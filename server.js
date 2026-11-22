import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrateStaffRole,migrateFulfillment } from './migrations.js';
import {PROVINCES,STORE_PROVINCE,OUTSIDE_FEE,storeAddress,selection,shippingFee} from './shipping.js';
import {buildReport} from './reports.js';
import {inventoryService,initializeStockHistory,recordMovement} from './inventory.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
export const STATUS = {pending:'Chờ xác nhận',confirmed:'Đã xác nhận',preparing:'Đang chuẩn bị',ready:'Chờ nhận tại cửa hàng',shipping:'Đang giao',delivered:'Đã giao',cancelled:'Đã hủy'};
const NEXT = {pending:['confirmed','cancelled'],confirmed:['preparing','cancelled'],preparing:['shipping','cancelled'],shipping:['delivered'],delivered:[],cancelled:[]};
const nextFor=o=>o.fulfillment==='pickup'?({pending:['confirmed','cancelled'],confirmed:['preparing','cancelled'],preparing:['ready','cancelled'],ready:['delivered','cancelled'],delivered:[],cancelled:[]}[o.status]||[]):NEXT[o.status]||[];
const POINTS_UNIT = 10000;
const now = () => new Date().toISOString();
const hash = value => createHash('sha256').update(value).digest('hex');
export function passwordHash(value) { const salt=randomBytes(16).toString('hex'); return `${salt}:${scryptSync(value,salt,64).toString('hex')}`; }
function passwordValid(value, stored) { const [salt,key]=stored.split(':'); return timingSafeEqual(scryptSync(value,salt,64),Buffer.from(key,'hex')); }
function fail(status,message) { throw Object.assign(new Error(message),{status}); }
function string(value,label,min=1,max=250) { if(typeof value!=='string'||value.trim().length<min||value.trim().length>max) fail(400,`${label} không hợp lệ (${min}–${max} ký tự).`); return value.trim(); }
function integer(value,label,min=0,max=1000000000) { if(!Number.isSafeInteger(value)||value<min||value>max) fail(400,`${label} không hợp lệ.`); return value; }
function email(value) { const v=string(value,'Email',5,254).toLowerCase(); if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) fail(400,'Email không hợp lệ.'); return v; }
function phone(value) { const v=string(value,'Số điện thoại',10,15).replace(/[\s.-]/g,''); if(!/^(0\d{9}|\+84\d{9})$/.test(v)) fail(400,'Nhập số điện thoại Việt Nam hợp lệ.'); return v; }
function image(value) { const v=string(value,'URL ảnh',1,2000); try { if(new URL(v).protocol!=='https:') throw 0; } catch { fail(400,'Ảnh phải dùng URL HTTPS.'); } return v; }

export function createApp(options={}) {
 const dbPath=options.dbPath||process.env.DB_PATH||join(ROOT,'data','mocvai.sqlite');
 if(dbPath!==':memory:') mkdirSync(dirname(resolve(dbPath)),{recursive:true});
 const db=new DatabaseSync(dbPath);
 const schema=readFileSync(join(ROOT,'schema.sql'),'utf8');
 db.exec(schema);migrateStaffRole(db,schema);migrateFulfillment(db);
 const run=(sql,...args)=>db.prepare(sql).run(...args);
 const one=(sql,...args)=>db.prepare(sql).get(...args);
 const all=(sql,...args)=>db.prepare(sql).all(...args);
 function tx(fn) { db.exec('BEGIN IMMEDIATE'); try { const result=fn(); db.exec('COMMIT'); return result; } catch(e) { db.exec('ROLLBACK'); throw e; } }
 function audit(actor,action,target) { run('INSERT INTO audit(actor,action,target,created_at) VALUES(?,?,?,?)',actor,action,String(target),now()); }
 // Credit previously delivered orders on upgrade. The order primary key makes
 // this repeatable without duplicating points on subsequent server starts.
 run(`INSERT OR IGNORE INTO loyalty_points(order_id,user_id,eligible_amount,points,created_at)
  SELECT id,user_id,MAX(0,subtotal-discount),CAST(MAX(0,subtotal-discount)/? AS INTEGER),?
  FROM orders WHERE status='delivered'`,POINTS_UNIT,now());
 if(!one('SELECT id FROM products LIMIT 1')) tx(()=>{
  for(const p of JSON.parse(readFileSync(join(ROOT,'seed.json'),'utf8'))) {
   const {id,name,price,colors,sizes,...metadata}=p;
   run('INSERT INTO products(id,name,price,metadata) VALUES(?,?,?,?)',id,name,price,JSON.stringify(metadata));
   for(const c of colors) for(const size of sizes) run('INSERT INTO variants(product_id,color,size,hex,img,stock) VALUES(?,?,?,?,?,?)',id,c.name,size,c.hex,c.img,20);
  }
 });
 function createAdmin(mail,pass) {
  mail=email(mail); string(pass,'Mật khẩu',8,128);
  if(one('SELECT id FROM users WHERE email=?',mail)) fail(409,'Email đã tồn tại. Không tự động nâng quyền tài khoản.');
  run("INSERT INTO users(email,name,password,role) VALUES(?,?,?,'admin')",mail,'Quản trị Mộc Vải',passwordHash(pass));
 }
 if(options.admin) createAdmin(options.admin.email,options.admin.password);
 initializeStockHistory(db);
 const inventory=inventoryService(db);
 const pointsBalance=id=>one('SELECT COALESCE(SUM(points),0) AS balance FROM loyalty_points WHERE user_id=?',id).balance;
 const publicUser=u=>u?{id:u.id,email:u.email,name:u.name,role:u.role,phone:u.phone,address:u.address,active:!!u.active,loyaltyPoints:pointsBalance(u.id)}:null;
 function products(admin=false) {
  return all(`SELECT * FROM products ${admin?'':'WHERE active=1'} ORDER BY id ${admin?'DESC':'ASC'}`).map(p=>{
   const variants=all(`SELECT * FROM variants WHERE product_id=? ${admin?'':'AND active=1'} ORDER BY id`,p.id);
   const colors=[...new Map(variants.map(v=>[v.color,{name:v.color,hex:v.hex,img:v.img}])).values()];
   return {...JSON.parse(p.metadata),id:p.id,name:p.name,price:p.price,active:!!p.active,colors,sizes:[...new Set(variants.map(v=>v.size))],variants,version:hash(JSON.stringify([p,variants]))};
  });
 }
 function cart(owner,choice=null) {
  const items=all('SELECT c.variant_id,c.qty,v.color,v.size,v.img,v.stock,v.active AS variant_active,p.active,p.id,p.name,p.price FROM carts c JOIN variants v ON v.id=c.variant_id JOIN products p ON p.id=v.product_id WHERE c.owner=? ORDER BY c.variant_id',owner);
  const meta=one('SELECT * FROM cart_meta WHERE owner=?',owner)||{};
  choice=choice||selection(meta,true);
  const subtotal=items.reduce((s,i)=>s+i.price*i.qty,0),promo=meta.promo||'';
  const discount=promo==='WELCOME50'&&subtotal>=99000?Math.min(50000,subtotal):0;
  const shipping=shippingFee(choice,!!items.length),shippingPending=!!items.length&&choice.fulfillment==='delivery'&&!choice.province;
  const quote=hash(JSON.stringify({items:items.map(i=>[i.variant_id,i.qty,i.price,i.active,i.variant_active]),subtotal,shipping,discount,...choice}));
  return {items,subtotal,shipping,shippingPending,discount,total:subtotal+shipping-discount,promo,quote,...choice};
 }
 function order(id) {
  const o=one('SELECT o.*,u.email AS customer_email FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=?',id);
  if(!o) fail(404,'Không tìm thấy đơn hàng.');
  const credit=one('SELECT points FROM loyalty_points WHERE order_id=?',id);
  return {...o,earnedPoints:credit?.points??0,pointsAwarded:!!credit,statusLabel:o.fulfillment==='pickup'&&o.status==='delivered'?'Đã nhận tại cửa hàng':STATUS[o.status],items:all('SELECT * FROM order_items WHERE order_id=?',id),history:all('SELECT status,note,created_at FROM order_history WHERE order_id=? ORDER BY id',id),payments:all('SELECT status,reference,created_at FROM payment_events WHERE order_id=? ORDER BY id',id),next:nextFor(o)};
 }
 const attempts=new Map();
 function limit(req) { const key=req.socket.remoteAddress, t=Date.now(); let a=attempts.get(key); if(!a||t>a.until) a={count:0,until:t+60000}; if(++a.count>20) fail(429,'Thử quá nhiều lần. Vui lòng đợi một phút.'); attempts.set(key,a); if(attempts.size>10000) for(const [k,v] of attempts) if(v.until<t) attempts.delete(k); }
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','same-origin'); res.setHeader('X-Frame-Options','DENY');
  let session,owner,user;
  const send=(status,data)=>{ res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(data)); };
  try {
   const url=new URL(req.url,'http://localhost'); const path=url.pathname, method=req.method;
   if(!path.startsWith('/api/')) {
    const staticFiles={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/admin':'admin.html','/admin/':'admin.html','/account':'account.html','/account.js':'account.js','/account.css':'account.css','/admin.js':'admin.js','/admin.css':'admin.css','/shared.js':'shared.js','/checkout.js':'checkout.js','/reports-view.js':'reports-view.js','/inventory-view.js':'inventory-view.js','/invoice':'invoice.html','/invoice.js':'invoice.js','/invoice.css':'invoice.css'};
    const file=staticFiles[path]; if(!file) fail(404,'Không tìm thấy trang.');
    const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';
    res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-cache'}); return res.end(readFileSync(join(ROOT,'public',file)));
   }
   const token=(req.headers.cookie||'').match(/(?:^|;\s*)mv_session=([a-f0-9]{64})(?:;|$)/)?.[1];
   session=token?one('SELECT * FROM sessions WHERE token=? AND expires>?',hash(token),Date.now()):null;
   function newSession(uid=null) {
    const raw=randomBytes(32).toString('hex'), csrf=randomBytes(24).toString('hex');
    const tokenHash=hash(raw);run('INSERT INTO sessions(token,csrf,user_id,expires) VALUES(?,?,?,?)',tokenHash,csrf,uid,Date.now()+7*86400000);
    res.setHeader('Set-Cookie',`mv_session=${raw}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${process.env.COOKIE_SECURE==='1'?'; Secure':''}`);
    return {token:tokenHash,csrf,user_id:uid};
   }
   if(!session) session=newSession();
   user=session.user_id?one('SELECT * FROM users WHERE id=? AND active=1',session.user_id):null;
   if(session.user_id&&!user) { run('DELETE FROM sessions WHERE token=?',session.token);session=newSession(); }
   owner=user?'u:'+user.id:'s:'+session.token;
   const requireUser=()=>{ if(!user) fail(401,'Vui lòng đăng nhập.'); };
   const requireCustomer=()=>{requireUser();if(user.role!=='customer')fail(403,'Chỉ tài khoản khách hàng được đặt mua online.');};
   const requireAdmin=()=>{ requireUser();if(user.role!=='admin') fail(403,'Bạn không có quyền quản trị.'); };
   if(!['GET','HEAD'].includes(method)) {
    const origin=req.headers.origin; if(origin&&origin!==`http://${req.headers.host}`&&origin!==`https://${req.headers.host}`) fail(403,'Nguồn yêu cầu không hợp lệ.');
    if(req.headers['x-csrf-token']!==session.csrf) fail(403,'Phiên làm việc đã thay đổi. Hãy tải lại trang.');
   }
   let b={};
   if(['POST','PUT','PATCH'].includes(method)) {
    if(!(req.headers['content-type']||'').startsWith('application/json')) fail(415,'Yêu cầu JSON.');
    let body='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>131072) fail(413,'Dữ liệu quá lớn.');body+=chunk;}
    try {b=JSON.parse(body||'{}');}catch{fail(400,'JSON không hợp lệ.');} if(!b||Array.isArray(b)||typeof b!=='object') fail(400,'Dữ liệu không hợp lệ.');
   }
   const bank=process.env.BANK_DETAILS||'';
   if(method==='GET'&&path==='/api/me') return send(200,{user:publicUser(user),csrf:session.csrf,config:{bankDetails:bank,paymentMethods:bank?['cod','bank_transfer']:['cod'],statuses:STATUS,fulfillment:{provinces:PROVINCES,storeProvince:STORE_PROVINCE,storeAddress:storeAddress(),outsideFee:OUTSIDE_FEE}}});
   if(method==='GET'&&path==='/api/products') return send(200,products());
   if(method==='POST'&&['/api/auth/register','/api/auth/login'].includes(path)) {
    limit(req); if(b.portal!==undefined&&!['customer','staff'].includes(b.portal))fail(400,'Khu vực đăng nhập không hợp lệ.');
    if(path.endsWith('register')&&b.portal==='staff')fail(403,'Tài khoản nhân viên phải được quản trị viên cấp.');
    const mail=email(b.email);string(b.password,'Mật khẩu',8,128);const pass=b.password;
    if(path.endsWith('register')) {
     const name=string(b.name,'Họ tên',2,100); if(one('SELECT id FROM users WHERE email=?',mail)) fail(409,'Email đã được đăng ký.');
     run('INSERT INTO users(email,name,password) VALUES(?,?,?)',mail,name,passwordHash(pass));
    }
    const u=one('SELECT * FROM users WHERE email=?',mail);
    if(!u||!passwordValid(pass,u.password)||!u.active) fail(401,'Email hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa.');
    if(b.portal==='staff'&&u.role==='customer')fail(403,'Đây là tài khoản khách hàng. Hãy chọn đăng nhập Khách hàng.');
    if(b.portal==='customer'&&u.role!=='customer')fail(403,'Đây là tài khoản nhân viên/quản trị. Hãy chọn đăng nhập Nhân viên / Quản trị.');
    tx(()=>{
     const destination='u:'+u.id;
     for(const item of u.role==='customer'?all('SELECT * FROM carts WHERE owner=?',owner):[]) {
      const existing=one('SELECT qty FROM carts WHERE owner=? AND variant_id=?',destination,item.variant_id);
      if(owner!==destination) run('INSERT INTO carts(owner,variant_id,qty) VALUES(?,?,?) ON CONFLICT(owner,variant_id) DO UPDATE SET qty=excluded.qty',destination,item.variant_id,Math.min(99,item.qty+(existing?.qty||0)));
     }
     if(owner!==destination) {
      const guestMeta=one('SELECT * FROM cart_meta WHERE owner=?',owner);
      if(guestMeta&&u.role==='customer')run('INSERT INTO cart_meta(owner,promo,fulfillment,province) VALUES(?,?,?,?) ON CONFLICT(owner) DO UPDATE SET promo=excluded.promo,fulfillment=excluded.fulfillment,province=excluded.province',destination,guestMeta.promo,guestMeta.fulfillment,guestMeta.province);
      run('DELETE FROM carts WHERE owner=?',owner);run('DELETE FROM cart_meta WHERE owner=?',owner);
     }
     run('DELETE FROM sessions WHERE token=?',session.token);session=newSession(u.id);
    }); return send(200,{user:publicUser(u),csrf:session.csrf});
   }
   if(method==='POST'&&path==='/api/auth/logout') { run('DELETE FROM sessions WHERE token=?',session.token);session=newSession();return send(200,{csrf:session.csrf}); }
   if(method==='PATCH'&&path==='/api/profile') {
    requireUser();const name=string(b.name,'Họ tên',2,100),p=b.phone?phone(b.phone):'',address=typeof b.address==='string'?string(b.address||' ','Địa chỉ',0,500):'';
    run('UPDATE users SET name=?,phone=?,address=? WHERE id=?',name,p,address,user.id);return send(200,publicUser(one('SELECT * FROM users WHERE id=?',user.id)));
   }
   if(method==='GET'&&path==='/api/cart') return send(200,cart(owner));
   if(user&&user.role!=='customer'&&path.startsWith('/api/cart')&&method!=='GET') fail(403,'Tài khoản quản lý không sử dụng giỏ hàng mua sắm.');
   if(method==='POST'&&path==='/api/cart/fulfillment'){
    const choice=selection(b,true);run('INSERT INTO cart_meta(owner,fulfillment,province) VALUES(?,?,?) ON CONFLICT(owner) DO UPDATE SET fulfillment=excluded.fulfillment,province=excluded.province',owner,choice.fulfillment,choice.province);return send(200,cart(owner));
   }
   if(method==='PUT'&&path==='/api/cart') {
    if(!Array.isArray(b.items)||b.items.length>100) fail(400,'Giỏ hàng không hợp lệ.');
    const seen=new Set();const items=b.items.map(i=>{if(!i||typeof i!=='object')fail(400,'Sản phẩm trong giỏ không hợp lệ.');integer(i.variant_id,'Biến thể',1);integer(i.qty,'Số lượng',1,99);if(seen.has(i.variant_id)) fail(400,'Biến thể bị lặp.');seen.add(i.variant_id);const v=one('SELECT v.*,p.active AS product_active FROM variants v JOIN products p ON p.id=v.product_id WHERE v.id=?',i.variant_id);if(!v||!v.active||!v.product_active) fail(409,'Sản phẩm đã ngừng bán. Hãy xóa khỏi giỏ.');if(i.qty>v.stock) fail(409,`Chỉ còn ${v.stock} sản phẩm ${v.color}, size ${v.size}.`);return i;});
    tx(()=>{run('DELETE FROM carts WHERE owner=?',owner);for(const i of items) run('INSERT INTO carts(owner,variant_id,qty) VALUES(?,?,?)',owner,i.variant_id,i.qty);});return send(200,cart(owner));
   }
   if(method==='POST'&&path==='/api/cart/promo') {
    const code=string(b.code||'','Mã giảm giá',0,30).toUpperCase(); if(code&&code!=='WELCOME50') fail(400,'Mã giảm giá không hợp lệ.');if(code&&cart(owner).subtotal<99000) fail(400,'WELCOME50 áp dụng cho đơn từ 99.000đ.');
    run('INSERT INTO cart_meta(owner,promo) VALUES(?,?) ON CONFLICT(owner) DO UPDATE SET promo=excluded.promo',owner,code);return send(200,cart(owner));
   }
   if(method==='GET'&&path==='/api/orders') {requireUser();return send(200,all('SELECT id FROM orders WHERE user_id=? ORDER BY created_at DESC',user.id).map(o=>order(o.id)));}
   if(method==='GET'&&path==='/api/loyalty') {
    requireUser();return send(200,{balance:pointsBalance(user.id),unit:POINTS_UNIT,history:all('SELECT order_id,eligible_amount,points,created_at FROM loyalty_points WHERE user_id=? ORDER BY created_at DESC,order_id',user.id)});
   }
   if(method==='POST'&&path==='/api/orders') {
    requireCustomer();const key=string(b.requestKey,'Mã yêu cầu',16,100); const existing=one('SELECT id FROM orders WHERE user_id=? AND request_key=?',user.id,key);if(existing) return send(200,order(existing.id));
    const stored=one('SELECT * FROM cart_meta WHERE owner=?',owner)||{};
    const choice=selection({fulfillment:b.fulfillment??stored.fulfillment,province:b.province??stored.province});
    const receiver=string(b.receiver,'Người nhận',2,100),p=phone(b.phone),address=choice.fulfillment==='pickup'?storeAddress():string(b.address,'Địa chỉ',10,500);
    if(!['cod',...(bank?['bank_transfer']:[])].includes(b.method)) fail(400,'Phương thức thanh toán chưa được hỗ trợ.');
    const id='MV'+randomUUID().replaceAll('-','').slice(0,12).toUpperCase();
    tx(()=>{
     const c=cart(owner,choice);if(!c.items.length) fail(400,'Giỏ hàng trống.');
     if(b.quote&&b.quote!==c.quote) fail(409,'Giỏ hàng hoặc giá đã thay đổi. Hãy xem lại tổng tiền và xác nhận lại.');
     for(const i of c.items) {
      if(!i.active||!i.variant_active) fail(409,`${i.name} đã ngừng bán.`);
      if(run('UPDATE variants SET stock=stock-? WHERE id=? AND stock>=?',i.qty,i.variant_id,i.qty).changes!==1) fail(409,`${i.name} (${i.color}/${i.size}) không đủ tồn kho.`);
      recordMovement(db,i.variant_id,-i.qty,'order_reserve',id,user.id);
     }
     run('INSERT INTO orders(id,user_id,request_key,receiver,phone,address,subtotal,shipping,discount,total,method,created_at,fulfillment,province,store_address) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',id,user.id,key,receiver,p,address,c.subtotal,c.shipping,c.discount,c.total,b.method,now(),choice.fulfillment,choice.province,storeAddress());
     for(const i of c.items) run('INSERT INTO order_items(order_id,variant_id,name,color,size,img,price,qty) VALUES(?,?,?,?,?,?,?,?)',id,i.variant_id,i.name,i.color,i.size,i.img,i.price,i.qty);
     run('INSERT INTO order_history(order_id,status,note,actor,created_at) VALUES(?,?,?,?,?)',id,'pending','Đơn hàng được tạo; tồn kho đã được giữ.',user.id,now());
     run('DELETE FROM carts WHERE owner=?',owner);run('DELETE FROM cart_meta WHERE owner=?',owner);
    });return send(201,order(id));
   }
   const cancel=path.match(/^\/api\/orders\/([A-Z0-9]+)\/cancel$/);
   if(method==='POST'&&cancel) {
    requireUser();const o=order(cancel[1]);if(o.user_id!==user.id) fail(404,'Không tìm thấy đơn hàng.');if(o.status!=='pending') fail(409,'Chỉ được hủy đơn đang chờ xác nhận.');
    changeStatus(o,'cancelled',user.id,'Khách hàng hủy đơn.');return send(200,order(o.id));
   }
   if(method==='POST'&&path==='/api/newsletter') {run('INSERT OR IGNORE INTO subscribers(email) VALUES(?)',email(b.email));return send(201,{ok:true});}
   if(path.startsWith('/api/admin/')) {
    requireUser();
    const staffOrderAccess=(method==='GET'&&path==='/api/admin/orders')||
     (method==='PATCH'&&/^\/api\/admin\/orders\/[A-Z0-9]+\/status$/.test(path))||
     (['GET','POST'].includes(method)&&path==='/api/admin/products')||
     (method==='GET'&&/^\/api\/admin\/orders\/[A-Z0-9]+\/invoice$/.test(path));
    if(user.role!=='admin'&&!(user.role==='staff'&&staffOrderAccess)) requireAdmin();
    if(method==='GET'&&path==='/api/admin/reports')return send(200,buildReport(db,{from:url.searchParams.get('from'),to:url.searchParams.get('to')}));
    if(method==='GET'&&path==='/api/admin/inventory')return send(200,inventory.report({from:url.searchParams.get('from'),to:url.searchParams.get('to')}));
    if(method==='POST'&&path==='/api/admin/inventory/receipts'){const result=inventory.create(b,user.id);return send(result.created?201:200,result.receipt);}
    const receiptAction=path.match(/^\/api\/admin\/inventory\/receipts\/(NK[A-Z0-9]+)\/(confirm|cancel)$/);
    if(method==='POST'&&receiptAction)return send(200,inventory[receiptAction[2]](receiptAction[1],user.id));
    const receiptRead=path.match(/^\/api\/admin\/inventory\/receipts\/(NK[A-Z0-9]+)$/);
    if(method==='GET'&&receiptRead)return send(200,inventory.receipt(receiptRead[1]));
    const invoiceMatch=path.match(/^\/api\/admin\/orders\/([A-Z0-9]+)\/invoice$/);
    if(method==='GET'&&invoiceMatch){const o=order(invoiceMatch[1]);return send(200,{order:o,storeAddress:o.store_address||storeAddress()});}
    if(method==='GET'&&path==='/api/admin/users') return send(200,all('SELECT * FROM users ORDER BY id DESC').map(u=>({...publicUser(u),created_at:u.created_at})));
    const userMatch=path.match(/^\/api\/admin\/users\/(\d+)$/);
    if(method==='PATCH'&&userMatch) {
     const id=Number(userMatch[1]),target=one('SELECT * FROM users WHERE id=?',id);
     if(!target) fail(404,'Không tìm thấy tài khoản.');
     if(b.role===undefined&&b.active===undefined) fail(400,'Cần chọn vai trò hoặc trạng thái tài khoản.');
     if(b.role!==undefined&&!['customer','staff','admin'].includes(b.role)) fail(400,'Vai trò không hợp lệ.');
     if(b.active!==undefined&&typeof b.active!=='boolean') fail(400,'Trạng thái không hợp lệ.');
     const role=b.role??target.role,active=b.active??!!target.active;
     if(id===user.id&&(role!=='admin'||!active)) fail(409,'Không thể tự khóa hoặc hạ quyền tài khoản đang đăng nhập.');
     if(target.role==='admin'&&target.active&&(role!=='admin'||!active)&&one("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1").n<=1) fail(409,'Phải giữ ít nhất một quản trị viên đang hoạt động.');
     tx(()=>{
      run('UPDATE users SET role=?,active=? WHERE id=?',role,Number(active),id);
      if(role!==target.role||Number(active)!==target.active) run('DELETE FROM sessions WHERE user_id=?',id);
      audit(user.id,`user.access:${target.role}->${role}:${Number(active)}`,id);
     });
     return send(200,publicUser(one('SELECT * FROM users WHERE id=?',id)));
    }
    if(method==='GET'&&path==='/api/admin/products') return send(200,products(true));
    if(method==='POST'&&path==='/api/admin/products') {const id=saveProduct(b,null,user.id);return send(201,products(true).find(p=>p.id===id));}
    const productMatch=path.match(/^\/api\/admin\/products\/(\d+)$/);
    if(method==='PUT'&&productMatch) {saveProduct(b,Number(productMatch[1]),user.id);return send(200,{ok:true});}
    if(method==='GET'&&path==='/api/admin/customers') return send(200,all("SELECT u.id,u.email,u.name,u.phone,u.address,u.active,u.created_at,COUNT(o.id) AS order_count,COALESCE(SUM(CASE WHEN o.payment_status='paid' THEN o.total ELSE 0 END),0) AS spent FROM users u LEFT JOIN orders o ON o.user_id=u.id WHERE u.role='customer' GROUP BY u.id ORDER BY u.id DESC"));
    const customerMatch=path.match(/^\/api\/admin\/customers\/(\d+)$/);
    if(method==='PATCH'&&customerMatch) {
     if(typeof b.active!=='boolean') fail(400,'Trạng thái không hợp lệ.');const id=Number(customerMatch[1]);if(!one("SELECT id FROM users WHERE id=? AND role='customer'",id)) fail(404,'Không tìm thấy khách hàng.');
     tx(()=>{run('UPDATE users SET active=? WHERE id=?',Number(b.active),id);if(!b.active) run('DELETE FROM sessions WHERE user_id=?',id);audit(user.id,b.active?'customer.enable':'customer.disable',id);});return send(200,{ok:true});
    }
    if(method==='GET'&&path==='/api/admin/orders') return send(200,all('SELECT id FROM orders ORDER BY created_at DESC').map(o=>order(o.id)));
    const statusMatch=path.match(/^\/api\/admin\/orders\/([A-Z0-9]+)\/status$/);
    if(method==='PATCH'&&statusMatch) {
     const o=order(statusMatch[1]);if(!nextFor(o).includes(b.status)) fail(409,'Không thể chuyển sang trạng thái này.');
     const carrier=b.status==='shipping'?string(b.carrier,'Đơn vị vận chuyển',2,100):o.carrier,tracking=b.status==='shipping'?string(b.tracking,'Mã vận đơn',3,100):o.tracking;
     const defaultNote=o.fulfillment==='pickup'&&b.status==='delivered'?'Khách đã nhận tại cửa hàng':STATUS[b.status];
     changeStatus(o,b.status,user.id,string(b.note||defaultNote,'Ghi chú',1,500),carrier,tracking);return send(200,order(o.id));
    }
    const paymentMatch=path.match(/^\/api\/admin\/orders\/([A-Z0-9]+)\/payment$/);
    if(method==='PATCH'&&paymentMatch) {
     const o=order(paymentMatch[1]);const reference=string(b.reference,'Mã giao dịch / biên nhận',3,150);
     if(b.status==='paid') {if(o.payment_status!=='unpaid'||o.status==='cancelled'||(o.method==='cod'&&o.status!=='delivered')) fail(409,'Chưa thể xác nhận thanh toán cho đơn này.');}
     else if(b.status==='refunded') {if(o.payment_status!=='refund_pending') fail(409,'Đơn không chờ hoàn tiền.');}
     else fail(400,'Trạng thái thanh toán không hợp lệ.');
     tx(()=>{run('UPDATE orders SET payment_status=? WHERE id=?',b.status,o.id);run('INSERT INTO payment_events(order_id,status,reference,actor,created_at) VALUES(?,?,?,?,?)',o.id,b.status,reference,user.id,now());audit(user.id,'payment.'+b.status,o.id);});return send(200,order(o.id));
    }
   }
   fail(404,'Không tìm thấy chức năng.');
  } catch(e) {if(!e.status) console.error(e);if(!res.headersSent) send(e.status||500,{error:e.status?e.message:'Có lỗi hệ thống. Vui lòng thử lại.'});else res.end();}
 });
 function changeStatus(o,status,actor,note,carrier=o.carrier,tracking=o.tracking) {
  tx(()=>{
   if(one('SELECT status FROM orders WHERE id=?',o.id).status!==o.status) fail(409,'Đơn đã thay đổi. Hãy tải lại.');
   run('UPDATE orders SET status=?,carrier=?,tracking=? WHERE id=?',status,carrier,tracking,o.id);
   if(status==='delivered') {
    const eligible=Math.max(0,o.subtotal-o.discount),points=Math.floor(eligible/POINTS_UNIT);
    const credit=run('INSERT OR IGNORE INTO loyalty_points(order_id,user_id,eligible_amount,points,created_at) VALUES(?,?,?,?,?)',o.id,o.user_id,eligible,points,now());
    if(credit.changes) audit(actor,'loyalty.award',o.id);
   }
   if(status==='cancelled') {
    for(const i of o.items){run('UPDATE variants SET stock=stock+? WHERE id=?',i.qty,i.variant_id);recordMovement(db,i.variant_id,i.qty,'order_cancel',o.id,actor);}
    if(o.payment_status==='paid') {run("UPDATE orders SET payment_status='refund_pending' WHERE id=?",o.id);run('INSERT INTO payment_events(order_id,status,reference,actor,created_at) VALUES(?,?,?,?,?)',o.id,'refund_pending','Đơn bị hủy; cần hoàn tiền cho khách.',actor,now());}
   }
   run('INSERT INTO order_history(order_id,status,note,actor,created_at) VALUES(?,?,?,?,?)',o.id,status,note,actor,now());audit(actor,'order.'+status,o.id);
  });
 }
 function saveProduct(b,id,actor) {
  const name=string(b.name,'Tên sản phẩm',2,180),price=integer(b.price,'Giá',1000,100000000),originalPrice=integer(b.originalPrice??price,'Giá gốc',price,100000000);
  if(typeof b.active!=='boolean') fail(400,'Trạng thái sản phẩm không hợp lệ.');
  const metadata={audience:string(b.audience,'Đối tượng',1,40),category:string(b.category,'Danh mục',1,60),fabric:string(b.fabric,'Mô tả',1,2000),badge:string(b.badge||'Mới về','Nhãn',1,40),originalPrice,discount:originalPrice>price?`-${Math.round((1-price/originalPrice)*100)}%`:'',flashSale:!!b.flashSale,rating:id?JSON.parse(one('SELECT metadata FROM products WHERE id=?',id)?.metadata||'{}').rating||0:0,sold:0};
  if(!Array.isArray(b.variants)||!b.variants.length||b.variants.length>200) fail(400,'Cần 1–200 biến thể.');
  const keys=new Set(), colorData=new Map();const variants=b.variants.map(v=>{
   if(!v||typeof v!=='object') fail(400,'Biến thể không hợp lệ.');
   const color=string(v.color,'Màu',1,60),size=string(v.size,'Size',1,20),stock=integer(v.stock,'Tồn kho',0,100000),img=image(v.img),hex=string(v.hex,'Mã màu',7,7);
   if(!/^#[a-f0-9]{6}$/i.test(hex)) fail(400,'Mã màu không hợp lệ.');const key=JSON.stringify([color,size]);if(keys.has(key)) fail(400,'Màu và size bị trùng.');keys.add(key);
   const cd=colorData.get(color);if(cd&&(cd.hex!==hex||cd.img!==img)) fail(400,'Các size cùng màu phải dùng chung mã màu và ảnh.');colorData.set(color,{hex,img});return {color,size,stock,img,hex};
  });
  return tx(()=>{
   if(id) {const current=products(true).find(p=>p.id===id);if(!current) fail(404,'Không tìm thấy sản phẩm.');if(b.version!==current.version) fail(409,'Sản phẩm hoặc tồn kho đã thay đổi. Hãy tải lại trước khi sửa.');metadata.sold=current.sold;run('UPDATE products SET name=?,price=?,active=?,metadata=? WHERE id=?',name,price,Number(b.active),JSON.stringify(metadata),id);}
   else id=Number(run('INSERT INTO products(name,price,active,metadata) VALUES(?,?,?,?)',name,price,Number(b.active),JSON.stringify(metadata)).lastInsertRowid);
   run('UPDATE variants SET active=0 WHERE product_id=?',id);
   const stockReference='product-'+id+'-'+randomUUID();
   for(const v of variants){
    const previous=one('SELECT id,stock FROM variants WHERE product_id=? AND color=? AND size=?',id,v.color,v.size);
    run('INSERT INTO variants(product_id,color,size,hex,img,stock) VALUES(?,?,?,?,?,?) ON CONFLICT(product_id,color,size) DO UPDATE SET hex=excluded.hex,img=excluded.img,stock=excluded.stock,active=1',id,v.color,v.size,v.hex,v.img,v.stock);
    const current=one('SELECT id FROM variants WHERE product_id=? AND color=? AND size=?',id,v.color,v.size);
    if(!previous||previous.stock!==v.stock)recordMovement(db,current.id,v.stock-(previous?.stock||0),previous?'adjustment':'initial',stockReference,actor);
   }
   audit(actor,'product.save',id);return id;
  });
 }
 return {server,db,createAdmin,close:()=>db.close()};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const app=createApp(); const port=Number(process.env.PORT||3000),host=process.env.HOST||'127.0.0.1';
 app.server.listen(port,host,()=>console.log(`Mộc Vải: http://${host}:${port} | Quản trị: http://${host}:${port}/admin`));
 for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>app.server.close(()=>{app.close();process.exit(0);}));
}
