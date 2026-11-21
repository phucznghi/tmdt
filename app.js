const RAW=[
  ["tee","Áo thun basic cổ tròn",199,"#ffffff","Trắng",0,"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80"],
  ["tee","Áo thun oversize",249,"#1f2937","Đen",1,"https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80"],
  ["tee","Áo thun in chữ",229,"#f59e0b","Vàng",0,"https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=600&q=80"],
  ["tee","Áo polo nam",299,"#2563eb","Xanh dương",0,"https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&w=600&q=80"],
  ["tee","Áo thun sọc",219,"#f472b6","Hồng",1,"https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=600&q=80"],
  ["tee","Áo croptop nữ",189,"#10b981","Xanh lá",0,"https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80"],
  ["shirt","Sơ mi trắng công sở",349,"#fafafa","Trắng",0,"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80"],
  ["shirt","Sơ mi caro",379,"#b91c1c","Đỏ đô",1,"https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80"],
  ["shirt","Sơ mi linen",399,"#d6c3a1","Be",0,"https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=600&q=80"],
  ["shirt","Sơ mi denim",429,"#3b6ea5","Xanh denim",0,"https://images.unsplash.com/photo-1588359386417-3192772e16c4?auto=format&fit=crop&w=600&q=80"],
  ["shirt","Sơ mi họa tiết",359,"#7c3aed","Tím",1,"https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=600&q=80"],
  ["hoodie","Hoodie nỉ basic",459,"#111827","Đen",0,"https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=600&q=80"],
  ["hoodie","Hoodie oversize",499,"#fde68a","Vàng nhạt",1,"https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?auto=format&fit=crop&w=600&q=80"],
  ["hoodie","Hoodie zip",529,"#1e3a8a","Xanh navy",0,"https://images.unsplash.com/photo-1620799139834-6b8f844fbe61?auto=format&fit=crop&w=600&q=80"],
  ["hoodie","Sweater len",479,"#a16207","Nâu",0,"https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=600&q=80"],
  ["jacket","Áo khoác bomber",699,"#166534","Xanh rêu",1,"https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=600&q=80"],
  ["jacket","Áo khoác denim",649,"#60a5fa","Xanh jeans",0,"https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=600&q=80"],
  ["jacket","Áo khoác gió",549,"#0f172a","Xanh đen",0,"https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80"],
  ["jacket","Blazer thanh lịch",899,"#44403c","Xám đậm",0,"https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80"],
  ["jacket","Áo khoác dạ",1290,"#9a3412","Nâu đất",1,"https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=600&q=80"],
  ["pants","Quần jeans slim",499,"#1d4ed8","Xanh đậm",0,"https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=600&q=80"],
  ["pants","Quần jeans ống rộng",549,"#93c5fd","Xanh nhạt",1,"https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80"],
  ["pants","Quần kaki",429,"#c2a878","Be",0,"https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=600&q=80"],
  ["pants","Quần tây",459,"#111827","Đen",1,"https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=600&q=80"],
  ["pants","Quần jogger",389,"#374151","Xám than",0,"https://images.unsplash.com/photo-1552902865-b72c031ac5ea?auto=format&fit=crop&w=600&q=80"],
  ["pants","Quần culottes",419,"#f9fafb","Trắng",0,"https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=600&q=80"],
  ["shorts","Quần short kaki",249,"#a3b18a","Xanh sage",0,"https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=600&q=80"],
  ["shorts","Quần short jean",279,"#3b82f6","Xanh jeans",1,"https://images.unsplash.com/photo-1565084888279-aca607ecce0c?auto=format&fit=crop&w=600&q=80"],
  ["shorts","Quần short thể thao",199,"#ef4444","Đỏ",0,"https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=600&q=80"],
  ["skirt","Chân váy chữ A",299,"#ec4899","Hồng đậm",0,"https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=600&q=80"],
  ["skirt","Chân váy xếp ly",329,"#0ea5e9","Xanh biển",1,"https://images.unsplash.com/photo-1577900258307-26411733b430?auto=format&fit=crop&w=600&q=80"],
  ["dress","Đầm hoa nhí",459,"#fb7185","Hồng san hô",0,"https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=600&q=80"],
  ["dress","Đầm suông",429,"#14b8a6","Xanh ngọc",0,"https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80"],
  ["dress","Đầm maxi",589,"#a855f7","Tím",1,"https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=600&q=80"]
];

const D=RAW.map((a,i)=>({
  id:i,t:a[0],n:a[1],p:a[2]*1000,c:a[3],cn:a[4],s:!!a[5],img:a[6]
}));

const CAT={tee:"Áo",shirt:"Áo",hoodie:"Áo",jacket:"Áo khoác",pants:"Quần",shorts:"Quần",skirt:"Váy & Đầm",dress:"Váy & Đầm"};
const DESC={
  "Áo":"Chất cotton mềm, thoáng khí, dễ layer mặc hằng ngày và mùa se lạnh.",
  "Áo khoác":"Dày vừa, giữ ấm tốt, đường may chắc chắn cho tiết trời cuối năm.",
  "Quần":"Vải co giãn nhẹ, đứng form, thoải mái cả ngày dài.",
  "Váy & Đầm":"Chất vải nhẹ, rủ đẹp, phù hợp đi làm, dạo phố và tiệc cuối năm."
};

const fallbackSvg=(label,bg)=>`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750"><rect width="600" height="750" fill="#e5e7eb"/><circle cx="300" cy="330" r="110" fill="${bg}" stroke="#17181a" stroke-opacity=".2" stroke-width="4"/><text x="300" y="500" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="700" fill="#17181a">${label}</text></svg>`)}`;

const imgTag=(p,alt)=>`<img src="${p.img}" alt="${esc(alt||p.n)}" loading="lazy" onerror="this.onerror=null;this.src=fallbackSvg('${esc(p.n)}','${esc(p.c)}')">`;

const money=n=>n.toLocaleString("vi-VN")+"₫",price=p=>p.s?Math.round(p.p*.9):p.p;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $=id=>document.getElementById(id);
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let cat="Tất cả",cart=store.get("lm_cart",[]),user=store.get("lm_user",null),pend=false;

$("heroImg").onerror=function(){this.onerror=null;this.src=fallbackSvg("An Yen Thu Dong","#d92d20")};
$("chips").innerHTML=["Tất cả","Áo","Áo khoác","Quần","Váy & Đầm","Sale"].map(c=>`<button class="chip" data-c="${c}" style="margin-right:6px">${c}</button>`).join("");
$("chips").onclick=e=>{const c=e.target.dataset.c;if(c){cat=c;render()}};
$("q").oninput=render;$("sort").onchange=render;
$("goShop").onclick=()=>$("shop").scrollIntoView({behavior:"smooth"});

function render(){
 const q=$("q").value.trim().toLowerCase();
 document.querySelectorAll(".chip").forEach(b=>b.classList.toggle("on",b.dataset.c===cat));
 let L=D.filter(p=>(cat==="Tất cả"||(cat==="Sale"?p.s:CAT[p.t]===cat))&&(p.n+" "+p.cn).toLowerCase().includes(q));
 const s=$("sort").value;
 if(s==="a")L.sort((a,b)=>price(a)-price(b));if(s==="z")L.sort((a,b)=>price(b)-price(a));if(s==="s")L.sort((a,b)=>b.s-a.s);
 $("grid").innerHTML=L.length?L.map(p=>`<button class="pc" data-id="${p.id}"><div class="pi">${p.s?'<span class="sale">SALE -10%</span>':""}${imgTag(p)}</div><h3>${p.n}</h3><div class="m">${p.cn}</div><div class="pr">${p.s?`<em>${money(price(p))}</em><s>${money(p.p)}</s>`:money(p.p)}</div></button>`).join(""):'<div class="empty">Không tìm thấy sản phẩm phù hợp. Hãy thử từ khóa khác.</div>';
}
$("grid").onclick=e=>{const b=e.target.closest(".pc");if(b)openProd(+b.dataset.id)};

function open(html,side){$("box").innerHTML='<button class="x" aria-label="Đóng" onclick="closeM()">×</button>'+html;$("ov").className="ov show"+(side?" side":"")}
function closeM(){$("ov").className="ov"}
$("ov").onclick=e=>{if(e.target.id==="ov")closeM()};
document.onkeydown=e=>{if(e.key==="Escape")closeM()};
function toast(m){const t=$("toast");t.textContent=m;t.style.display="block";clearTimeout(t._h);t._h=setTimeout(()=>t.style.display="none",2200)}

let selSize="";
function openProd(id){
 const p=D[id],k=CAT[p.t],sizes=k==="Quần"?["28","30","32","34"]:["S","M","L","XL"];selSize=sizes[1];
 const r=(4+((id*7)%10)/10).toFixed(1);
 open(`<div class="det"><div class="pi">${p.s?'<span class="sale">SALE -10%</span>':""}${imgTag(p)}</div><div>
 <div class="m" style="color:var(--mute)">${k}</div><h2>${p.n}</h2>
 <div style="margin-bottom:8px">★ ${r} · đã bán ${40+id*13}</div>
 <div class="pr" style="font-size:22px">${p.s?`<em>${money(price(p))}</em><s>${money(p.p)}</s>`:money(p.p)}</div>
 <p style="color:var(--mute)">${DESC[k]}</p>
 <div><span class="sw" style="background:${p.c}"></span>Màu: ${p.cn}</div>
 <div style="margin-top:14px">Kích cỡ</div><div class="sz" id="sz">${sizes.map(s=>`<button class="${s===selSize?"on":""}" data-s="${s}">${s}</button>`).join("")}</div>
 <button class="btn p full" onclick="addCart(${id})">Thêm vào giỏ</button>
 <div class="note">Miễn phí đổi size trong 7 ngày.</div></div></div>`);
 $("sz").onclick=e=>{const s=e.target.dataset.s;if(!s)return;selSize=s;[...$("sz").children].forEach(b=>b.classList.toggle("on",b.dataset.s===s))};
}
function addCart(id){const i=cart.find(x=>x.id===id&&x.s===selSize);i?i.q++:cart.push({id,s:selSize,q:1});sync();closeM();toast("Đã thêm vào giỏ hàng")}
function sync(){store.set("lm_cart",cart);$("cc").textContent=cart.reduce((a,b)=>a+b.q,0)}
const sub=()=>cart.reduce((a,x)=>a+price(D[x.id])*x.q,0),ship=()=>sub()>=2000000||!cart.length?0:30000;

function openCart(){
 if(!cart.length){open('<h2 style="margin-top:0">Giỏ hàng</h2><div class="empty" style="padding:40px 0">Giỏ hàng đang trống. Chọn vài món bạn thích nhé.</div>',1);return}
 const left=Math.max(0,2000000-sub());
 open(`<h2 style="margin-top:0">Giỏ hàng</h2>${cart.map((x,i)=>{const p=D[x.id];return `<div class="ci"><div class="pi">${imgTag(p)}</div><div class="t"><b>${p.n}</b><br><span style="color:var(--mute)">${p.cn} · Size ${x.s}</span><br>${money(price(p))}<br><span class="qty"><button onclick="qty(${i},-1)">−</button>${x.q}<button onclick="qty(${i},1)">+</button></span></div></div>`}).join("")}
 <div class="note">${left?`Mua thêm ${money(left)} để được miễn phí vận chuyển.`:"Đơn của bạn được miễn phí vận chuyển."}</div>
 <div class="row"><span>Tạm tính</span><span>${money(sub())}</span></div><div class="row"><span>Vận chuyển</span><span>${ship()?money(ship()):"Miễn phí"}</span></div>
 <div class="row t"><span>Tổng cộng</span><span>${money(sub()+ship())}</span></div>
 <button class="btn p full" style="margin-top:14px" onclick="checkout()">Thanh toán</button>`,1);
}
function qty(i,d){cart[i].q+=d;if(cart[i].q<1)cart.splice(i,1);sync();openCart()}
$("cartBtn").onclick=openCart;

function checkout(){
 if(!user){pend=true;authM("login");return}
 open(`<h2 style="margin-top:0">Thông tin giao hàng</h2><label>Họ và tên</label><input class="in" id="f1" value="${esc(user.name)}">
 <label>Số điện thoại</label><input class="in" id="f2" inputmode="tel" value="${esc(user.phone||"")}">
 <label>Địa chỉ nhận hàng</label><input class="in" id="f3" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành">
 <label>Ghi chú</label><input class="in" id="f4" placeholder="Ví dụ: giao giờ hành chính">
 <label>Thanh toán</label><div class="pay"><label><input type="radio" name="pm" checked>Tiền mặt khi nhận</label><label><input type="radio" name="pm">Chuyển khoản</label><label><input type="radio" name="pm">Thẻ ATM/Visa</label></div>
 <div class="row t"><span>Tổng cộng</span><span>${money(sub()+ship())}</span></div><div class="err" id="er"></div>
 <button class="btn p full" onclick="place()">Đặt hàng</button>`,1);
}
function place(){
 if(!$("f1").value.trim()||!/^0\d{9}$/.test($("f2").value.trim())||!$("f3").value.trim()){$("er").textContent="Vui lòng nhập đủ họ tên, số điện thoại 10 số và địa chỉ nhận hàng.";return}
 const code="LM"+Date.now().toString().slice(-7);cart=[];sync();
 open(`<div style="text-align:center;padding:30px 0"><div style="font-size:44px">✓</div><h2>Đặt hàng thành công</h2><p>Mã đơn hàng: <b>${code}</b></p><p style="color:var(--mute)">An Yên sẽ gọi xác nhận trong ít phút. Cảm ơn bạn đã mua sắm.</p><button class="btn p" onclick="closeM()">Tiếp tục mua sắm</button></div>`,1);
}

function authM(mode){
 const reg=mode==="reg";
 open(`<h2 style="margin-top:0">${reg?"Tạo tài khoản":"Đăng nhập"}</h2>
 ${reg?'<label>Họ và tên</label><input class="in" id="a1"><label>Số điện thoại</label><input class="in" id="a4" inputmode="tel">':""}
 <label>Email</label><input class="in" id="a2" type="email" autocomplete="email"><label>Mật khẩu</label><input class="in" id="a3" type="password" autocomplete="${reg?"new-password":"current-password"}">
 <div class="err" id="er"></div><button class="btn p full" onclick="${reg?"doReg()":"doLogin()"}">${reg?"Đăng ký":"Đăng nhập"}</button>
 <p style="text-align:center;color:var(--mute)">${reg?"Đã có tài khoản?":"Chưa có tài khoản?"} <a href="#" onclick="authM('${reg?"login":"reg"}');return false" style="color:var(--ink);font-weight:700">${reg?"Đăng nhập":"Đăng ký"}</a></p>`);
}
const users=()=>store.get("lm_users",[]);
function doReg(){
 const n=$("a1").value.trim(),e=$("a2").value.trim().toLowerCase(),p=$("a3").value,ph=$("a4").value.trim();
 if(!n||!/^\S+@\S+\.\S+$/.test(e)){$("er").textContent="Vui lòng nhập họ tên và email hợp lệ.";return}
 if(p.length<6){$("er").textContent="Mật khẩu cần ít nhất 6 ký tự.";return}
 const u=users();if(u.some(x=>x.e===e)){$("er").textContent="Email này đã được đăng ký. Hãy đăng nhập.";return}
 u.push({n,e,p,ph});store.set("lm_users",u);setUser({name:n,email:e,phone:ph});
}
function doLogin(){
 const e=$("a2").value.trim().toLowerCase(),p=$("a3").value,m=users().find(x=>x.e===e&&x.p===p);
 if(!m){$("er").textContent="Email hoặc mật khẩu chưa đúng. Hãy kiểm tra lại.";return}
 setUser({name:m.n,email:m.e,phone:m.ph});
}
function setUser(u){user=u;store.set("lm_user",u);ua();toast("Xin chào, "+u.name);if(pend){pend=false;checkout()}else closeM()}
function ua(){$("acct").textContent=user?"Chào, "+user.name.split(" ").pop():"Đăng nhập"}
$("acct").onclick=()=>{if(!user){authM("login");return}
 open(`<h2 style="margin-top:0">Tài khoản</h2><p><b>${esc(user.name)}</b><br>${esc(user.email)}${user.phone?"<br>"+esc(user.phone):""}</p><button class="btn full" onclick="logout()">Đăng xuất</button>`)};
function logout(){user=null;store.set("lm_user",null);ua();closeM();toast("Đã đăng xuất")}
ua();sync();render();
