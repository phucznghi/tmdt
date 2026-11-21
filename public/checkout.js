import {esc} from '/shared.js';
export function mountFulfillment(container,config,addressInput,onChange,onError){
 container.innerHTML=`<fieldset style="border:1px solid #dce5de;border-radius:12px;padding:12px;display:grid;gap:12px"><legend>Cách nhận hàng</legend><label>Hình thức nhận hàng<select name="fulfillment" style="width:100%;padding:10px;border:1px solid #bdccbf;border-radius:8px"><option value="delivery">Giao đến địa chỉ</option><option value="pickup">Lấy tại cửa hàng</option></select></label><label data-province>Tỉnh / thành phố<select name="province" style="width:100%;padding:10px;border:1px solid #bdccbf;border-radius:8px" required><option value="">Chọn tỉnh / thành phố</option>${config.provinces.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join('')}</select></label><p data-store hidden>Nhận tại: <strong>${esc(config.storeAddress)}</strong></p><p style="font-size:14px;color:#53675a">Nhận tại cửa hàng hoặc giao trong ${esc(config.storeProvince)} miễn phí. Ngoài tỉnh ${config.outsideFee.toLocaleString('vi-VN')}đ/đơn.</p></fieldset>`;
 const mode=container.querySelector('[name=fulfillment]'),province=container.querySelector('[name=province]'),provinceLabel=container.querySelector('[data-province]'),store=container.querySelector('[data-store]'),addressWrapper=addressInput.closest('label')||addressInput;
 let pending=Promise.resolve();
 function sync(){const pickup=mode.value==='pickup';provinceLabel.style.display=pickup?'none':'';store.hidden=!pickup;province.required=!pickup;province.disabled=pickup;addressWrapper.style.display=pickup?'none':'';addressInput.disabled=pickup;addressInput.required=!pickup;}
 const read=()=>({fulfillment:mode.value,province:mode.value==='pickup'?config.storeProvince:province.value});
 function set(choice){mode.value=choice.fulfillment||'delivery';province.value=choice.province||'';sync();}
 function change(){sync();const choice=read();mode.disabled=true;province.disabled=true;pending=pending.then(()=>onChange(choice)).catch(onError).finally(()=>{mode.disabled=false;sync();});}
 mode.addEventListener('change',change);province.addEventListener('change',change);sync();
 return {read,set,wait:()=>pending};
}
