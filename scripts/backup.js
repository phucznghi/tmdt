import {DatabaseSync,backup} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {mkdirSync,writeFileSync,readFileSync,statSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
const source=resolve(process.env.DB_PATH||fileURLToPath(new URL('../data/mocvai.sqlite',import.meta.url)));
const folder=resolve(process.argv[2]||process.env.BACKUP_DIR||'backups');mkdirSync(folder,{recursive:true});
const target=join(folder,'mocvai-'+new Date().toISOString().replaceAll(':','-')+'.sqlite');
const db=new DatabaseSync(source,{readOnly:true});
try{
 await backup(db,target);
 const restored=new DatabaseSync(target,{readOnly:true});let integrity;
 try{integrity=restored.prepare('PRAGMA integrity_check').get().integrity_check;if(integrity!=='ok')throw Error('Backup integrity check failed');if(restored.prepare('PRAGMA foreign_key_check').all().length)throw Error('Backup foreign keys failed');}finally{restored.close();}
 const manifest={createdAt:new Date().toISOString(),file:target,bytes:statSync(target).size,sha256:createHash('sha256').update(readFileSync(target)).digest('hex'),integrity};
 writeFileSync(target+'.json',JSON.stringify(manifest,null,2));console.log(JSON.stringify(manifest));
}finally{db.close();}
