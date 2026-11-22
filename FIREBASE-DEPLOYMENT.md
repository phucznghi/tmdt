# Mộc Vải trên Firebase Spark

Dự án `store-clothes-tmdt` dùng Firebase Hosting, Authentication email/mật khẩu và Cloud Firestore Standard tại `asia-southeast1`. Không dùng Cloud Run, Cloud Functions, Storage hoặc liên kết Cloud Billing. Mã Node.js/SQLite vẫn phục vụ bản chạy cục bộ, tách dữ liệu với bản Firebase.

## Địa chỉ

- Cửa hàng: https://store-clothes-tmdt.web.app/
- Khách hàng: https://store-clothes-tmdt.web.app/account
- Nhân viên/admin: https://store-clothes-tmdt.web.app/account?admin=1
- Quản lý: https://store-clothes-tmdt.web.app/admin

## Dữ liệu thực tế

Firestore có 10 loại collection: `users`, `products`, `variants`, `product_names`, `orders`, `loyalty_points`, `inventory_receipts`, `stock_movements`, `audit`, `subscribers`. Collection chưa có document chỉ xuất hiện trong Console sau lần ghi đầu tiên.

Identity nằm trong Authentication. `users/{uid}` giữ hồ sơ, vai trò và mốc thu hồi quyền. Giỏ hàng nằm trên trình duyệt, tách theo UID, không phải dữ liệu quyết định giá/tồn. Chi tiết hàng, lịch sử và sự kiện tiền được nhúng trong document đơn. Chi tiết phiếu nhập được nhúng trong document phiếu. ID tham chiếu thay cho khóa ngoại SQL. Security Rules và giao dịch kiểm tra các liên kết nghiệp vụ. 16 bảng SQL trong `schema.sql` chỉ thuộc bản cục bộ.

Đặt đơn đọc lại giá/tồn và giảm tồn nguyên tử. Mã đơn từ UID và requestKey chống gửi lặp. Hủy đơn hoàn tồn trong giao dịch. Hoàn tất đơn đồng thời ghi điểm tại `loyalty_points/{orderId}`, chống cộng lặp. Phiếu nhập xác nhận một lần trong giao dịch. Đơn lưu snapshot tên/giá/màu/size để giữ dữ liệu lịch sử khi sửa danh mục.

`stock_movements` lưu nhập kho và điều chỉnh danh mục. Các dòng giữ/hoàn hàng hiển thị trong báo cáo được suy ra từ đơn và lịch sử, có ký hiệu — ở tồn sau vì không lưu snapshot tồn sau cho các dòng này. Không coi báo cáo là sổ kiểm toán kho bất biến.

## Phân quyền

Security Rules chặn truy cập trái quyền ngay tại Firestore. Khách chỉ đọc đơn/điểm của mình, không tự cấp vai trò. Nhân viên xem/xử lý đơn, in bill, thêm và sửa mẫu, sửa thông tin hàng, ảnh, màu/size; không sửa số tồn hoặc đọc giá nhập/tài khoản. Admin quản lý sản phẩm, kho, doanh thu, tài khoản và đối soát tiền.

Đổi quyền/khóa ghi `access_changed_at`. Token đăng nhập trước mốc đó bị Rules từ chối. Admin được bảo vệ khỏi hạ quyền/khóa trong giao diện để tránh mất quyền quản trị. Chủ dự án xử lý trường hợp đặc biệt qua Firebase Console. Chống tên trùng không dấu dùng khóa `product_names` trong giao dịch ứng dụng. Rules không thực hiện chuẩn hóa dấu tiếng Việt.

## Giới hạn và vận hành

- Giá danh mục minh họa 149.000–399.000đ. Chỉ COD, admin đối soát thủ công. Chưa tích hợp cổng thanh toán hoặc API giao hàng.
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


