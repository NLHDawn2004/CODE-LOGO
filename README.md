# HD CODE LOGO

Công cụ xử lý logo hàng loạt, chạy trên máy qua trình duyệt.

## Cách mở

1. Cài Node.js nếu máy chưa có.
2. Tải kho này về và giải nén.
3. Bấm đúp `MO-CONG-CU.cmd`.
4. Công cụ mở tại `http://127.0.0.1:18764/`.

Không cần cài thêm thư viện. Giữ các tệp của công cụ trong cùng thư mục.

## Chức năng

- Kéo thả nhiều ảnh hoặc nạp ảnh từ thư mục Google Drive công khai.
- Tách nền hoặc giữ nền, hỗ trợ đổi riêng từng logo trong phần xem trước.
- Zoom bằng thanh kéo, nút bấm hoặc con lăn chuột; kéo logo sang trái/phải.
- Chọn nền tự động tương phản, trắng, đen hoặc trong suốt.
- Viền tròn cố định 40 px, ghép sát nền logo.
- Xuất PNG theo mã Headpic hoặc giữ tên team ban đầu; tải từng ảnh hoặc ZIP.
- Chế độ giữ ảnh gốc trong khung 1000×1000, không thêm viền hoặc tách nền.

## Google Drive

API Key được cấu hình trong `drive-settings.json` và không hiện trên giao diện.
Kho này có kèm tệp cấu hình API theo yêu cầu của chủ công cụ.

Dán link thư mục rồi bấm **NẠP LOGO TỪ DRIVE**. Thư mục và ảnh cần quyền xem/tải công khai bằng đường liên kết. Công cụ đọc ảnh trực tiếp trong thư mục, không duyệt thư mục con; giới hạn 30 MB mỗi ảnh và 1000 ảnh mỗi thư mục.

Ảnh gốc tải từ Google qua bộ tải cục bộ để tránh lỗi đọc ảnh khác miền trong trình duyệt.

Xem thêm `HUONG-DAN.txt`. Mở trực tiếp `index.html` vẫn chọn ảnh từ máy được; chức năng Drive cần mở qua `MO-CONG-CU.cmd`.
