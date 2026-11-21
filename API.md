# API Mộc Vải

Tất cả dữ liệu gửi là JSON. Gọi `GET /api/me` đầu tiên để nhận cookie phiên và `csrf`. Mọi POST/PUT/PATCH cần header `X-CSRF-Token`; sau đăng nhập/đăng xuất cập nhật token mới từ phản hồi. Lỗi trả dạng `{ "error": "Thông báo" }` cùng mã HTTP 400/401/403/404/409/413/415/429.

| Phương thức | Đường dẫn | Ý nghĩa |
| --- | --- | --- |
| GET | `/api/me` | Phiên, hồ sơ hiện tại và cấu hình thanh toán |
| POST | `/api/auth/register` | `{name,email,password}`; tạo khách và đăng nhập |
| POST | `/api/auth/login` | `{email,password}` |
| POST | `/api/auth/logout` | Hủy phiên |
| PATCH | `/api/profile` | Khách sửa `{name,phone,address}` của mình |
| GET | `/api/products` | Sản phẩm đang bán và biến thể còn hoạt động |
| GET | `/api/cart` | Giỏ hiện tại; giá, phí, giảm, tổng và quote |
| PUT | `/api/cart` | Thay danh sách `{items:[{variant_id,qty}]}` |
| POST | `/api/cart/promo` | `{code}`; chuỗi rỗng để bỏ mã |
| GET | `/api/orders` | Chỉ các đơn thuộc khách đang đăng nhập, kèm chi tiết và lịch sử |
| GET | `/api/loyalty` | Bắt buộc đăng nhập: `{balance,unit,history}` của chính tài khoản; không hỗ trợ sửa điểm |
| POST | `/api/orders` | `{receiver,phone,address,method,requestKey,quote?}`; method `cod` / `bank_transfer` khi bật |
| POST | `/api/orders/:id/cancel` | Khách hủy đơn mình khi `pending` |
| POST | `/api/newsletter` | Lưu `{email}` đăng ký nhận ưu đãi; chưa gửi email |
| GET/POST | `/api/admin/products` | Danh sách / tạo sản phẩm |
| PUT | `/api/admin/products/:id` | Sửa sản phẩm, phải gửi `version` lấy từ danh sách admin |
| GET | `/api/admin/customers` | Danh sách khách và thống kê đơn |
| GET | `/api/admin/users` | Chỉ admin: danh sách tài khoản và vai trò, không trả mật khẩu |
| PATCH | `/api/admin/users/:id` | Chỉ admin: `{role?,active?}`; `customer` / `staff` / `admin`; đổi quyền hoặc trạng thái hủy các phiên cũ |
| PATCH | `/api/admin/customers/:id` | `{active:true/false}`; khóa/mở khóa |
| GET | `/api/admin/orders` | Tất cả đơn, chi tiết và lịch sử |
| PATCH | `/api/admin/orders/:id/status` | `{status,carrier?,tracking?,note?}` |
| PATCH | `/api/admin/orders/:id/payment` | `{status,reference}`; `paid` / `refunded` |

Sản phẩm tạo/sửa gồm `name,price,originalPrice,audience,category,fabric,badge,active,flashSale,variants`. Mỗi biến thể có `color,size,hex,img,stock`; màu/size không trùng; ảnh HTTPS. Biến thể không có trong lần lưu tiếp theo bị ngừng bán, không xóa lịch sử.

Trạng thái đơn dùng `pending,confirmed,preparing,shipping,delivered,cancelled`. Trạng thái thanh toán dùng `unpaid,paid,refund_pending,refunded`. Giá, tồn kho và quyền truy cập luôn được kiểm tra ở server. Giá trị `quote` từ giỏ giúp client phát hiện giỏ hoặc tổng tiền đã thay đổi trước khi xác nhận. API danh sách hiện chưa phân trang; phù hợp phạm vi bài tập, cần bổ sung khi dữ liệu tăng.

Vai trò `staff` chỉ được `GET /api/admin/orders` và `PATCH /api/admin/orders/:id/status` trong nhóm API quản trị. Mọi API sản phẩm/khách hàng/tài khoản/thanh toán ở nhóm này chỉ dành cho `admin`; gọi trực tiếp API không vượt qua được kiểm tra quyền. Đăng ký công khai luôn tạo `customer`.

`POST /api/orders` bắt buộc có phiên đăng nhập còn hiệu lực. Hồ sơ trong `/api/me` có `user.loyaltyPoints`; mỗi đơn có `earnedPoints` và `pointsAwarded`. Khi chuyển đơn sang `delivered`, server ghi điểm trong cùng transaction với trạng thái: `floor(max(0,subtotal-discount)/10000)`. Bảng `loyalty_points` dùng `order_id` làm khóa chính để chặn cộng trùng; khách không thể chỉ định người nhận điểm hoặc số điểm. `/api/loyalty` bỏ qua mọi tham số chọn user và luôn lọc theo phiên hiện tại.
