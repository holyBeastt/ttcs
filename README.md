# TTCS - Hệ thống Quản lý Khối lượng Giảng dạy

Hệ thống nội bộ của Học viện Kỹ thuật Mật mã (KMA), phục vụ quản lý hợp đồng mời giảng và kê khai giờ dạy vượt định mức.

## Tính năng chính

### Quản lý Mời giảng
- Tạo hợp đồng & phụ lục mời giảng (xuất file Word từ template)
- Quản lý hồ sơ giảng viên mời giảng (GVM)
- Quy trình phê duyệt hợp đồng giữa Khoa và Phòng Đào tạo
- Xuất Ủy nhiệm chi và danh sách thanh toán thù lao

### Kê khai Vượt giờ
- Kê khai giờ dạy trên lớp, lớp ngoài quy chuẩn
- Quản lý giờ coi thi, chấm thi, ra đề
- Kê khai hướng dẫn Đồ án tốt nghiệp, tham quan thực tế
- Import dữ liệu từ Excel khối lượng giảng dạy
- Export tổng hợp kê khai theo Giảng viên hoặc Khoa
- Tự động tính giờ quy đổi theo hệ số (sĩ số, hệ đào tạo, tính chất môn)

### Hỗ trợ khác
- Đồng bộ dữ liệu từ hệ thống quản lý đào tạo
- Quản lý quy chuẩn định mức, hệ số quy đổi
- Thống kê & báo cáo theo học kỳ, năm học

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Backend | Node.js, Express |
| Frontend | EJS, Bootstrap 5, jQuery |
| Database | MySQL |
| Excel | exceljs, xlsx |
| Word | docxtemplater, docx |
| PDF | pdf-merger-js, libreoffice-convert |

## Cài đặt

```bash
npm install
```

Tạo file `.env`:
```
DB_HOST=localhost
DB_USER=...
DB_PASS=...
DB_NAME=...
```

Chạy:
```bash
npm start
```

Truy cập: `http://localhost:3000`
