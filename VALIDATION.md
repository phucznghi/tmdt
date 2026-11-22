# Kết quả xác minh

Ngày cập nhật kiểm tra: 22/11/2026 (Asia/Saigon).

- Nguồn UI: `phucznghi/tmdt`, commit `229d3b47ee97605139ad0b43782914834d49291f`.
- HTML/CSS trang chủ trước script ứng dụng được giữ nguyên; SHA-256: `510361fef355e6f6246110f72dd1c1d59e195df9429cefdb1d93024955152197`.
- `npm.cmd test`: **40/40 kiểm thử đạt** trên Node.js 24.17.0, gồm kho/nhập hàng, báo cáo, bill, nhận tại cửa hàng/phí theo tỉnh, phân quyền, tích điểm và migration database cũ.
- Kiểm tra cú pháp các file JavaScript server/client thành công.
- Đã thao tác trong trình duyệt trên database thử riêng: thêm vào giỏ từ UI gốc; đăng ký khách; khôi phục giỏ sau đăng ký; đặt COD; xem lịch sử đơn; đăng xuất/đăng nhập admin; xác nhận, chuẩn bị và chuyển đơn sang đang giao với mã vận đơn; sửa tồn kho biến thể; xem danh sách khách hàng.
- Database dùng cho thao tác trình duyệt nằm trong thư mục làm việc tạm, không đưa vào mã nguồn bàn giao. Lần chạy mới không có tài khoản admin mặc định hay đơn kiểm thử.
- Chưa kiểm thử kết nối thanh toán/đơn vị vận chuyển ngoài vì phiên bản này dùng đối soát và cập nhật thủ công. Chưa thực hiện kiểm thử tải, triển khai công khai, hoặc đánh giá bảo mật toàn diện.

Các case tự động nằm trong `tests/integration.test.js`; kiểm thử thất bại nếu HTML/CSS gốc bị chỉnh sửa.

Kiểm thử bổ sung cho nhân viên: xử lý trọn luồng đơn/vận chuyển; bị từ chối API sửa sản phẩm, quản lý khách, quản lý tài khoản, nhận tiền và hoàn tiền; admin vẫn thực hiện được các chức năng này; thu hồi quyền/khóa tài khoản vô hiệu phiên; không thể tự nâng quyền; migration giữ dữ liệu cũ và khóa ngoại.

Đã kiểm tra giao diện bằng dữ liệu giả: đăng nhập nhân viên chỉ thấy mục đơn hàng/vận chuyển và xác nhận đơn thành công; đăng nhập admin thấy mục tài khoản/phân quyền; cấp vai trò nhân viên qua giao diện, tải lại danh sách vẫn giữ quyền vừa cấp. Không tạo tài khoản mẫu hoặc thay đổi quyền người dùng thật trong database bàn giao.

Kiểm thử đăng nhập/tích điểm: khách chưa đăng nhập, đã đăng xuất hoặc hết phiên không đặt được đơn; trước khi giao và khi hủy không tích điểm; đã giao chỉ tích một lần, đúng người đặt, đúng số tiền sau giảm giá và không tính phí giao. Có kiểm tra làm tròn dưới ngưỡng, đúng ngưỡng, không thể tự sửa hoặc đọc điểm người khác, và nâng cấp các đơn cũ không cộng trùng khi khởi động lại.

Đã kiểm tra trình duyệt trên database giả: khách chưa đăng nhập bấm đặt hàng được đưa đến trang đăng nhập; đăng nhập xong giữ giỏ và đặt COD; tài khoản ban đầu 0 điểm; nhân viên chuyển đơn qua các bước đến Đã giao; khách đăng nhập lại thấy 32 điểm cho 329.000đ tiền hàng, lịch sử ghi đúng mã đơn (không tính 30.000đ vận chuyển).

Đã thử cho phiên đăng nhập hết hạn sau khi điền form đặt hàng: khi bấm xác nhận, không tạo thêm đơn và giao diện chuyển về trang đăng nhập.

Các kiểm thử mới xác minh: miễn phí TP.HCM/nhận tại cửa hàng và thu 30.000đ ngoài tỉnh kể cả đơn lớn; từ chối tỉnh sai/thiếu và quote cũ; giữ lựa chọn giỏ sau đăng nhập; pickup qua ready rồi mới hoàn tất/tích điểm; nhân viên thêm sản phẩm nhưng không sửa, in bill đúng tổng và không đọc báo cáo; admin/nhân viên không mua hàng; báo cáo tính theo tiền thu/hoàn và mốc ngày Việt Nam, không ghi nhận đơn chưa thanh toán; migration giữ phí và tổng đơn cũ.

Đã thao tác trên trình duyệt với database giả: chọn Hà Nội thấy phí 30.000đ, chuyển pickup thấy miễn phí và 970 Quang Trung, đặt pickup từ cả giỏ trang chủ lẫn trang tài khoản; nhân viên thêm sản phẩm và chỉ xem được sản phẩm sau tạo; xử lý pickup tới chờ nhận/đã nhận; mở bill với tiền hàng 658.000đ, giảm 50.000đ, ship 30.000đ và tổng 638.000đ; admin xem báo cáo, đổi khoảng ngày để xem biểu đồ tháng; admin tìm sản phẩm được nhưng không thấy nút giỏ/mua. Kiểm tra in dừng ở trang bill sẵn sàng gọi hộp thoại in, không gửi lệnh đến máy in vật lý.

Kiểm thử kho xác minh quyền admin, chống tạo/xác nhận phiếu trùng, phiếu nháp/hủy không cộng kho, rollback toàn bộ khi một dòng vượt giới hạn, từ chối số lượng/giá âm hoặc lặp biến thể, tính giá trị theo số nhận và ngày xác nhận tại Việt Nam, theo dõi giữ/hoàn/điều chỉnh kho, giữ lịch sử sau khởi động lại và ghi tồn đầu cho dữ liệu cũ mà không bịa phiếu nhập.

Đã thao tác nhập kho trên trình duyệt bằng dữ liệu giả: lập phiếu hai biến thể (10 × 120.000đ và 4 × 90.000đ), lưu nháp không đổi tồn; xác nhận tăng đúng 14 sản phẩm và 1.560.000đ trong báo cáo. Tải lại vẫn chỉ có một phiếu, tổng không bị cộng trùng. Kiểm tra bố cục bảng tồn và biểu mẫu nhập hàng.

Kiểm tra hai khu vực đăng nhập: customer/staff phải khớp vai trò có sẵn, đăng ký nội bộ bị từ chối và không thể tự cấp quyền qua payload. Trên trình duyệt, khu vực nội bộ không có đăng ký, nhân viên đăng nhập được chuyển đến /admin; dùng tài khoản nhân viên ở khu vực khách nhận thông báo chọn lại; khu vực khách vẫn có đăng ký.

Đồng nhất giao diện đăng nhập: đã kiểm tra trên trình duyệt hai lựa chọn khách hàng/nội bộ với logo Mộc Vải, nền kem, nút và ô nhập bo tròn; đăng nhập bằng tài khoản nhân viên giả vẫn chuyển đúng sang quản lý. Kiểm thử xác minh Live Server localhost/127.0.0.1 chuyển cổng 5500 sang 3000, giữ query/hash, không chuyển khách trên GitHub Pages sang localhost, và CSS trang tài khoản trả HTTP 200.

Hoàn thiện chân trang: đã bấm đủ 8 liên kết trên trình duyệt, mở đúng nội dung size/tích điểm/tra cứu/FAQ/giao hàng/đổi trả/bảo hành/thông tin cá nhân, đóng mở hộp thoại và kiểm tra link tra cứu đến tài khoản. Thử email giả footer-ui-demo@example.test cho phản hồi lưu thành công và điều kiện WELCOME50 ngay dưới form. Kiểm thử API xác minh email hợp lệ được lưu một lần, gửi trùng không nhân bản và email sai bị từ chối.

Danh mục UNIQLO: đã kiểm tra HTTP 200 và content-type image/jpeg của đủ 12 URL ảnh, xác nhận trên trình duyệt đủ 12 ảnh tải từ CDN UNIQLO. Bộ lọc trẻ em trả 4 mẫu; xem nhanh hiện tên, màu, giá tham khảo, mô tả tóm tắt và link sản phẩm nguồn. Size trẻ em hiển thị 110–160 theo chiều cao cm thay cho bảng cân nặng người lớn. Kiểm thử nhập danh mục xác minh chỉ ẩn đúng mẫu cũ, giữ tồn cũ/sản phẩm tự thêm, không nhân bản hoặc reset tồn khi chạy lại và giữ toàn vẹn khóa ngoại. Database đang dùng được sao lưu trước cập nhật; số tài khoản và đơn được giữ.

Tìm kiếm không dấu/chống trùng: kiểm thử Unicode tổ hợp, đ/Đ, hoa thường, khoảng trắng, nhiều từ đảo thứ tự; POST/PUT từ admin/nhân viên bị từ chối tên trùng, kể cả hàng đã ngừng bán. Hai POST đồng thời trả một 201 và một 409. Sửa chính sản phẩm vẫn được, tên khác tạo mới bình thường. Trình duyệt đã tìm `ao khoac navy` ra hai áo, nhập `ao thun vai gan` báo đúng sản phẩm cũ/tồn 120 và mở danh sách tồn; trong phiếu nhập tìm không dấu, chọn biến thể M tồn 20, nhập 5 thấy dự kiến 25, không lưu phiếu trong kiểm tra này.

Đã kiểm tra thêm bản index tĩnh qua HTTP độc lập: `ao khoac navy` vẫn trả 2 sản phẩm và nút đăng nhập vẫn mở đúng thông báo chưa kết nối backend.
