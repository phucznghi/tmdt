import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../server.js';

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
const checkout=(requestKey='request-checkout-0001',method='cod')=>({receiver:'Nguyễn Văn An',phone:'0901234567',address:'128 Nguyễn Trãi, TP Hồ Chí Minh',method,requestKey});
async function add(c,variant_id,qty=1){return c.call('/cart','PUT',{items:[{variant_id,qty}]});}

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
test('source storefront UI remains intact; only its script is connected to backend',async()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');assert.match(html,/<script type="module" src="\/app.js"><\/script>/);
 // SHA-256 of the original GitHub HTML/CSS prefix before its application script.
 const prefix=html.slice(0,html.indexOf('<script type="module" src="/app.js">'));
 assert.equal(createHash('sha256').update(prefix).digest('hex'),'510361fef355e6f6246110f72dd1c1d59e195df9429cefdb1d93024955152197');
});

test('invalid cart payload and changed price quote are rejected without creating orders',async t=>{
 const {client,app}=await fixture(t);const c=client();await c.register();await c.call('/cart','PUT',{items:[null]},400);const v=(await c.call('/products'))[0].variants[0];const cart=await add(c,v.id);app.db.prepare('UPDATE products SET price=price+1000 WHERE id=?').run(v.product_id);
 await c.call('/orders','POST',{...checkout(),quote:cart.quote},409);assert.equal((await c.call('/orders')).length,0);assert.equal((await c.call('/cart')).items.length,1);
 const fresh=await c.call('/cart');await c.call('/orders','POST',{...checkout(),quote:fresh.quote},201);
});
