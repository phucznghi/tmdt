import {readFileSync} from 'node:fs';
import {normalizeText} from './public/text.js';
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
   if(db.prepare('SELECT name FROM products').all().some(row=>normalizeText(row.name)===normalizeText(name)))throw new Error('Đã có sản phẩm cùng tên: '+name+'. Hãy kiểm tra sản phẩm hiện có trước khi nhập danh mục.');
   const productId=Number(db.prepare('INSERT INTO products(name,price,metadata) VALUES(?,?,?)').run(name,price,JSON.stringify(metadata)).lastInsertRowid);
   for(const c of colors)for(const size of sizes){const variantId=Number(db.prepare('INSERT INTO variants(product_id,color,size,hex,img,stock) VALUES(?,?,?,?,?,20)').run(productId,c.name,size,c.hex,c.img).lastInsertRowid);recordMovement(db,variantId,20,'initial','uniqlo-demo-'+p.source.productCode,actor??null);}
   added++;
  }
  if(added||archived){if(!actor)throw new Error('Cần có tài khoản admin hoạt động trước khi nhập danh mục.');db.prepare('INSERT INTO audit(actor,action,target,created_at) VALUES(?,?,?,?)').run(actor,'catalog.uniqlo-demo',JSON.stringify({added,archived}),new Date().toISOString());}
  db.exec('COMMIT');return {added,archived};
 }catch(error){db.exec('ROLLBACK');throw error;}
}

// Explicit update: never reset existing prices automatically on server startup.
export function updateCatalogPrices(db){
 const seed=JSON.parse(readFileSync(new URL('./seed.json',import.meta.url),'utf8'));let updated=0;
 db.exec('BEGIN IMMEDIATE');
 try{
  const actor=db.prepare("SELECT id FROM users WHERE role='admin' AND active=1 ORDER BY id LIMIT 1").get()?.id;
  for(const item of seed){
   const row=db.prepare("SELECT * FROM products WHERE json_extract(metadata,'$.source.productCode')=?").get(item.source.productCode);if(!row)continue;
   const metadata=JSON.parse(row.metadata);const next={...metadata,badge:item.badge,originalPrice:item.price,discount:'',source:{...metadata.source,priceNote:item.source.priceNote}};
   if(row.price===item.price&&JSON.stringify(metadata)===JSON.stringify(next))continue;
   if(!actor)throw new Error('Cần tài khoản admin hoạt động để cập nhật giá.');
   db.prepare('UPDATE products SET price=?,metadata=? WHERE id=?').run(item.price,JSON.stringify(next),row.id);updated++;
  }
  if(updated)db.prepare('INSERT INTO audit(actor,action,target,created_at) VALUES(?,?,?,?)').run(actor,'catalog.prices',JSON.stringify({updated,maxPrice:399000}),new Date().toISOString());
  db.exec('COMMIT');return {updated};
 }catch(error){db.exec('ROLLBACK');throw error;}
}
