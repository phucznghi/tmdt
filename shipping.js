// Provincial names follow the post-2025 list published by chinhphu.vn:
// https://xaydungchinhsach.chinhphu.vn/chi-tiet-34-don-vi-hanh-chinh-cap-tinh-tu-12-6-2025-119250612141845533.htm
export const PROVINCES=['TP.HCM','Hà Nội','Hải Phòng','Đà Nẵng','Huế','Cần Thơ','Cao Bằng','Điện Biên','Lai Châu','Sơn La','Lạng Sơn','Quảng Ninh','Thanh Hóa','Nghệ An','Hà Tĩnh','Tuyên Quang','Lào Cai','Thái Nguyên','Phú Thọ','Bắc Ninh','Hưng Yên','Ninh Bình','Quảng Trị','Quảng Ngãi','Gia Lai','Khánh Hòa','Lâm Đồng','Đắk Lắk','Đồng Nai','Tây Ninh','Vĩnh Long','Đồng Tháp','An Giang','Cà Mau'];
export const STORE_PROVINCE='TP.HCM';
export const OUTSIDE_FEE=30000;
export const storeAddress=()=>process.env.STORE_ADDRESS||'970 Quang Trung, TP.HCM';
export function selection(value={},allowIncomplete=false){
 const fulfillment=value.fulfillment??'delivery';
 if(!['delivery','pickup'].includes(fulfillment))throw Object.assign(new Error('Cách nhận hàng không hợp lệ.'),{status:400});
 const province=fulfillment==='pickup'?STORE_PROVINCE:(value.province??'');
 if(typeof province!=='string'||(!PROVINCES.includes(province)&&!(allowIncomplete&&province==='')))throw Object.assign(new Error('Vui lòng chọn tỉnh/thành nhận hàng hợp lệ.'),{status:400});
 return {fulfillment,province};
}
export function shippingFee(choice,hasItems=true){return !hasItems||choice.fulfillment==='pickup'||choice.province===STORE_PROVINCE||!choice.province?0:OUTSIDE_FEE;}
