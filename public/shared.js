export const $ = id => document.getElementById(id);
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money = n => new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(n);
export const date = n => new Date(n).toLocaleString('vi-VN');
export const paymentLabels = {unpaid:'Chưa thanh toán',paid:'Đã thanh toán',refund_pending:'Chờ hoàn tiền',refunded:'Đã hoàn tiền'};
export const statusLabels = {pending:'Chờ xác nhận',confirmed:'Đã xác nhận',preparing:'Đang chuẩn bị',shipping:'Đang giao',delivered:'Đã giao',cancelled:'Đã hủy'};
let csrf='';
export async function api(path,method='GET',body) {
 const response=await fetch('/api'+path,{method,headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 let data; try {data=await response.json();}catch {throw new Error('Không đọc được phản hồi từ máy chủ.');}
 if(data.csrf) csrf=data.csrf;
 if(!response.ok) throw Object.assign(new Error(data.error||'Yêu cầu thất bại.'),{status:response.status});
 return data;
}
export async function redirectForLogin(error,path) {
 if(![401,403].includes(error.status)) return false;
 try {
  const session=await api('/me');
  if(!session.user){location.href=path;return true;}
 } catch {}
 return false;
}
export async function busy(button,work,onError) {
 if(button?.disabled) return;
 if(button) button.disabled=true;
 try {return await work();} catch(error) {if(onError) onError(error);else alert(error.message);} finally {if(button) button.disabled=false;}
}
export function orderHtml(o,admin=false) {
 return `<div class="order-head"><div><strong>${esc(o.id)}</strong><p>${date(o.created_at)}</p></div><span class="badge ${o.status}">${esc(o.statusLabel)}</span></div>
 <div class="order-items">${o.items.map(i=>`<div class="order-item"><img src="${esc(i.img)}" alt=""><div><strong>${esc(i.name)}</strong><p>${esc(i.color)} · ${esc(i.size)} · SL ${i.qty}</p></div><b>${money(i.price*i.qty)}</b></div>`).join('')}</div>
 <div class="order-grid"><div><h4>Giao đến</h4><p>${esc(o.receiver)} · ${esc(o.phone)}</p><p>${esc(o.address)}</p>${admin?`<p>${esc(o.customer_email)}</p>`:''}</div><div><h4>Thanh toán</h4><p>${o.method==='cod'?'Thanh toán khi nhận hàng (COD)':'Chuyển khoản ngân hàng'}</p><p><span class="badge">${paymentLabels[o.payment_status]}</span></p><p>Tiền hàng ${money(o.subtotal)} · Phí giao ${money(o.shipping)} · Giảm ${money(o.discount)}</p><strong class="total">${money(o.total)}</strong></div></div>
 ${o.pointsAwarded?`<p class="shipment">Đã tích <strong>+${o.earnedPoints} điểm</strong> cho đơn giao thành công.</p>`:''}
 ${o.carrier?`<p class="shipment">${esc(o.carrier)} · Mã vận đơn: <strong>${esc(o.tracking)}</strong></p>`:''}
 <details><summary>Lịch sử xử lý (${o.history.length})</summary><ol class="timeline">${o.history.map(h=>`<li><strong>${esc(statusLabels[h.status])}</strong><p>${esc(h.note)}</p><small>${date(h.created_at)}</small></li>`).join('')}</ol>${o.payments.map(p=>`<p>${date(p.created_at)} · ${paymentLabels[p.status]} · ${esc(p.reference)}</p>`).join('')}</details>`;
}
