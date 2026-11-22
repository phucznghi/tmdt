// Set this to the deployed Node.js website when online hosting is available.
const MOC_VAI_BACKEND_URL = '';
(() => {
 const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
 const destination=local?'http://'+location.hostname+':3000':MOC_VAI_BACKEND_URL;
 if(local&&location.port!=='3000'){
  location.replace(destination+'/'+location.search+location.hash);
  return;
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const modal=document.getElementById('auth-modal');
  const panel=modal?.firstElementChild;
  if(!panel)return;
  panel.innerHTML=`<button type="button" id="static-auth-close" aria-label="Đóng" style="position:absolute;right:18px;top:12px;font-size:26px;color:#64748b">×</button><h2 style="text-align:center;font-size:28px;font-weight:800;color:#1b4332;margin:16px 0">MỘC <span style="color:#d97706">VẢI</span></h2><h3 style="text-align:center;font-size:22px;font-weight:700;margin-bottom:20px">Đăng nhập tài khoản</h3><div id="static-auth-links" style="display:grid;gap:12px"></div><p id="static-auth-notice" style="margin-top:18px;font-size:14px;line-height:1.7;color:#627768"></p>`;
  const links=document.getElementById('static-auth-links');
  for(const [label,path] of [['Khách hàng','/account'],['Nhân viên / Quản trị','/account?admin=1']]){
   const a=document.createElement(destination?'a':'button');a.textContent=label;
   a.style.cssText='display:block;text-align:center;padding:14px;border-radius:30px;background:#1b4332;color:white;font-weight:600';
   if(destination)a.href=new URL(path,destination).href;else{a.disabled=true;a.style.opacity='.55';}
   links.append(a);
  }
  document.getElementById('static-auth-notice').textContent=destination?'Đăng nhập bằng tài khoản của bạn để tiếp tục.':'Bản xem trước GitHub Pages chưa được kết nối máy chủ. Đăng nhập và phân quyền sẽ hoạt động khi cửa hàng triển khai backend online. Nếu chạy trên máy, mở http://127.0.0.1:3000/account.';
  const close=()=>{modal.classList.add('hidden');modal.classList.remove('flex');};
  document.getElementById('static-auth-close').onclick=close;
  document.getElementById('header-account-btn')?.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();modal.classList.remove('hidden');modal.classList.add('flex');},true);
 });
})();
