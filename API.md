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
| POST | `/api/cart/fulfillment` | Lưu `{fulfillment,province}`; `delivery` hoặc `pickup`; trả lại giá/phí/quote mới |
| GET | `/api/orders` | Chỉ các đơn thuộc khách đang đăng nhập, kèm chi tiết và lịch sử |
| GET | `/api/loyalty` | Bắt buộc đăng nhập: `{balance,unit,history}` của chính tài khoản; không hỗ trợ sửa điểm |
| POST | `/api/orders` | `{receiver,phone,address,method,requestKey,quote?}`; method `cod` / `bank_transfer` khi bật |
| POST | `/api/orders/:id/cancel` | Khách hủy đơn mình khi `pending` |
| POST | `/api/newsletter` | Lưu `{email}` đăng ký nhận ưu đãi; chưa gửi email |
| GET/POST | `/api/admin/products` | Danh sách / tạo sản phẩm |
| GET | `/api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD` | Chỉ admin: tổng hợp, kỳ trước, tỷ lệ tăng trưởng, biểu đồ và top sản phẩm; tối đa 366 ngày |
| GET | `/api/admin/inventory?from=YYYY-MM-DD&to=YYYY-MM-DD` | Chỉ admin: tồn hiện tại, số đang giữ, phiếu nhập, số lượng/giá trị nhận trong kỳ, nhà cung cấp và nhật ký |
| POST | `/api/admin/inventory/receipts` | Chỉ admin: tạo phiếu nháp `{supplier,supplier_reference?,note?,requestKey,items:[{variant_id,qty,unit_cost}]}` |
| GET | `/api/admin/inventory/receipts/:id` | Chỉ admin: chi tiết phiếu và dòng hàng chụp lại lúc lập |
| POST | `/api/admin/inventory/receipts/:id/confirm` | Chỉ admin: xác nhận và cộng kho một lần, giao dịch toàn bộ dòng hàng |
| POST | `/api/admin/inventory/receipts/:id/cancel` | Chỉ admin: hủy phiếu nháp, không thay đổi tồn |
| GET | `/api/admin/orders/:id/invoice` | Admin/nhân viên: dữ liệu bill từ đơn đã lưu; trang in tại `/invoice?id=:id` |
| PUT | `/api/admin/products/:id` | Sửa sản phẩm, phải gửi `version` lấy từ danh sách admin |
| GET | `/api/admin/customers` | Danh sách khách và thống kê đơn |
| GET | `/api/admin/users` | Chỉ admin: danh sách tài khoản và vai trò, không trả mật khẩu |
| PATCH | `/api/admin/users/:id` | Chỉ admin: `{role?,active?}`; `customer` / `staff` / `admin`; đổi quyền hoặc trạng thái hủy các phiên cũ |
| PATCH | `/api/admin/customers/:id` | `{active:true/false}`; khóa/mở khóa |
| GET | `/api/admin/orders` | Tất cả đơn, chi tiết và lịch sử |
| PATCH | `/api/admin/orders/:id/status` | `{status,carrier?,tracking?,note?}` |
| PATCH | `/api/admin/orders/:id/payment` | `{status,reference}`; `paid` / `refunded` |

Sản phẩm tạo/sửa gồm `name,price,originalPrice,audience,category,fabric,badge,active,flashSale,variants`. Mỗi biến thể có `color,size,hex,img,stock`; màu/size không trùng; ảnh HTTPS. Biến thể không có trong lần lưu tiếp theo bị ngừng bán, không xóa lịch sử.

Trạng thái đơn dùng `pending,confirmed,preparing,ready,shipping,delivered,cancelled`; `ready` dành cho pickup, `shipping` dành cho giao đến địa chỉ. Trạng thái thanh toán dùng `unpaid,paid,refund_pending,refunded`. Giá, tồn kho và quyền truy cập luôn được kiểm tra ở server. Giá trị `quote` từ giỏ giúp client phát hiện giỏ hoặc tổng tiền đã thay đổi trước khi xác nhận. API danh sách hiện chưa phân trang; phù hợp phạm vi bài tập, cần bổ sung khi dữ liệu tăng.

Vai trò `staff` được xem đơn, cập nhật trạng thái, đọc bill, xem sản phẩm và tạo sản phẩm mới. `PUT /api/admin/products/:id`, quản lý khách hàng/tài khoản, thanh toán/hoàn tiền và báo cáo chỉ dành cho `admin`. `POST /api/orders` chỉ dành cho `customer`; admin/nhân viên không được sửa giỏ hàng để mua. Đăng ký công khai luôn tạo `customer`.

Toàn bộ `/api/admin/inventory*` chỉ cho admin, kể cả đọc giá nhập. Phiếu có trạng thái `draft,received,cancelled`; không chỉnh sửa phiếu đã lập, hủy nháp và lập lại nếu cần. `qty` là số nguyên 1–100.000, giá nhập là số nguyên 0–100.000.000đ; tổng phiếu tối đa 1.000 tỷ, không nhận tổng do client khai báo. Xác nhận không được làm một biến thể vượt 100.000 tồn khả dụng. `requestKey` chống tạo trùng theo admin lập; xác nhận lại trả phiếu cũ và không cộng thêm. Phiếu/nhật ký theo thời gian Việt Nam; số liệu nhập dùng `confirmed_at`, các phiếu nháp vẫn hiện ngoài khoảng ngày. Nhật ký trả tối đa 200 dòng gần nhất trong kỳ. Không suy diễn phiếu nhập lịch sử từ tồn đầu.

Đơn mới dùng `fulfillment` (`delivery` / `pickup`) và `province` (giá trị từ `config.fulfillment.provinces` trong `/api/me`). Nếu không gửi, dùng lựa chọn đã lưu trong giỏ; giao hàng thiếu tỉnh/thành sẽ bị từ chối. Nhận cửa hàng và giao TP.HCM phí 0; ngoài tỉnh 30.000đ. `shipping` do client gửi bị bỏ qua. Với pickup, server dùng địa chỉ cửa hàng, không dùng địa chỉ do client gửi. Đơn trả thêm `fulfillment,province,store_address`; pickup có bước `ready` trước `delivered`. Đổi cách nhận/province làm thay đổi quote nên phải xác nhận tổng tiền mới.

`POST /api/orders` bắt buộc có phiên đăng nhập còn hiệu lực. Hồ sơ trong `/api/me` có `user.loyaltyPoints`; mỗi đơn có `earnedPoints` và `pointsAwarded`. Khi chuyển đơn sang `delivered`, server ghi điểm trong cùng transaction với trạng thái: `floor(max(0,subtotal-discount)/10000)`. Bảng `loyalty_points` dùng `order_id` làm khóa chính để chặn cộng trùng; khách không thể chỉ định người nhận điểm hoặc số điểm. `/api/loyalty` bỏ qua mọi tham số chọn user và luôn lọc theo phiên hiện tại.

Đăng nhập `POST /api/auth/login` nhận thêm `portal: "customer" | "staff"` (staff gồm nhân viên và admin). Vai trò tài khoản phải khớp khu vực, nếu không trả 403 trước khi đổi phiên. Bỏ `portal` vẫn tương thích client cũ và không thay đổi quyền theo tài khoản. Đăng ký với `portal: "staff"` bị từ chối; đăng ký công khai chỉ tạo customer.

POST/PUT sản phẩm kiểm tra tên trùng trên toàn bộ sản phẩm (kể cả ngừng bán), bỏ dấu/đổi đ thành d, hoa thường và khoảng trắng; trùng trả 409, không thay đổi sản phẩm hoặc tồn. Khi sửa loại trừ chính ID đang sửa. GET inventory trả thêm category/audience cho bộ lọc tên không dấu; phiếu nhập vẫn chỉ nhận variant_id đã tồn tại.
