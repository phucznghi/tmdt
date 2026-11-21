// Rebuild only the legacy users table to extend its role CHECK constraint.
// Child tables retain their references to users(id); all existing IDs are copied.
export function migrateStaffRole(db, schema) {
 const current=db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
 if(current.sql.includes("'staff'")) return;
 const definition=schema.match(/CREATE TABLE IF NOT EXISTS users \([\s\S]*?\n\);/)[0];
 db.exec('PRAGMA foreign_keys=OFF');
 try {
  db.exec('BEGIN IMMEDIATE');
  db.exec(definition.replace('IF NOT EXISTS users','users_staff_migration'));
  db.exec(`INSERT INTO users_staff_migration(id,email,name,password,role,phone,address,active,created_at)
   SELECT id,email,name,password,role,phone,address,active,created_at FROM users;
   DROP TABLE users;
   ALTER TABLE users_staff_migration RENAME TO users;`);
  if(db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Không thể nâng cấp vai trò: dữ liệu liên kết không hợp lệ.');
  db.exec('COMMIT');
 } catch(error) {db.exec('ROLLBACK');throw error;}
 finally {db.exec('PRAGMA foreign_keys=ON');}
}
export function migrateFulfillment(db){
 db.exec('BEGIN IMMEDIATE');
 try{
  for(const [table,columns] of Object.entries({cart_meta:{fulfillment:"TEXT NOT NULL DEFAULT 'delivery'",province:"TEXT NOT NULL DEFAULT ''"},orders:{fulfillment:"TEXT NOT NULL DEFAULT 'delivery'",province:"TEXT NOT NULL DEFAULT ''",store_address:"TEXT NOT NULL DEFAULT ''"}})){
   const existing=new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(c=>c.name));
   for(const [column,type] of Object.entries(columns))if(!existing.has(column))db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}
