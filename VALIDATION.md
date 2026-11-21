# Kết quả xác minh

Ngày kiểm tra: 21/11/2026 (Asia/Saigon).

- Nguồn UI: `phucznghi/tmdt`, commit `229d3b47ee97605139ad0b43782914834d49291f`.
- HTML/CSS trang chủ trước script ứng dụng được giữ nguyên; SHA-256: `510361fef355e6f6246110f72dd1c1d59e195df9429cefdb1d93024955152197`.
- `npm.cmd test`: **13/13 kiểm thử đạt** trên Node.js 24.17.0.
- Kiểm tra cú pháp các file JavaScript server/client thành công.
- Đã thao tác trong trình duyệt trên database thử riêng: thêm vào giỏ từ UI gốc; đăng ký khách; khôi phục giỏ sau đăng ký; đặt COD; xem lịch sử đơn; đăng xuất/đăng nhập admin; xác nhận, chuẩn bị và chuyển đơn sang đang giao với mã vận đơn; sửa tồn kho biến thể; xem danh sách khách hàng.
- Database dùng cho thao tác trình duyệt nằm trong thư mục làm việc tạm, không đưa vào mã nguồn bàn giao. Lần chạy mới không có tài khoản admin mặc định hay đơn kiểm thử.
- Chưa kiểm thử kết nối thanh toán/đơn vị vận chuyển ngoài vì phiên bản này dùng đối soát và cập nhật thủ công. Chưa thực hiện kiểm thử tải, triển khai công khai, hoặc đánh giá bảo mật toàn diện.

Các case tự động nằm trong `tests/integration.test.js`; kiểm thử thất bại nếu HTML/CSS gốc bị chỉnh sửa.
