# Teaching Workload Management System (TWMS)

Hệ thống quản lý khối lượng giảng dạy toàn diện dành cho các trường đại học/cao đẳng, tập trung vào việc tự động hóa quy trình quản lý hợp đồng mời giảng và kê khai giờ dạy vượt định mức.

## 🌟 Các tính năng trọng tâm

### 1. Quản lý Mời giảng (Hợp đồng thỉnh giảng)
Hệ thống hóa toàn bộ quy trình từ lúc bắt đầu mời giảng đến khi thanh lý hợp đồng:
- **Hợp đồng & Phụ lục:** Tự động tạo file Word cho hợp đồng mời giảng và các phụ lục minh chứng đi kèm dựa trên mẫu (template) có sẵn.
- **Quản lý Giảng viên Mời giảng (GVM):** Lưu trữ hồ sơ, bằng cấp, và lịch sử giảng dạy của giảng viên ngoài trường.
- **Phê duyệt quy trình:** Hỗ trợ quy trình duyệt hợp đồng giữa Khoa và Phòng Đào tạo.
- **Thanh toán & Ủy nhiệm chi:** Hỗ trợ xuất file Ủy nhiệm chi và danh sách thanh toán thù lao giảng dạy.

### 2. Kê khai Vượt giờ & Thêm giờ (Excel Workflow)
Hỗ trợ giảng viên và bộ phận quản lý kê khai các hoạt động giảng dạy ngoài định mức chuẩn:
- **Hoạt động Giảng dạy:** Kê khai các giờ dạy trên lớp, lớp ngoài quy chuẩn.
- **Công tác Khảo thí:** Quản lý giờ coi thi, chấm thi và ra đề thi.
- **Hướng dẫn Đồ án & Tham quan:** Kê khai giờ hướng dẫn Đồ án tốt nghiệp và dẫn sinh viên đi thực tế/tham quan.
- **Xử lý Excel mạnh mẽ:** 
    - Nhập liệu (Import) từ file Excel khối lượng giảng dạy từ các phòng ban khác.
    - Xuất file (Export) tổng hợp kê khai theo mẫu của Giảng viên hoặc của Khoa.
- **Tự động hóa tính toán:** Tính toán số giờ quy đổi dựa trên hệ số (số lượng sinh viên, hệ đào tạo, tính chất môn học).

### 3. Tính năng hỗ trợ khác
- **Đồng bộ dữ liệu (Sync):** Kết nối và lấy dữ liệu từ hệ thống quản lý đào tạo, thời khóa biểu.
- **Quản lý Quy chuẩn:** Thiết lập định mức giờ dạy, quy định về số giờ NCKH và các hệ số quy đổi.
- **Thống kê & Báo cáo:** Cung cấp các biểu đồ và bảng biểu thống kê chi tiết về khối lượng công việc theo từng học kỳ, năm học.

## 🛠 Công nghệ sử dụng

- **Backend:** Node.js (Express framework)
- **Frontend:** EJS (Template Engine), Bootstrap 5, jQuery & jQuery UI
- **Cơ sở dữ liệu:** MySQL
- **Xử lý tài liệu:** 
    - **Excel:** `exceljs`, `xlsx`, `read-excel-file`
    - **Word:** `docxtemplater`, `docx`, `mammoth`
    - **PDF:** `pdf-merger-js`, `libreoffice-convert`

## 🚀 Cài đặt dự án

1. **Yêu cầu hệ thống:** Node.js >= 16, MySQL Server.
2. **Cài đặt thư viện:**
   ```bash
   npm install
   ```
3. **Cấu hình:** Tạo file `.env` và thiết lập các biến môi trường (DB_HOST, DB_USER, DB_PASS, DB_NAME).
4. **Khởi chạy:**
   ```bash
   npm start
   ```
   Truy cập: `http://localhost:3000`
