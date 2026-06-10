# PHÂN TÍCH ẢNH HƯỞNG: SỬA BUG DUYỆT 2 CẤP

> **Mục đích:** Đánh giá tác động của việc sửa query từ check 1 cấp → 2 cấp  
> **Trạng thái:** CHƯA SỬA CODE - Phân tích trước khi thực hiện

---

## 1. HIỆN TRẠNG

### 1.1. Query hiện tại (1 cấp)

**File:** `src/repositories/vuotgio_v2/tongHop.repo.js`

```javascript
// Dòng 411
const approvedCond = requireApproval ? "AND khoa_duyet = 1" : "";

// Áp dụng cho 3 bảng:
// 1. vg_lop_ngoai_quy_chuan
// 2. vg_coi_cham_ra_de  
// 3. vg_huong_dan_tham_quan_thuc_te
```

**Các hàm bị ảnh hưởng:**

| Hàm | Sử dụng | Tác động |
|-----|---------|----------|
| `getLopNgoaiQCByIdUser()` | Query 1 GV | ✅ |
| `getKthpByIdUser()` | Query 1 GV | ✅ |
| `getHuongDanThamQuanByIdUser()` | Query 1 GV | ✅ |
| `getLopNgoaiQCByIds()` | Batch query nhiều GV | ✅ |
| `getKthpByIds()` | Batch query nhiều GV | ✅ |
| `getHuongDanThamQuanByIds()` | Batch query nhiều GV | ✅ |
| `getDuLieuThoTongHop()` | Aggregation toàn khoa | ✅ |

### 1.2. Điều kiện duyệt đúng (2 cấp)

Theo code validation trong `duyetTongHop.repo.js` và `dataLock.repo.js`:

```javascript
// Lớp ngoài QC
khoa_duyet = 1 AND dao_tao_duyet = 1

// Coi chấm ra đề (KTHP)
khoa_duyet = 1 AND khao_thi_duyet = 1

// Hướng dẫn tham quan
khoa_duyet = 1 AND dao_tao_duyet = 1
```

---

## 2. ẢNH HƯỞNG TRỰC TIẾP (Khi sửa code)

### 2.1. Dữ liệu bị loại bỏ

**Khi sửa → Các bản ghi SAU sẽ KHÔNG còn được tính vào vượt giờ:**

#### Trường hợp A: Lớp ngoài QC
```sql
-- BỊ LOẠI BỎ:
SELECT * FROM vg_lop_ngoai_quy_chuan
WHERE khoa_duyet = 1 AND dao_tao_duyet = 0;
```

**Ví dụ thực tế:**
- Khoa CNTT duyệt 1 lớp ngoài QC: `khoa_duyet = 1`
- Đào tạo chưa duyệt: `dao_tao_duyet = 0`
- Lớp này có 10 tiết quy chuẩn

**Hiện tại:** 10 tiết này **VẪN TÍNH** vào vượt giờ của GV ❌  
**Sau khi sửa:** 10 tiết này **KHÔNG TÍNH** ✅

#### Trường hợp B: Coi chấm ra đề (KTHP)
```sql
-- BỊ LOẠI BỎ:
SELECT * FROM vg_coi_cham_ra_de
WHERE khoa_duyet = 1 AND khao_thi_duyet = 0;
```

**Ví dụ thực tế:**
- GV coi thi, khoa duyệt: `khoa_duyet = 1`
- Phòng Khảo thí chưa duyệt: `khao_thi_duyet = 0`
- Có 5 tiết quy chuẩn

**Hiện tại:** 5 tiết này **VẪN TÍNH** ❌  
**Sau khi sửa:** 5 tiết này **KHÔNG TÍNH** ✅

#### Trường hợp C: Hướng dẫn tham quan
```sql
-- BỊ LOẠI BỎ:
SELECT * FROM vg_huong_dan_tham_quan_thuc_te
WHERE khoa_duyet = 1 AND dao_tao_duyet = 0;
```

**Tương tự như Lớp ngoài QC**

### 2.2. Thay đổi số liệu vượt giờ

**Công thức tính vượt giờ:**

```
Tổng thực hiện (TRƯỚC) = Giảng dạy + Lớp ngoài QC (1 cấp) + KTHP (1 cấp) + Đồ án + HDTQ (1 cấp)
Tổng thực hiện (SAU)   = Giảng dạy + Lớp ngoài QC (2 cấp) + KTHP (2 cấp) + Đồ án + HDTQ (2 cấp)
```

**Kết quả:**

| Trường hợp | Số tiết bị loại | Ảnh hưởng vượt giờ |
|------------|-----------------|-------------------|
| GV A có 10 tiết LNQC chỉ duyệt 1 cấp | -10 tiết | Vượt giờ **GIẢM 10 tiết** |
| GV B có 5 tiết KTHP chỉ duyệt 1 cấp | -5 tiết | Vượt giờ **GIẢM 5 tiết** |
| GV C có 8 tiết HDTQ chỉ duyệt 1 cấp | -8 tiết | Vượt giờ **GIẢM 8 tiết** |
| GV D: Tất cả đã duyệt 2 cấp | 0 tiết | **KHÔNG ẢNH HƯỞNG** |

---

## 3. ẢNH HƯỞNG GIÁN TIẾP

### 3.1. Snapshot đã tạo (Dữ liệu cũ)

**Vấn đề:** Các năm học đã khóa dữ liệu (đã tạo snapshot) sẽ **KHÔNG tự động thay đổi**.

**Ví dụ:**
- Năm 2023-2024 đã khóa ngày 01/08/2024 (dùng query 1 cấp)
- Snapshot lưu trong `vg_so_tiet_tong_hop` với dữ liệu sai
- Sửa code ngày 10/06/2026
- **Snapshot cũ vẫn giữ nguyên dữ liệu sai** ❌

**Giải pháp:**

#### Option 1: Chấp nhận dữ liệu cũ sai (Khuyến nghị)
- ✅ Không làm gì với snapshot cũ
- ✅ Chỉ áp dụng fix cho năm học mới
- ✅ Ghi chú vào changelog: "Trước ngày X, dữ liệu tính theo 1 cấp"

#### Option 2: Tính lại snapshot cũ (Rủi ro cao)
```sql
-- KHÔNG KHUYẾN NGHỊ
-- Cần approval từ Ban Giám đốc/Tài chính trước khi thực hiện

-- Bước 1: Backup snapshot cũ
CREATE TABLE vg_so_tiet_tong_hop_backup_20260610 
SELECT * FROM vg_so_tiet_tong_hop;

-- Bước 2: Xóa snapshot cũ của năm cần tính lại
DELETE FROM vg_so_tiet_tong_hop 
WHERE nam_hoc = '2023 - 2024';

-- Bước 3: Xóa lock để cho phép tính lại
DELETE FROM vg_khoa_du_lieu 
WHERE nam_hoc = '2023 - 2024';

-- Bước 4: Chạy lại quy trình khóa (qua UI hoặc API)
-- POST /v2/vuotgio/tong-hop/khoa-du-lieu
```

⚠️ **RỦI RO:**
- Số liệu thay đổi → GV có thể khiếu nại
- File Excel đã xuất khác với snapshot mới
- Cần thông báo và giải thích cho tất cả GV

### 3.2. UI hiển thị sẽ thay đổi

**Các màn hình bị ảnh hưởng:**

| Màn hình | Endpoint | Ảnh hưởng |
|----------|----------|-----------|
| **Tổng hợp Giảng viên** | `/tong-hop/giang-vien?isDuKien=false` | Số liệu GIẢM |
| **Tổng hợp Khoa** | `/tong-hop/khoa` | Số liệu GIẢM |
| **Chi tiết cá nhân (Chính thức)** | `/ca-nhan-chinh-thuc` | Số liệu GIẢM |
| **Preview cá nhân** | `/tong-hop/preview/:MaGV` | (Từ snapshot, không đổi) |
| **Xuất file** | `/xuat-file/excel` | (Từ snapshot, không đổi) |

**Lưu ý:** 
- ✅ Màn hình **Dự kiến** (`isDuKien=true`) **KHÔNG ẢNH HƯỞNG** vì không check approval
- ✅ Màn hình **Sau lưu** (từ snapshot) **KHÔNG ẢNH HƯỞNG** với năm đã khóa

### 3.3. Quy trình duyệt bị chặt chẽ hơn

**Trước khi sửa:**
```
Nhập liệu → Khoa duyệt → ✅ Đã tính vào vượt giờ (SAI)
```

**Sau khi sửa:**
```
Nhập liệu → Khoa duyệt → Đào tạo/Khảo thí duyệt → ✅ Mới tính vào vượt giờ (ĐÚNG)
```

**Ảnh hưởng:**
- ⚠️ Quy trình dài hơn
- ⚠️ Nếu Đào tạo/Khảo thí chậm duyệt → GV sẽ thấy số tiết **ÍT HƠN**
- ⚠️ Cần training lại cho người dùng

---

## 4. ẢNH HƯỞNG THEO NHÓM NGƯỜI DÙNG

### 4.1. Giảng viên

**Ảnh hưởng:**
- ❌ **Số tiết vượt giờ GIẢM** nếu có bản ghi chỉ duyệt 1 cấp
- ❌ **Tiền vượt giờ GIẢM** tương ứng
- ⚠️ Có thể **phản đối** nếu đã quen với số liệu cũ

**Kịch bản cụ thể:**

```
GV Nguyễn Văn A:
- Tổng tiết thực hiện (trước): 320 tiết
  ├─ Giảng dạy: 280 tiết
  ├─ Lớp ngoài QC: 20 tiết (khoa_duyet=1, dao_tao_duyet=0) ← BỊ LOẠI
  ├─ KTHP: 15 tiết (khoa_duyet=1, khao_thi_duyet=1) ← ĐƯỢC GIỮ
  └─ Đồ án: 5 tiết

- Tổng tiết thực hiện (sau): 300 tiết (GIẢM 20 tiết)
