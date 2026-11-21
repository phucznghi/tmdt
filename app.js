const RAW=[
  ["tee","Áo thun basic cổ tròn",199,"#ffffff","Trắng",0],
  ["tee","Áo thun oversize",249,"#1f2937","Đen",1],
  ["tee","Áo thun in chữ",229,"#f59e0b","Vàng",0],
  ["tee","Áo polo nam",299,"#2563eb","Xanh dương",0],
  ["tee","Áo thun sọc",219,"#f472b6","Hồng",1],
  ["tee","Áo croptop nữ",189,"#10b981","Xanh lá",0],
  ["shirt","Sơ mi trắng công sở",349,"#fafafa","Trắng",0],
  ["shirt","Sơ mi caro",379,"#b91c1c","Đỏ đô",1],
  ["shirt","Sơ mi linen",399,"#d6c3a1","Be",0],
  ["shirt","Sơ mi denim",429,"#3b6ea5","Xanh denim",0],
  ["shirt","Sơ mi họa tiết",359,"#7c3aed","Tím",1],
  ["hoodie","Hoodie nỉ basic",459,"#111827","Đen",0],
  ["hoodie","Hoodie oversize",499,"#fde68a","Vàng nhạt",1],
  ["hoodie","Hoodie zip",529,"#1e3a8a","Xanh navy",0],
  ["hoodie","Sweater len",479,"#a16207","Nâu",0],
  ["jacket","Áo khoác bomber",699,"#166534","Xanh rêu",1],
  ["jacket","Áo khoác denim",649,"#60a5fa","Xanh jeans",0],
  ["jacket","Áo khoác gió",549,"#0f172a","Xanh đen",0],
  ["jacket","Blazer thanh lịch",899,"#44403c","Xám đậm",0],
  ["jacket","Áo khoác dạ",1290,"#9a3412","Nâu đất",1],
  ["pants","Quần jeans slim",499,"#1d4ed8","Xanh đậm",0],
  ["pants","Quần jeans ống rộng",549,"#93c5fd","Xanh nhạt",1],
  ["pants","Quần kaki",429,"#c2a878","Be",0],
  ["pants","Quần tây",459,"#111827","Đen",1],
  ["pants","Quần jogger",389,"#374151","Xám than",0],
  ["pants","Quần culottes",419,"#f9fafb","Trắng",0],
  ["shorts","Quần short kaki",249,"#a3b18a","Xanh sage",0],
  ["shorts","Quần short jean",279,"#3b82f6","Xanh jeans",1],
  ["shorts","Quần short thể thao",199,"#ef4444","Đỏ",0],
  ["skirt","Chân váy chữ A",299,"#ec4899","Hồng đậm",0],
  ["skirt","Chân váy xếp ly",329,"#0ea5e9","Xanh biển",1],
  ["dress","Đầm hoa nhí",459,"#fb7185","Hồng san hô",0],
  ["dress","Đầm suông",429,"#14b8a6","Xanh ngọc",0],
  ["dress","Đầm maxi",589,"#a855f7","Tím",1]
];

const D=RAW.map((a,i)=>({
  id:i,t:a[0],n:a[1],p:a[2]*1000,c:a[3],cn:a[4],s:!!a[5]
}));

const CAT={tee:"Áo",shirt:"Áo",hoodie:"Áo",jacket:"Áo khoác",pants:"Quần",shorts:"Quần",skirt:"Váy & Đầm",dress:"Váy & Đầm"};
const DESC={
  "Áo":"Chất cotton mềm, thoáng khí, dễ layer mặc hằng ngày và mùa se lạnh.",
  "Áo khoác":"Dày vừa, giữ ấm tốt, đường may chắc chắn cho tiết trời cuối năm.",
  "Quần":"Vải co giãn nhẹ, đứng form, thoải mái cả ngày dài.",
  "Váy & Đầm":"Chất vải nhẹ, rủ đẹp, phù hợp đi làm, dạo phố và tiệc cuối năm."
};

// Vẽ đúng kiểu dáng & họa tiết đặc trưng theo từng mã sản phẩm (0..33)
function artInner(p){
  const c=p.c, stroke="rgba(20,22,26,.45)", dark="#17181a";
  const isLight=["#ffffff","#fafafa","#f9fafb","#fde68a","#d6c3a1","#93c5fd","#a3b18a"].includes(c.toLowerCase());
  const accent=isLight?"#334155":"#f8fafc";

  switch(p.id){
    case 0: // Áo thun basic cổ tròn - Trắng
      return `<path d="M32 20 L12 33 L20 46 L29 40 V84 H71 V40 L80 46 L88 33 L68 20 Q50 31 32 20Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>`;
    case 1: // Áo thun oversize - Đen
      return `<path d="M26 18 L6 34 L16 50 L28 42 V85 H72 V42 L84 50 L94 34 L74 18 Q50 29 26 18Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>`;
    case 2: // Áo thun in chữ - Vàng
      return `<path d="M30 19 L10 33 L18 46 L28 40 V84 H72 V40 L82 46 L90 33 L70 19 Q50 30 30 19Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <rect x="35" y="47" width="30" height="6" rx="2" fill="${dark}"/>
      <rect x="39" y="57" width="22" height="5" rx="2" fill="${dark}"/>`;
    case 3: // Áo polo nam - Xanh dương
      return `<path d="M30 19 L10 33 L18 46 L28 40 V84 H72 V40 L82 46 L90 33 L70 19 L58 25 L50 35 L42 25Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="50" y1="35" x2="50" y2="51" stroke="${accent}" stroke-width="2.2"/>
      <circle cx="50" cy="40" r="1.5" fill="${accent}"/><circle cx="50" cy="46" r="1.5" fill="${accent}"/>`;
    case 4: // Áo thun sọc - Hồng
      return `<defs><clipPath id="cp4"><path d="M30 19 L10 33 L18 46 L28 40 V84 H72 V40 L82 46 L90 33 L70 19 Q50 30 30 19Z"/></clipPath></defs>
      <g clip-path="url(#cp4)"><rect x="0" y="15" width="100" height="75" fill="${c}"/>
      <path d="M0 32 H100 M0 44 H100 M0 56 H100 M0 68 H100 M0 80 H100" stroke="#ffffff" stroke-width="4.5"/></g>
      <path d="M30 19 L10 33 L18 46 L28 40 V84 H72 V40 L82 46 L90 33 L70 19 Q50 30 30 19Z" fill="none" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>`;
    case 5: // Áo croptop nữ - Xanh lá
      return `<path d="M32 22 L13 34 L20 45 L29 40 V68 H71 V40 L80 45 L87 34 L68 22 Q50 32 32 22Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>`;
    case 6: // Sơ mi trắng công sở
      return `<path d="M32 18 L9 43 L18 52 L28 41 V85 H72 V41 L82 52 L91 43 L68 18 L50 28Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="50" y1="28" x2="50" y2="85" stroke="${stroke}" stroke-width="1.6"/>
      <circle cx="50" cy="42" r="1.5" fill="${stroke}"/><circle cx="50" cy="55" r="1.5" fill="${stroke}"/><circle cx="50" cy="68" r="1.5" fill="${stroke}"/>`;
    case 7: // Sơ mi caro - Đỏ đô
      return `<defs><clipPath id="cp7"><path d="M32 18 L9 43 L18 52 L28 41 V85 H72 V41 L82 52 L91 43 L68 18 L50 28Z"/></clipPath></defs>
      <g clip-path="url(#cp7)"><rect x="0" y="15" width="100" height="75" fill="${c}"/>
      <path d="M24 15 V90 M40 15 V90 M56 15 V90 M72 15 V90 M0 34 H100 M0 50 H100 M0 66 H100 M0 82 H100" stroke="#ffffff" stroke-opacity=".55" stroke-width="3"/></g>
      <path d="M32 18 L9 43 L18 52 L28 41 V85 H72 V41 L82 52 L91 43 L68 18 L50 28Z" fill="none" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>`;
    case 8: // Sơ mi linen - Be
      return `<path d="M32 18 L9 43 L18 52 L28 41 V85 H72 V41 L82 52 L91 43 L68 18 L50 28Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="50" y1="28" x2="50" y2="85" stroke="${stroke}" stroke-width="1.6"/>
      <path d="M34 50 H44 V62 H34Z" fill="none" stroke="${stroke}" stroke-width="1.5"/>`;
    case 9: // Sơ mi denim - Xanh denim
      return `<path d="M32 18 L9 43 L18 52 L28 41 V85 H72 V41 L82 52 L91 43 L68 18 L50 28Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="50" y1="28" x2="50" y2="85" stroke="#fde68a" stroke-width="1.6" stroke-dasharray="3 2"/>
      <path d="M33 48 H44 V60 H33ZM56 48 H67 V60 H56Z" fill="none" stroke="#fde68a" stroke-width="1.5"/>`;
    case 10: // Sơ mi họa tiết - Tím
      return `<path d="M32 18 L9 43 L18 52 L28 41 V85 H72 V41 L82 52 L91 43 L68 18 L50 28Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="38" cy="48" r="3" fill="#fde68a"/><circle cx="62" cy="52" r="3" fill="#fde68a"/><circle cx="42" cy="68" r="3" fill="#86efac"/><circle cx="58" cy="72" r="3" fill="#86efac"/>`;
    case 11: // Hoodie nỉ basic - Đen
      return `<path d="M31 23 Q50 10 69 23 L90 48 L80 58 L70 45 V85 H30 V45 L20 58 L10 48Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M36 64 H64 V76 H36Z" fill="none" stroke="${accent}" stroke-width="1.8"/>`;
    case 12: // Hoodie oversize - Vàng nhạt
      return `<path d="M27 22 Q50 8 73 22 L94 48 L82 60 L71 46 V86 H29 V46 L18 60 L6 48Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M44 31 V46 M56 31 V46" stroke="${stroke}" stroke-width="1.8"/>`;
    case 13: // Hoodie zip - Xanh navy
      return `<path d="M31 23 Q50 10 69 23 L90 48 L80 58 L70 45 V85 H30 V45 L20 58 L10 48Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="50" y1="29" x2="50" y2="85" stroke="${accent}" stroke-width="2.2"/>`;
    case 14: // Sweater len - Nâu
      return `<path d="M30 20 L9 38 L18 50 L28 41 V85 H72 V41 L82 50 L91 38 L70 20 Q50 30 30 20Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M28 78 H72 M28 41 H18 M72 41 H82" stroke="${accent}" stroke-opacity=".5" stroke-width="3"/>`;
    case 15: // Áo khoác bomber - Xanh rêu
      return `<path d="M31 18 L8 42 L17 52 L28 41 V83 H72 V41 L83 52 L92 42 L69 18 L50 26Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <rect x="28" y="79" width="44" height="6" rx="2" fill="#1e293b"/>`;
    case 16: // Áo khoác denim - Xanh jeans
      return `<path d="M31 18 L8 42 L17 52 L28 41 V85 H72 V41 L83 52 L92 42 L69 18 L50 26Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="50" y1="26" x2="50" y2="85" stroke="#1e3a8a" stroke-width="1.8"/>
      <path d="M33 47 H44 V58 H33ZM56 47 H67 V58 H56Z" fill="none" stroke="#1e3a8a" stroke-width="1.6"/>`;
    case 17: // Áo khoác gió - Xanh đen
      return `<path d="M31 18 L8 42 L17 52 L28 41 V85 H72 V41 L83 52 L92 42 L69 18 Q50 28 31 18Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="50" y1="25" x2="50" y2="85" stroke="#38bdf8" stroke-width="2"/>`;
    case 18: // Blazer thanh lịch - Xám đậm
      return `<path d="M31 16 L8 44 L17 53 L28 41 V86 H72 V41 L83 53 L92 44 L69 16 L50 25Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M50 25 L38 52 L50 62 L62 52Z" fill="none" stroke="${accent}" stroke-width="1.8"/>
      <path d="M33 66 H45 M55 66 H67" stroke="${accent}" stroke-width="1.6"/>`;
    case 19: // Áo khoác dạ - Nâu đất
      return `<path d="M31 15 L9 44 L19 52 L29 40 V89 H71 V40 L81 52 L91 44 L69 15 L50 25Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="50" y1="25" x2="50" y2="89" stroke="${stroke}" stroke-width="1.8"/>
      <circle cx="55" cy="48" r="2.2" fill="${accent}"/><circle cx="55" cy="62" r="2.2" fill="${accent}"/>`;
    case 20: // Quần jeans slim - Xanh đậm
      return `<path d="M32 14 H68 L73 88 H53 L50 42 L47 88 H27Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="32" y1="24" x2="68" y2="24" stroke="#f59e0b" stroke-width="1.6"/>
      <line x1="50" y1="24" x2="50" y2="42" stroke="#f59e0b" stroke-width="1.6"/>`;
    case 21: // Quần jeans ống rộng - Xanh nhạt
      return `<path d="M30 14 H70 L79 88 H54 L50 40 L46 88 H21Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="30" y1="24" x2="70" y2="24" stroke="#2563eb" stroke-width="1.6"/>`;
    case 22: // Quần kaki - Be
      return `<path d="M31 14 H69 L75 88 H53 L50 41 L47 88 H25Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="31" y1="24" x2="69" y2="24" stroke="${stroke}" stroke-width="1.6"/>
      <path d="M31 24 L40 38 M69 24 L60 38" stroke="${stroke}" stroke-width="1.5"/>`;
    case 23: // Quần tây - Đen
      return `<path d="M31 14 H69 L75 88 H53 L50 41 L47 88 H25Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="37" y1="28" x2="36" y2="88" stroke="${accent}" stroke-opacity=".4" stroke-width="1.3"/>
      <line x1="63" y1="28" x2="64" y2="88" stroke="${accent}" stroke-opacity=".4" stroke-width="1.3"/>`;
    case 24: // Quần jogger - Xám than
      return `<path d="M31 14 H69 L73 84 H54 L50 42 L46 84 H27Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <rect x="30" y="14" width="40" height="8" rx="3" fill="#111827"/>
      <rect x="27" y="82" width="19" height="6" rx="2" fill="#111827"/><rect x="54" y="82" width="19" height="6" rx="2" fill="#111827"/>`;
    case 25: // Quần culottes - Trắng
      return `<path d="M30 14 H70 L81 84 H53 L50 38 L47 84 H19Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="30" y1="24" x2="70" y2="24" stroke="${stroke}" stroke-width="1.6"/>`;
    case 26: // Quần short kaki - Xanh sage
      return `<path d="M29 18 H71 L77 64 H53 L50 39 L47 64 H23Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="29" y1="27" x2="71" y2="27" stroke="${stroke}" stroke-width="1.6"/>`;
    case 27: // Quần short jean - Xanh jeans
      return `<path d="M29 18 H71 L78 63 H53 L50 39 L47 63 H22Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="29" y1="27" x2="71" y2="27" stroke="#f59e0b" stroke-width="1.6"/>`;
    case 28: // Quần short thể thao - Đỏ
      return `<path d="M28 18 H72 L79 62 H53 L50 38 L47 62 H21Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="28" y1="18" x2="21" y2="62" stroke="#ffffff" stroke-width="2.5"/>
      <line x1="72" y1="18" x2="79" y2="62" stroke="#ffffff" stroke-width="2.5"/>`;
    case 29: // Chân váy chữ A - Hồng đậm
      return `<path d="M35 18 H65 L86 86 H14Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <line x1="35" y1="26" x2="65" y2="26" stroke="${stroke}" stroke-width="1.6"/>`;
    case 30: // Chân váy xếp ly - Xanh biển
      return `<path d="M35 18 H65 L86 86 H14Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M40 26 L26 86 M47 26 L40 86 M53 26 L60 86 M60 26 L74 86" stroke="${stroke}" stroke-width="1.5"/>`;
    case 31: // Đầm hoa nhí - Hồng san hô
      return `<path d="M38 14 L50 23 L62 14 L66 40 L86 88 H14 L34 40Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="38" cy="54" r="3" fill="#fef08a"/><circle cx="62" cy="58" r="3" fill="#fef08a"/><circle cx="48" cy="72" r="3" fill="#ffffff"/><circle cx="66" cy="76" r="3" fill="#fef08a"/>`;
    case 32: // Đầm suông - Xanh ngọc
      return `<path d="M38 14 L50 23 L62 14 L67 42 L74 88 H26 L33 42Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>`;
    case 33: // Đầm maxi - Tím
      return `<path d="M39 14 L50 22 L61 14 L65 40 L90 91 H10 L35 40Z" fill="${c}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M35 40 Q50 46 65 40" fill="none" stroke="${accent}" stroke-width="2"/>`;
    default:
      return `<circle cx="50" cy="50" r="30" fill="${c}" stroke="${stroke}" stroke-width="2"/>`;
  }
}

function makeImgSrc(p){
  const label=String(p.n).replace(/[<>&"]/g,"");
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 100 125">
    <rect width="100" height="125" fill="#e8e6e1"/>
    <g transform="translate(0,4)">${artInner(p)}</g>
    <text x="50" y="114" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="6.2" font-weight="700" fill="#17181a">${label}</text>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(svg);
}

const imgTag=(p,alt)=>`<img src="${makeImgSrc(p)}" alt="${esc(alt||p.n)}" loading="lazy">`;

const money=n=>n.toLocaleString("vi-VN")+"₫",price=p=>p.s?Math.round(p.p*.9):p.p;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const $=id=>document.getElementById(id);
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let cat="Tất cả",cart=store.get("lm_cart",[]),user=store.get("lm_user",null),pend=false;

$("heroImg").src=makeImgSrc({id:19,n:"Áo khoác dạ",c:"#9a3412"});
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
