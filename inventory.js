import {randomUUID} from 'node:crypto';
import {localDay,reportWindow} from './reports.js';
const now=()=>new Date().toISOString();
function fail(status,message){throw Object.assign(new Error(message),{status});}
function text(value,label,min,max){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)fail(400,label+' không hợp lệ.');return value.trim();}
function number(value,label,min,max){if(!Number.isSafeInteger(value)||value<min||value>max)fail(400,label+' không hợp lệ.');return value;}
export function recordMovement(db,variantId,delta,kind,reference,actor=null){
 const variant=db.prepare('SELECT stock FROM variants WHERE id=?').get(variantId);
 if(!variant)fail(404,'Không tìm thấy biến thể trong kho.');
 db.prepare('INSERT INTO stock_movements(variant_id,delta,kind,reference,actor,stock_after,created_at) VALUES(?,?,?,?,?,?,?)').run(variantId,delta,kind,reference,actor,variant.stock,now());
}
export function initializeStockHistory(db){
 db.prepare(`INSERT INTO stock_movements(variant_id,delta,kind,reference,stock_after,created_at)
  SELECT v.id,v.stock,'opening','inventory-baseline',v.stock,? FROM variants v
  WHERE NOT EXISTS(SELECT 1 FROM stock_movements m WHERE m.variant_id=v.id)`).run(now());
}
export function inventoryService(db){
 const one=(sql,...args)=>db.prepare(sql).get(...args),all=(sql,...args)=>db.prepare(sql).all(...args),run=(sql,...args)=>db.prepare(sql).run(...args);
 function tx(work){db.exec('BEGIN IMMEDIATE');try{const result=work();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}}
 function audit(actor,action,id){run('INSERT INTO audit(actor,action,target,created_at) VALUES(?,?,?,?)',actor,action,id,now());}
 function receipt(id){
  const r=one('SELECT r.*,u.name AS created_by_name,c.name AS confirmed_by_name FROM inventory_receipts r JOIN users u ON u.id=r.created_by LEFT JOIN users c ON c.id=r.confirmed_by WHERE r.id=?',id);if(!r)fail(404,'Không tìm thấy phiếu nhập.');
  const items=all('SELECT * FROM inventory_receipt_items WHERE receipt_id=? ORDER BY id',id);
  return {...r,items,total:items.reduce((s,i)=>s+i.qty*i.unit_cost,0),quantity:items.reduce((s,i)=>s+i.qty,0)};
 }
 function create(body,actor){
  const key=text(body.requestKey,'Mã yêu cầu',16,100),existing=one('SELECT id FROM inventory_receipts WHERE created_by=? AND request_key=?',actor,key);
  if(existing)return {created:false,receipt:receipt(existing.id)};
  const supplier=text(body.supplier,'Nhà cung cấp',2,160),reference=text(body.supplier_reference??'','Số chứng từ',0,100),note=text(body.note??'','Ghi chú',0,500);
  if(!Array.isArray(body.items)||body.items.length<1||body.items.length>100)fail(400,'Phiếu nhập cần từ 1 đến 100 biến thể.');
  const seen=new Set(),items=body.items.map(i=>{
   if(!i||typeof i!=='object')fail(400,'Dòng hàng không hợp lệ.');const id=number(i.variant_id,'Biến thể',1,1000000000),qty=number(i.qty,'Số lượng',1,100000),cost=number(i.unit_cost,'Giá nhập',0,100000000);
   if(seen.has(id))fail(400,'Biến thể bị lặp trong phiếu nhập.');seen.add(id);
   const v=one('SELECT v.*,p.name FROM variants v JOIN products p ON p.id=v.product_id WHERE v.id=?',id);if(!v)fail(404,'Biến thể không tồn tại.');return {variant_id:id,qty,unit_cost:cost,name:v.name,color:v.color,size:v.size};
  });
  const total=items.reduce((s,i)=>s+i.qty*i.unit_cost,0);if(!Number.isSafeInteger(total)||total>1000000000000)fail(400,'Tổng giá trị phiếu vượt giới hạn 1.000 tỷ đồng.');
  const id='NK'+randomUUID().replaceAll('-','').slice(0,12).toUpperCase();
  tx(()=>{run('INSERT INTO inventory_receipts(id,supplier,supplier_reference,note,request_key,created_by,created_at) VALUES(?,?,?,?,?,?,?)',id,supplier,reference,note,key,actor,now());for(const i of items)run('INSERT INTO inventory_receipt_items(receipt_id,variant_id,name,color,size,qty,unit_cost) VALUES(?,?,?,?,?,?,?)',id,i.variant_id,i.name,i.color,i.size,i.qty,i.unit_cost);audit(actor,'inventory.draft',id);});
  return {created:true,receipt:receipt(id)};
 }
 function confirm(id,actor){
  return tx(()=>{
   const r=receipt(id);if(r.status==='received')return r;if(r.status!=='draft')fail(409,'Phiếu đã hủy không thể nhập kho.');
   for(const i of r.items){const v=one('SELECT stock FROM variants WHERE id=?',i.variant_id);if(!v||v.stock+i.qty>100000)fail(409,`Tồn kho ${i.name} (${i.color}/${i.size}) vượt giới hạn 100.000.`);run('UPDATE variants SET stock=stock+? WHERE id=?',i.qty,i.variant_id);recordMovement(db,i.variant_id,i.qty,'receipt',id,actor);}
   run("UPDATE inventory_receipts SET status='received',confirmed_by=?,confirmed_at=? WHERE id=?",actor,now(),id);audit(actor,'inventory.receive',id);return receipt(id);
  });
 }
 function cancel(id,actor){return tx(()=>{const r=receipt(id);if(r.status==='cancelled')return r;if(r.status!=='draft')fail(409,'Phiếu đã nhập không thể hủy. Điều chỉnh tồn kho cần được ghi nhận riêng.');run("UPDATE inventory_receipts SET status='cancelled',cancelled_at=? WHERE id=?",now(),id);audit(actor,'inventory.cancel',id);return receipt(id);});}
 function report(query={}){
  const {from,to,days}=reportWindow(query),inRange=value=>value&&localDay(value)>=from&&localDay(value)<=to;
  const stock=all(`SELECT v.id,v.product_id,p.name,json_extract(p.metadata,'$.category') AS category,json_extract(p.metadata,'$.audience') AS audience,v.color,v.size,v.stock,v.active,p.active AS product_active,
   COALESCE((SELECT SUM(i.qty) FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.variant_id=v.id AND o.status IN ('pending','confirmed','preparing','ready')),0) AS reserved
   FROM variants v JOIN products p ON p.id=v.product_id ORDER BY p.name,v.id`).map(v=>({...v,onHand:v.stock+v.reserved}));
  const receipts=all('SELECT id FROM inventory_receipts ORDER BY created_at DESC,id').map(r=>receipt(r.id));
  const received=receipts.filter(r=>r.status==='received'&&inRange(r.confirmed_at)),suppliers=new Map(),periods=new Map();
  for(const r of received){const key=r.supplier.toLocaleLowerCase('vi'),s=suppliers.get(key)||{supplier:r.supplier,receipts:0,quantity:0,value:0};s.receipts++;s.quantity+=r.quantity;s.value+=r.total;suppliers.set(key,s);const keyDate=localDay(r.confirmed_at).slice(0,days>62?7:10),p=periods.get(keyDate)||{period:keyDate,receipts:0,quantity:0,value:0};p.receipts++;p.quantity+=r.quantity;p.value+=r.total;periods.set(keyDate,p);}
  const movements=all('SELECT m.*,p.name,v.color,v.size,u.name AS actor_name FROM stock_movements m JOIN variants v ON v.id=m.variant_id JOIN products p ON p.id=v.product_id LEFT JOIN users u ON u.id=m.actor ORDER BY m.id DESC').filter(m=>inRange(m.created_at)).slice(0,200);
  return {from,to,stock,summary:{available:stock.reduce((s,v)=>s+v.stock,0),reserved:stock.reduce((s,v)=>s+v.reserved,0),onHand:stock.reduce((s,v)=>s+v.onHand,0),lowStockVariants:stock.filter(v=>v.active&&v.product_active&&v.stock<=5).length,receiptCount:received.length,receivedQuantity:received.reduce((s,r)=>s+r.quantity,0),receivedValue:received.reduce((s,r)=>s+r.total,0),draftReceipts:receipts.filter(r=>r.status==='draft').length},receipts:receipts.filter(r=>r.status==='draft'||inRange(r.status==='received'?r.confirmed_at:r.cancelled_at)),suppliers:[...suppliers.values()].sort((a,b)=>b.value-a.value),series:[...periods.values()].sort((a,b)=>a.period.localeCompare(b.period)),movements};
 }
 return {create,confirm,cancel,receipt,report};
}
