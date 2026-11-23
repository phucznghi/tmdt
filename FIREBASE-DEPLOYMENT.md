# Mộc Vải trên Firebase Spark

Dự án `store-clothes-tmdt` dùng Firebase Hosting, Authentication email/mật khẩu và Cloud Firestore Standard tại `asia-southeast1`. Không dùng Cloud Run, Cloud Functions, Storage hoặc liên kết Cloud Billing. Mã Node.js/SQLite vẫn phục vụ bản chạy cục bộ, tách dữ liệu với bản Firebase.

## Địa chỉ

- Cửa hàng: https://store-clothes-tmdt.web.app/
- Khách hàng: https://store-clothes-tmdt.web.app/account
- Nhân viên/admin: https://store-clothes-tmdt.web.app/account?admin=1
- Quản lý: https://store-clothes-tmdt.web.app/admin

## Dữ liệu thực tế

Firestore có 11 loại collection: `users`, `products`, `variants`, `product_names`, `orders`, `loyalty_points`, `inventory_receipts`, `stock_movements`, `audit`, `subscribers`, `settings`. Collection chưa có document chỉ xuất hiện trong Console sau lần ghi đầu tiên.

Identity nằm trong Authentication. `users/{uid}` giữ hồ sơ, vai trò và mốc thu hồi quyền. Giỏ hàng nằm trên trình duyệt, tách theo UID, không phải dữ liệu quyết định giá/tồn. Chi tiết hàng, lịch sử và sự kiện tiền được nhúng trong document đơn. Chi tiết phiếu nhập được nhúng trong document phiếu. ID tham chiếu thay cho khóa ngoại SQL. Security Rules và giao dịch kiểm tra các liên kết nghiệp vụ. 16 bảng SQL trong `schema.sql` chỉ thuộc bản cục bộ.

Đặt đơn đọc lại giá/tồn và giảm tồn nguyên tử. Mã đơn từ UID và requestKey chống gửi lặp. Hủy đơn hoàn tồn trong giao dịch. Hoàn tất đơn đồng thời ghi điểm tại `loyalty_points/{orderId}`, chống cộng lặp. Phiếu nhập xác nhận một lần trong giao dịch. Đơn lưu snapshot tên/giá/màu/size để giữ dữ liệu lịch sử khi sửa danh mục.

`stock_movements` lưu nhập kho và điều chỉnh danh mục. Các dòng giữ/hoàn hàng hiển thị trong báo cáo được suy ra từ đơn và lịch sử, có ký hiệu — ở tồn sau vì không lưu snapshot tồn sau cho các dòng này. Không coi báo cáo là sổ kiểm toán kho bất biến.

## Phân quyền

Security Rules chặn truy cập trái quyền ngay tại Firestore. Khách chỉ đọc đơn/điểm của mình, không tự cấp vai trò. Nhân viên xem/xử lý đơn, in bill, thêm và sửa mẫu, sửa thông tin hàng, ảnh, màu/size; không sửa số tồn hoặc đọc giá nhập/tài khoản. Admin quản lý sản phẩm, kho, doanh thu, tài khoản và đối soát tiền.

Đổi quyền/khóa ghi `access_changed_at`. Token đăng nhập trước mốc đó bị Rules từ chối. Admin được bảo vệ khỏi hạ quyền/khóa trong giao diện để tránh mất quyền quản trị. Chủ dự án xử lý trường hợp đặc biệt qua Firebase Console. Chống tên trùng không dấu dùng khóa `product_names` trong giao dịch ứng dụng. Rules không thực hiện chuẩn hóa dấu tiếng Việt.

## Giới hạn và vận hành

- Giá danh mục minh họa 149.000–399.000đ. Có COD và chuyển khoản trước bằng VietQR, admin đối soát thủ công. Chưa tích hợp cổng tự động xác nhận ngân hàng hoặc API giao hàng.
- Bản triển khai giới hạn 3 biến thể khác nhau mỗi đơn, 99 sản phẩm mỗi biến thể để giữ giao dịch trong ngân sách kiểm tra Rules. Đây là lựa chọn thiết kế ứng dụng, không phải giới hạn riêng của Spark.
- Ảnh dùng URL HTTPS bên ngoài và phụ thuộc nguồn ảnh. Chưa có upload ảnh hoặc Storage.
- Firestore miễn phí có 1 GiB dữ liệu, 50.000 lượt đọc/ngày, 20.000 lượt ghi/ngày và 20.000 lượt xóa/ngày. Hosting có hạn mức riêng. Khi vượt hạn mức Spark, dịch vụ liên quan có thể ngừng phục vụ đến khi hạn mức làm mới. Không tự nâng gói.
- Báo cáo tổng hợp trên trình duyệt admin. Cần phân trang/cache và dữ liệu tổng hợp khi quy mô tăng. Chưa bật App Check enforcement, MFA hoặc có kiểm thử xâm nhập độc lập.
- `node scripts/firebase-backup.mjs` tạo snapshot JSON và SHA-256 vào `backups/` bằng phiên Firebase CLI của chủ dự án. File chứa dữ liệu riêng, không đưa lên Git/Hosting. Snapshot gồm collection cấp cao hiện tại, không chứa mật khẩu hoặc danh tính Authentication. Cần diễn tập khôi phục trên môi trường tách biệt. Chưa có lịch sao lưu tự động.

## Cập nhật bản công khai

Đăng nhập Firebase CLI bằng tài khoản chủ dự án. Chạy kiểm thử trước deploy:

```powershell
npm.cmd test
firebase.cmd deploy --only hosting,firestore:rules --project store-clothes-tmdt
```

Hosting chỉ upload `public/`. Không upload database, .env, backups hoặc thông tin xác thực CLI. `firebase-config.json` chứa cấu hình ứng dụng công khai. Quyền dữ liệu dựa trên Auth và Rules. Firebase lưu dữ liệu độc lập với máy phát triển và các lần deploy Hosting.

Nguồn chính thức: [giá](https://firebase.google.com/pricing), [hạn mức Firestore](https://firebase.google.com/docs/firestore/quotas), [Rules](https://firebase.google.com/docs/firestore/security/rules-conditions), [giao dịch](https://firebase.google.com/docs/firestore/manage-data/transactions).



## Chuyển khoản trước bằng QR

Cấu hình người nhận được chủ dự án quản lý tại `settings/payments`, gồm `enabled` và map `bank` (bankBin, bankName, accountNumber, accountName, displayName). Client chỉ được đọc đúng document này, không được sửa tài khoản nhận tiền. Khi đổi ngân hàng, chủ dự án cập nhật bằng Console/CLI rồi phát hành lại nếu cần.

Đơn `bank_transfer` lưu `bank_snapshot` khớp cấu hình tin cậy tại lúc đặt. QR dùng Quick Link SVG của VietQR, điền chính xác tổng đơn và mã đơn làm nội dung. Số tài khoản được giữ dưới dạng string để bảo toàn số 0 đầu. Thông tin chuyển khoản luôn hiện bằng chữ để đối chiếu hoặc dùng nếu ảnh QR không tải được. Không có API key hoặc mật khẩu ngân hàng trong mã nguồn.

Quét QR không đánh dấu paid. Chỉ admin nhập chứng từ sau khi kiểm tra tiền nhận; đơn bank_transfer chưa paid không được xử lý tiếp. COD vẫn chỉ ghi nhận tiền sau delivered. Hủy một đơn đã paid chuyển refund_pending và hoàn tồn trong cùng giao dịch; admin đối soát hoàn tiền riêng, không có chuyển tiền tự động. QR ẩn khi paid, chờ hoàn, đã hoàn hoặc đơn đã hủy. Hoàn tiền sau delivered hiện chưa tự thu hồi điểm.

Đơn chưa chuyển tiền vẫn giữ tồn cho đến khi bị hủy, chưa có lịch tự hủy do hết hạn trên Spark. Cần kiểm tra và hủy các đơn bỏ dở qua admin. Các bộ kiểm tra ngày 24/11/2026 gồm 46 ca cục bộ, 28 ca Firestore hồi quy và 19 ca QR; tất cả dùng chứng từ giả, không thực hiện chuyển tiền. Mã QR ảnh đã được giải mã và đối chiếu BIN, số tài khoản, số tiền, nội dung và CRC.

Nguồn kỹ thuật: https://www.vietqr.io/qr-dong và https://api.vietqr.io/v2/banks.
