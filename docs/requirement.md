# Yêu cầu ứng dụng Mobile (Flutter)

## Tổng quan

Ứng dụng mobile Flutter phục vụ **giảng viên**, tập trung vào các nhu cầu tra cứu nhanh, nhận thông báo và cập nhật thông tin cá nhân trên điện thoại.

---

## Vai trò người dùng

| Vai trò | Mô tả |
|---|---|
| Giảng viên | Đăng nhập, xem thông báo, xem thông tin giảng viên mời, cập nhật hồ sơ cá nhân, xem thống kê cá nhân |

---

## Các tính năng

### 1. 🔐 Đăng nhập & Quản lý phiên

- Đăng nhập bằng tài khoản nội bộ
- Lưu phiên đăng nhập
- Đăng xuất

---

### 2. 👨‍🏫 Thông tin giảng viên mời của khoa

- Xem danh sách giảng viên mời của khoa
- Xem thông tin cơ bản của giảng viên mời
- Hỗ trợ tra cứu nhanh trên thiết bị di động

---

### 3. 🔔 Thông báo

- Xem danh sách thông báo
- Xem chi tiết nội dung thông báo
- Đánh dấu đã đọc / chưa đọc (nếu backend hỗ trợ)

---

### 4. 👤 Thông tin cá nhân

- Xem hồ sơ cá nhân
- Chỉnh sửa các thông tin cá nhân được phép cập nhật
- Đồng bộ dữ liệu với hệ thống backend

---

### 5. 📊 Thống kê cá nhân

- Xem các chỉ số thống kê cá nhân
- Hiển thị dữ liệu ngắn gọn, dễ theo dõi trên mobile

---

## Tính năng KHÔNG đưa lên mobile

| Tính năng | Lý do |
|---|---|
| Import dữ liệu từ Excel | Cần thao tác file, phù hợp web hơn |
| Đồng bộ dữ liệu hệ thống | Chức năng quản trị, nhạy cảm |
| Xuất Word / PDF / Excel | Phù hợp màn hình lớn hơn |
| Các chức năng quản trị tổng hợp của khoa | Không thuộc phạm vi mobile giai đoạn đầu |

---

## Kiến trúc

```
Flutter App
    ↓ REST API (JSON)
Backend Node.js/Express (hiện tại)
    → Bổ sung các endpoint JSON cho mobile
    ↓
MySQL Database
```

> **Lưu ý**: Backend hiện tại chủ yếu render server-side (EJS). Cần **bổ sung REST API endpoints** trả JSON cho mobile. Một số AJAX endpoint hiện có có thể tái sử dụng.

---

## Lộ trình phát triển

| Phase | Nội dung |
|---|---|
| Phase 1 | Đăng nhập + Xem thông tin giảng viên mời của khoa + Thông báo + Chỉnh sửa thông tin cá nhân |
| Phase 2 | Xem thông báo + Thống kê cá nhân |
