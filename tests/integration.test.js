import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
import {normalizeText,matchesSearch} from '../public/text.js';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createApp,passwordHash} from '../server.js';
import {importUniqloCatalog,updateCatalogPrices} from '../catalog-import.js';

const ADMIN={email:'admin@example.test',password:'Admin-password-2026'};
async function fixture(t,options={}){
 const dir=mkdtempSync(join(tmpdir(),'mocvai-'));
 const app=createApp({dbPath:join(dir,'test.sqlite'),admin:ADMIN,...options});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port;
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.close();rmSync(dir,{recursive:true,force:true});});
 function client(){let cookie='',csrf='';return {async call(path,method='GET',body,expected=200,headers={}){
  const r=await fetch(base+'/api'+path,{method,headers:{cookie,'Content-Type':'application/json','X-CSRF-Token':csrf,...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];const data=await r.json();if(data.csrf)csrf=data.csrf;
  assert.equal(r.status,expected,`${method} ${path}: ${JSON.stringify(data)}`);return data;
 },async register(email='buyer@example.test'){await this.call('/me');return this.call('/auth/register','POST',{email,password:'Buyer-password-2026',name:'Khách hàng thử nghiệm'});},async login(){await this.call('/me');return this.call('/auth/login','POST',ADMIN);}};}
 return {app,base,dir,client};
}
const checkout=(requestKey='request-checkout-0001',method='cod')=>({receiver:'Nguyễn Văn An',phone:'0901234567',address:'128 Nguyễn Trãi, TP Hồ Chí Minh',method,requestKey,fulfillment:'delivery',province:'TP.HCM'});
async function add(c,variant_id,qty=1){await c.call('/cart','PUT',{items:[{variant_id,qty}]});return c.call('/cart/fulfillment','POST',{fulfillment:'delivery',province:'TP.HCM'});}
async function deliver(admin,id){for(const status of ['confirmed','preparing','shipping','delivered'])await admin.call('/admin/orders/'+id+'/status','PATCH',{status,carrier:'GHN',tracking:'POINTS-TEST-001'});}
const intake=(items,key='inventory-request-0001',supplier='Nhà cung cấp kiểm thử')=>({supplier,supplier_reference:'NCC-001',note:'Phiếu nhập kiểm thử',requestKey:key,items});

test('register, real password auth, profile, admin permissions and CSRF',async t=>{
 const {client}=await fixture(t);const c=client();const {user}=await c.register();assert.equal(user.role,'customer');
 assert.equal((await c.call('/me')).user.email,user.email);
 await c.call('/admin/orders','GET',undefined,403);
 await c.call('/profile','PATCH',{name:'Tên mới',phone:'0901234567',address:'Địa chỉ'},403,{'X-CSRF-Token':'wrong'});
 await c.call('/profile','PATCH',{name:'Tên mới',phone:'invalid',address:'Địa chỉ'},400);
 await c.call('/profile','PATCH',{name:'Tên mới',phone:'0901234567',address:'Địa chỉ'});
 await c.call('/auth/logout','POST',{});assert.equal((await c.call('/me')).user,null);
 await c.call('/auth/login','POST',{email:user.email,password:'wrong-password'},401);
 await c.call('/auth/login','POST',{email:user.email,password:'Buyer-password-2026'});
 assert.equal((await c.call('/me')).user.name,'Tên mới');
 await c.call('/auth/logout','POST',{},403,{origin:'https://evil.test'});
});
test('guest cart merges on login; account cart survives logout and login',async t=>{
 const {client}=await fixture(t);const c=client();await c.call('/me');const p=(await c.call('/products'))[0],v=p.variants[0];await add(c,v.id,2);await c.register();assert.equal((await c.call('/cart')).items[0].qty,2);await c.call('/auth/logout','POST',{});assert.equal((await c.call('/cart')).items.length,0);await c.call('/auth/login','POST',{email:'buyer@example.test',password:'Buyer-password-2026'});assert.equal((await c.call('/cart')).items[0].qty,2);
});
test('checkout uses server prices, stock reservation, idempotency and cancellation',async t=>{
 const {client}=await fixture(t);const c=client();await c.register();const p=(await c.call('/products'))[0],v=p.variants[0];await add(c,v.id,2);const cart=await c.call('/cart/promo','POST',{code:'WELCOME50'});const o=await c.call('/orders','POST',{...checkout(),total:1,price:1},201);assert.equal(o.total,p.price*2-50000);assert.equal(o.total,cart.total);assert.equal((await c.call('/products'))[0].variants[0].stock,v.stock-2);
 const repeat=await c.call('/orders','POST',checkout());assert.equal(repeat.id,o.id);assert.equal((await c.call('/orders')).length,1);
 await c.call('/orders/'+o.id+'/cancel','POST',{});assert.equal((await c.call('/products'))[0].variants[0].stock,v.stock);await c.call('/orders/'+o.id+'/cancel','POST',{},409);assert.equal((await c.call('/products'))[0].variants[0].stock,v.stock);
});
test('other customers cannot view or cancel another customer order',async t=>{
 const {client}=await fixture(t);const a=client(),b=client();await a.register('a@example.test');await b.register('b@example.test');const p=(await a.call('/products'))[0];await add(a,p.variants[0].id);const o=await a.call('/orders','POST',checkout(),201);assert.equal((await b.call('/orders')).length,0);await b.call('/orders/'+o.id+'/cancel','POST',{},404);await b.call('/admin/orders/'+o.id+'/status','PATCH',{status:'confirmed'},403);
});
test('order transitions, tracking requirement and separate COD collection',async t=>{
 const {client}=await fixture(t);const c=client(),a=client();await c.register();await a.login();const v=(await c.call('/products'))[0].variants[0];await add(c,v.id);const o=await c.call('/orders','POST',checkout(),201);const path='/admin/orders/'+o.id;
 await a.call(path+'/status','PATCH',{status:'delivered'},409);
 await a.call(path+'/payment','PATCH',{status:'paid',reference:'COD-0001'},409);
 await a.call(path+'/status','PATCH',{status:'confirmed'});await c.call('/orders/'+o.id+'/cancel','POST',{},409);
 await a.call(path+'/status','PATCH',{status:'preparing'});await a.call(path+'/status','PATCH',{status:'shipping'},400);
 await a.call(path+'/status','PATCH',{status:'shipping',carrier:'GHN',tracking:'GHN-0001'});let done=await a.call(path+'/status','PATCH',{status:'delivered'});assert.equal(done.payment_status,'unpaid');
 done=await a.call(path+'/payment','PATCH',{status:'paid',reference:'COD-0001'});assert.equal(done.payment_status,'paid');assert.equal(done.history.length,5);assert.equal(done.tracking,'GHN-0001');await a.call(path+'/payment','PATCH',{status:'paid',reference:'COD-0001'},409);await a.call(path+'/status','PATCH',{status:'cancelled'},409);
});
test('bank transfer is disabled without configuration',async t=>{
 const {client}=await fixture(t);const c=client();await c.register();await add(c,(await c.call('/products'))[0].variants[0].id);await c.call('/orders','POST',checkout('request-transfer-0001','bank_transfer'),400);
});
test('bank transfer payment and refund have an audit trail',async t=>{
 const old=process.env.BANK_DETAILS;process.env.BANK_DETAILS='Ngân hàng thử nghiệm - 123456';t.after(()=>{if(old===undefined)delete process.env.BANK_DETAILS;else process.env.BANK_DETAILS=old;});
 const {client}=await fixture(t);const c=client(),a=client();await c.register();await a.login();await add(c,(await c.call('/products'))[0].variants[0].id);const o=await c.call('/orders','POST',checkout('request-transfer-0001','bank_transfer'),201);const path='/admin/orders/'+o.id;
 await a.call(path+'/payment','PATCH',{status:'paid',reference:'BANK-001'});await c.call('/orders/'+o.id+'/cancel','POST',{});const done=await a.call(path+'/payment','PATCH',{status:'refunded',reference:'REFUND-001'});assert.equal(done.payment_status,'refunded');assert.equal(done.payments.length,3);
});
test('two competing checkouts cannot oversell and failed transaction keeps cart',async t=>{
 const {client,app}=await fixture(t);const a=client(),b=client();await a.register('a@example.test');await b.register('b@example.test');const v=(await a.call('/products'))[0].variants[0];app.db.prepare('UPDATE variants SET stock=1 WHERE id=?').run(v.id);await add(a,v.id);await add(b,v.id);
 await a.call('/orders','POST',checkout(),201);await b.call('/orders','POST',checkout(),409);assert.equal((await b.call('/cart')).items.length,1);assert.equal((await b.call('/products'))[0].variants[0].stock,0);await b.call('/cart','PUT',{items:[{variant_id:v.id,qty:2}]},409);
});
test('product CRUD, optimistic concurrency, hidden variants, historical snapshots',async t=>{
 const {client}=await fixture(t);const a=client(),c=client();await a.login();await c.register();let p=(await a.call('/admin/products'))[0];p.variants=p.variants.filter(v=>v.active);const v=p.variants[0];await add(c,v.id);const o=await c.call('/orders','POST',checkout(),201);
 await a.call('/admin/products/'+p.id,'PUT',p,409);p=(await a.call('/admin/products')).find(x=>x.id===p.id);p.name='Tên đã sửa';p.price=500000;p.originalPrice=600000;p.variants=p.variants.filter(v=>v.active);await a.call('/admin/products/'+p.id,'PUT',p);assert.notEqual((await c.call('/orders'))[0].items[0].name,p.name);assert.equal((await c.call('/orders'))[0].id,o.id);
 p=(await a.call('/admin/products')).find(x=>x.id===p.id);p.active=false;await a.call('/admin/products/'+p.id,'PUT',p);assert.ok(!(await c.call('/products')).some(x=>x.id===p.id));await c.call('/cart','PUT',{items:[{variant_id:v.id,qty:1}]},409);
 const created=await a.call('/admin/products','POST',{...p,id:undefined,active:true,name:'Áo mới',variants:[{color:'Xanh',size:'M',stock:3,hex:'#123456',img:'https://example.com/a.jpg'}]},201);assert.ok(created.id);assert.equal(created.variants[0].stock,3);
});
test('locking a customer revokes sessions and prevents login',async t=>{
 const {client}=await fixture(t);const c=client(),a=client();const {user}=await c.register();await a.login();await a.call('/admin/customers/'+user.id,'PATCH',{active:false});assert.equal((await c.call('/me')).user,null);await c.call('/auth/login','POST',{email:user.email,password:'Buyer-password-2026'},401);await a.call('/admin/customers/'+user.id,'PATCH',{active:true});await c.call('/auth/login','POST',{email:user.email,password:'Buyer-password-2026'});
});
test('data and sessions persist when the server is reopened',async t=>{
 const {app,client,dir}=await fixture(t);const c=client();await c.register();const v=(await c.call('/products'))[0].variants[0];await add(c,v.id);await c.call('/orders','POST',checkout(),201);
 const second=createApp({dbPath:join(dir,'test.sqlite')});try{assert.equal(second.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,1);assert.ok(second.db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n>0);assert.equal(second.db.prepare('SELECT stock FROM variants WHERE id=?').get(v.id).stock,19);}finally{second.close();}
 assert.equal(app.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
});
test('footer support links are consistent in static and backend storefronts',async t=>{
 const paths=['size','loyalty','orders','faq','shipping','returns','warranty','privacy'];
 for(const file of ['../index.html','../public/index.html']){
  const html=readFileSync(new URL(file,import.meta.url),'utf8'),footer=html.slice(html.indexOf('<footer'),html.indexOf('</footer>'));
  for(const path of paths)assert.ok(footer.includes('href="#support-'+path+'" data-support="'+path+'"'));
  assert.ok(!footer.includes('href="#catalog-section"'));assert.match(footer,/WELCOME50/);
 }
 const {base}=await fixture(t);
 for(const path of ['/support.js','/support.css'])assert.equal((await fetch(base+path)).status,200);
});

test('invalid cart payload and changed price quote are rejected without creating orders',async t=>{
 const {client,app}=await fixture(t);const c=client();await c.register();await c.call('/cart','PUT',{items:[null]},400);const v=(await c.call('/products'))[0].variants[0];const cart=await add(c,v.id);app.db.prepare('UPDATE products SET price=price+1000 WHERE id=?').run(v.product_id);
 await c.call('/orders','POST',{...checkout(),quote:cart.quote},409);assert.equal((await c.call('/orders')).length,0);assert.equal((await c.call('/cart')).items.length,1);
 const fresh=await c.call('/cart');await c.call('/orders','POST',{...checkout(),quote:fresh.quote},201);
});

test('staff can process and ship orders but cannot access admin-only resources or payments',async t=>{
 const {client,app}=await fixture(t);const admin=client(),staff=client(),buyer=client();await admin.login();const {user}=await staff.register('staff@example.test');await buyer.register('customer@example.test');
 await admin.call('/admin/users/'+user.id,'PATCH',{role:'staff'});
 // Granting access revokes the prior customer session, then a fresh sign-in gets staff access.
 assert.equal((await staff.call('/me')).user,null);
 await staff.call('/auth/login','POST',{email:user.email,password:'Buyer-password-2026'});
 assert.equal((await staff.call('/me')).user.role,'staff');
 const variant=(await buyer.call('/products'))[0].variants[0];await add(buyer,variant.id);const o=await buyer.call('/orders','POST',checkout(),201);
 assert.equal((await staff.call('/admin/orders'))[0].id,o.id);
 const path='/admin/orders/'+o.id;
 for(const status of ['confirmed','preparing'])await staff.call(path+'/status','PATCH',{status});
 await staff.call(path+'/status','PATCH',{status:'shipping',carrier:'GHN',tracking:'STAFF-001'});
 await staff.call(path+'/status','PATCH',{status:'delivered'});
 for(const p of ['/admin/users','/admin/customers','/admin/reports'])await staff.call(p,'GET',undefined,403);
 assert.ok((await staff.call('/admin/products')).length>0);
 await staff.call('/admin/users/'+user.id,'PATCH',{role:'admin'},403);
 await staff.call('/admin/customers/'+user.id,'PATCH',{active:false},403);
 await staff.call('/admin/products','POST',{},400);
 await staff.call('/admin/products/1','PUT',{},403);
 await staff.call(path+'/payment','PATCH',{status:'paid',reference:'STAFF-COD-001'},403);
 await admin.call(path+'/payment','PATCH',{status:'paid',reference:'ADMIN-COD-001'});
 // A refund-ready order remains protected even when the staff calls the API directly.
 app.db.prepare("UPDATE orders SET payment_status='refund_pending' WHERE id=?").run(o.id);
 await staff.call(path+'/payment','PATCH',{status:'refunded',reference:'STAFF-REFUND-001'},403);
 assert.equal(app.db.prepare('SELECT payment_status FROM orders WHERE id=?').get(o.id).payment_status,'refund_pending');
 await admin.call(path+'/payment','PATCH',{status:'refunded',reference:'ADMIN-REFUND-001'});
 assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM audit WHERE actor=? AND action='order.shipping'").get(user.id).n,1);
});

test('only admins manage roles; demotion and locking immediately revoke staff sessions',async t=>{
 const {client}=await fixture(t);const admin=client(),staff=client(),buyer=client();await admin.login();const {user}=await staff.register('staff@example.test');const buyerUser=(await buyer.register('buyer@example.test')).user;
 const users=await admin.call('/admin/users');assert.ok(users.every(u=>!('password'in u)));const administrator=users.find(u=>u.role==='admin');
 await buyer.call('/admin/users/'+buyerUser.id,'PATCH',{role:'admin'},403);
 await admin.call('/admin/users/'+user.id,'PATCH',{role:'superuser'},400);
 await admin.call('/admin/users/'+administrator.id,'PATCH',{role:'staff'},409);
 await admin.call('/admin/users/'+administrator.id,'PATCH',{active:false},409);
 await admin.call('/admin/users/'+user.id,'PATCH',{role:'staff'});await staff.call('/me');await staff.call('/auth/login','POST',{email:user.email,password:'Buyer-password-2026'});
 await admin.call('/admin/users/'+user.id,'PATCH',{role:'customer'});await staff.call('/admin/orders','GET',undefined,401);await staff.call('/me');await staff.call('/auth/login','POST',{email:user.email,password:'Buyer-password-2026'});await staff.call('/admin/orders','GET',undefined,403);
 await admin.call('/admin/users/'+user.id,'PATCH',{role:'staff',active:false});await staff.call('/me');await staff.call('/auth/login','POST',{email:user.email,password:'Buyer-password-2026'},401);
 await admin.call('/admin/users/'+user.id,'PATCH',{active:true});await staff.call('/auth/login','POST',{email:user.email,password:'Buyer-password-2026'});await staff.call('/admin/orders');
});

test('public registration and profile cannot grant staff or admin roles',async t=>{
 const {client}=await fixture(t);const c=client();await c.call('/me');const result=await c.call('/auth/register','POST',{name:'Khách thử',email:'self-promote@example.test',password:'Buyer-password-2026',role:'staff'});assert.equal(result.user.role,'customer');await c.call('/profile','PATCH',{name:'Tên mới',phone:'',address:'',role:'admin'});assert.equal((await c.call('/me')).user.role,'customer');await c.call('/admin/users','GET',undefined,403);
});

test('legacy database migration preserves users, passwords, orders, sessions and foreign keys',()=>{
 const dir=mkdtempSync(join(tmpdir(),'mocvai-migrate-')),dbPath=join(dir,'legacy.sqlite');let app;
 try {
  const db=new DatabaseSync(dbPath);const schema=readFileSync(new URL('../schema.sql',import.meta.url),'utf8').replace("'customer','staff','admin'","'customer','admin'");db.exec(schema);
  const password=passwordHash('Legacy-password-2026');db.prepare('INSERT INTO users(id,email,name,password,role) VALUES(?,?,?,?,?)').run(7,'legacy-admin@example.test','Admin cũ',password,'admin');db.prepare('INSERT INTO users(id,email,name,password,role) VALUES(?,?,?,?,?)').run(8,'legacy-customer@example.test','Khách cũ',password,'customer');
  db.prepare('INSERT INTO sessions(token,csrf,user_id,expires) VALUES(?,?,?,?)').run('legacy-session','legacy-csrf',7,Date.now()+86400000);
  db.exec("INSERT INTO orders(id,user_id,request_key,receiver,phone,address,subtotal,shipping,discount,total,method,created_at) VALUES('MVLEGACY01',8,'legacy-order-request','Khách cũ','0901234567','Địa chỉ cũ',1000,0,0,1000,'cod','2026-11-21T00:00:00Z'); INSERT INTO order_history(order_id,status,note,actor,created_at) VALUES('MVLEGACY01','pending','Lịch sử cũ',7,'2026-11-21T00:00:00Z'); INSERT INTO audit(actor,action,target,created_at) VALUES(7,'legacy.action','MVLEGACY01','2026-11-21T00:00:00Z');");db.close();
  app=createApp({dbPath});assert.equal(app.db.prepare('SELECT password FROM users WHERE id=7').get().password,password);assert.equal(app.db.prepare('SELECT user_id FROM orders').get().user_id,8);assert.equal(app.db.prepare('SELECT actor FROM order_history').get().actor,7);assert.equal(app.db.prepare('SELECT user_id FROM sessions').get().user_id,7);assert.equal(app.db.prepare('SELECT actor FROM audit').get().actor,7);
  app.db.prepare("UPDATE users SET role='staff' WHERE id=8").run();assert.equal(app.db.prepare('PRAGMA foreign_keys').get().foreign_keys,1);assert.deepEqual(app.db.prepare('PRAGMA foreign_key_check').all(),[]);app.close();app=createApp({dbPath});assert.equal(app.db.prepare('SELECT role FROM users WHERE id=8').get().role,'staff');assert.equal(app.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
 } finally {app?.close();rmSync(dir,{recursive:true,force:true});}
});

test('checkout requires an authenticated account, including after logout or session expiry',async t=>{
 const {client,app}=await fixture(t);const c=client();await c.call('/me');const v=(await c.call('/products'))[0].variants[0];await add(c,v.id);
 await c.call('/orders','POST',{...checkout(),user_id:1,email:ADMIN.email},401);await c.call('/loyalty','GET',undefined,401);assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n,0);assert.equal(app.db.prepare('SELECT stock FROM variants WHERE id=?').get(v.id).stock,v.stock);
 await c.register();await c.call('/auth/logout','POST',{});await c.call('/orders','POST',checkout(),401);await c.call('/auth/login','POST',{email:'buyer@example.test',password:'Buyer-password-2026'});app.db.prepare('UPDATE sessions SET expires=0').run();assert.equal((await c.call('/me')).user,null);await c.call('/orders','POST',checkout(),401);
});

test('delivered orders award points once to their owner, after discount and excluding shipping',async t=>{
 const {client,app}=await fixture(t);const admin=client(),c=client(),other=client();await admin.login();const {user}=await c.register();await other.register('other@example.test');const p=(await c.call('/products'))[0],v=p.variants[0];await add(c,v.id);await c.call('/cart/promo','POST',{code:'WELCOME50'});const o=await c.call('/orders','POST',checkout(),201);
 assert.equal((await c.call('/loyalty')).balance,0);assert.equal(o.pointsAwarded,false);
 await admin.call('/admin/orders/'+o.id+'/status','PATCH',{status:'confirmed'});assert.equal((await c.call('/loyalty')).history.length,0);
 await admin.call('/admin/orders/'+o.id+'/status','PATCH',{status:'preparing'});await admin.call('/admin/orders/'+o.id+'/status','PATCH',{status:'shipping',carrier:'GHN',tracking:'POINTS-001'});assert.equal((await c.call('/loyalty')).balance,0);
 const done=await admin.call('/admin/orders/'+o.id+'/status','PATCH',{status:'delivered'});const expected=Math.floor((p.price-50000)/10000);assert.equal(done.earnedPoints,expected);assert.equal(done.payment_status,'unpaid');assert.equal(done.pointsAwarded,true);const points=await c.call('/loyalty');assert.equal(points.balance,expected);assert.equal(points.history[0].eligible_amount,p.price-50000);assert.equal(points.history[0].order_id,o.id);assert.equal((await c.call('/me')).user.loyaltyPoints,expected);
 await admin.call('/admin/orders/'+o.id+'/status','PATCH',{status:'delivered'},409);await admin.call('/admin/orders/'+o.id+'/payment','PATCH',{status:'paid',reference:'COD-POINTS-001'});await c.call('/orders','POST',checkout());assert.equal((await c.call('/loyalty')).history.length,1);assert.equal((await c.call('/loyalty')).balance,expected);
 assert.equal((await other.call('/loyalty?user_id='+user.id)).balance,0);assert.deepEqual((await other.call('/loyalty')).history,[]);await c.call('/profile','PATCH',{name:'Khách hàng',phone:'',address:'',loyaltyPoints:999999});assert.equal((await c.call('/me')).user.loyaltyPoints,expected);assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM loyalty_points').get().n,1);
});

test('cancelled orders earn no points; each delivered order rounds down including zero-point orders',async t=>{
 const {client,app}=await fixture(t);const admin=client(),c=client();await admin.login();await c.register();const p=(await c.call('/products'))[0],v=p.variants[0];await add(c,v.id);const cancelled=await c.call('/orders','POST',checkout('request-points-cancel-0001'),201);await c.call('/orders/'+cancelled.id+'/cancel','POST',{});assert.equal((await c.call('/loyalty')).balance,0);
 for(const [index,price]of [9999,10000].entries()){
  app.db.prepare('UPDATE products SET price=? WHERE id=?').run(price,p.id);await add(c,v.id);const o=await c.call('/orders','POST',checkout('request-points-boundary-'+index),201);await deliver(admin,o.id);
 }
 const result=await c.call('/loyalty');assert.equal(result.balance,1);assert.equal(result.history.length,2);assert.deepEqual(result.history.map(h=>h.points).sort(),[0,1]);assert.ok(!result.history.some(h=>h.order_id===cancelled.id));
});

test('upgrade backfills older delivered orders once and point history persists on reopening',async t=>{
 const {client,app,dir}=await fixture(t);const c=client();const {user}=await c.register();const v=(await c.call('/products'))[0].variants[0];await add(c,v.id);const o=await c.call('/orders','POST',checkout(),201);
 // Mimic an older database which predates the loyalty ledger.
 app.db.prepare("UPDATE orders SET status='delivered' WHERE id=?").run(o.id);app.db.exec('DROP TABLE loyalty_points');
 for(let i=0;i<2;i++){
  const reopened=createApp({dbPath:join(dir,'test.sqlite')});try{assert.equal(reopened.db.prepare('SELECT COUNT(*) AS n FROM loyalty_points WHERE user_id=?').get(user.id).n,1);assert.equal(reopened.db.prepare('SELECT points FROM loyalty_points WHERE order_id=?').get(o.id).points,Math.floor(o.subtotal/10000));assert.deepEqual(reopened.db.prepare('PRAGMA foreign_key_check').all(),[]);}finally{reopened.close();}
 }
 assert.equal((await c.call('/loyalty')).history.length,1);
});

test('shipping is free for TP.HCM or pickup, and 30000 outside regardless of order value',async t=>{
 const {client}=await fixture(t);const c=client();await c.register();const p=(await c.call('/products')).find(p=>p.price>=300000),v=p.variants[0];await add(c,v.id,2);
 let cart=await c.call('/cart/fulfillment','POST',{fulfillment:'delivery',province:'Hà Nội'});assert.equal(cart.shipping,30000);assert.equal(cart.shippingPending,false);
 const outside=await c.call('/orders','POST',{...checkout('request-outside-shipping-001'),province:'Hà Nội',shipping:0,total:1,quote:cart.quote},201);assert.equal(outside.shipping,30000);assert.equal(outside.total,p.price*2+30000);assert.equal(outside.province,'Hà Nội');
 await add(c,v.id);cart=await c.call('/cart/fulfillment','POST',{fulfillment:'delivery',province:'TP.HCM'});assert.equal(cart.shipping,0);const local=await c.call('/orders','POST',{...checkout('request-local-shipping-001'),quote:cart.quote},201);assert.equal(local.shipping,0);
 await add(c,v.id);cart=await c.call('/cart/fulfillment','POST',{fulfillment:'pickup',province:'Hà Nội'});assert.equal(cart.shipping,0);assert.equal(cart.province,'TP.HCM');
 const pickup=await c.call('/orders','POST',{...checkout('request-pickup-shipping-001'),address:'',fulfillment:'pickup',province:'Hà Nội',quote:cart.quote},201);assert.equal(pickup.shipping,0);assert.equal(pickup.address,'970 Quang Trung, TP.HCM');assert.equal(pickup.fulfillment,'pickup');assert.equal(pickup.store_address,'970 Quang Trung, TP.HCM');
});

test('shipping requires a valid destination, rejects stale quotes, and guest preferences survive login',async t=>{
 const {client}=await fixture(t);const c=client();await c.call('/me');const v=(await c.call('/products'))[0].variants[0];await c.call('/cart','PUT',{items:[{variant_id:v.id,qty:1}]});assert.equal((await c.call('/cart')).shippingPending,true);
 const guest=await c.call('/cart/fulfillment','POST',{fulfillment:'delivery',province:'Hà Nội'});await c.register();assert.equal((await c.call('/cart')).province,'Hà Nội');assert.equal((await c.call('/cart')).shipping,30000);
 await c.call('/cart/fulfillment','POST',{fulfillment:'delivery',province:'Không có tỉnh này'},400);
 await c.call('/cart/fulfillment','POST',{fulfillment:'fake',province:'TP.HCM'},400);
 await c.call('/orders','POST',{...checkout(),province:''},400);
 await c.call('/cart/fulfillment','POST',{fulfillment:'delivery',province:'TP.HCM'});
 await c.call('/orders','POST',{...checkout(),quote:guest.quote},409);
});

test('pickup follows ready then received, without a carrier; points only accrue on receipt',async t=>{
 const {client}=await fixture(t);const c=client(),a=client();await c.register();await a.login();const v=(await c.call('/products'))[0].variants[0];await add(c,v.id);await c.call('/cart/fulfillment','POST',{fulfillment:'pickup'});const o=await c.call('/orders','POST',{...checkout(),fulfillment:'pickup'},201),path='/admin/orders/'+o.id+'/status';
 await a.call(path,'PATCH',{status:'confirmed'});await a.call(path,'PATCH',{status:'preparing'});await a.call(path,'PATCH',{status:'shipping'},409);await a.call(path,'PATCH',{status:'delivered'},409);const ready=await a.call(path,'PATCH',{status:'ready'});assert.equal(ready.carrier,'');assert.equal((await c.call('/loyalty')).balance,0);const received=await a.call(path,'PATCH',{status:'delivered'});assert.equal(received.statusLabel,'Đã nhận tại cửa hàng');assert.ok(received.earnedPoints>0);assert.equal(received.shipping,0);
});

test('staff can add products and print bills, but cannot edit products, buy, or read reports',async t=>{
 const {client}=await fixture(t);const a=client(),s=client(),c=client(),guest=client();await a.login();const {user}=await s.register('staff-new@example.test');await c.register();await a.call('/admin/users/'+user.id,'PATCH',{role:'staff'});await s.call('/me');await s.call('/auth/login','POST',{email:user.email,password:'Buyer-password-2026'});
 const original=(await s.call('/admin/products'))[0];const created=await s.call('/admin/products','POST',{...original,name:'Sản phẩm do nhân viên thêm',variants:[{color:'Xanh',size:'M',hex:'#123456',img:'https://example.com/product.jpg',stock:5}]},201);assert.ok(created.id);await s.call('/admin/products/'+created.id,'PUT',created,403);await c.call('/admin/products','POST',created,403);await s.call('/admin/reports','GET',undefined,403);await c.call('/admin/reports','GET',undefined,403);
 for(const operator of [a,s]){await operator.call('/cart','PUT',{items:[]},403);await operator.call('/cart/promo','POST',{code:'WELCOME50'},403);await operator.call('/cart/fulfillment','POST',{fulfillment:'pickup'},403);await operator.call('/orders','POST',checkout(),403);}
 await add(c,created.variants[0].id,2);const o=await c.call('/orders','POST',checkout(),201);const bill=await s.call('/admin/orders/'+o.id+'/invoice');assert.equal(bill.order.total,o.total);assert.equal(bill.order.items[0].qty,2);assert.equal(bill.storeAddress,'970 Quang Trung, TP.HCM');await a.call('/admin/orders/'+o.id+'/invoice');await c.call('/admin/orders/'+o.id+'/invoice','GET',undefined,403);await guest.call('/me');await guest.call('/admin/orders/'+o.id+'/invoice','GET',undefined,401);
});

test('reports summarize receipts, refunds, growth and local-day boundaries without counting unpaid orders as revenue',async t=>{
 const old=process.env.BANK_DETAILS;process.env.BANK_DETAILS='Ngân hàng kiểm thử';t.after(()=>{if(old===undefined)delete process.env.BANK_DETAILS;else process.env.BANK_DETAILS=old;});
 const {client,app}=await fixture(t);const a=client(),c=client();await a.login();const {user}=await c.register();const v=(await c.call('/products'))[0].variants[0];const paid=[];
 for(let i=0;i<2;i++){await add(c,v.id);const o=await c.call('/orders','POST',checkout('request-report-paid-'+i),201);await deliver(a,o.id);await a.call('/admin/orders/'+o.id+'/payment','PATCH',{status:'paid',reference:'REPORT-PAID-'+i});paid.push(o);}
 await add(c,v.id);const refunded=await c.call('/orders','POST',checkout('request-report-refund-001','bank_transfer'),201);await a.call('/admin/orders/'+refunded.id+'/payment','PATCH',{status:'paid',reference:'REPORT-BANK-001'});await c.call('/orders/'+refunded.id+'/cancel','POST',{});await a.call('/admin/orders/'+refunded.id+'/payment','PATCH',{status:'refunded',reference:'REPORT-REFUND-001'});
 await add(c,v.id);const unpaid=await c.call('/orders','POST',checkout('request-report-unpaid-001'),201);
 app.db.prepare('UPDATE orders SET created_at=? WHERE id=?').run('2026-11-20T01:00:00Z',paid[0].id);for(const o of [paid[1],refunded,unpaid])app.db.prepare('UPDATE orders SET created_at=? WHERE id=?').run('2026-11-21T17:00:00Z',o.id);
 app.db.prepare("UPDATE payment_events SET created_at=? WHERE order_id=? AND status='paid'").run('2026-11-19T17:00:00Z',paid[0].id);app.db.prepare("UPDATE payment_events SET created_at=? WHERE order_id=? AND status='paid'").run('2026-11-21T17:00:00Z',paid[1].id);app.db.prepare("UPDATE payment_events SET created_at=? WHERE order_id=? AND status='paid'").run('2026-11-20T17:00:00Z',refunded.id);app.db.prepare("UPDATE payment_events SET created_at=? WHERE order_id=? AND status='refunded'").run('2026-11-22T17:00:00Z',refunded.id);
 app.db.prepare("UPDATE order_history SET created_at=? WHERE order_id=? AND status='delivered'").run('2026-11-20T01:00:00Z',paid[0].id);app.db.prepare("UPDATE order_history SET created_at=? WHERE order_id=? AND status='delivered'").run('2026-11-21T17:00:00Z',paid[1].id);app.db.prepare('UPDATE users SET created_at=? WHERE id=?').run('2026-11-21T17:00:00Z',user.id);
 const report=await a.call('/admin/reports?from=2026-11-22&to=2026-11-23');assert.equal(report.current.collected,paid[1].total);assert.equal(report.current.refunded,refunded.total);assert.equal(report.current.netRevenue,0);assert.equal(report.totals.netRevenue,paid[0].total+paid[1].total);assert.equal(report.current.orderCount,3);assert.equal(report.current.newCustomers,1);assert.equal(report.growth.revenuePercent,-100);assert.equal(report.growth.ordersPercent,200);assert.equal(report.series[0].netRevenue,paid[1].total);assert.equal(report.series[1].netRevenue,-refunded.total);assert.equal(report.topProducts[0].units,1);
 const monthly=await a.call('/admin/reports?from=2026-01-01&to=2026-12-31');assert.equal(monthly.grouping,'month');assert.equal(monthly.series.length,12);await a.call('/admin/reports?from=2026-02-30&to=2026-03-01','GET',undefined,400);await a.call('/admin/reports?from=2025-01-01&to=2026-12-31','GET',undefined,400);
});

test('fulfillment migration preserves historical shipping totals and existing carts',()=>{
 const dir=mkdtempSync(join(tmpdir(),'mocvai-shipping-')),dbPath=join(dir,'legacy.sqlite');let app;
 try{
  const db=new DatabaseSync(dbPath);let schema=readFileSync(new URL('../schema.sql',import.meta.url),'utf8');schema=schema.replace("CREATE TABLE IF NOT EXISTS cart_meta (owner TEXT PRIMARY KEY, promo TEXT NOT NULL DEFAULT '', fulfillment TEXT NOT NULL DEFAULT 'delivery', province TEXT NOT NULL DEFAULT '');","CREATE TABLE IF NOT EXISTS cart_meta (owner TEXT PRIMARY KEY, promo TEXT NOT NULL DEFAULT '');");schema=schema.replace(" fulfillment TEXT NOT NULL DEFAULT 'delivery', province TEXT NOT NULL DEFAULT '', store_address TEXT NOT NULL DEFAULT '',\n",'');db.exec(schema);
  db.prepare('INSERT INTO users(id,email,name,password) VALUES(?,?,?,?)').run(1,'old@example.test','Khách cũ',passwordHash('Old-password-2026'));db.exec("INSERT INTO orders(id,user_id,request_key,receiver,phone,address,subtotal,shipping,discount,total,method,created_at) VALUES('MVOLD01',1,'old-order-request','Khách cũ','0901234567','Địa chỉ cũ',100000,70000,0,170000,'cod','2026-11-21T00:00:00Z'); INSERT INTO cart_meta(owner,promo) VALUES('u:1','WELCOME50');");db.close();
  app=createApp({dbPath});const o=app.db.prepare('SELECT * FROM orders').get();assert.equal(o.shipping,70000);assert.equal(o.total,170000);assert.equal(o.fulfillment,'delivery');assert.equal(app.db.prepare('SELECT promo FROM cart_meta').get().promo,'WELCOME50');assert.deepEqual(app.db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{app?.close();rmSync(dir,{recursive:true,force:true});}
});

test('only admins can inspect inventory costs and create, confirm or cancel receipts',async t=>{
 const {client,app}=await fixture(t);const admin=client(),staff=client(),buyer=client(),guest=client();await admin.login();const {user}=await staff.register('inventory-staff@example.test');await buyer.register();await admin.call('/admin/users/'+user.id,'PATCH',{role:'staff'});await staff.call('/me');await staff.call('/auth/login','POST',{email:user.email,password:'Buyer-password-2026'});await guest.call('/me');
 const v=(await admin.call('/admin/inventory')).stock[0],body=intake([{variant_id:v.id,qty:2,unit_cost:100000}]),r=await admin.call('/admin/inventory/receipts','POST',body,201);
 for(const [c,status]of [[staff,403],[buyer,403],[guest,401]]){
  await c.call('/admin/inventory','GET',undefined,status);await c.call('/admin/inventory/receipts/'+r.id,'GET',undefined,status);await c.call('/admin/inventory/receipts','POST',body,status);await c.call('/admin/inventory/receipts/'+r.id+'/confirm','POST',{},status);await c.call('/admin/inventory/receipts/'+r.id+'/cancel','POST',{},status);
 }
 assert.equal(app.db.prepare('SELECT stock FROM variants WHERE id=?').get(v.id).stock,v.stock);
});

test('draft receipts do not change stock; confirmation is atomic and idempotent',async t=>{
 const {client,app}=await fixture(t);const a=client();await a.login();const p=(await a.call('/admin/products'))[0],[v1,v2]=p.variants;
 const body=intake([{variant_id:v1.id,qty:5,unit_cost:100000},{variant_id:v2.id,qty:3,unit_cost:80000}]);const r=await a.call('/admin/inventory/receipts','POST',{...body,total:1,status:'received'},201);assert.equal(r.status,'draft');assert.equal(r.total,740000);assert.equal(r.quantity,8);assert.equal(app.db.prepare('SELECT stock FROM variants WHERE id=?').get(v1.id).stock,v1.stock);
 assert.equal((await a.call('/admin/inventory')).summary.receiptCount,0);assert.equal((await a.call('/admin/inventory/receipts','POST',body)).id,r.id);
 const done=await a.call('/admin/inventory/receipts/'+r.id+'/confirm','POST',{});assert.equal(done.status,'received');assert.ok(done.confirmed_at);await a.call('/admin/inventory/receipts/'+r.id+'/confirm','POST',{});await a.call('/admin/inventory/receipts/'+r.id+'/cancel','POST',{},409);
 assert.equal(app.db.prepare('SELECT stock FROM variants WHERE id=?').get(v1.id).stock,v1.stock+5);assert.equal(app.db.prepare('SELECT stock FROM variants WHERE id=?').get(v2.id).stock,v2.stock+3);assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM stock_movements WHERE kind='receipt' AND reference=?").get(r.id).n,2);assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM audit WHERE action='inventory.receive' AND target=?").get(r.id).n,1);
 await a.call('/admin/products/'+p.id,'PUT',p,409);assert.equal((await a.call('/admin/inventory')).summary.receivedValue,740000);
});

test('cancelled drafts never affect stock and cannot be confirmed',async t=>{
 const {client,app}=await fixture(t);const a=client();await a.login();const v=(await a.call('/admin/inventory')).stock[0];const r=await a.call('/admin/inventory/receipts','POST',intake([{variant_id:v.id,qty:9,unit_cost:1000}]),201);
 await a.call('/admin/inventory/receipts/'+r.id+'/cancel','POST',{});await a.call('/admin/inventory/receipts/'+r.id+'/cancel','POST',{});await a.call('/admin/inventory/receipts/'+r.id+'/confirm','POST',{},409);assert.equal(app.db.prepare('SELECT stock FROM variants WHERE id=?').get(v.id).stock,v.stock);const report=await a.call('/admin/inventory');assert.equal(report.summary.receivedQuantity,0);assert.equal(report.summary.receivedValue,0);assert.equal(report.receipts[0].status,'cancelled');
});

test('invalid receipt lines and totals are rejected before saving any draft',async t=>{
 const {client,app}=await fixture(t);const a=client();await a.login();const v=(await a.call('/admin/inventory')).stock[0],line={variant_id:v.id,qty:1,unit_cost:1000};
 for(const items of [[],[null],[{...line,qty:0}],[{...line,qty:-1}],[{...line,qty:1.5}],[{...line,unit_cost:-1}],[{...line,unit_cost:100000001}],[line,line],[{...line,qty:100000,unit_cost:100000000}]])await a.call('/admin/inventory/receipts','POST',intake(items),400);
 await a.call('/admin/inventory/receipts','POST',intake([{...line,variant_id:9999999}]),404);assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM inventory_receipts').get().n,0);
});

test('a failing receipt line rolls back every stock and movement change',async t=>{
 const {client,app}=await fixture(t);const a=client();await a.login();const [v1,v2]=(await a.call('/admin/inventory')).stock;app.db.prepare('UPDATE variants SET stock=99999 WHERE id=?').run(v2.id);
 const r=await a.call('/admin/inventory/receipts','POST',intake([{variant_id:v1.id,qty:4,unit_cost:1000},{variant_id:v2.id,qty:2,unit_cost:1000}]),201);await a.call('/admin/inventory/receipts/'+r.id+'/confirm','POST',{},409);assert.equal(app.db.prepare('SELECT stock FROM variants WHERE id=?').get(v1.id).stock,v1.stock);assert.equal(app.db.prepare('SELECT stock FROM variants WHERE id=?').get(v2.id).stock,99999);assert.equal((await a.call('/admin/inventory/receipts/'+r.id)).status,'draft');assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM stock_movements WHERE reference=?").get(r.id).n,0);
 app.db.prepare('UPDATE variants SET stock=99998 WHERE id=?').run(v2.id);await a.call('/admin/inventory/receipts/'+r.id+'/confirm','POST',{});assert.equal(app.db.prepare('SELECT stock FROM variants WHERE id=?').get(v2.id).stock,100000);
});

test('intake reports use confirmation date and warehouse movements explain holds, cancellations and adjustments',async t=>{
 const {client,app,dir}=await fixture(t);const a=client(),c=client();await a.login();await c.register();const v=(await a.call('/admin/inventory')).stock[0];const r=await a.call('/admin/inventory/receipts','POST',intake([{variant_id:v.id,qty:5,unit_cost:120000}]),201);await a.call('/admin/inventory/receipts/'+r.id+'/confirm','POST',{});app.db.prepare('UPDATE inventory_receipts SET created_at=?,confirmed_at=? WHERE id=?').run('2026-11-20T00:00:00Z','2026-11-21T17:00:00Z',r.id);
 const report=await a.call('/admin/inventory?from=2026-11-22&to=2026-11-22');assert.equal(report.summary.receivedQuantity,5);assert.equal(report.summary.receivedValue,600000);assert.equal(report.suppliers[0].value,600000);assert.equal(report.series[0].period,'2026-11-22');assert.equal((await a.call('/admin/inventory?from=2026-11-20&to=2026-11-20')).summary.receiptCount,0);
 await add(c,v.id,2);const o=await c.call('/orders','POST',checkout(),201);let current=(await a.call('/admin/inventory')).stock.find(row=>row.id===v.id);assert.equal(current.reserved,2);assert.equal(current.stock,v.stock+3);assert.equal(current.onHand,v.stock+5);await c.call('/orders/'+o.id+'/cancel','POST',{});current=(await a.call('/admin/inventory')).stock.find(row=>row.id===v.id);assert.equal(current.reserved,0);assert.equal(current.stock,v.stock+5);
 const p=(await a.call('/admin/products')).find(p=>p.id===v.product_id);p.variants=p.variants.filter(v=>v.active);p.variants.find(row=>row.id===v.id).stock++;await a.call('/admin/products/'+p.id,'PUT',p);assert.equal(app.db.prepare('SELECT SUM(delta) AS n FROM stock_movements WHERE variant_id=?').get(v.id).n,v.stock+6);
 assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM stock_movements WHERE variant_id=? AND kind='order_reserve'").get(v.id).n,1);assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM stock_movements WHERE variant_id=? AND kind='order_cancel'").get(v.id).n,1);assert.equal(app.db.prepare("SELECT COUNT(*) AS n FROM stock_movements WHERE variant_id=? AND kind='adjustment'").get(v.id).n,1);
 const before=app.db.prepare('SELECT COUNT(*) AS n FROM stock_movements').get().n,reopened=createApp({dbPath:join(dir,'test.sqlite')});try{assert.equal(reopened.db.prepare('SELECT COUNT(*) AS n FROM stock_movements').get().n,before);assert.equal(reopened.db.prepare('SELECT stock FROM variants WHERE id=?').get(v.id).stock,v.stock+6);assert.deepEqual(reopened.db.prepare('PRAGMA foreign_key_check').all(),[]);}finally{reopened.close();}
});

test('upgrading an older warehouse records current opening stock without inventing receipts',async t=>{
 const {app,dir}=await fixture(t);const v=app.db.prepare('SELECT id FROM variants LIMIT 1').get();app.db.prepare('UPDATE variants SET stock=7 WHERE id=?').run(v.id);app.db.exec('DROP TABLE stock_movements');
 const reopened=createApp({dbPath:join(dir,'test.sqlite')});try{const row=reopened.db.prepare('SELECT * FROM stock_movements WHERE variant_id=?').get(v.id);assert.equal(row.kind,'opening');assert.equal(row.delta,7);assert.equal(row.stock_after,7);assert.equal(reopened.db.prepare('SELECT COUNT(*) AS n FROM inventory_receipts').get().n,0);assert.equal(reopened.db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');}finally{reopened.close();}
});


test('separate customer and staff login portals enforce existing roles without granting privileges',async t=>{
 const {client,app}=await fixture(t);const c=client(),a=client(),staff=client(),guest=client();
 await c.register();await c.call('/auth/logout','POST',{});
 await c.call('/auth/login','POST',{email:'buyer@example.test',password:'Buyer-password-2026',portal:'staff'},403);
 assert.equal((await c.call('/me')).user,null);
 const buyer=await c.call('/auth/login','POST',{email:'buyer@example.test',password:'Buyer-password-2026',portal:'customer'});assert.equal(buyer.user.role,'customer');
 await a.call('/me');await a.call('/auth/login','POST',{...ADMIN,portal:'customer'},403);assert.equal((await a.call('/me')).user,null);
 assert.equal((await a.call('/auth/login','POST',{...ADMIN,portal:'staff'})).user.role,'admin');
 app.db.prepare("INSERT INTO users(email,name,password,role) VALUES(?,?,?,'staff')").run('portal-staff@example.test','Staff portal',passwordHash('Staff-password-2026'));
 await staff.call('/me');await staff.call('/auth/login','POST',{email:'portal-staff@example.test',password:'Staff-password-2026',portal:'staff'});
 await staff.call('/admin/orders');await staff.call('/admin/users','GET',undefined,403);
 await guest.call('/me');await guest.call('/auth/register','POST',{email:'forged-staff@example.test',password:'Buyer-password-2026',name:'Forged staff',portal:'staff',role:'admin'},403);
 assert.equal(app.db.prepare('SELECT id FROM users WHERE email=?').get('forged-staff@example.test'),undefined);
 await guest.call('/auth/login','POST',{...ADMIN,portal:'admin'},400);
 await guest.call('/auth/login','POST',{...ADMIN,password:'Wrong-password-2026',portal:'staff'},401);
 const reg=await guest.call('/auth/register','POST',{email:'portal-buyer@example.test',password:'Buyer-password-2026',name:'Khách mua hàng',portal:'customer',role:'admin'});assert.equal(reg.user.role,'customer');
});


test('static entry forwards local previews to the real app and account theme is served',async t=>{
 const source=readFileSync(new URL('../site-entry.js',import.meta.url),'utf8');
 for(const host of ['127.0.0.1','localhost']){
  let target;runInNewContext(source,{location:{hostname:host,port:'5500',search:'?demo=1',hash:'#top',replace:value=>target=value},document:{addEventListener(){throw new Error('Local preview must redirect before activating mock UI');}}});
  assert.equal(target,'http://'+host+':3000/?demo=1#top');
 }
 let ready=false;runInNewContext(source,{location:{hostname:'phucznghi.github.io',port:'',search:'',hash:'',replace(){throw new Error('Hosted preview must not redirect visitors to localhost');}},document:{addEventListener:event=>{assert.equal(event,'DOMContentLoaded');ready=true;}}});assert.equal(ready,true);
 assert.match(readFileSync(new URL('../index.html',import.meta.url),'utf8'),/src="\.\/site-entry.js"/);
 const {base}=await fixture(t);const css=await fetch(base+'/account.css');assert.equal(css.status,200);assert.match(await css.text(),/auth-brand/);
});


test('newsletter saves a valid email once and rejects invalid input',async t=>{
 const {client,app}=await fixture(t);const c=client();await c.call('/me');
 await c.call('/newsletter','POST',{email:'newsletter-demo@example.test'},201);
 await c.call('/newsletter','POST',{email:'newsletter-demo@example.test'},201);
 assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM subscribers WHERE email=?').get('newsletter-demo@example.test').n,1);
 await c.call('/newsletter','POST',{email:'not-an-email'},400);
 assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM subscribers').get().n,1);
});


test('Uniqlo catalog import archives only original samples and preserves old stock and history',()=>{
 const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
 try{
  db.prepare("INSERT INTO users(email,name,password,role) VALUES(?,?,?,'admin')").run('import-admin@example.test','Import admin',passwordHash('Admin-password-2026'));
  const old=JSON.parse(readFileSync(new URL('../legacy-seed.json',import.meta.url),'utf8'))[0];
  db.prepare('INSERT INTO products(id,name,price,metadata) VALUES(?,?,?,?)').run(old.id,old.name,old.price,JSON.stringify(old));
  const v=Number(db.prepare('INSERT INTO variants(product_id,color,size,hex,img,stock) VALUES(?,?,?,?,?,?)').run(old.id,'Xanh','M','#123456','https://example.com/old.jpg',7).lastInsertRowid);
  db.prepare('INSERT INTO products(name,price,metadata) VALUES(?,?,?)').run('Sản phẩm cửa hàng tự thêm',123000,'{}');
  assert.deepEqual(importUniqloCatalog(db),{added:12,archived:1});
  assert.equal(db.prepare('SELECT active FROM products WHERE id=?').get(old.id).active,0);
  assert.equal(db.prepare('SELECT stock FROM variants WHERE id=?').get(v).stock,7);
  assert.equal(db.prepare('SELECT active FROM products WHERE name=?').get('Sản phẩm cửa hàng tự thêm').active,1);
  const imported=db.prepare("SELECT * FROM products WHERE json_extract(metadata,'$.source.productCode') IS NOT NULL").all();assert.equal(imported.length,12);
  const first=db.prepare('SELECT id FROM variants WHERE product_id=?').get(imported[0].id);db.prepare('UPDATE variants SET stock=stock-1 WHERE id=?').run(first.id);
  const before=db.prepare('SELECT COUNT(*) AS n FROM stock_movements').get().n;
  assert.deepEqual(importUniqloCatalog(db),{added:0,archived:0});assert.equal(db.prepare('SELECT stock FROM variants WHERE id=?').get(first.id).stock,19);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM stock_movements').get().n,before);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
 }finally{db.close();}
});


test('Vietnamese search ignores accents, case, spacing and word order',()=>{
 assert.equal(normalizeText('  ÁO  ĐỎ  Đậm  '),'ao do dam');
 assert.equal(normalizeText('A\u0301o Đo\u0309'),'ao do');
 assert.equal(matchesSearch(['Áo Khoác','Xanh Navy','Nam'],'  NAVY ao  khoac '),true);
 assert.equal(matchesSearch(['Áo Thun','Đỏ đậm'],'ao do'),true);
 assert.equal(matchesSearch(['Áo Khoác','Xanh Navy'],'ao xanh do'),false);
 assert.equal(matchesSearch(['Nhà cung cấp Vải Xanh'],'nha cung cap'),true);
 assert.equal(matchesSearch(['Áo Thun'],'  '),true);
});

test('product names are unique across accents, case, spaces, staff/admin and hidden warehouse records',async t=>{
 const {client,app,base}=await fixture(t);const a=client(),staff=client();await a.login();
 app.db.prepare("INSERT INTO users(email,name,password,role) VALUES(?,?,?,'staff')").run('unique-staff@example.test','Nhân viên kiểm thử',passwordHash('Staff-password-2026'));
 await staff.call('/me');await staff.call('/auth/login','POST',{email:'unique-staff@example.test',password:'Staff-password-2026',portal:'staff'});
 const p=(await a.call('/admin/products'))[0],body={...p,variants:p.variants.filter(v=>v.active)};
 const before=app.db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
 for(const c of [a,staff])for(const name of [p.name,normalizeText(p.name).toUpperCase(),normalizeText(p.name).replaceAll(' ','  '),p.name.normalize('NFD')])await c.call('/admin/products','POST',{...body,name},409);
 assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM products').get().n,before);
 // A product remains the same inventory item even after it is hidden from sale.
 await a.call('/admin/products/'+p.id,'PUT',{...body,active:false});
 await staff.call('/admin/products','POST',{...body,name:normalizeText(p.name)},409);
 const another=(await a.call('/admin/products')).find(v=>v.id!==p.id);
 await a.call('/admin/products/'+another.id,'PUT',{...another,name:normalizeText(p.name)},409);
 assert.equal(app.db.prepare('SELECT name FROM products WHERE id=?').get(another.id).name,another.name);
 const current=(await a.call('/admin/products')).find(v=>v.id===p.id);
 await a.call('/admin/products/'+p.id,'PUT',{...current,name:p.name.toUpperCase()});
 assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM products').get().n,before);
 const unique=await staff.call('/admin/products','POST',{...body,name:'Sản phẩm hoàn toàn mới',variants:[{...body.variants[0],stock:0}]},201);
 assert.equal(unique.name,'Sản phẩm hoàn toàn mới');assert.equal(unique.variants[0].stock,0);
 // Both requests pass through one transaction; only the first insert can succeed.
 async function parallelSession(credentials){
  const initial=await fetch(base+'/api/me');let cookie=initial.headers.get('set-cookie').split(';')[0];const initialData=await initial.json();
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{cookie,'Content-Type':'application/json','X-CSRF-Token':initialData.csrf},body:JSON.stringify(credentials)});assert.equal(login.status,200);
  cookie=login.headers.get('set-cookie').split(';')[0];const data=await login.json();return {cookie,'Content-Type':'application/json','X-CSRF-Token':data.csrf};
 }
 const headers=await Promise.all([parallelSession(ADMIN),parallelSession({email:'unique-staff@example.test',password:'Staff-password-2026'})]);
 const results=await Promise.all(headers.map((h,i)=>fetch(base+'/api/admin/products',{method:'POST',headers:h,body:JSON.stringify({...body,name:i?'TEN CUNG LUC':'Tên cùng lúc'})})));
 assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
 assert.equal(app.db.prepare('SELECT name FROM products').all().filter(v=>normalizeText(v.name)==='ten cung luc').length,1);
});


test('catalog price update caps display prices and preserves orders, stock and accounts',async t=>{
 const {client,app}=await fixture(t);const buyer=client();await buyer.register();
 const p=(await buyer.call('/products'))[0],v=p.variants[0];app.db.prepare('UPDATE products SET price=588000 WHERE id=?').run(p.id);
 await add(buyer,v.id);const order=await buyer.call('/orders','POST',checkout('before-catalog-price-update'),201);assert.equal(order.total,588000);
 const stock=app.db.prepare('SELECT stock FROM variants WHERE id=?').get(v.id).stock,users=app.db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
 assert.deepEqual(updateCatalogPrices(app.db),{updated:1});assert.deepEqual(updateCatalogPrices(app.db),{updated:0});
 const catalog=await buyer.call('/products');assert.equal(catalog.length,12);assert.ok(catalog.every(x=>x.price<=400000&&x.badge==='Mới về'));
 assert.equal(app.db.prepare('SELECT stock FROM variants WHERE id=?').get(v.id).stock,stock);assert.equal(app.db.prepare('SELECT COUNT(*) AS n FROM users').get().n,users);
 const saved=(await buyer.call('/orders'))[0];assert.equal(saved.total,588000);assert.equal(saved.items[0].price,588000);
});
