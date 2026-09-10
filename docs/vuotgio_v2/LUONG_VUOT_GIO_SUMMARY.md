# TÓM TẮT LUỒNG VƯỢT GIỜ V2

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**. Khi tài liệu mâu thuẫn với source code, source code là nguồn quyết định.

## 1. Ba trạng thái dữ liệu

### 🔵 Dự kiến (live projected)

- API/view tiêu biểu: `GET /v2/vuotgio/ca-nhan-du-kien`, tổng hợp với `isDuKien=true`.
- Giảng dạy từ `quychuan`, DATN từ `doantotnghiep` đã transform/map.
- LNQC/KTHP/HDTQ đọc runtime rows không thêm điều kiện duyệt.
- NCKH vẫn lấy qua stats scope mặc định **OFFICIAL**, nên phải đủ `khoa_duyet=1 AND vien_nc_duyet=1`.
- Dữ liệu có thể thay đổi.

### 🟡 Chính thức (live official)

- API/view tiêu biểu: `GET /v2/vuotgio/ca-nhan-chinh-thuc`, `/tong-hop/giang-vien?isDuKien=false`.
- Giảng dạy từ `giangday`, DATN từ `exportdoantotnghiep`.
- LNQC: `khoa_duyet=1 AND dao_tao_duyet=1`.
- KTHP: `khoa_duyet=1 AND khao_thi_duyet=1` trên `vg_kthp`.
- HDTQ: `khoa_duyet=1 AND dao_tao_duyet=1`.

### 🔒 Sau khóa (snapshot)

- Snapshot lưu trong `vg_so_tiet_tong_hop` với version/latest metadata và JSON SDO đầy đủ.
- `GET /v2/vuotgio/ca-nhan-sau-luu`, thống kê khoa và export đọc snapshot khi năm đã khóa.
- Preview cá nhân/khoa tự động dùng snapshot nếu năm đã khóa; trước khóa vẫn có thể tính live.

## 2. Công thức hiện hành

```text
tongThucHien = Giảng dạy + LNQC + KTHP + Đồ án + HDTQ
thieuNCKH = max(0, dinhMucNCKH - soTietNCKH)
tongVuot = max(0, tongThucHien - thieuNCKH - dinhMucSauMienGiam)
thanhToan = min(tongVuot, dinhMucSauMienGiam)
```

- Mặc định khi thiếu `sotietdinhmuc`: `dinhMucChuan=280`, `dinhMucNCKH=200`.
- NCKH **không** được miễn giảm; chỉ định mức giảng dạy chịu policy miễn giảm.
- V1 dùng phần trăm miễn giảm trực tiếp cho định mức giảng dạy.
- V2 chỉ áp dụng cho `2025 - 2026` đến `2031 - 2032`; nếu có miễn giảm thì định mức giảng dạy là `224`, `mienGiam=56`.

## 3. Duyệt và khóa

```text
Nhập liệu
  → Khoa duyệt
  → Đào tạo/Khảo thí duyệt cấp 2
  → Văn phòng duyệt tổng hợp từng khoa
  → Khóa năm học
  → Tính official SDO + lưu snapshot
```

Điều kiện khóa gồm năm hợp lệ/tồn tại, chưa khóa, toàn bộ LNQC/KTHP/HDTQ đủ hai cấp duyệt, mọi khoa đã `van_phong_duyet=1`, và có SDO để lưu. Sau khóa, `checkDataLock` chặn các route ghi Vượt Giờ có gắn middleware; route duyệt tổng hợp có guard riêng.

## 4. Payment/export

`PaymentCalculator.computeSdoBreakdown()` chia `thanhToan` theo năm nhóm `vn`, `lao`, `cuba`, `cpc`, `dongHP`, phân bổ phần dư vào nhóm cuối và tính đơn giá bằng `ROUND(luong / 176, 0)`. Constant `MAX_PAYABLE_HOURS=300` hiện không được áp dụng trong calculator.

## 5. Nguồn code chính

```text
src/services/vuotgio_v2/tongHop.service.js
src/mappers/vuotgio_v2/summary.mapper.js
src/mappers/vuotgio_v2/policies/OvertimePolicyFactory.js
src/services/vuotgio_v2/dataLock.service.js
src/services/vuotgio_v2/snapshotData.service.js
src/services/vuotgio_v2/xuatFile.service.js
```
