import {initializeApp} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import {getAuth,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import {getFirestore,doc,collection,getDoc,getDocs,query,where,setDoc,updateDoc,runTransaction,writeBatch,serverTimestamp,Timestamp} from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js';
import {normalizeText} from '/text.js';
import {PROVINCES,selection,shippingFee,storeAddress} from '/firebase-shipping.js';
import {reportWindow,buildReport} from '/firebase-reports.js';
const STATUS={pending:'Chờ xác nhận',confirmed:'Đã xác nhận',preparing:'Đang chuẩn bị',ready:'Chờ nhận tại cửa hàng',shipping:'Đang giao',delivered:'Đã giao',cancelled:'Đã hủy'};
const next=o=>({pending:['confirmed','cancelled'],confirmed:['preparing','cancelled'],preparing:[o.fulfillment==='pickup'?'ready':'shipping','cancelled'],ready:['delivered','cancelled'],shipping:['delivered'],delivered:[],cancelled:[]}[o.status]||[]);
const iso=v=>v?.toDate?v.toDate().toISOString():v;
const clean=v=>Array.isArray(v)?v.map(clean):v&&typeof v==='object'&&!v.toDate?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,clean(x)])):iso(v);
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
function text(v,label,min=1,max=250){if(typeof v!=='string'||v.trim().length<min||v.trim().length>max)fail(label+' không hợp lệ.');return v.trim();}
function number(v,label,min=0,max=1000000000){if(!Number.isSafeInteger(v)||v<min||v>max)fail(label+' không hợp lệ.');return v;}
const uid=prefix=>prefix+crypto.randomUUID().replaceAll('-','').slice(0,18).toUpperCase();
const stored=(k,def)=>{try{return JSON.parse(localStorage.getItem(k))??def;}catch{return def;}};
export async function createStore(){
 const app=initializeApp(await(await fetch('/firebase-config.json')).json()),auth=getAuth(app),db=getFirestore(app);await auth.authStateReady();
 const ref=(c,id)=>doc(db,c,String(id));
 const one=async(c,id)=>{const s=await getDoc(ref(c,id));return s.exists()?{...s.data(),id:s.data().id??s.id}:null;};
 const list=async(c,filters=[])=>{const s=await getDocs(filters.length?query(collection(db,c),...filters.map(a=>where(...a))):collection(db,c));return s.docs.map(s=>({...s.data(),id:s.data().id??s.id}));};
 async function me(){
  if(!auth.currentUser)return null;
  const u=await one('users',auth.currentUser.uid);if(!u)fail('Hồ sơ chưa được tạo. Hãy đăng ký lại hoặc liên hệ admin.',403);
  const token=await auth.currentUser.getIdTokenResult();
  if(!u.active||(u.access_changed_at?.toMillis()||0)>Number(token.claims.auth_time)*1000){await signOut(auth);fail('Phiên đã bị thu hồi. Hãy đăng nhập lại.',401);}
  return {...clean(u),loyaltyPoints:u.role==='customer'?(await list('loyalty_points',[['user_id','==',u.id]])).reduce((s,p)=>s+p.points,0):0};
 }
 async function requireRole(roles){const u=await me();if(!u)fail('Vui lòng đăng nhập.',401);if(!roles.includes(u.role))fail('Bạn không có quyền truy cập.',403);return u;}
 const config={bankDetails:'',paymentMethods:['cod'],statuses:STATUS,fulfillment:{provinces:PROVINCES,storeProvince:'TP.HCM',storeAddress:storeAddress(),outsideFee:30000}};
 const cartKey=()=> 'mv-fb-cart-'+(auth.currentUser?.uid||'guest');
 const metaKey=()=> 'mv-fb-meta-'+(auth.currentUser?.uid||'guest');
 function saveCart(value){localStorage.setItem(cartKey(),JSON.stringify(value));}
 async function catalog(internal=false){
  const ps=await list('products',internal?[]:[['active','==',true]]),vs=await list('variants',internal?[]:[['active','==',true]]);
  return ps.map(p=>{const variants=vs.filter(v=>String(v.product_id)===String(p.id));const colors=[...new Map(variants.filter(v=>v.active).map(v=>[v.color,{name:v.color,hex:v.hex,img:v.img}])).values()];return {...p,version:JSON.stringify([p.version,variants.map(v=>[v.id,v.stock,v.active])]),variants,colors,sizes:[...new Set(variants.filter(v=>v.active).map(v=>v.size))]};}).sort((a,b)=>internal?b.id-a.id:a.id-b.id);
 }
 async function cart(){
  const raw=stored(cartKey(),[]),meta=stored(metaKey(),{}),choice=selection(meta,true),ps=await catalog(),items=[];
  for(const i of raw){const p=ps.find(p=>p.variants.some(v=>String(v.id)===String(i.variant_id))),v=p?.variants.find(v=>String(v.id)===String(i.variant_id));if(p&&v)items.push({variant_id:v.id,product_id:p.id,name:p.name,color:v.color,size:v.size,img:v.img,price:v.price,qty:i.qty,stock:v.stock,active:true,variant_active:v.active});}
  const subtotal=items.reduce((s,i)=>s+i.price*i.qty,0),promo=meta.promo||'',discount=promo==='WELCOME50'&&subtotal>=99000?50000:0,shipping=shippingFee(choice,!!items.length);
  const quote=JSON.stringify([items.map(i=>[i.variant_id,i.qty,i.price]),choice,discount,shipping]);
  return {items,subtotal,promo,discount,shipping,total:subtotal+shipping-discount,shippingPending:!!items.length&&choice.fulfillment==='delivery'&&!choice.province,quote,...choice};
 }
 async function orders(all=false){const rows=await list('orders',all?[]:[['user_id','==',auth.currentUser.uid]]);return Promise.all(rows.sort((a,b)=>iso(b.created_at).localeCompare(iso(a.created_at))).map(serializeOrder));}
 async function serializeOrder(o){const point=await one('loyalty_points',o.id);return {...clean(o),statusLabel:o.fulfillment==='pickup'&&o.status==='delivered'?'Đã nhận tại cửa hàng':STATUS[o.status],next:next(o),pointsAwarded:!!point,earnedPoints:point?.points||0};}
 const audit=(batch,actor,action,target)=>batch.set(ref('audit',uid('AU')),{actor,action,target:String(target),created_at:serverTimestamp()});
 async function createOrder(body){
  const u=await requireRole(['customer']),key=text(body.requestKey,'Mã yêu cầu',16,100),id='MV'+(await digest(u.id+':'+key)).slice(0,24).toUpperCase(),orderRef=ref('orders',id);
  const existing=await one('orders',id).catch(e=>{if(e.code==='permission-denied')return null;throw e;});if(existing)return serializeOrder(existing);
  const c=await cart();if(!c.items.length)fail('Giỏ hàng trống.');if(c.items.length>3)fail('Mỗi đơn tối đa 3 biến thể khác nhau trên bản Firebase Spark.');
  if(body.quote&&body.quote!==c.quote)fail('Giỏ hàng hoặc giá đã đổi. Xem lại tổng tiền.',409);
  const choice=selection(body),receiver=text(body.receiver,'Người nhận',2,100),phone=text(body.phone,'Số điện thoại',10,15).replace(/[\s.-]/g,'');if(!/^(0\d{9}|\+84\d{9})$/.test(phone))fail('Số điện thoại Việt Nam không hợp lệ.');
  if(body.method!=='cod')fail('Bản hiện tại sử dụng COD.');
  await runTransaction(db,async tx=>{
   const prior=await tx.get(orderRef);if(prior.exists())return;
   const snaps=await Promise.all(c.items.map(i=>tx.get(ref('variants',i.variant_id))));
   const items=snaps.map((s,i)=>{const v=s.data(),q=c.items[i].qty;if(!v?.active||v.stock<q)fail('Hàng không còn đủ tồn.');if(v.price!==c.items[i].price)fail('Giá đã thay đổi. Hãy tải lại giỏ.',409);return {variant_id:String(c.items[i].variant_id),product_id:v.product_id,name:v.name,color:v.color,size:v.size,img:v.img,price:v.price,qty:q};});
   const subtotal=items.reduce((s,i)=>s+i.price*i.qty,0),shipping=shippingFee(choice),discount=c.promo==='WELCOME50'&&subtotal>=99000?50000:0;
   tx.set(orderRef,{id,user_id:u.id,customer_email:u.email,request_key:key,receiver,phone,address:choice.fulfillment==='pickup'?storeAddress():text(body.address,'Địa chỉ',10,500),subtotal,shipping,discount,total:subtotal+shipping-discount,method:'cod',payment_status:'unpaid',status:'pending',carrier:'',tracking:'',...choice,store_address:storeAddress(),created_at:serverTimestamp(),items,history:[],payments:[],promo:c.promo});
   items.forEach((it,i)=>tx.update(ref('variants',it.variant_id),{stock:snaps[i].data().stock-it.qty,last_order:id}));
  });saveCart([]);return serializeOrder(await one('orders',id));
 }
 async function statusOrder(id,status,body={},customerCancel=false){
  const u=await requireRole(customerCancel?['customer']:['staff','admin']);
  await runTransaction(db,async tx=>{const r=ref('orders',id),s=await tx.get(r);if(!s.exists())fail('Không có đơn.',404);const o=s.data();if(customerCancel&&(o.user_id!==u.id||o.status!=='pending'))fail('Không được hủy đơn này.',403);if(o.status===status)return;if(!next(o).includes(status))fail('Chuyển trạng thái không hợp lệ.',409);
   const stock=status==='cancelled'?await Promise.all(o.items.map(i=>tx.get(ref('variants',i.variant_id)))):[];
   const point=status==='delivered'?await tx.get(ref('loyalty_points',id)):null;
   const change={status,history:[...o.history,{status,note:body.note||'',actor:u.id,created_at:new Date().toISOString()}]};
   if(status==='cancelled')change.cancelled_at=serverTimestamp();
   if(status==='shipping'){change.carrier=text(body.carrier,'Hãng giao',1,100);change.tracking=text(body.tracking,'Mã vận đơn',1,150);}
   tx.update(r,change);if(status==='cancelled')o.items.forEach((it,i)=>tx.update(ref('variants',it.variant_id),{stock:stock[i].data().stock+it.qty,last_order:id}));
   if(status==='delivered'&&!point.exists())tx.set(ref('loyalty_points',id),{order_id:id,user_id:o.user_id,eligible_amount:o.subtotal-o.discount,points:Math.floor((o.subtotal-o.discount)/10000),created_at:serverTimestamp()});
  });return serializeOrder(await one('orders',id));
 }
 async function saveProduct(body,id=null){
  const u=await requireRole(['staff','admin']),name=text(body.name,'Tên sản phẩm',2,180),key=encodeURIComponent(normalizeText(name)),price=number(body.price,'Giá',1000,100000000),productId=id?Number(id):Date.now();
  if(!Array.isArray(body.variants)||body.variants.length<1||body.variants.length>40)fail('Cần 1–40 biến thể.');
  const old=id?await one('products',id):null;if(id&&!old)fail('Không có sản phẩm.',404);
  const oldVariants=id?(await list('variants')).filter(v=>v.product_id===productId):[];
  if(old&&body.version!==JSON.stringify([old.version,oldVariants.map(v=>[v.id,v.stock,v.active])]))fail('Dữ liệu đã thay đổi, tải lại trước khi sửa.',409);
  let variantSequence=productId*100;const occupiedIds=new Set(oldVariants.map(v=>v.id));const allocateVariant=()=>{while(occupiedIds.has(variantSequence))variantSequence++;const id=variantSequence++;occupiedIds.add(id);return id;};
  const seen=new Set(),seenIds=new Set(),variants=body.variants.map((v,i)=>{const color=text(v.color,'Màu',1,60),size=text(v.size,'Size',1,20);if(seen.has(color+'|'+size))fail('Trùng biến thể.');seen.add(color+'|'+size);if(!/^https:\/\//.test(v.img))fail('Ảnh phải dùng HTTPS.');const existing=v.id?oldVariants.find(x=>String(x.id)===String(v.id)):oldVariants.find(x=>x.color===color&&x.size===size);if(v.id&&!existing)fail('Biến thể không thuộc sản phẩm.');const stock=number(v.stock,'Tồn',0,100000);if(u.role==='staff'&&stock!==(existing?.stock||0))fail('Chỉ admin được thay đổi số tồn; biến thể mới phải có tồn 0.',403);const variantId=existing?.id||allocateVariant();if(seenIds.has(variantId))fail('Lặp mã biến thể.');seenIds.add(variantId);return {id:variantId,product_id:productId,name,color,size,price,stock,active:!!body.active,img:v.img,hex:v.hex||'#1b4332'};});
  const product={id:productId,name,price,active:!!body.active,category:text(body.category,'Danh mục',1,60),audience:body.audience||'Nam',badge:body.badge||'',fabric:text(body.fabric,'Mô tả',1,2000),originalPrice:number(body.originalPrice,'Giá gốc',price,100000000),flashSale:!!body.flashSale,version:crypto.randomUUID(),variants:variants.map(v=>v.id)};
  await runTransaction(db,async tx=>{const lock=await tx.get(ref('product_names',key)),current=await tx.get(ref('products',productId));const currentVariants=await Promise.all(oldVariants.map(v=>tx.get(ref('variants',v.id))));if(lock.exists()&&lock.data().product_id!==productId)fail('Tên sản phẩm đã tồn tại.',409);if(!id&&current.exists())fail('Mã sản phẩm vừa được sử dụng, hãy lưu lại.',409);if(id&&(current.data().version!==old.version||currentVariants.some((s,i)=>s.data().stock!==oldVariants[i].stock)))fail('Sản phẩm hoặc tồn đã thay đổi.',409);
   tx.set(ref('product_names',key),{product_id:productId});tx.set(ref('products',productId),product);variants.forEach(v=>{tx.set(ref('variants',v.id),v,{merge:true});const prior=oldVariants.find(x=>x.id===v.id),delta=v.stock-(prior?.stock||0);if(delta)tx.set(ref('stock_movements',uid('SM')),{variant_id:String(v.id),name,color:v.color,size:v.size,delta,stock_after:v.stock,kind:prior?'adjustment':'initial',reference:String(productId),actor:u.id,actor_name:u.name,created_at:serverTimestamp()});});oldVariants.filter(v=>!variants.some(x=>x.id===v.id)).forEach(v=>tx.update(ref('variants',v.id),{active:false,name,price}));if(old&&normalizeText(old.name)!==normalizeText(name))tx.delete(ref('product_names',encodeURIComponent(normalizeText(old.name))));audit(tx,u.id,id?'product.update':'product.create',productId);
  });return product;
 }
 async function inventory(params={}){
  const {from,to,days}=reportWindow(params),ps=await catalog(true),os=await orders(true),receipts=(await list('inventory_receipts')).map(clean),users=await list('users'),inRange=v=>v&&v.slice(0,10)>=from&&v.slice(0,10)<=to;
  const stock=ps.flatMap(p=>p.variants.map(v=>{const reserved=os.filter(o=>['pending','confirmed','preparing','ready'].includes(o.status)).flatMap(o=>o.items).filter(i=>i.variant_id===String(v.id)).reduce((n,i)=>n+i.qty,0);return {...v,id:v.id,name:p.name,category:p.category,audience:p.audience,product_active:p.active,reserved,onHand:v.stock+reserved};}));
  const selected=receipts.filter(r=>r.status==='draft'||inRange(r.confirmed_at||r.cancelled_at)),received=selected.filter(r=>r.status==='received'),suppliers=new Map(),periods=new Map();
  receipts.forEach(r=>{r.created_by_name=users.find(u=>u.id===r.created_by)?.name||'';r.confirmed_by_name=users.find(u=>u.id===r.confirmed_by)?.name||'';});
  for(const r of received){const sup=suppliers.get(r.supplier)||{supplier:r.supplier,receipts:0,quantity:0,value:0},date=(r.confirmed_at||'').slice(0,days>62?7:10),period=periods.get(date)||{period:date,receipts:0,quantity:0,value:0};for(const row of [sup,period]){row.receipts++;row.quantity+=r.quantity;row.value+=r.total;}suppliers.set(r.supplier,sup);periods.set(date,period);}
  const movements=(await list('stock_movements')).map(clean);
  for(const o of os)for(const i of o.items){const movement={...i,reference:o.id,stock_after:'—',actor_name:'Theo đơn hàng',kind:'order_reserve',delta:-i.qty,created_at:o.created_at};movements.push(movement);if(o.status==='cancelled')movements.push({...movement,kind:'order_cancel',delta:i.qty,created_at:o.cancelled_at||o.history.find(h=>h.status==='cancelled')?.created_at});}
  return {from,to,stock,summary:{available:stock.reduce((s,v)=>s+v.stock,0),reserved:stock.reduce((s,v)=>s+v.reserved,0),onHand:stock.reduce((s,v)=>s+v.onHand,0),lowStockVariants:stock.filter(v=>v.active&&v.product_active&&v.stock<=5).length,receiptCount:received.length,receivedQuantity:received.reduce((s,r)=>s+r.quantity,0),receivedValue:received.reduce((s,r)=>s+r.total,0),draftReceipts:receipts.filter(r=>r.status==='draft').length},receipts:selected,suppliers:[...suppliers.values()],series:[...periods.values()].sort((a,b)=>a.period.localeCompare(b.period)),movements:movements.filter(m=>inRange(m.created_at)).sort((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,200)};
 }
 async function receiptCreate(body){
  const u=await requireRole(['admin']),key=text(body.requestKey,'Mã yêu cầu',16,100),id='NK'+(await digest(u.id+':'+key)).slice(0,20).toUpperCase();const old=await one('inventory_receipts',id);if(old)return clean(old);
  if(!body.items?.length||body.items.length>40)fail('Phiếu cần 1–40 dòng hàng.');const seen=new Set(),items=[];
  for(const i of body.items){if(seen.has(String(i.variant_id)))fail('Biến thể bị lặp.');seen.add(String(i.variant_id));const v=await one('variants',i.variant_id);if(!v)fail('Không có biến thể.');items.push({variant_id:String(i.variant_id),name:v.name,color:v.color,size:v.size,qty:number(i.qty,'Số lượng',1,100000),unit_cost:number(i.unit_cost,'Giá nhập',0,100000000)});}
  const r={id,supplier:text(body.supplier,'Nhà cung cấp',2,160),supplier_reference:body.supplier_reference||'',note:body.note||'',status:'draft',request_key:key,created_by:u.id,created_at:serverTimestamp(),items,quantity:items.reduce((s,i)=>s+i.qty,0),total:items.reduce((s,i)=>s+i.qty*i.unit_cost,0)};await runTransaction(db,async tx=>{const target=ref('inventory_receipts',id);if(!(await tx.get(target)).exists())tx.set(target,r);});return clean(await one('inventory_receipts',id));
 }
 async function receiptAction(id,action){const u=await requireRole(['admin']);await runTransaction(db,async tx=>{const s=await tx.get(ref('inventory_receipts',id));if(!s.exists())fail('Không có phiếu.');const r=s.data(),status=action==='confirm'?'received':'cancelled';if(r.status===status)return;if(r.status!=='draft')fail('Phiếu đã xử lý không thể sửa.',409);
   const vs=action==='confirm'?await Promise.all(r.items.map(i=>tx.get(ref('variants',i.variant_id)))):[];
   tx.update(ref('inventory_receipts',id),action==='confirm'?{status,confirmed_by:u.id,confirmed_at:serverTimestamp()}:{status,cancelled_at:serverTimestamp()});
   if(action==='confirm')r.items.forEach((i,n)=>{const stock=vs[n].data().stock+i.qty;if(stock>100000)fail('Tồn vượt giới hạn.');tx.update(ref('variants',i.variant_id),{stock});tx.set(ref('stock_movements',uid('SM')),{...i,delta:i.qty,stock_after:stock,kind:'receipt',reference:id,actor:u.id,actor_name:u.name,created_at:serverTimestamp()});});audit(tx,u.id,'inventory.'+action,id);
  });return clean(await one('inventory_receipts',id));}
 async function call(path,method='GET',body={}){
  const url=new URL(path,'https://local'),route=url.pathname,params=Object.fromEntries(url.searchParams);
  if(route==='/me')return {user:await me(),csrf:'firebase-auth',config};
  if(route==='/auth/logout'){await signOut(auth);return {csrf:''};}
  if(route==='/auth/register'){
   const name=text(body.name,'Họ tên',2,100);if(body.password?.length<8)fail('Mật khẩu ít nhất 8 ký tự.');const r=await createUserWithEmailAndPassword(auth,body.email,body.password);await setDoc(ref('users',r.user.uid),{id:r.user.uid,email:r.user.email,name,phone:'',address:'',role:'customer',active:true,created_at:serverTimestamp(),access_changed_at:Timestamp.fromMillis(0)});return {user:await me()};
  }
  if(route==='/auth/login'){
   await signInWithEmailAndPassword(auth,body.email,body.password);const u=await me();if((body.portal==='staff')!==(u.role!=='customer')){await signOut(auth);fail('Chọn đúng khu vực đăng nhập của tài khoản.',403);}const guest=stored('mv-fb-cart-guest',[]);if(u.role==='customer'&&guest.length){const saved=stored(cartKey(),[]);for(const i of guest){const old=saved.find(x=>x.variant_id===i.variant_id);if(old)old.qty=Math.min(99,old.qty+i.qty);else saved.push(i);}saveCart(saved.slice(0,3));localStorage.removeItem('mv-fb-cart-guest');}return {user:u};
  }
  if(route==='/products')return catalog();
  if(route==='/profile'){const u=await requireRole(['customer','staff','admin']);await updateDoc(ref('users',u.id),{name:text(body.name,'Họ tên',2,100),phone:body.phone||'',address:body.address||''});return me();}
  if(route==='/cart'){if(method==='PUT'){if(!Array.isArray(body.items)||body.items.length>3)fail('Bản Spark hỗ trợ tối đa 3 biến thể khác nhau mỗi đơn.');const seen=new Set();saveCart(body.items.map(i=>{const variant_id=String(i.variant_id);if(seen.has(variant_id))fail('Trùng biến thể trong giỏ.');seen.add(variant_id);return {variant_id,qty:number(i.qty,'Số lượng',1,99)};}));}return cart();}
  if(route==='/cart/fulfillment'){const meta=stored(metaKey(),{});localStorage.setItem(metaKey(),JSON.stringify({...meta,...selection(body,true)}));return cart();}
  if(route==='/cart/promo'){const code=(body.code||'').toUpperCase();if(code&&code!=='WELCOME50')fail('Mã ưu đãi không hợp lệ.');localStorage.setItem(metaKey(),JSON.stringify({...stored(metaKey(),{}),promo:code}));return cart();}
  if(route==='/orders'){await requireRole(['customer']);return method==='POST'?createOrder(body):orders();}
  let m=route.match(/^\/orders\/([^/]+)\/cancel$/);if(m)return statusOrder(m[1],'cancelled',{},true);
  if(route==='/loyalty'){const u=await requireRole(['customer']),history=(await list('loyalty_points',[['user_id','==',u.id]])).map(clean);return {unit:10000,balance:history.reduce((s,p)=>s+p.points,0),history};}
  if(route==='/newsletter'){const email=text(body.email,'Email',5,254).toLowerCase();if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))fail('Email không hợp lệ.');try{await setDoc(ref('subscribers',email),{email,created_at:serverTimestamp()});}catch(e){if(e.code!=='permission-denied')throw e;}return {ok:true};}
  const u=await requireRole(['admin','staff']);
  if(route==='/admin/products')return method==='POST'?saveProduct(body):catalog(true);
  m=route.match(/^\/admin\/products\/(\d+)$/);if(m)return saveProduct(body,m[1]);
  if(route==='/admin/orders')return orders(true);
  m=route.match(/^\/admin\/orders\/([^/]+)\/invoice$/);if(m)return {order:await serializeOrder(await one('orders',m[1])),storeAddress:storeAddress()};
  m=route.match(/^\/admin\/orders\/([^/]+)\/status$/);if(m)return statusOrder(m[1],body.status,body);
  await requireRole(['admin']);
  m=route.match(/^\/admin\/orders\/([^/]+)\/payment$/);if(m){await runTransaction(db,async tx=>{const r=ref('orders',m[1]),s=await tx.get(r),o=s.data();if(o.payment_status===body.status)return;if(body.status==='paid'&&(o.status!=='delivered'||o.payment_status!=='unpaid'))fail('Chưa đủ điều kiện ghi nhận tiền.');if(body.status==='refunded'&&o.payment_status!=='paid')fail('Chưa có tiền để hoàn.');tx.update(r,{payment_status:body.status,payments:[...o.payments,{status:body.status,reference:text(body.reference,'Biên nhận',3,150),actor:u.id,created_at:new Date().toISOString()}]});audit(tx,u.id,'payment.'+body.status,m[1]);});return serializeOrder(await one('orders',m[1]));}
  if(route==='/admin/users')return (await list('users')).map(clean);
  if(route==='/admin/customers'){const os=await orders(true);return (await list('users',[['role','==','customer']])).map(c=>({...clean(c),order_count:os.filter(o=>o.user_id===c.id).length,spent:os.filter(o=>o.user_id===c.id&&o.payment_status==='paid').reduce((s,o)=>s+o.total,0)}));}
  m=route.match(/^\/admin\/(users|customers)\/([^/]+)$/);if(m){if(m[2]===u.id)fail('Không tự đổi quyền/khóa tài khoản đang dùng.');const target=await one('users',m[2]);if(target.role==='admin')fail('Bản Spark bảo vệ tài khoản admin, không hạ quyền hoặc khóa admin tại đây.');await updateDoc(ref('users',m[2]),{role:m[1]==='users'?body.role:target.role,active:!!body.active,access_changed_at:serverTimestamp()});return {ok:true};}
  if(route==='/admin/reports'){
   const os=await orders(true),us=(await list('users')).map(clean),payments=os.flatMap(o=>o.payments.map(p=>({...p,total:o.total}))),delivered=os.filter(o=>o.status==='delivered').flatMap(o=>o.items.map(i=>({...i,completed_at:o.history.find(h=>h.status==='delivered')?.created_at||o.created_at})));
   return buildReport({prepare(sql){return {all(){return sql.includes('FROM payment_events')?payments:sql.includes('FROM order_items')?delivered:sql.includes('FROM users')?us.filter(u=>u.role==='customer'):os;}};}},params);
  }
  if(route==='/admin/inventory')return inventory(params);
  if(route==='/admin/inventory/receipts')return receiptCreate(body);
  m=route.match(/^\/admin\/inventory\/receipts\/([^/]+)\/(confirm|cancel)$/);if(m)return receiptAction(m[1],m[2]);
  fail('Không có chức năng này.',404);
 }
 return {call};
}
async function digest(text){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join('');}




