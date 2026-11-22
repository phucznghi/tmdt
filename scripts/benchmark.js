import {createApp} from '../server.js';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir,cpus,totalmem,platform,release} from 'node:os';
import {join,resolve,sep} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'mocvai-bench-')),app=createApp({dbPath:join(dir,'bench.sqlite')});
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
try{
 const initial=await fetch(base+'/api/me'),cookie=initial.headers.get('set-cookie').split(';')[0];await initial.arrayBuffer();
 for(let i=0;i<20;i++)await (await fetch(base+'/api/products',{headers:{cookie}})).arrayBuffer();
 const results=[];
 for(const concurrency of [1,10,30]){
  const samples=[],statuses={};let next=0;const requests=300,started=performance.now();
  await Promise.all(Array.from({length:concurrency},async()=>{while(next++<requests){const s=performance.now();const r=await fetch(base+'/api/products',{headers:{cookie}});await r.arrayBuffer();samples.push(performance.now()-s);statuses[r.status]=(statuses[r.status]||0)+1;}}));
  const elapsed=performance.now()-started;samples.sort((a,b)=>a-b);const percentile=p=>Number(samples[Math.min(samples.length-1,Math.ceil(samples.length*p)-1)].toFixed(2));
  results.push({concurrency,requests,elapsedMs:Math.round(elapsed),requestsPerSecond:Number((requests*1000/elapsed).toFixed(2)),p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),statuses});
 }
 const report={measuredAt:new Date().toISOString(),scope:'Loopback HTTP GET /api/products; one process; 12 seeded products; 20 warmups; excludes WAN, TLS, images and writes',node:process.version,sqlite:app.db.prepare('SELECT sqlite_version() AS version').get().version,os:platform()+' '+release(),cpu:cpus()[0]?.model,logicalCpus:cpus().length,memoryGiB:Number((totalmem()/1024**3).toFixed(1)),rssMiB:Number((process.memoryUsage().rss/1024**2).toFixed(1)),results};
 if(process.argv[2])writeFileSync(resolve(process.argv[2]),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await new Promise(r=>app.server.close(r));app.close();const expected=resolve(tmpdir())+sep+'mocvai-bench-';if(!resolve(dir).startsWith(expected))throw Error('Unexpected benchmark directory');rmSync(dir,{recursive:true,force:true});}
