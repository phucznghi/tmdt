// Run with Node.js 24 after `firebase login`. Uses the owner's CLI credentials in memory.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
let base;try{base=resolve(require.resolve('firebase-tools/package.json'),'../lib');}catch{base=join(process.env.APPDATA||'', 'npm/node_modules/firebase-tools/lib');}
const project=JSON.parse(readFileSync(new URL('../.firebaserc',import.meta.url))).projects.default;
const auth=require(join(base,'auth.js')),options={project,nonInteractive:true};
auth.setActiveAccount(options,auth.getGlobalDefaultAccount());await require(join(base,'requireAuth.js')).requireAuth(options);
const {Client}=require(join(base,'apiv2.js')),client=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'});
const prefix=`/projects/${project}/databases/(default)/documents`,log={reqBody:true,resBody:true};
const ids=(await client.post(prefix+':listCollectionIds',{pageSize:100},{skipLog:log})).body.collectionIds||[],documents=[];
for(const id of ids){let pageToken;do{const result=await client.get(prefix+'/'+id,{queryParams:{pageSize:300,...(pageToken?{pageToken}:{})},skipLog:log});documents.push(...(result.body.documents||[]));pageToken=result.body.nextPageToken;}while(pageToken);}
const dir=resolve('backups');mkdirSync(dir,{recursive:true});const path=join(dir,'firestore-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
const payload=JSON.stringify({project,createdAt:new Date().toISOString(),scope:'top-level collections; Auth identities require separate recovery',collections:ids,documents},null,2);
writeFileSync(path,payload);const sha256=createHash('sha256').update(payload).digest('hex');writeFileSync(path+'.sha256',sha256+'\n');
console.log(JSON.stringify({path,collections:ids.length,documents:documents.length,sha256}));
