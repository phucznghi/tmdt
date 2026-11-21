import {createApp} from '../server.js';
import readline from 'node:readline';
const email=process.argv[2];
if(!email){console.error('Cách dùng: npm run admin -- admin@example.com');process.exit(1);}
let password=process.env.ADMIN_PASSWORD;
if(!password){
 if(!process.stdin.isTTY){console.error('Cần ADMIN_PASSWORD hoặc chạy trong terminal tương tác.');process.exit(1);}
 process.stdout.write('Mật khẩu admin (tối thiểu 8 ký tự, không hiển thị): ');
 password=await new Promise(resolve=>{let value='';readline.emitKeypressEvents(process.stdin);process.stdin.setRawMode(true);const handler=(s,key)=>{if(key?.ctrl&&key.name==='c')process.exit(130);if(key?.name==='return'){process.stdin.setRawMode(false);process.stdin.removeListener('keypress',handler);process.stdin.pause();process.stdout.write('\n');resolve(value);}else if(key?.name==='backspace')value=value.slice(0,-1);else if(s&&!key?.ctrl)value+=s;};process.stdin.on('keypress',handler);process.stdin.resume();});
}
const app=createApp();try{app.createAdmin(email,password);console.log('Đã tạo tài khoản quản trị.');}catch(e){console.error(e.message);process.exitCode=1;}finally{app.close();}
