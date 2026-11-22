import {readFileSync} from 'node:fs';
import {recordMovement} from './inventory.js';
export function importUniqloCatalog(db){
 const products=JSON.parse(readFileSync(new URL('./seed.json',import.meta.url),'utf8'));
 const legacy=JSON.parse(readFileSync(new URL('./legacy-seed.json',import.meta.url),'utf8'));
 let added=0,archived=0;
 const actor=db.prepare("SELECT id FROM users WHERE role='admin' AND active=1 ORDER BY id LIMIT 1").get()?.id;
 db.exec('BEGIN IMMEDIATE');
 try{
  for(const p of legacy){const row=db.prepare('SELECT name,active FROM products WHERE id=?').get(p.id);if(row?.name===p.name&&row.active){db.prepare('UPDATE products SET active=0 WHERE id=?').run(p.id);archived++;}}
  for(const p of products){
   if(db.prepare("SELECT id FROM products WHERE json_extract(metadata,'$.source.productCode')=?").get(p.source.productCode))continue;
   const {id,name,price,colors,sizes,...metadata}=p;
   const productId=Number(db.prepare('INSERT INTO products(name,price,metadata) VALUES(?,?,?)').run(name,price,JSON.stringify(metadata)).lastInsertRowid);
   for(const c of colors)for(const size of sizes){const variantId=Number(db.prepare('INSERT INTO variants(product_id,color,size,hex,img,stock) VALUES(?,?,?,?,?,20)').run(productId,c.name,size,c.hex,c.img).lastInsertRowid);recordMovement(db,variantId,20,'initial','uniqlo-demo-'+p.source.productCode,actor??null);}
   added++;
  }
  if(added||archived){if(!actor)throw new Error('Cần có tài khoản admin hoạt động trước khi nhập danh mục.');db.prepare('INSERT INTO audit(actor,action,target,created_at) VALUES(?,?,?,?)').run(actor,'catalog.uniqlo-demo',JSON.stringify({added,archived}),new Date().toISOString());}
  db.exec('COMMIT');return {added,archived};
 }catch(error){db.exec('ROLLBACK');throw error;}
}
