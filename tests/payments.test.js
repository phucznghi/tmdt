import test from 'node:test';
import assert from 'node:assert/strict';
import {bankValid,qrPaymentUrl,qrPaymentHtml} from '../public/payments.js';
const bank={bankBin:'970422',bankName:'Test bank',accountNumber:'00000012345',accountName:'TEST MERCHANT',displayName:'Người nhận kiểm thử'};
const order={id:'MVQRPAYMENTTEST01',method:'bank_transfer',payment_status:'unpaid',status:'pending',total:279000,bank_snapshot:bank};
test('QR preserves leading zeros, exact amount and order reference',()=>{
 const url=new URL(qrPaymentUrl(order));assert.equal(url.origin,'https://img.vietqr.io');assert.equal(url.pathname,'/image/970422-00000012345-compact2.svg');assert.equal(url.searchParams.get('amount'),'279000');assert.equal(url.searchParams.get('addInfo'),order.id);assert.equal(url.searchParams.get('accountName'),bank.accountName);
});
test('paid, cancelled, refund, COD and invalid recipient never display a payment QR',()=>{
 for(const change of [{method:'cod'},{payment_status:'paid'},{payment_status:'refund_pending'},{payment_status:'refunded'},{status:'cancelled'},{bank_snapshot:null},{bank_snapshot:{...bank,accountNumber:12345}},{total:-1},{total:NaN},{id:'../unsafe'}])assert.equal(qrPaymentHtml({...order,...change}),'');
 assert.equal(bankValid({...bank,bankBin:'javascript:alert(1)'}),false);
});
test('QR instructions escape recipient fields and never promise automatic reconciliation',()=>{
 const html=qrPaymentHtml({...order,bank_snapshot:{...bank,displayName:'<img src=x onerror=alert(1)>'}});assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('không tự đổi trạng thái'));assert.ok(html.includes('referrerpolicy="no-referrer"'));
});
