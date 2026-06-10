# TÓM TẮT LUỒNG VƯỢT GIỜ

> **Quick Reference Guide**

## 1. BA LUỒNG CHÍNH

### 🔵 DỰ KIẾN (Preview)
- **Nguồn:** `quychuan` + 3 bảng VG (không yêu cầu duyệt)
- **Mục đích:** Xem trước dữ liệu
- **Đặc điểm:** ⚠️ Có thể thay đổi
- **API:** `GET /v2/vuotgio/ca-nhan-du-kien`

### 🟡 CHÍNH THỨC (Draft)
- **Nguồn:** `giangday` + 3 bảng VG (yêu cầu duyệt)
- **Mục đích:** Dữ liệu đã lưu, chờ duyệt tổng hợp
- **Vấn đề:** ❌ Hiện chỉ check 1 cấp (nên là 2 cấp)
- **API:** `GET /v2/vuotgio/ca-nhan-chinh-thuc`

### 🔒 SAU LƯU (Locked)
- **Nguồn:** `vg_so_tiet_tong_hop` (Snapshot)
- **Mục đích:** Dữ liệu đã chốt, không thay đổi
- **Đặc điểm:** ✅ Nhất quán 100%, có versioning
- **API:** `GET /v2/vuotgio/ca-nhan-sau-luu`

---

## 2. CÔNG THỨC TÍNH VƯỢT GIỜ

```
Tổng thực hiện = Giảng dạy + Lớp ngoài QC + KTHP + Đồ án + HDTQ

Định mức sau miễn giảm = Định mức chuẩn - (Định mức × % miễn giảm)

Thiếu NCKH = max(0, Định mức NCKH sau miễn giảm - Số tiết NCKH)

Vượt giờ thực tế = max(0, (Tổng thực hiện - Thiếu NCKH) - Định mức sau miễn giảm)

Vượt giờ thanh toán = min(Vượt giờ thực tế, Định mức sau miễn giảm)
```

---

## 3. QUY TRÌNH DUYỆT

```
Nhập liệu → Duyệt Khoa → Duyệt Đào tạo/Khảo thí 
    ↓
Duyệt Tổng hợp (VP/TC) → Khóa dữ liệu → Snapshot
    ↓
Thống kê / Preview / Xuất file (từ Snapshot)
```

**Điều kiện khóa:**
1. ✅ Tất cả bản ghi đã duyệt 2 cấp
2. ✅ Tất cả khoa đã duyệt tổng hợp
3. ✅ Năm học chưa bị khóa

---

## 4. VẤN ĐỀ NGHIÊM TRỌNG

### ❌ BUG: Chỉ check 1 cấp duyệt

**Vị trí:** `src/repositories/vuotgio_v2/tongHop.repo.js`

**Hiện tại:**
```javascript
const approvedCond = requireApproval ? "AND khoa_duyet = 1" : "";
```

**Nên sửa thành:**
```javascript
// Lớp ngoài QC và HDTQ
const approvedCond = requireApproval 
    ? "AND khoa_duyet = 1 AND dao_tao_duyet = 1" : "";

// KTHP
const approvedCond = requireApproval 
    ? "AND khoa_duyet = 1 AND khao_thi_duyet = 1" : "";
```

---

## 5. KIỂM TRA NHANH

### ✅ ĐÚNG
- [x] Công thức tính toán nhất quán
- [x] Snapshot architecture tốt
- [x] Dữ liệu sau lưu đồng bộ 100%
- [x] Breakdown theo hệ đào tạo chính xác

### ❌ CẦN FIX
- [ ] Query chỉ check 1 cấp duyệt (nên là 2 cấp)
- [ ] Thiếu audit trail cho duyệt
- [ ] Thiếu validation số tiết
- [ ] Dự kiến không có warning "có thể thay đổi"

---

## 6. CÂU TRẢ LỜI CHO CÁC CÂU HỎI

| Câu hỏi | Trả lời |
|---------|---------|
| **Dự kiến: Luồng dữ liệu chính xác?** | ✅ Có, nhưng dữ liệu không ổn định |
| **Chính thức: Duyệt 2 cấp đảm bảo?** | ❌ KHÔNG - Chỉ check 1 cấp |
| **Dự kiến = Chính thức khi hoàn thành?** | ❌ KHÔNG tự động bằng nhau |
| **Sau lưu: Dữ liệu từ bảng duy nhất?** | ✅ Có - `vg_so_tiet_tong_hop` |
| **Cơ chế tính toán đồng nhất?** | ✅ Có - Single source of truth |

---

## 7. ACTION ITEMS

| Priority | Task | File |
|----------|------|------|
| 🔴 **P0** | Fix query duyệt 2 cấp | `tongHop.repo.js` |
| 🟠 **P1** | Thêm audit trail | New migration |
| 🟠 **P1** | Thêm validation | `*.service.js` |
| 🟡 **P2** | Warning UI dự kiến | Frontend |

---

**Chi tiết đầy đủ:** Xem file `LUONG_VUOT_GIO_ANALYSIS.md`
