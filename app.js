/* ============ 1. DỮ LIỆU MẪU (khớp bảng Products + Product_Variants ở phần 3) ============ */
const $ = s => document.querySelector(s);
const vnd = n => n.toLocaleString('vi-VN') + 'đ';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const slug = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'D').replace(/\s+/g,'').toUpperCase();
const COL = {'Trắng':'#f3f1ec','Đen':'#222','Xanh navy':'#1e3a5f','Xanh nhạt':'#bcd4ea','Xanh đậm':'#25406b','Be':'#d9c7a8','Rêu':'#5b6b3a'};

// [mã, tên, danh mục, giá, icon, màu[], size[]]
const raw = [
  ['AT','Áo thun basic cotton','Áo thun',149000,'👕',['Trắng','Đen','Xanh navy'],['S','M','L']],
  ['SM','Áo sơ mi oxford','Áo sơ mi',279000,'👔',['Trắng','Xanh nhạt'],['M','L','XL']],
  ['QJ','Quần jeans ống suông','Quần jeans',399000,'👖',['Xanh đậm','Đen'],['29','30','31']],
  ['CV','Chân váy xếp ly','Váy',229000,'👗',['Đen','Be'],['S','M','L']],
  ['AK','Áo khoác bomber','Áo khoác',459000,'🧥',['Đen','Rêu'],['M','L','XL']],
  ['MU','Mũ lưỡi trai','Phụ kiện',89000,'🧢',['Đen','Be'],['Free']]
];
const products = raw.map(([code,name,cat,price,e,cols,sizes], i) => ({
  id:i+1, code, name, cat, price, e, cols, sizes,
  variants: cols.flatMap((c,ci) => sizes.map((s,si) => ({
    sku:`${code}-${slug(c)}-${s}`, color:c, size:s,
    stock: (i+ci+si)%6===0 ? 0 : ((i*3+ci*2+si)%7)+2   // tồn kho dùng chung online + cửa hàng
  })))
}));
const allVars = () => products.flatMap(p => p.variants);
const findVar = sku => allVars().find(v => v.sku === sku);
const prodOf = sku => products.find(p => p.variants.some(v => v.sku === sku));

/* ============ 2. TRẠNG THÁI ỨNG DỤNG ============ */
let route='shop', cart=[], orders=[], voucher='', nextId=1001, M=null, PQ='', pc=[], pPhone='', pPay='Tiền mặt', lastInv=null;
const F = {q:'', cat:'Tất cả', size:'', color:''};
const ck = {name:'', phone:'', addr:'', pay:'COD'};
const ST = {pending:'Chờ xác nhận',processing:'Đang xử lý',shipped:'Đang giao',delivered:'Đã giao',cancelled:'Đã hủy'};
const FLOW = ['pending','processing','shipped','delivered'];

function toast(msg){const t=$('#toast');t.textContent=msg;t.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',2600)}

/* ============ 3. ĐIỀU HƯỚNG ============ */
function render(){
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.dataset.r === route));
  $('#cnt').textContent = cart.reduce((s,l) => s + l.qty, 0);
  $('#app').innerHTML = ({shop:shopV, cart:cartV, orders:ordersV, pos:posV, admin:adminV}[route] || shopV)();
}
function go(){route = location.hash.slice(1) || 'shop'; render(); scrollTo(0,0)}
addEventListener('hashchange', go);

/* ============ 4. TRANG CỬA HÀNG (khách hàng) ============ */
function shopV(){
  const cats = ['Tất cả', ...new Set(products.map(p => p.cat))];
  const sizes = [...new Set(products.flatMap(p => p.sizes))];
  const cols = [...new Set(products.flatMap(p => p.cols))];
  setTimeout(drawGrid);
  return `<h1>Quần áo cho mỗi ngày</h1>
  <div class="bar">
    <input placeholder="Tìm tên sản phẩm" value="${esc(F.q)}" oninput="F.q=this.value;drawGrid()">
    <select onchange="F.cat=this.value;drawGrid()">${cats.map(c=>`<option ${c===F.cat?'selected':''}>${c}</option>`).join('')}</select>
    <select onchange="F.size=this.value;drawGrid()"><option value="">Mọi size</option>${sizes.map(s=>`<option ${s===F.size?'selected':''}>${s}</option>`).join('')}</select>
    <select onchange="F.color=this.value;drawGrid()"><option value="">Mọi màu</option>${cols.map(c=>`<option ${c===F.color?'selected':''}>${c}</option>`).join('')}</select>
  </div><div id="grid" class="grid"></div>`;
}
function drawGrid(){
  const g=$('#grid'); if(!g) return;
  const list = products.filter(p =>
    (F.cat==='Tất cả' || p.cat===F.cat) &&
    p.name.toLowerCase().includes(F.q.toLowerCase()) &&
    p.variants.some(v => v.stock>0 && (!F.size||v.size===F.size) && (!F.color||v.color===F.color)));
  g.innerHTML = list.map(p => {
    const t = p.variants.reduce((s,v) => s+v.stock, 0);
    return `<article class="card" onclick="openP(${p.id})"><div class="pic">${p.e}</div><h3>${p.name}</h3>
    <div class="row"><b>${vnd(p.price)}</b><span class="mu">Còn ${t}</span></div>
    <div class="sw">${p.cols.map(c=>`<i style="background:${COL[c]}" title="${c}"></i>`).join('')}</div></article>`;
  }).join('') || '<p class="mu">Không có sản phẩm phù hợp. Thử bỏ bớt bộ lọc.</p>';
}

/* Cửa sổ chọn màu / size / số lượng */
function openP(id){const p=products.find(x=>x.id===id); M={p,color:p.cols[0],size:'',qty:1}; drawM()}
function closeM(){$('#modal').innerHTML=''}
function drawM(){
  const {p,color,size,qty}=M, v = size && p.variants.find(x => x.color===color && x.size===size);
  $('#modal').innerHTML = `<div class="ov" onclick="if(event.target===this)closeM()"><div class="dlg">
  <button class="x" onclick="closeM()" aria-label="Đóng">✕</button>
  <div class="pic big">${p.e}</div><h2>${p.name}</h2><b>${vnd(p.price)}</b>
  <p class="mu">Màu: ${color}</p>
  <div class="opts">${p.cols.map(c=>`<button class="sw2 ${c===color?'on':''}" onclick="M.color='${c}';M.size='';drawM()"><i style="background:${COL[c]}"></i>${c}</button>`).join('')}</div>
  <p class="mu">Size</p>
  <div class="opts">${p.sizes.map(s=>{const st=p.variants.find(x=>x.color===color&&x.size===s).stock;
    return `<button class="chip ${s===size?'on':''}" ${st?'':'disabled'} onclick="M.size='${s}';M.qty=1;drawM()">${s}${st?'':' (hết)'}</button>`}).join('')}</div>
  <p class="mu">${v ? `Mã ${v.sku} · còn ${v.stock} sản phẩm` : 'Chọn size để xem số lượng còn lại'}</p>
  <div class="row"><div class="qty"><button onclick="M.qty=Math.max(1,M.qty-1);drawM()">−</button><span>${qty}</span><button onclick="M.qty=Math.min(${v?v.stock:1},M.qty+1);drawM()">+</button></div>
  <button class="btn" ${v?'':'disabled'} onclick="addCart('${v?v.sku:''}',M.qty)">Thêm vào giỏ</button></div>
  </div></div>`;
}
function addCart(sku,q){
  const v=findVar(sku), l=cart.find(x=>x.sku===sku);
  if(l) l.qty=Math.min(v.stock,l.qty+q); else cart.push({sku,qty:q});
  closeM(); render(); toast('Đã thêm vào giỏ hàng');
}

/* ============ 5. GIỎ HÀNG + ĐẶT HÀNG ============ */
function calc(){
  const sub = cart.reduce((s,l) => s + l.qty*prodOf(l.sku).price, 0);
  const vc = voucher==='GIAM10' ? Math.round(sub*.1) : 0;
  const ship = (!cart.length || sub>=500000 || voucher==='FREESHIP') ? 0 : 30000;
  return {sub, vc, ship, total: sub-vc+ship};
}
function cartV(){
  if(!cart.length) return `<h1>Giỏ hàng</h1><div class="box">Giỏ hàng đang trống. <a href="#shop" style="color:var(--ac);font-weight:700">Xem sản phẩm</a></div>`;
  const t = calc();
  return `<h1>Giỏ hàng</h1><div class="two"><section class="box">
  ${cart.map(l=>{const p=prodOf(l.sku),v=findVar(l.sku);return `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--ln)">
    <div>${p.e} <b>${p.name}</b><div class="mu">${v.color} · ${v.size} · ${vnd(p.price)}</div></div>
    <div class="qty"><button onclick="chg('${l.sku}',-1)">−</button><span>${l.qty}</span><button onclick="chg('${l.sku}',1)">+</button></div></div>`}).join('')}
  <div class="bar" style="margin-top:12px"><input id="vc" placeholder="Mã giảm giá (GIAM10, FREESHIP)" value="${esc(voucher)}"><button onclick="applyV()">Áp dụng</button></div>
  <div class="row"><span>Tạm tính</span><span>${vnd(t.sub)}</span></div>
  <div class="row"><span>Giảm giá</span><span>−${vnd(t.vc)}</span></div>
  <div class="row"><span>Phí vận chuyển</span><span>${t.ship?vnd(t.ship):'Miễn phí'}</span></div>
  <div class="row" style="font-size:18px"><b>Tổng cộng</b><b>${vnd(t.total)}</b></div></section>
  <section class="box"><h3>Thông tin nhận hàng</h3><div class="f">
    <input placeholder="Họ và tên" value="${esc(ck.name)}" oninput="ck.name=this.value">
    <input placeholder="Số điện thoại (10 số)" inputmode="numeric" value="${esc(ck.phone)}" oninput="ck.phone=this.value">
    <input placeholder="Địa chỉ giao hàng" value="${esc(ck.addr)}" oninput="ck.addr=this.value">
    <select onchange="ck.pay=this.value">${['COD','Ví điện tử','Chuyển khoản'].map(m=>`<option ${m===ck.pay?'selected':''} value="${m}">${m==='COD'?'Thanh toán khi nhận hàng (COD)':m}</option>`).join('')}</select>
    <button class="btn" onclick="placeOrder()">Đặt hàng</button></div></section></div>`;
}
function chg(sku,d){
  const l=cart.find(x=>x.sku===sku); l.qty=Math.min(findVar(sku).stock, l.qty+d);
  if(l.qty<=0) cart=cart.filter(x=>x!==l); render();
}
function applyV(){
  const c=$('#vc').value.trim().toUpperCase();
  if(c && !['GIAM10','FREESHIP'].includes(c)) return toast('Mã giảm giá không hợp lệ');
  voucher=c; render(); if(c) toast('Đã áp dụng mã ' + c);
}
/* Tạo đơn: trừ/giữ tồn kho ngay (giống use case "Đặt hàng online") */
function mkOrder(channel,name,phone,addr,lines,total,pay){
  lines.forEach(l => findVar(l.sku).stock -= l.qty);
  const o = {id:nextId++, channel, name, phone, addr, pay, total,
    lines: lines.map(l => ({sku:l.sku, qty:l.qty, price:prodOf(l.sku).price})),
    status: channel==='pos' ? 'delivered' : 'pending',
    payStatus: (channel==='pos' || pay!=='COD') ? 'Đã thanh toán' : 'Chưa thanh toán',
    time: new Date().toLocaleString('vi-VN')};
  orders.unshift(o); return o;
}
function placeOrder(){
  if(!ck.name.trim() || !/^0\d{9}$/.test(ck.phone) || !ck.addr.trim())
    return toast('Cần nhập họ tên, số điện thoại 10 số và địa chỉ');
  if(cart.some(l => findVar(l.sku).stock < l.qty)) return toast('Có sản phẩm vừa hết hàng. Hãy kiểm tra lại giỏ');
  const o = mkOrder('online', ck.name, ck.phone, ck.addr, cart, calc().total, ck.pay);
  cart=[]; voucher=''; toast('Đặt hàng thành công, mã đơn #' + o.id); location.hash='orders';
}

/* ============ 6. THEO DÕI ĐƠN HÀNG ============ */
const lineTxt = o => o.lines.map(l => {const p=prodOf(l.sku),v=findVar(l.sku); return `${p.name} (${v.color}, ${v.size}) ×${l.qty}`}).join('<br>');
const track = o => o.status==='cancelled' ? '<span class="tag bad">Đã hủy</span>' :
  `<div class="trk">${FLOW.map((s,i)=>`<span class="${i<=FLOW.indexOf(o.status)?'on':''}">${ST[s]}</span>`).join('')}</div>`;
function restock(o){o.lines.forEach(l => findVar(l.sku).stock += l.qty)}
function cancelOrder(id){
  const o=orders.find(x=>x.id===id); if(!o || o.status==='cancelled') return;
  o.status='cancelled'; restock(o); render(); toast('Đã hủy đơn #'+id+' và trả hàng về kho');
}
function ordersV(){
  const mine = orders.filter(o => o.channel==='online');
  return `<h1>Đơn của tôi</h1>` + (mine.map(o => `<div class="box"><div class="row"><b>Đơn #${o.id}</b><span class="mu">${o.time}</span></div>
    <p>${lineTxt(o)}</p><div class="row"><span>${o.pay} · ${o.payStatus}</span><b>${vnd(o.total)}</b></div>${track(o)}
    ${o.status==='pending'?`<p><button onclick="cancelOrder(${o.id})">Hủy đơn</button></p>`:''}</div>`).join('')
    || '<div class="box">Bạn chưa có đơn hàng nào. <a href="#shop" style="color:var(--ac);font-weight:700">Mua sắm ngay</a></div>');
}

/* ============ 7. BÁN HÀNG TẠI QUẦY (POS cho nhân viên) ============ */
function posV(){
  setTimeout(drawPos);
  return `<h1>Bán hàng tại quầy</h1><div class="two"><section>
    <input style="width:100%;margin-bottom:10px" placeholder="Tìm theo tên hoặc mã SKU" value="${esc(PQ)}" oninput="PQ=this.value;drawPos()">
    <div id="posList" class="box scroll"></div></section><section class="box" id="posBill"></section></div>`;
}
function drawPos(){
  const L=$('#posList'), B=$('#posBill'); if(!L) return;
  const q=PQ.toLowerCase();
  L.innerHTML = '<table>' + allVars().filter(v => prodOf(v.sku).name.toLowerCase().includes(q) || v.sku.toLowerCase().includes(q)).slice(0,14).map(v =>
    `<tr><td>${prodOf(v.sku).name}<div class="mu">${v.sku} · ${v.color} · ${v.size}</div></td><td>còn ${v.stock}</td>
    <td><button ${v.stock?'':'disabled'} onclick="posAdd('${v.sku}')">Thêm</button></td></tr>`).join('') + '</table>';
  const tot = pc.reduce((s,l) => s + l.qty*prodOf(l.sku).price, 0);
  B.innerHTML = `<h3>Hóa đơn</h3>` + (pc.map(l=>`<div class="row"><span>${prodOf(l.sku).name} (${findVar(l.sku).size}) ×${l.qty}</span>
    <button onclick="pc=pc.filter(x=>x.sku!=='${l.sku}');drawPos()">✕</button></div>`).join('') || '<p class="mu">Chưa có sản phẩm. Chọn từ danh sách bên trái.</p>') +
    `<div class="f"><input placeholder="SĐT khách để tích điểm (không bắt buộc)" value="${esc(pPhone)}" oninput="pPhone=this.value">
    <select onchange="pPay=this.value">${['Tiền mặt','Chuyển khoản','Thẻ'].map(m=>`<option ${m===pPay?'selected':''}>${m}</option>`).join('')}</select>
    <div class="row" style="font-size:18px"><b>Tổng</b><b>${vnd(tot)}</b></div>
    <button class="btn" ${pc.length?'':'disabled'} onclick="posPay()">Thanh toán và xuất hóa đơn</button></div>` +
    (lastInv ? `<p class="mu" style="margin-top:12px">Hóa đơn gần nhất: #${lastInv.id}, ${vnd(lastInv.total)}${lastInv.pts?`, tích ${lastInv.pts} điểm`:''}</p>` : '');
}
function posAdd(sku){
  const v=findVar(sku), l=pc.find(x=>x.sku===sku);
  if(l){ if(l.qty<v.stock) l.qty++; else toast('Đã hết số lượng trong kho'); } else pc.push({sku,qty:1});
  drawPos();
}
function posPay(){
  const tot = pc.reduce((s,l) => s + l.qty*prodOf(l.sku).price, 0);
  const o = mkOrder('pos', pPhone||'Khách lẻ', pPhone, 'Tại cửa hàng', pc, tot, pPay);
  o.pts = pPhone ? Math.floor(tot/10000) : 0;   // 10.000đ = 1 điểm
  lastInv=o; pc=[]; pPhone=''; drawPos(); toast('Đã xuất hóa đơn #'+o.id+', tồn kho đã trừ');
}

/* ============ 8. TRANG QUẢN TRỊ ============ */
function nextStatus(id){
  const o=orders.find(x=>x.id===id), i=FLOW.indexOf(o.status);
  if(i>=0 && i<FLOW.length-1){ o.status=FLOW[i+1]; if(o.status==='delivered') o.payStatus='Đã thanh toán'; render(); }
}
function addStock(sku){findVar(sku).stock += 10; render(); toast('Đã nhập thêm 10 sản phẩm ' + sku)}
function adminV(){
  const ok = orders.filter(o => o.status!=='cancelled');
  const low = allVars().filter(v => v.stock<=2);
  return `<h1>Quản trị</h1><p class="mu">Bản demo chưa có đăng nhập. Hệ thống thật cần phân quyền theo vai trò admin / staff.</p>
  <div class="stats"><div class="box"><b>${vnd(ok.reduce((s,o)=>s+o.total,0))}</b><span class="mu">Doanh thu</span></div>
  <div class="box"><b>${orders.length}</b><span class="mu">Tổng số đơn</span></div>
  <div class="box"><b>${orders.filter(o=>o.status==='pending').length}</b><span class="mu">Đơn chờ xác nhận</span></div>
  <div class="box"><b>${low.length}</b><span class="mu">Mẫu sắp hết hàng</span></div></div>
  <h3>Đơn hàng</h3><div class="box scroll"><table><tr><th>Mã</th><th>Kênh</th><th>Khách</th><th>Sản phẩm</th><th>Tổng</th><th>Trạng thái</th><th></th></tr>
  ${orders.map(o=>`<tr><td>#${o.id}</td><td>${o.channel==='pos'?'Tại quầy':'Online'}</td><td>${esc(o.name)}</td><td>${lineTxt(o)}</td><td>${vnd(o.total)}</td>
   <td><span class="tag ${o.status==='cancelled'?'bad':o.status==='delivered'?'ok':'warn'}">${ST[o.status]}</span></td>
   <td>${o.channel==='online'&&!['delivered','cancelled'].includes(o.status)?`<button onclick="nextStatus(${o.id})">Chuyển bước tiếp</button> <button onclick="cancelOrder(${o.id})">Hủy</button>`:''}</td></tr>`).join('')
   || '<tr><td colspan="7" class="mu">Chưa có đơn hàng. Hãy đặt thử một đơn ở trang Cửa hàng hoặc Bán tại quầy.</td></tr>'}</table></div>
  <h3>Tồn kho theo biến thể</h3><div class="box scroll" style="max-height:340px"><table><tr><th>SKU</th><th>Sản phẩm</th><th>Còn lại</th><th></th></tr>
  ${allVars().map(v=>`<tr><td>${v.sku}</td><td>${prodOf(v.sku).name} (${v.color}, ${v.size})</td>
   <td><span class="tag ${v.stock===0?'bad':v.stock<=2?'warn':'ok'}">${v.stock}</span></td><td><button onclick="addStock('${v.sku}')">Nhập thêm 10</button></td></tr>`).join('')}</table></div>`;
}

go();
