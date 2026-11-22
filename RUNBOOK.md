# Vận hành và triển khai Mộc Vải

## Trạng thái đã kiểm chứng

- Chạy HTTP/SQLite trên Windows bằng Node 24.17.0; 42/42 integration tests đạt.
- Health: GET /healthz kiểm tra SELECT 1, không tạo session.
- Backup: npm run backup dùng node:sqlite backup, kiểm tra integrity và khóa ngoại, xuất manifest SHA256.
- Benchmark: npm run benchmark -- performance.json dùng database tạm, không tạo tải lên cửa hàng.
- render.yaml và Dockerfile là cấu hình chuẩn bị; chưa coi là bằng chứng đã chạy trên hosting.

## Triển khai lên Render

Chủ dự án tự tạo tài khoản và xác nhận chi phí. Theo tài liệu Render, persistent disk cần dịch vụ trả phí. Không dùng filesystem ephemeral để lưu SQLite lâu dài.

1. Kết nối repository GitHub, tạo Blueprint từ render.yaml; kiểm tra lại gói starter/disk trước khi đồng ý tạo.
2. Đặt HOST=0.0.0.0, COOKIE_SECURE=1, DB_PATH=/var/data/mocvai.sqlite. Không đặt database trong thư mục public.
3. Sau deploy, mở HTTPS /healthz, kiểm tra JSON status/database đều ok.
4. Tạo admin qua shell bằng `npm run admin -- email-cua-ban`; nhập mật khẩu tương tác. Nếu môi trường chỉ hỗ trợ secret, dùng ADMIN_PASSWORD tạm cho lệnh này rồi xóa secret; không đưa vào build command hoặc Git.
5. Đăng ký tài khoản khách thử, admin cấp staff theo nhu cầu. Không công khai tài khoản quản trị demo.
6. Thử đơn nhỏ, xử lý trạng thái, điểm, phiếu nhập và backup. Restart service, đối chiếu đơn/tồn còn nguyên.
7. Ghi URL HTTPS và commit, log deploy và kết quả smoke test. Chỉ sau đó đánh dấu nghiệm thu hosting.

## Sao lưu và khôi phục

Chạy `npm run backup -- backups` với DB_PATH của service. Lệnh tạo tệp riêng, không ghi đè, mở read-only database nguồn, kiểm tra bản sao và tạo manifest.

Đề xuất mỗi ngày một bản, giữ 7 bản gần nhất và thêm bản mã hóa ngoài máy. Đây là lịch đề xuất, script không tự cài scheduler, không tự xóa bản cũ và không tự chuyển file ra dịch vụ khác.

Khôi phục: dừng service; giữ database hiện hành để đối chiếu; kiểm tra SHA256/PRAGMA của backup; mở backup tại đường dẫn mới; chạy kiểm tra tài khoản, đơn, điểm, tồn; chỉ đổi DB_PATH sau khi đạt. Không ghi đè database đang có tiến trình ghi.

Mục tiêu dự kiến RPO 24h và RTO 60 phút cần được kiểm chứng bằng diễn tập trên hosting. Thời gian mở tệp và so sánh vài bảng không phải RTO toàn hệ thống.

## Giám sát

`npm run healthcheck -- https://ten-web/healthz` trả exit code khác 0 khi timeout, lỗi HTTP hoặc DB không khỏe. Có thể dùng cron/Task Scheduler hoặc monitor bên ngoài gọi định kỳ; chưa cài lịch hoặc gửi cảnh báo trong đợt này. Theo dõi riêng dung lượng disk, backup mới nhất, lỗi HTTP và thời gian phản hồi.

## Hiệu năng và giới hạn

Benchmark chỉ đo GET /api/products trên loopback, một process, 12 mẫu/70 biến thể, 20 warmups và 300 requests mỗi C1/C10/C30. Không suy ra tải Internet hoặc tải ghi của toàn hệ thống. SQLite và DatabaseSync giới hạn mở rộng nhiều instance; cần phân trang và đo tải ghi trước khi tăng quy mô.

## Demo công khai tạm

Có thể dùng Cloudflare Quick Tunnel trỏ đến một database minh họa riêng. URL tạm chỉ hoạt động khi máy và tiến trình còn chạy, không SLA và không phải hosting production. Không tunnel database có khách hàng thật hoặc đưa mật khẩu vào URL. URL và trạng thái thực tế được ghi trong gói bằng chứng, không hardcode vào repo.

Tài liệu: https://render.com/docs/disks ; https://render.com/docs/blueprint-spec ; https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/
