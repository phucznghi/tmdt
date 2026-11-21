const DAY=86400000;
export const localDay=value=>new Date(new Date(value).getTime()+7*3600000).toISOString().slice(0,10);
const offset=(value,n)=>new Date(Date.parse(value+'T00:00:00Z')+n*DAY).toISOString().slice(0,10);
function day(value,label){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw Object.assign(new Error(label+' không hợp lệ.'),{status:400});return value;}
const growth=(current,previous)=>previous===0?(current===0?0:null):Math.round((current-previous)/Math.abs(previous)*10000)/100;
export function reportWindow(query={}){
 const today=localDay(new Date()),to=day(query.to||today,'Ngày kết thúc'),from=day(query.from||offset(to,-29),'Ngày bắt đầu');
 const days=Math.round((Date.parse(to)-Date.parse(from))/DAY)+1;
 if(days<1||days>366)throw Object.assign(new Error('Chọn khoảng báo cáo từ 1 đến 366 ngày.'),{status:400});
 const previousFrom=offset(from,-days),previousTo=offset(from,-1);
 return {from,to,days,previousFrom,previousTo};
}
export function buildReport(db,query={}){
 const {from,to,days,previousFrom,previousTo}=reportWindow(query);
 const orders=db.prepare('SELECT id,user_id,created_at,status FROM orders').all();
 const customers=db.prepare("SELECT created_at FROM users WHERE role='customer'").all();
 const payments=db.prepare("SELECT p.status,p.created_at,o.total FROM payment_events p JOIN orders o ON o.id=p.order_id WHERE p.status IN ('paid','refunded')").all();
 const inRange=(value,a,b)=>{const d=localDay(value);return d>=a&&d<=b;};
 function summarize(a,b){
  const events=a?payments.filter(e=>inRange(e.created_at,a,b)):payments;
  const chosen=a?orders.filter(o=>inRange(o.created_at,a,b)):orders;
  const collected=events.filter(e=>e.status==='paid').reduce((s,e)=>s+e.total,0),refunded=events.filter(e=>e.status==='refunded').reduce((s,e)=>s+e.total,0);
  return {collected,refunded,netRevenue:collected-refunded,orderCount:chosen.length,cancelledOrders:chosen.filter(o=>o.status==='cancelled').length,newCustomers:(a?customers.filter(c=>inRange(c.created_at,a,b)):customers).length};
 }
 const monthly=days>62,series=new Map();
 for(let d=from;d<=to;d=offset(d,1)){const key=monthly?d.slice(0,7):d;if(!series.has(key))series.set(key,{period:key,collected:0,refunded:0,netRevenue:0,orders:0});}
 for(const e of payments){const d=localDay(e.created_at),r=series.get(monthly?d.slice(0,7):d);if(r&&d>=from&&d<=to){if(e.status==='paid')r.collected+=e.total;else r.refunded+=e.total;r.netRevenue=r.collected-r.refunded;}}
 for(const o of orders){const d=localDay(o.created_at),r=series.get(monthly?d.slice(0,7):d);if(r&&d>=from&&d<=to)r.orders++;}
 const delivered=db.prepare("SELECT i.name,i.qty,v.product_id,MIN(h.created_at) AS completed_at FROM order_items i JOIN variants v ON v.id=i.variant_id JOIN order_history h ON h.order_id=i.order_id AND h.status='delivered' GROUP BY i.id").all();
 const best=new Map();for(const i of delivered)if(inRange(i.completed_at,from,to)){const row=best.get(i.product_id)||{productId:i.product_id,name:i.name,units:0};row.units+=i.qty;best.set(i.product_id,row);}
 const current=summarize(from,to),previous=summarize(previousFrom,previousTo);
 return {from,to,previousFrom,previousTo,grouping:monthly?'month':'day',totals:summarize(),current,previous,growth:{revenuePercent:growth(current.netRevenue,previous.netRevenue),ordersPercent:growth(current.orderCount,previous.orderCount),customersPercent:growth(current.newCustomers,previous.newCustomers)},series:[...series.values()],topProducts:[...best.values()].sort((a,b)=>b.units-a.units).slice(0,10)};
}
