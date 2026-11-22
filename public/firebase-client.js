// Firebase is enabled only on the dedicated Hosting domain or explicit local test mode.
export const firebaseMode=/^(store-clothes-tmdt\.(web\.app|firebaseapp\.com))$/.test(location.hostname)||new URLSearchParams(location.search).has('firebase');
let loaded;
export async function firebaseApi(path,method,body){
 loaded??=import('/firebase-store.js').then(m=>m.createStore());
 try{return await (await loaded).call(path,method,body);}catch(e){
  const messages={'auth/invalid-credential':'Email hoặc mật khẩu không đúng.','auth/email-already-in-use':'Email đã được đăng ký.','auth/weak-password':'Mật khẩu cần ít nhất 8 ký tự.','permission-denied':'Bạn không có quyền thực hiện thao tác này hoặc phiên đăng nhập đã bị thu hồi.','auth/too-many-requests':'Đăng nhập quá nhiều lần, hãy thử lại sau.'};
  if(messages[e.code])e.message=messages[e.code];if(e.code==='permission-denied')e.status=403;throw e;
 }
}
