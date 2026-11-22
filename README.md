# Mộc Vải — phần 5, 6, 7

Bản triển khai từ repo `phucznghi/tmdt`, nhánh `main`, commit `229d3b47ee97605139ad0b43782914834d49291f` tại thời điểm kiểm tra. Giữ nguyên HTML/CSS và bố cục trang chủ. Chỉ thay script mô phỏng bằng script gọi backend; trang tài khoản và quản trị nằm riêng.

## Chạy trên Windows

Yêu cầu **Node.js 24 trở lên**. Không cần cài thêm thư viện hoặc máy chủ cơ sở dữ liệu.

Mở terminal tại thư mục chứa file này:

```powershell
npm.cmd run admin -- admin@example.com
npm.cmd start
```

Lệnh đầu yêu cầu bạn tự đặt mật khẩu admin, tối thiểu 8 ký tự; mật khẩu không hiển thị khi nhập. Không có tài khoản hay mật khẩu admin mặc định. Email trùng sẽ bị từ chối, không tự nâng quyền một tài khoản khách hàng.

- Cửa hàng: http://localhost:3000
- Tài khoản, đăng ký, lịch sử đơn: http://localhost:3000/account
- Quản trị: http://localhost:3000/admin

Đăng nhập admin tại `/account`, sau đó bấm **Quản trị**. Khách tự đăng ký tài khoản mới. Dùng `Ctrl+C` để dừng server.

## Nhân viên và phân quyền

Hệ thống có ba vai trò, kiểm tra quyền tại backend:

| Chức năng | Khách hàng | Nhân viên | Admin |
| --- | --- | --- | --- |
| Giỏ hàng và đặt mua online | Có | Không | Không |
| Xem tất cả đơn, xử lý trạng thái và vận chuyển | Không | Có | Có |
| Thêm sản phẩm mới | Không | Có | Có |
| Sửa sản phẩm / tồn kho, quản lý khách hàng | Không | Không | Có |
| Xem và in bill có tổng giá trị đơn hàng | Không | Có | Có |
| Báo cáo doanh thu, tăng trưởng | Không | Không | Có |
| Lập / xác nhận phiếu nhập và xem giá nhập, báo cáo nhập kho | Không | Không | Có |
| Xác nhận nhận tiền hoặc hoàn tiền | Không | Không | Có |
| Cấp / thu hồi quyền, khóa / mở tài khoản | Không | Không | Có |

Để thêm nhân viên:

1. Người dùng đăng ký tài khoản tại `/account`.
2. Admin đăng nhập, mở `/admin` → **Tài khoản & phân quyền**.
3. Tìm email, chọn **Nhân viên**, giữ trạng thái hoạt động và bấm **Lưu quyền**.
4. Nhân viên đăng nhập lại, mở **Xử lý đơn hàng** để vào khu vực đơn và vận chuyển.

Nhân viên có thể xác nhận, chuẩn bị, giao và hoàn tất đơn theo quy trình hiện có; có thể hủy trước khi giao cho đơn vị vận chuyển. Hủy đơn đã trả tiền chỉ tạo yêu cầu chờ hoàn tiền, không xác nhận đã hoàn tiền. Admin thực hiện bước đối soát riêng.

Nhân viên được tìm/xem danh sách và thêm sản phẩm mới (gồm biến thể, tồn kho ban đầu), nhưng không sửa sản phẩm hoặc tồn kho đã có. Admin/nhân viên dùng khu vực quản lý; giỏ hàng và đặt mua chỉ dành cho khách hàng, bị kiểm tra cả ở backend.

## Kho và nhập hàng

Admin mở **Kho & nhập hàng** để xem tồn theo sản phẩm/màu/size, lọc hàng sắp hết (≤ 5) hoặc hết hàng, xem số đang giữ cho đơn và ước tính số còn tại kho.

Quy trình nhập:

1. Bấm **Lập phiếu nhập hàng**, nhập nhà cung cấp, số chứng từ nếu có, ghi chú và các dòng biến thể/số lượng/giá nhập.
2. **Lưu phiếu nháp** để kiểm tra; bước này chưa tăng tồn kho.
3. Sau khi kiểm đếm hàng thực nhận, bấm **Xác nhận đã nhận hàng & cộng kho**. Toàn bộ dòng hàng và nhật ký được ghi trong cùng giao dịch; lỗi một dòng thì không cộng dở dang các dòng còn lại.
4. Phiếu đã nhập chỉ xem, không sửa hoặc hủy; phiếu nháp có thể hủy và lập lại nếu nhập sai. Gửi lại yêu cầu xác nhận không cộng kho lần hai.

Chọn khoảng ngày để xem số phiếu đã nhập, số lượng, tổng giá trị nhập, tổng hợp theo ngày/tháng và theo nhà cung cấp. Báo cáo tính theo **ngày xác nhận nhập**, loại phiếu nháp/đã hủy khỏi số liệu nhập; mọi phiếu nháp vẫn hiển thị để tiếp tục xử lý. Tồn kho trên màn hình là tồn **hiện tại**, không phải ảnh chụp tồn tại ngày cuối kỳ.

Tồn khả dụng là số chưa giữ cho đơn. Số đang giữ gồm đơn chờ xác nhận, đã xác nhận, đang chuẩn bị hoặc chờ nhận tại cửa hàng; ước tính tại kho = khả dụng + đang giữ. Đây là số hệ thống tính, cần kiểm đếm để đối chiếu thực tế.

Nhật ký ghi tồn đầu khi bật tính năng, tồn ban đầu sản phẩm, nhập hàng, giữ hàng cho đơn, hoàn do hủy đơn và điều chỉnh tồn. Nâng cấp giữ số tồn cũ làm tồn đầu, **không tự tạo phiếu nhập, nhà cung cấp hoặc giá nhập cho lịch sử chưa có**. Sửa tồn ở mục sản phẩm là điều chỉnh kiểm kê, không được tính thành nhập từ nhà cung cấp. Khi tạo mã hàng mới có thể để tồn 0 rồi lập phiếu nhập để ghi đủ giá và nhà cung cấp, tránh cộng hàng hai lần.

Giá trị nhập là tổng số lượng × giá nhập được lưu trên phiếu, chưa quản lý công nợ/thanh toán nhà cung cấp, thuế hoặc định giá xuất kho. Nó không tự trừ vào báo cáo thu tiền bán hàng. Nhân viên vẫn chỉ xem tồn qua danh sách sản phẩm và thêm mã hàng mới; không xem giá nhập hay xác nhận nhập kho.

## Báo cáo doanh thu và in bill

Admin mở **Doanh thu & tăng trưởng** để xem doanh thu tổng hợp, chọn khoảng ngày, xem biểu đồ theo ngày (hoặc theo tháng khi khoảng chọn trên 62 ngày), so sánh với kỳ trước có cùng số ngày, số đơn, khách mới và sản phẩm đã giao/nhận thành công.

Doanh thu trong báo cáo được định nghĩa là **tiền thực thu trừ tiền thực hoàn, gồm phí giao hàng**, dựa trên nhật ký xác nhận thanh toán/hoàn tiền và ngày đối soát theo giờ Việt Nam. Đơn mới hoặc chưa trả tiền không tính là doanh thu. Khi kỳ trước bằng 0 và kỳ này có phát sinh, báo cáo hiển thị chưa tính tỷ lệ thay vì tạo phần trăm giả. Đây là báo cáo thu tiền, chưa tính chi phí/lợi nhuận.

Trong danh sách đơn, admin/nhân viên bấm **In bill / Xem tổng giá trị đơn** để mở phiếu gồm mã/ngày đơn, khách nhận, cách nhận hàng, địa chỉ, từng sản phẩm/màu/size/số lượng/đơn giá, tiền hàng, giảm giá, phí giao, **tổng giá trị đơn** và trạng thái thanh toán. Bấm **In bill / Lưu PDF** để dùng hộp thoại in của trình duyệt. Mở bill không tự đánh dấu đã thanh toán hay đã giao.

## Nhận hàng và phí giao

- Cửa hàng: **970 Quang Trung, TP.HCM**; có thể cấu hình lại bằng `STORE_ADDRESS`.
- **Lấy tại cửa hàng:** miễn phí; không yêu cầu địa chỉ giao của khách. Luồng: chờ xác nhận → xác nhận → chuẩn bị → chờ nhận tại cửa hàng → đã nhận tại cửa hàng. Chỉ bước cuối mới tích điểm.
- **Giao trong TP.HCM:** miễn phí.
- **Giao ngoài tỉnh/thành khác:** **30.000đ/đơn**, kể cả đơn giá trị cao. Chính sách này thay cho miễn phí theo ngưỡng 498.000đ trước đây.
- Khách chọn tỉnh/thành trong danh sách khi giao đến địa chỉ; chưa chọn thì giỏ hiển thị chưa xác định phí và không đặt được đơn. Server tính phí, không tin phí do trình duyệt gửi.
- Cách nhận, tỉnh/thành, địa chỉ cửa hàng và phí được lưu theo từng đơn. Nâng cấp không đổi phí hoặc tổng tiền của đơn cũ.

Thay đổi vai trò hoặc khóa tài khoản hủy các phiên đăng nhập cũ ngay lập tức. Tự đăng ký hoặc sửa hồ sơ không thể tự nâng quyền. Admin không được tự khóa hoặc tự hạ quyền tài khoản đang đăng nhập; hệ thống giữ ít nhất một admin hoạt động. Những thay đổi quyền có nhật ký audit.

Khi khởi động phiên bản mới, database cũ chỉ có `customer/admin` sẽ tự nâng cấp để hỗ trợ `staff`, giữ nguyên ID tài khoản, mật khẩu, phiên và dữ liệu đơn hàng. Không cần xóa database; kiểm thử migration bao gồm kiểm tra khóa ngoại và tính toàn vẹn dữ liệu.

Không mở trực tiếp `index.html` bằng `file://`. Website cần chạy qua server để gọi API. GitHub Pages chỉ phục vụ file tĩnh nên không chạy được backend này.

Khi đưa vào repo, `index.html` tại thư mục gốc được giữ nguyên để bảo toàn bản UI tĩnh hiện tại. Bản nối backend nằm ở `public/index.html` và được phục vụ qua `npm.cmd start`. Các chức năng phần 5–7 cần truy cập địa chỉ server Node.js, không phải bản GitHub Pages tĩnh.

## Đối chiếu yêu cầu

| Mục | Đã triển khai |
| --- | --- |
| 5. Khách hàng và quản trị | Đăng ký/đăng nhập bằng mật khẩu, đăng xuất, hồ sơ cá nhân, tìm/lọc/sắp xếp sản phẩm, giỏ hàng lưu trên server, đặt hàng, lịch sử và chi tiết đơn; khu vực admin phân quyền riêng. |
| 6. Sản phẩm, khách hàng, đơn và thanh toán | Thêm/sửa/ẩn sản phẩm; quản lý biến thể màu/size và tồn kho; xem/tìm/khóa/mở khóa khách hàng; xử lý đơn; tính giá/phí/ưu đãi trên server; COD và chuyển khoản đối soát thủ công khi có cấu hình; lịch sử nhận/hoàn tiền. |
| 7. Vận chuyển và trạng thái | Người nhận/điện thoại/địa chỉ, phí giao hàng, tên đơn vị vận chuyển, mã vận đơn, chuyển trạng thái theo quy trình, lịch sử thời gian và ghi chú hiển thị cho khách. |

## Giữ nguyên UI index

`public/index.html` giữ nguyên phần HTML/CSS của bản gốc trước script ứng dụng. Không sửa header, menu, banner, catalog, giỏ hàng, form đặt hàng hoặc footer. Kiểm thử có SHA-256 của phần UI gốc để phát hiện chỉnh sửa ngoài ý muốn.

- `public/app.js` giữ các hàm dựng giao diện sản phẩm, bộ lọc, banner và giỏ hàng; thay dữ liệu và nghiệp vụ bằng API.
- Nút tài khoản dẫn đến `/account` khi chưa đăng nhập; các mục hồ sơ/đơn hàng mở trang tài khoản riêng. Modal đăng nhập Google giả lập trong HTML gốc không còn được kích hoạt.
- Form đặt hàng gốc dùng COD. Trang `/account?tab=checkout` có lựa chọn chuyển khoản nếu đã cấu hình.
- Footer, chính sách, bộ đếm Flash Sale và thông tin giới thiệu của UI gốc được giữ lại; nội dung thương mại mẫu cần được chủ cửa hàng xác minh trước khi sử dụng thật.

## Quy tắc nghiệp vụ

### Đăng nhập và tích điểm

- Có thể xem sản phẩm và thêm giỏ khi chưa đăng nhập, nhưng **bắt buộc đăng nhập mới tạo được đơn hàng**. Server kiểm tra phiên, không nhận tài khoản do trình duyệt tự khai báo. Phiên hết hạn thì khách phải đăng nhập lại.
- Đơn chuyển sang **Đã giao** được cộng điểm vào tài khoản đặt đơn, bất kể người cập nhật là admin hay nhân viên. Việc tích điểm theo trạng thái giao hàng, không chờ xác nhận thu tiền COD riêng.
- Mức hiện tại: **1 điểm / 10.000đ tiền hàng sau giảm giá**, bỏ phần lẻ theo từng đơn, không tính phí vận chuyển. Ví dụ: tiền hàng 329.000đ, giảm 50.000đ, phí giao 30.000đ → tích **27 điểm**.
- Chưa giao hoặc đã hủy không được tích điểm. Mỗi đơn chỉ có một bản ghi điểm; gửi lại yêu cầu hoặc khởi động lại server không cộng thêm.
- Khách xem tổng điểm và lịch sử tại `/account`; mỗi đơn đã giao cũng hiển thị số điểm được cộng. Tài khoản chỉ xem được điểm của chính mình và không tự sửa điểm qua API.
- Database cũ tự thêm bảng `loyalty_points`; các đơn cũ ở trạng thái đã giao được ghi điểm một lần. Không cần xóa hoặc đặt lại dữ liệu.
- Phiên bản này chỉ tích và hiển thị điểm, chưa triển khai đổi điểm, hết hạn điểm hoặc xử lý trả hàng sau giao thành công.

### Đơn hàng và thanh toán

1. Đơn hàng: **Chờ xác nhận → Đã xác nhận → Đang chuẩn bị → Đang giao → Đã giao**.
2. Khách chỉ hủy được đơn của mình ở trạng thái **Chờ xác nhận**. Admin có thể hủy trước khi giao cho đơn vị vận chuyển. Không chuyển ngược hoặc bỏ qua bước.
3. Tồn kho được giữ ngay khi tạo đơn bằng giao dịch SQLite; khi hủy, hoàn kho đúng một lần. Biến thể không đủ hàng hoặc bị ngừng bán không thể đặt.
4. Trước khi chuyển sang **Đang giao**, bắt buộc có tên đơn vị vận chuyển và mã vận đơn. Đây là quản lý vận chuyển thủ công, chưa gọi API GHN/GHTK/Viettel Post.
5. Thanh toán tách biệt với giao hàng. Với COD, chỉ xác nhận nhận tiền sau khi đơn **Đã giao / Đã nhận tại cửa hàng**, và phải có biên nhận đối soát.
6. Đơn chuyển khoản cần admin xác nhận tiền thực nhận với mã giao dịch. Hủy đơn đã trả tiền chuyển sang **Chờ hoàn tiền**; admin hoàn tiền bên ngoài hệ thống rồi lưu biên nhận để chuyển **Đã hoàn tiền**. Bấm nút không thực hiện chuyển tiền ngân hàng.
7. Mỗi yêu cầu đặt hàng có khóa chống gửi trùng. API không nhận giá sản phẩm từ trình duyệt làm nguồn tính tiền; ảnh, tên, giá và biến thể được chụp lại trong đơn để không đổi theo catalog sau này.
8. Phí giao theo nơi nhận như mục trên. Mã `WELCOME50` giảm 50.000đ cho đơn từ 99.000đ. Hiện mã này có thể dùng nhiều lần; chưa triển khai chương trình giới hạn một lần mỗi tài khoản.
9. Khi admin đang sửa sản phẩm mà tồn kho/giá đã thay đổi, hệ thống từ chối ghi đè và yêu cầu tải lại.

## Dữ liệu và cấu hình

Database tự tạo tại `data/mocvai.sqlite`; WAL/SHM có thể xuất hiện khi server chạy. Lần chạy đầu nạp 12 sản phẩm từ UI gốc, mặc định mỗi màu/size có 20 đơn vị để thử nghiệp vụ. Các con số này là dữ liệu mẫu, cần sửa tại admin trước khi vận hành thật.

Các bảng: `users`, `sessions`, `products`, `variants`, `carts`, `cart_meta`, `orders`, `order_items`, `order_history`, `payment_events`, `loyalty_points`, `inventory_receipts`, `inventory_receipt_items`, `stock_movements`, `subscribers`, `audit`. Xem cấu trúc trong `schema.sql`.

Các biến môi trường PowerShell, đặt trước khi chạy server:

```powershell
$env:PORT = '3000'
$env:DB_PATH = 'C:\duong-dan\mocvai.sqlite'
# Chỉ bật khi đã có thông tin tài khoản nhận tiền chính xác:
$env:BANK_DETAILS = 'Tên ngân hàng; số tài khoản; tên chủ tài khoản'
npm.cmd start
```

`HOST` mặc định `127.0.0.1`. `COOKIE_SECURE=1` dành cho môi trường HTTPS. Đường dẫn database tương đối được tính từ thư mục chạy lệnh. Server không tự đọc `.env`; cần đặt biến môi trường hoặc cơ chế cấu hình của môi trường triển khai.

Mật khẩu được băm bằng scrypt với salt riêng; phiên đăng nhập nằm trong database, cookie HttpOnly/SameSite, có CSRF token, kiểm tra quyền ở server, truy vấn tham số hóa và escape dữ liệu hiển thị. Khóa khách hàng hủy các phiên đang đăng nhập.

## Kiểm tra và demo

```powershell
npm.cmd test
```

Kiểm thử chạy trên database tạm, tách khỏi dữ liệu cửa hàng: đăng nhập, CSRF, phân quyền, merge giỏ hàng, giá server, tồn kho, hủy, chống gửi trùng, chuyển trạng thái, COD, chuyển khoản/hoàn tiền, sửa sản phẩm, khóa khách và lưu dữ liệu.

Kịch bản demo:

1. Khách thêm sản phẩm vào giỏ, đăng ký tài khoản rồi đặt đơn COD.
2. Tải lại trang, mở **Đơn hàng của tôi** để chứng minh đơn được lưu.
3. Đăng nhập admin, mở **Sản phẩm & tồn kho** để xem số lượng đã giảm.
4. Mở **Đơn hàng & vận chuyển**, xác nhận → chuẩn bị → nhập đơn vị/mã vận đơn → đang giao.
5. Khách bấm **Tải lại trạng thái**, xem mã vận đơn và lịch sử.
6. Admin xác nhận đã giao, sau khi đối soát COD thì lưu biên nhận nhận tiền.
7. Thử một đơn khác, hủy khi chờ xác nhận và kiểm tra tồn kho được hoàn.

## Phạm vi bàn giao

Đây là mã nguồn cho phần 5–7, chưa triển khai backend lên máy chủ. Chưa tích hợp cổng thanh toán, webhook ngân hàng hay API vận chuyển thực. Những phần triển khai, sao lưu/giám sát, kiểm thử tải và mở rộng ở mục 8–12 của đề cần được thực hiện riêng trước khi tuyên bố sẵn sàng vận hành công khai. UI gốc vẫn dùng CDN Tailwind, Google Fonts và ảnh Unsplash nên cần Internet để hiển thị đầy đủ.

### Hai khu vực đăng nhập

`/account` dành cho khách hàng, có đăng ký tài khoản. `/account?admin=1` dành cho nhân viên và quản trị viên, chỉ đăng nhập bằng tài khoản đã được cấp. Chọn sai khu vực sẽ có thông báo chuyển sang khu vực phù hợp; máy chủ xác minh vai trò trước khi tạo phiên đăng nhập. Nhân viên/admin đăng nhập thành công được đưa đến khu vực quản lý.
