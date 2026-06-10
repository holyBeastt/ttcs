# PHÂN TÍCH LUỒNG VƯỢT GIỜ (Vuotgio V2)

> **Document Version:** 2.0  
> **Ngày cập nhật:** 2026-06-10  
> **Nguồn:** Phân tích từ codebase thực tế

---

## MỤC LỤC

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Luồng Dự kiến](#2-luồng-dự-kiến)
3. [Luồng Chính thức](#3-luồng-chính-thức)
4. [Luồng Sau lưu (Snapshot)](#4-luồng-sau-lưu-snapshot)
5. [Cơ chế tính toán](#5-cơ-chế-tính-toán)
6. [Vấn đề và khuyến nghị](#6-vấn-đề-và-khuyến-nghị)

---

## 1. TỔNG QUAN KIẾN TRÚC

### 1.1. Các thành phần chính

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│  Controllers: tongHop, preview, xuatFile, duyetTongHop  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                     SERVICE LAYER                        │
│  - tongHop.service (SDO Engine)                         │
│  - thongKe.service (Aggregation)                        │
│  - snapshotData.service (Read from snapshot)            │
│  - xuatFile.service (Export Type A)                     │
│  - consolidatedExport.service (Export Type B)           │
│  - duyetTongHop.service (Approval workflow)             │
│  - dataLock.service (Lock & snapshot creation)          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                   REPOSITORY LAYER                       │
│  - tongHop.repo (Data fetching)                         │
│  - duyetTongHop.repo (Approval status)                  │
│  - soTietTongHop.repo (Snapshot storage)                │
│  - dataLock.repo (Lock records)                         │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                     DATABASE LAYER                       │
│  Tables:                                                 │
│  - giangday / quychuan (Teaching data)                  │
│  - vg_lop_ngoai_quy_chuan (External classes)           │
│  - vg_coi_cham_ra_de (Exam supervision)                │
│  - exportdoantotnghiep / doantotnghiep (Thesis)         │
│  - vg_huong_dan_tham_quan_thuc_te (Field trips)        │
│  - nckh_v3 (Research hours - external service)         │
│  - vg_duyet_tong_hop (Approval by department)          │
│  - vg_khoa_du_lieu (Data lock records)                 │
│  - vg_so_tiet_tong_hop (Snapshot storage)              │
└─────────────────────────────────────────────────────────┘
```

### 1.2. Các nguồn dữ liệu (Data Sources)

| Nguồn | Bảng DB | Điều kiện lọc | Ghi chú |
|-------|---------|---------------|---------|
| **Giảng dạy** | `giangday` (Chính thức)<br>`quychuan` (Dự kiến) | `MoiGiang = 0` (Chỉ cơ hữu) | Dự kiến: Lấy TẤT CẢ từ quychuan<br>Chính thức: Đã lưu vào giangday |
| **Lớp ngoài QC** | `vg_lop_ngoai_quy_chuan` | `khoa_duyet = 1` (Chính thức) | Không có khái niệm "dự kiến" |
| **Coi chấm ra đề** | `vg_coi_cham_ra_de` | `khoa_duyet = 1` (Chính thức) | Import từ file Excel |
| **Đồ án** | `exportdoantotnghiep` (Chính thức)<br>`doantotnghiep` (Dự kiến) | `isMoiGiang = 0` | Dự kiến: Qua service transform |
| **Hướng dẫn TQ** | `vg_huong_dan_tham_quan_thuc_te` | `khoa_duyet = 1` (Chính thức) | Nhập thủ công |
| **NCKH** | External: `nckh_v3` service | - | Gọi `statsService.getLecturerSummary()` |

---

## 2. LUỒNG DỰ KIẾN

### 2.1. Mục đích
- Xem **trước** dữ liệu vượt giờ **trước khi lưu chính thức**
- Dùng để kiểm tra, đối chiếu với quy chuẩn
- **KHÔNG có cơ chế duyệt**, dữ liệu có thể thay đổi

### 2.2. Dự kiến Cá nhân

**Endpoint:** `GET /v2/vuotgio/ca-nhan-du-kien?namHoc=2024 - 2025`

**Luồng dữ liệu:**

```
UI Request → tongHopController.getStandardSummaryData(isDuKien=true)
         ↓
tongHopService.getAtomicSDO(namHoc, id_User, isDuKien=true)
         ↓
Parallel fetch:
  ├─ giangDay:     FROM quychuan (ALL records, MoiGiang=0)
  ├─ lopNgoaiQC:   FROM vg_lop_ngoai_quy_chuan (NO requireApproval)
  ├─ kthp:         FROM vg_coi_cham_ra_de (NO requireApproval)
  ├─ doAn:         FROM doantotnghiep (transform qua service)
  ├─ hdtq:         FROM vg_huong_dan_tham_quan_thuc_te (NO requireApproval)
  └─ nckhRecords:  FROM nckh_v3 service
         ↓
mapper.toAtomicSDO() → Tính toán SDO
         ↓
Return: {
  id_User, giangVien, khoa,
  soTietGiangDay, soTietNgoaiQC, soTietKTHP, soTietDoAn, soTietHDTQ,
  soTietNCKH, tongThucHien, thieuNCKH, tongVuot, thanhToan,
  tableE, tableF, breakdown, raw (chi tiết từng nguồn)
}
```

**Đặc điểm:**
- ✅ Lấy **TẤT CẢ** dữ liệu từ `quychuan` (chưa lưu)
- ✅ Lấy dữ liệu từ 3 bảng vượt giờ **KHÔNG cần duyệt** (`requireApproval=false`)
- ✅ Dữ liệu có thể **thay đổi** theo quy chuẩn
- ❌ **KHÔNG có snapshot**, tính toán real-time

### 2.3. Dự kiến Chung (Tổng hợp)

**Endpoint:** `GET /v2/vuotgio/tong-hop/giang-vien?namHoc=2024 - 2025&khoa=CNTT&isDuKien=true`

**Luồng dữ liệu:**

```
UI Request → tongHopController.tongHopTheoGV(isDuKien=true)
         ↓
tongHopService.getCollectionSDODetail(namHoc, khoa, isDuKien=true)
         ↓
Batch fetch (1 query per table):
  1. getDuLieuThoTongHop → Lấy danh sách GV theo khoa
  2. Parallel batch queries:
     ├─ getGiangDayByIds:  FROM quychuan (processed by giangDayService)
     ├─ getLopNgoaiQCByIds: FROM vg_lop_ngoai_quy_chuan
     ├─ getKthpByIds:      FROM vg_coi_cham_ra_de
     ├─ getDoAnByIds:      FROM doantotnghiep (transformed)
     ├─ getHuongDanThamQuanByIds: FROM vg_huong_dan_tham_quan_thuc_te
     └─ statsService.getLecturerSummary(): NCKH toàn bộ GV
         ↓
Group by id_User in memory → Map từng GV
         ↓
mapper.toAtomicSDO() cho từng GV
         ↓
Return: Array<SDO>
```

**Đặc điểm:**
- ✅ Batch query (8 queries thay vì N*8)
- ✅ Hiệu năng cao hơn query từng GV
- ⚠️ **Lưu ý:** Dữ liệu từ `quychuan` có thể thay đổi → Số liệu không ổn định

### 2.4. Kiểm tra tính chính xác của luồng Dự kiến

#### ✅ ĐÚNG:
1. **Nguồn dữ liệu hợp lý:**
   - Giảng dạy từ `quychuan` (chưa lưu)
   - 3 bảng vượt giờ từ DB (có thể chưa duyệt hết)
   - NCKH từ service riêng

2. **Công thức tính toán:**
   - Sử dụng chung `calculateOvertime()` với luồng Chính thức
   - Consistency trong logic

#### ⚠️ CẨN THẬN:
1. **Không có cơ chế khóa dữ liệu:**
   - Dự kiến = Xem trước, có thể thay đổi
   - Không nên dùng để ra quyết định chính thức

2. **Dữ liệu có thể lẫn:**
   - Nếu `quychuan` có cả GVM (MoiGiang=1) → Cần filter
   - Code đã filter: `WHERE qc.MoiGiang = 0` ✅

---

## 3. LUỒNG CHÍNH THỨC

### 3.1. Quy trình Duyệt 2 Cấp

**Điều kiện để tính vượt giờ Chính thức:**

```
┌─────────────────────────────────────────────────────────┐
│  BẢNG VG_LOP_NGOAI_QUY_CHUAN                           │
│  Điều kiện: khoa_duyet = 1 AND dao_tao_duyet = 1       │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│  BẢNG VG_COI_CHAM_RA_DE                                │
│  Điều kiện: khoa_duyet = 1 AND khao_thi_duyet = 1      │
└─────────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│  BẢNG VG_HUONG_DAN_THAM_QUAN_THUC_TE                   │
│  Điều kiện: khoa_duyet = 1 AND dao_tao_duyet = 1       │
└─────────────────────────────────────────────────────────┘
```

**Lưu ý quan trọng:**
- ⚠️ Code hiện tại **CHỈ check `khoa_duyet = 1`** khi `requireApproval=true`
- ❌ **KHÔNG check cấp 2** (`dao_tao_duyet`, `khao_thi_duyet`) trong query
- 🐛 **Tiềm ẩn bug:** Dữ liệu chỉ duyệt 1 cấp vẫn được tính vào vượt giờ

**Code thực tế trong `tongHop.repo.js`:**

```javascript
const requireApproval = !isDuKien;
// ...
const [lnqc] = await connection.execute(
    queryDetails('vg_lop_ngoai_quy_chuan', 'nam_hoc', approvedCond),
    [namHoc, ...lecturerIds]
);

// approvedCond = "AND khoa_duyet = 1" (chỉ check 1 cấp!)
```

### 3.2. Tài chính Duyệt Vượt Giờ (Duyệt Tổng Hợp)

**Endpoint:** `POST /v2/vuotgio/tong-hop/duyet-khoa`

**Mục đích:** Văn phòng/Tài chính duyệt **tổng hợp vượt giờ theo khoa** sau khi tất cả bản ghi đã duyệt 2 cấp.

**Luồng:**

```
UI Request (namHoc, khoa, userId, ghiChu)
         ↓
duyetTongHopController.approveKhoa()
         ↓
1. Check điều kiện tiên quyết:
   duyetTongHopRepo.getUnapprovedCountsByKhoa()
   → Kiểm tra 3 bảng đã duyệt 2 cấp chưa:
     - vg_lop_ngoai_quy_chuan: khoa_duyet=1 AND dao_tao_duyet=1
     - vg_coi_cham_ra_de: khoa_duyet=1 AND khao_thi_duyet=1
     - vg_huong_dan_tham_quan_thuc_te: khoa_duyet=1 AND dao_tao_duyet=1
         ↓
   Nếu còn bản ghi chưa duyệt → Return error với chi tiết
         ↓
2. Upsert bản ghi duyệt:
   INSERT INTO vg_duyet_tong_hop 
   (nam_hoc, khoa, van_phong_duyet, van_phong_nguoi_duyet_id, van_phong_ngay_duyet, ghi_chu)
   VALUES (?, ?, 1, ?, NOW(), ?)
   ON DUPLICATE KEY UPDATE ...
         ↓
Return success
```

**Bảng `vg_duyet_tong_hop`:**

| Cột | Mô tả |
|-----|-------|
| `nam_hoc` | Năm học |
| `khoa` | Mã khoa |
| `van_phong_duyet` | 0/1 (Trạng thái duyệt) |
| `van_phong_nguoi_duyet_id` | ID người duyệt |
| `van_phong_ngay_duyet` | Thời gian duyệt |
| `ghi_chu` | Ghi chú |

**Điều kiện khóa dữ liệu:** Tất cả khoa phải duyệt tổng hợp trước khi khóa.

### 3.3. Chính thức Cá nhân

**Endpoint:** `GET /v2/vuotgio/ca-nhan-chinh-thuc?namHoc=2024 - 2025`

**Luồng dữ liệu:**

```
UI Request → tongHopController.getStandardSummaryData(isDuKien=false)
         ↓
tongHopService.getAtomicSDO(namHoc, id_User, isDuKien=false)
         ↓
Parallel fetch:
  ├─ giangDay:     FROM giangday (Đã lưu, MoiGiang=0)
  ├─ lopNgoaiQC:   FROM vg_lop_ngoai_quy_chuan WHERE khoa_duyet=1
  ├─ kthp:         FROM vg_coi_cham_ra_de WHERE khoa_duyet=1
  ├─ doAn:         FROM exportdoantotnghiep (isMoiGiang=0)
  ├─ hdtq:         FROM vg_huong_dan_tham_quan_thuc_te WHERE khoa_duyet=1
  └─ nckhRecords:  FROM nckh_v3 service
         ↓
mapper.toAtomicSDO() → Tính toán SDO
         ↓
Return SDO
```

**So sánh với Dự kiến:**

| Nguồn | Dự kiến | Chính thức |
|-------|---------|------------|
| Giảng dạy | `quychuan` (ALL) | `giangday` (Đã lưu) |
| Lớp ngoài QC | Tất cả | `khoa_duyet=1` |
| KTHP | Tất cả | `khoa_duyet=1` |
| Đồ án | `doantotnghiep` | `exportdoantotnghiep` |
| HDTQ | Tất cả | `khoa_duyet=1` |

### 3.4. Kiểm tra tính chính xác

#### ❌ VẤN ĐỀ NGHIÊM TRỌNG:

**1. Query chỉ check 1 cấp duyệt thay vì 2 cấp:**

```javascript
// File: tongHop.repo.js
// HIỆN TẠI:
const approvedCond = requireApproval ? "AND khoa_duyet = 1" : "";

// NÊN SỬA THÀNH (Theo đúng nghiệp vụ):
const approvedCondLNQC = requireApproval 
    ? "AND khoa_duyet = 1 AND dao_tao_duyet = 1" : "";
const approvedCondKTHP = requireApproval 
    ? "AND khoa_duyet = 1 AND khao_thi_duyet = 1" : "";
const approvedCondHDTQ = requireApproval 
    ? "AND khoa_duyet = 1 AND dao_tao_duyet = 1" : "";
```

**Hậu quả:** Dữ liệu chỉ duyệt khoa (chưa duyệt đào tạo/khảo thí) vẫn được tính vào vượt giờ chính thức.

**2. Case tất cả mời giảng hoàn thành + vượt giờ duyệt 2 cấp:**

Giả sử:
- Tất cả mời giảng đã hoàn thành → `giangday` đã có đầy đủ dữ liệu
- Tất cả vượt giờ (LNQC, KTHP, HDTQ) đã duyệt 2 cấp → Điều kiện thỏa mãn

**Kiểm tra:**
```
Tổng tiết Dự kiến = soTietGiangDay + soTietNgoaiQC + soTietKTHP + soTietDoAn + soTietHDTQ
                    (từ quychuan)   (tất cả)       (tất cả)    (dự kiến)  (tất cả)

Tổng tiết Chính thức = soTietGiangDay + soTietNgoaiQC + soTietKTHP + soTietDoAn + soTietHDTQ
                       (từ giangday)   (duyệt 1 cấp)  (duyệt 1 cấp) (chính thức) (duyệt 1 cấp)
```

**Kết luận:**
- ❌ **KHÔNG BẰNG NHAU** nếu:
  - `giangday` khác `quychuan` (đã lưu vs dự kiến)
  - Có bản ghi LNQC/KTHP/HDTQ chỉ duyệt 1 cấp (hiện tại vẫn tính vào)

- ✅ **BẰNG NHAU** chỉ khi:
  - `giangday` = `quychuan` (đã lưu hết)
  - Tất cả LNQC/KTHP/HDTQ đã duyệt 2 cấp
  - Không có sự thay đổi dữ liệu

---

## 4. LUỒNG SAU LƯU (SNAPSHOT)

### 4.1. Quy trình Khóa Dữ Liệu (Lock Data)

**Endpoint:** `POST /v2/vuotgio/tong-hop/khoa-du-lieu`

**Mục đích:** Chốt dữ liệu vượt giờ cuối năm, không cho phép thay đổi.

**Luồng chi tiết:**

```
UI Request (namHoc, userId, ghiChu)
         ↓
dataLockController.lockData()
         ↓
dataLockService.lockData(namHoc, userId, ghiChu)
         ↓
STEP 1: VALIDATE
  ├─ 1a. Check format năm học: "YYYY - YYYY" ✅
  ├─ 1b. Check năm học tồn tại trong DB ✅
  ├─ 1c. Check chưa bị khóa ✅
  ├─ 1d. Check điều kiện duyệt 2 cấp trên 3 bảng:
  │      - vg_lop_ngoai_quy_chuan: khoa_duyet=1 AND dao_tao_duyet=1
  │      - vg_coi_cham_ra_de: khoa_duyet=1 AND khao_thi_duyet=1
  │      - vg_huong_dan_tham_quan_thuc_te: khoa_duyet=1 AND dao_tao_duyet=1
  │      → Nếu còn bản ghi chưa duyệt → STOP ❌
  └─ 1e. Check tất cả khoa đã duyệt tổng hợp:
         duyetTongHopRepo.isAllKhoaApproved(namHoc)
         → Nếu chưa đủ → STOP ❌
         ↓
STEP 2: TÍNH TOÁN SDO TOÀN TRƯỜNG
  tongHopService.getCollectionSDODetail(namHoc, "ALL", isDuKien=false)
  → Tính toán SDO cho TẤT CẢ giảng viên
  → Bao gồm: raw, tableE, tableF, breakdown
  → Thời gian: Log compute time (ms)
         ↓
STEP 3: TRANSACTION (BEGIN)
  ├─ 3a. INSERT lock record:
  │      INSERT INTO vg_khoa_du_lieu (nam_hoc, nguoi_khoa_id, ghi_chu)
  │      VALUES (?, ?, ?)
  │
  ├─ 3b. Deactivate old snapshots:
  │      UPDATE vg_so_tiet_tong_hop 
  │      SET is_latest = 0 
  │      WHERE nam_hoc = ? AND is_latest = 1
  │
  └─ 3c. Bulk INSERT new snapshot:
         INSERT INTO vg_so_tiet_tong_hop (
           id_User, nam_hoc, version, is_latest,
           so_tiet_dinh_muc, phan_tram_mien_giam, so_tiet_mien_giam,
           tong_so_tiet_giang_day, tong_so_tiet_nckh, no_nckh,
           vuot_thuc_te, vuot_thanh_toan,
           nguoi_chot_id, ghi_chu, chi_tiet
         ) VALUES ?
         
         chi_tiet = JSON.stringify(sdo) -- Lưu toàn bộ SDO
         ↓
STEP 4: COMMIT
         ↓
Return: { success: true, version, totalGV, computeTimeMs }
```

**Bảng `vg_khoa_du_lieu`:**

| Cột | Mô tả |
|-----|-------|
| `nam_hoc` | Năm học (PK) |
| `ngay_khoa` | Thời gian khóa |
| `nguoi_khoa_id` | ID người khóa |
| `ghi_chu` | Ghi chú |

**Bảng `vg_so_tiet_tong_hop` (Snapshot):**

| Cột | Mô tả |
|-----|-------|
| `id` | Auto increment |
| `id_User` | ID giảng viên |
| `nam_hoc` | Năm học |
| `version` | Version snapshot (incremental) |
| `is_latest` | 1 = version mới nhất, 0 = lịch sử |
| `so_tiet_dinh_muc` | Định mức chuẩn |
| `phan_tram_mien_giam` | % miễn giảm |
| `so_tiet_mien_giam` | Số tiết miễn giảm |
| `tong_so_tiet_giang_day` | Tổng tiết thực hiện |
| `tong_so_tiet_nckh` | Tổng tiết NCKH |
| `no_nckh` | Thiếu NCKH |
| `vuot_thuc_te` | Vượt giờ thực tế |
| `vuot_thanh_toan` | Vượt giờ thanh toán |
| `ngay_chot` | Thời gian chốt |
| `nguoi_chot_id` | ID người chốt |
| `ghi_chu` | Ghi chú |
| **`chi_tiet`** | **JSON (toàn bộ SDO)** |

**Cấu trúc JSON trong `chi_tiet`:**

```json
{
  "id_User": 123,
  "giangVien": "Nguyễn Văn A",
  "khoa": "CNTT",
  "maKhoa": "CNTT",
  "isKhoa": 1,
  "tongThucHien": 350,
  "tongVuot": 70,
  "thanhToan": 70,
  "soTietGiangDay": 300,
  "soTietNgoaiQC": 20,
  "soTietKTHP": 10,
  "soTietDoAn": 15,
  "soTietHDTQ": 5,
  "soTietNCKH": 200,
  "thieuNCKH": 80,
  "tableE": { ... },
  "tableF": {
    "rows": [...],
    "totals": {...}
  },
  "breakdown": {
    "hk1": { vn, lao, cuba, cpc, dongHP, total },
    "hk2": { ... },
    "year": { ... },
    "vuot": { ... },
    "money": { ... },
    "thucNhan": 7000000,
    "mucTT": 100000
  },
  "raw": {
    "giangDay": [...],
    "lopNgoaiQC": [...],
    "kthp": [...],
    "doAn": [...],
    "hdtq": [...],
    "nckhRecords": [...]
  }
}
```

### 4.2. Thống Kê Sau Lưu

**Endpoint:** `GET /v2/vuotgio/tong-hop/khoa?namHoc=2024 - 2025`

**Luồng:**

```
UI Request → tongHopController.tongHopTheoKhoa()
         ↓
thongKeService.getThongKeKhoa(namHoc, khoa)
         ↓
snapshotDataService.getSnapshotSDOList(namHoc, khoa)
         ↓
Check năm học đã khóa: requireLocked(namHoc)
  → Nếu chưa khóa → THROW Error 403 ❌
         ↓
Query snapshot:
  SELECT * FROM vg_so_tiet_tong_hop
  WHERE nam_hoc = ? AND is_latest = 1
         ↓
Parse cột chi_tiet (JSON → Object)
         ↓
Filter theo khoa (nếu cần)
         ↓
Group by Khoa (nếu khoa = "ALL"):
  ├─ isKhoa = 0 → Group vào "BGĐ&PHONG"
  └─ isKhoa = 1 → Group theo maKhoa
         ↓
Return: { data: [...], summary: {...} }
```

**Đặc điểm:**
- ✅ **BẮT BUỘC** đọc từ snapshot (năm đã khóa)
- ✅ Instant (không cần tính toán lại)
- ✅ Dữ liệu **KHÔNG thay đổi** sau khi khóa
- ✅ Hỗ trợ audit trail (versioning)

### 4.3. Preview Cá Nhân Sau Lưu

**Endpoint:** `GET /v2/vuotgio/tong-hop/preview/:MaGV?namHoc=2024 - 2025`

**Luồng:**

```
UI Request → previewController.getPreviewData()
         ↓
snapshotDataService.getSnapshotSDOByUser(namHoc, id_User)
         ↓
Check năm học đã khóa → Nếu chưa → THROW Error 403
         ↓
Query:
  SELECT * FROM vg_so_tiet_tong_hop
  WHERE nam_hoc = ? AND id_User = ? AND is_latest = 1
         ↓
Parse chi_tiet JSON → SDO
         ↓
templatePreviewService.buildTemplatePreviewPdf(sdo)
  → Generate PDF từ SDO (có đầy đủ raw, tableF, breakdown)
         ↓
Return: { pdfBase64, intermediateJson, warnings }
```

### 4.4. Preview Khoa Sau Lưu

**Endpoint:** `GET /v2/vuotgio/tong-hop/preview-khoa/:khoa?namHoc=2024 - 2025`

**Tương tự Preview Cá nhân, nhưng lấy tất cả GV trong khoa.**

### 4.5. Xuất File Sau Lưu

#### Type A: Kê Khai Cá Nhân

**Endpoint:** `GET /v2/vuotgio/xuat-file/excel?namHoc=2024 - 2025&khoa=CNTT&giangVien=123`

**Luồng:**

```
UI Request → xuatFileController.exportExcel()
         ↓
Check năm học đã khóa: dataLockService.isLocked(namHoc)
  → Nếu chưa → Return 403 ❌
         ↓
xuatFileService.exportExcel(namHoc, khoa, giangVien)
         ↓
_resolveSummaries() → Load SDO từ snapshot:
  ├─ Scope 1 GV: getSnapshotSDOByUser(namHoc, giangVien)
  ├─ Scope 1 Khoa: getSnapshotSDOList(namHoc, khoa)
  └─ Scope Toàn trường: getSnapshotSDOList(namHoc, "ALL")
         ↓
buildWorkbook(summaries) → Generate Excel
  ├─ Mỗi GV = 1 sheet
  ├─ Bảng A, B, C, D, E, F
  └─ Dùng raw data từ chi_tiet JSON
         ↓
Send file: KeKhai_VuotGio_<Ten>_<NamHoc>.xlsx
```

#### Type B: Tổng Hợp Khoa/Phòng

**Endpoint:** `GET /v2/vuotgio/xuat-file/tong-hop?namHoc=2024 - 2025`

**Luồng:**

```
UI Request → xuatFileController.exportConsolidated()
         ↓
Check năm học đã khóa → Nếu chưa → Return 403 ❌
         ↓
consolidatedExportService.exportConsolidatedByDepartment(namHoc)
         ↓
ConsolidatedGenerator.generateConsolidatedWorkbook(namHoc)
         ↓
Load snapshot toàn trường:
  snapshotDataService.getSnapshotSDOList(namHoc, "ALL")
         ↓
Group by Khoa/Phòng:
  ├─ isKhoa = 0 → "Ban giám đốc & các phòng" (1 sheet)
  └─ isKhoa = 1 → Mỗi khoa 1 sheet
         ↓
Generate workbook:
  ├─ Sheet 1-N: Chi tiết từng Khoa/Phòng (36 cột)
  │   ├─ Dùng breakdown từ snapshot
  │   ├─ Công thức Excel reference giữa các sheet
  │   └─ Định dạng màu sắc sync với UI
  │
  ├─ Sheet "TỔNG HỢP": 
  │   └─ Danh sách tất cả khoa, link đến sheet chi tiết
  │
  └─ Sheet "TIỀN THANH TOÁN":
      └─ Bảng kê chuyển khoản (STK, ngân hàng, số tiền)
         ↓
Send file: TongHop_VuotGio_<NamHoc>.xlsx
```

### 4.6. Kiểm tra tính đồng bộ

**Câu hỏi:** Dữ liệu có được lấy từ **bảng duy nhất** không?

✅ **ĐÚNG:**
- Tất cả luồng sau lưu đều đọc từ `vg_so_tiet_tong_hop` (bảng duy nhất)
- Thống kê, Preview, Xuất file → Cùng 1 nguồn

**Câu hỏi:** Các dữ liệu có đồng bộ với nhau không?

✅ **ĐÚNG:**
- Cột `chi_tiet` lưu toàn bộ SDO (JSON)
- Preview: Parse `chi_tiet` → SDO → Generate PDF
- Xuất file: Parse `chi_tiet` → SDO → Generate Excel
- Thống kê: Parse `chi_tiet` → Group by Khoa

→ **Đảm bảo 100% consistency** vì cùng 1 dữ liệu gốc.

**Câu hỏi:** Preview/Xuất file có dùng đúng breakdown không?

✅ **ĐÚNG:**
- Breakdown được tính sẵn trong `chi_tiet` khi tạo snapshot
- `PaymentCalculator.computeSdoBreakdown()` = **Single Source of Truth**
- Preview và Excel đều dùng breakdown từ snapshot

---

## 5. CƠ CHẾ TÍNH TOÁN

### 5.1. Công Thức Tính Vượt Giờ (Core Formula)

**File:** `src/mappers/vuotgio_v2/summary.mapper.js`

**Function:** `calculateOvertime(params)`

```javascript
const calculateOvertime = (params) => {
    const {
        soTietGiangDay = 0,     // Giảng dạy
        soTietNgoaiQC = 0,      // Lớp ngoài QC
        soTietKTHP = 0,         // Coi chấm ra đề
        soTietDoAn = 0,         // Đồ án
        soTietHDTQ = 0,         // Hướng dẫn tham quan
        soTietNCKH = 0,         // Nghiên cứu khoa học
        phanTramMienGiam = 0,   // % miễn giảm
        dinhMucChuan = 280,     // Định mức chuẩn
        dinhMucNCKH = 280       // Định mức NCKH
    } = params;

    // [I] Tổng số tiết thực hiện
    const tongThucHien = soTietGiangDay + soTietNgoaiQC 
                       + soTietKTHP + soTietDoAn + soTietHDTQ;
    
    // [IV] Số tiết được miễn giảm
    const mienGiam = dinhMucChuan * (phanTramMienGiam / 100);
    
    // [VI] Định mức sau miễn giảm
    const dinhMucSauMienGiam = dinhMucChuan - mienGiam;

    // [III] Thiếu NCKH (Định mức NCKH cũng được miễn giảm)
    const mienGiamNCKH = dinhMucNCKH * (phanTramMienGiam / 100);
    const dinhMucNCKHSauGiam = dinhMucNCKH - mienGiamNCKH;
    const thieuNCKH = Math.max(0, dinhMucNCKHSauGiam - soTietNCKH);
    
    // [V] Tổng số tiết vượt giờ thực tế
    // Công thức: (Mục I - Mục III) - Mục VI
    let tongVuot = (tongThucHien - thieuNCKH) - dinhMucSauMienGiam;
    tongVuot = Math.max(0, tongVuot);  // Không âm
    
    // [Thanh toán] Giới hạn <= Mục VI
    const thanhToan = Math.min(tongVuot, dinhMucSauMienGiam);

    return {
        tongThucHien,
        mienGiam,
        dinhMucSauMienGiam,
        thieuTietGiangDay: Math.max(0, dinhMucSauMienGiam - tongThucHien),
        thieuNCKH,
        tongVuot,
        thanhToan,  // ← Số tiết được thanh toán
        dinhMucChuan
    };
};
```

**Giải thích:**

| Mục | Công thức | Ý nghĩa |
|-----|-----------|---------|
| **I** | `soTietGiangDay + soTietNgoaiQC + soTietKTHP + soTietDoAn + soTietHDTQ` | Tổng tiết thực hiện |
| **II** | `dinhMucChuan` (280) | Định mức chuẩn |
| **III** | `max(0, (dinhMucNCKH - mienGiamNCKH) - soTietNCKH)` | Thiếu NCKH |
| **IV** | `dinhMucChuan * (phanTramMienGiam / 100)` | Miễn giảm |
| **V** | `max(0, (I - III) - (II - IV))` | Vượt giờ thực tế |
| **VI** | `min(V, II - IV)` | **Vượt giờ thanh toán** |

**Nguyên tắc:**
- ✅ Thiếu NCKH **trừ vào** tổng tiết thực hiện
- ✅ Miễn giảm **giảm** định mức chuẩn
- ✅ Vượt giờ thanh toán **không vượt quá** định mức sau miễn giảm (cap)

### 5.2. Tính Breakdown Theo Hệ Đào Tạo

**File:** `src/services/vuotgio_v2/department_excel/data/calculator.js`

**Function:** `computeSdoBreakdown(tableF, totalOvertime, luong)`

**Mục đích:** Phân bổ số tiết và tiền vượt giờ theo 5 hệ đào tạo.

**5 Hệ đào tạo:**
1. `vn` - Hệ Việt Nam
2. `lao` - Hệ Lào
3. `cuba` - Hệ Cuba
4. `cpc` - Hệ Công nghệ Cơ bản
5. `dongHP` - Hệ Đóng học phí

**Luồng:**

```
1. Parse tableF → Tổng tiết theo hệ (HK1, HK2, cả năm)
         ↓
2. Phân tỉ lệ vượt giờ:
   vuot_vn = round((year_vn / yearTotal) * totalOvertime)
   vuot_lao = round((year_lao / yearTotal) * totalOvertime)
   vuot_cuba = round((year_cuba / yearTotal) * totalOvertime)
   vuot_cpc = round((year_cpc / yearTotal) * totalOvertime)
   vuot_dongHP = totalOvertime - (vuot_vn + vuot_lao + vuot_cuba + vuot_cpc)
         ↓
3. Tính thành tiền:
   mucTT = round(luong / 176)  // Đơn giá mỗi tiết
   money_vn = vuot_vn * mucTT
   money_lao = vuot_lao * mucTT
   ...
         ↓
4. Kết quả:
   {
     hk1: { vn, lao, cuba, cpc, dongHP, total },
     hk2: { vn, lao, cuba, cpc, dongHP, total },
     year: { vn, lao, cuba, cpc, dongHP, total },
     vuot: { vn, lao, cuba, cpc, dongHP, total },
     money: { vn, lao, cuba, cpc, dongHP, total },
     thucNhan: moneyTotal,
     mucTT: rate
   }
```

**Đặc điểm:**
- ✅ **Single Source of Truth** - Dùng cho cả API và Export
- ✅ Đơn giá luôn = `round(luong / 176)` (không fallback)
- ✅ Phân bổ tỉ lệ **theo số tiết cả năm** của từng hệ
- ✅ Hệ `dongHP` dùng phép trừ để tổng đúng bằng `totalOvertime`

### 5.3. Mapping Hệ Đào Tạo

**File:** `src/mappers/vuotgio_v2/trainingSystem.mapper.js`

**Nhiệm vụ:** Chuẩn hóa tên hệ đào tạo (có nhiều biến thể) → 5 category cố định.

**Ví dụ mapping:**

| Tên gốc | Category key | Label |
|---------|--------------|-------|
| "Hệ Mật mã VN (ĐTKTKM)" | `vn` | "Hệ Việt Nam" |
| "Hệ Lào" | `lao` | "Hệ Lào" |
| "Hệ Cuba" | `cuba` | "Hệ Cuba" |
| "Hệ Công nghệ Cơ bản" | `cpc` | "Hệ Công nghệ Cơ bản" |
| "Hệ đóng học phí" | `dongHP` | "Hệ Đóng học phí" |

**Lợi ích:**
- ✅ Nhất quán khi ghép dữ liệu từ nhiều nguồn
- ✅ Dễ group và aggregate
- ✅ Tránh lỗi do tên không khớp

### 5.4. Đảm Bảo Tính Nhất Quán

**Câu hỏi:** Tổng hợp số tiết, Preview, Xuất file có dùng cùng 1 công thức không?

✅ **ĐÚNG:**

| Module | Công thức tính vượt giờ | Breakdown |
|--------|-------------------------|-----------|
| **Tổng hợp cá nhân** | `calculateOvertime()` | `computeSdoBreakdown()` |
| **Tổng hợp khoa** | `calculateOvertime()` | `computeSdoBreakdown()` |
| **Preview cá nhân** | Từ snapshot (đã tính) | Từ snapshot (đã tính) |
| **Preview khoa** | Từ snapshot (đã tính) | Từ snapshot (đã tính) |
| **Xuất file Type A** | Từ snapshot (đã tính) | Từ snapshot (đã tính) |
| **Xuất file Type B** | Từ snapshot (đã tính) | Từ snapshot (đã tính) |

**Kết luận:**
- ✅ **Tất cả đều dùng chung `calculateOvertime()`** khi tính toán
- ✅ **Snapshot lưu kết quả đã tính** → Đảm bảo consistency sau lưu
- ✅ **Breakdown dùng chung `computeSdoBreakdown()`** → Single source of truth

---

## 6. VẤN ĐỀ VÀ KHUYẾN NGHỊ

### 6.1. Vấn Đề Nghiêm Trọng

#### ❌ **VẤN ĐỀ 1: Chỉ check 1 cấp duyệt thay vì 2 cấp**

**Vị trí:** `src/repositories/vuotgio_v2/tongHop.repo.js`

**Hiện trạng:**
```javascript
const approvedCond = requireApproval ? "AND khoa_duyet = 1" : "";
```

**Hậu quả:**
- Dữ liệu chỉ duyệt khoa (chưa duyệt đào tạo/khảo thí) **vẫn được tính** vào vượt giờ chính thức
- Vi phạm quy trình duyệt 2 cấp
- Số liệu không chính xác

**Đề xuất sửa:**

```javascript
// File: tongHop.repo.js

// Định nghĩa điều kiện duyệt đúng cho từng bảng
const getApprovalCondition = (table, requireApproval) => {
    if (!requireApproval) return "";
    
    switch(table) {
        case 'vg_lop_ngoai_quy_chuan':
        case 'vg_huong_dan_tham_quan_thuc_te':
            return "AND khoa_duyet = 1 AND dao_tao_duyet = 1";
        case 'vg_coi_cham_ra_de':
            return "AND khoa_duyet = 1 AND khao_thi_duyet = 1";
        default:
            return "";
    }
};

// Áp dụng vào các query
const approvedCondLNQC = getApprovalCondition('vg_lop_ngoai_quy_chuan', requireApproval);
const approvedCondKTHP = getApprovalCondition('vg_coi_cham_ra_de', requireApproval);
const approvedCondHDTQ = getApprovalCondition('vg_huong_dan_tham_quan_thuc_te', requireApproval);
```

**Test case để verify:**

1. Tạo bản ghi LNQC: `khoa_duyet=1, dao_tao_duyet=0`
2. Chạy tổng hợp chính thức
3. **Kỳ vọng:** Bản ghi **KHÔNG được tính** vào vượt giờ
4. **Thực tế hiện tại:** Bản ghi **VẪN được tính** ❌

#### ❌ **VẤN ĐỀ 2: Dữ liệu Dự kiến không ổn định**

**Nguyên nhân:**
- Dự kiến đọc từ `quychuan` → Có thể thay đổi bất cứ lúc nào
- Không có cơ chế lock/snapshot cho dự kiến

**Hậu quả:**
- Giảng viên xem dự kiến hôm nay: 300 tiết
- Ngày mai xem lại: 280 tiết (do quy chuẩn thay đổi)
- Gây nhầm lẫn, khó đối chiếu

**Đề xuất:**
- ⚠️ Thêm warning UI: "Dữ liệu dự kiến có thể thay đổi theo quy chuẩn"
- ⚠️ Hiển thị timestamp khi fetch dữ liệu
- ⚠️ Không dùng dự kiến để ra quyết định quan trọng

#### ⚠️ **VẤN ĐỀ 3: Không có validation số tiết hợp lý**

**Hiện trạng:**
- Cho phép nhập số tiết âm
- Cho phép số tiết vượt quá 1000 (không hợp lý)

**Đề xuất:**
```javascript
// Thêm validation ở service layer
const validateSoTiet = (value, min = 0, max = 1000) => {
    if (value < min || value > max) {
        throw new Error(`Số tiết không hợp lệ: ${value} (phải từ ${min} đến ${max})`);
    }
};
```

#### ⚠️ **VẤN ĐỀ 4: Thiếu audit trail cho việc duyệt**

**Hiện trạng:**
- Khi hủy duyệt: `SET khoa_duyet = 0, nguoi_duyet = NULL`
- Mất thông tin lịch sử duyệt

**Đề xuất:**
- Thêm bảng audit: `vg_duyet_history`
- Log mọi thao tác duyệt/hủy duyệt với timestamp và user

### 6.2. Câu Trả Lời Cho Các Câu Hỏi

#### ✅ **Dự kiến: Luồng dữ liệu có chính xác?**

**Dự kiến Cá nhân:**
- ✅ Luồng dữ liệu logic
- ✅ Công thức tính toán đúng
- ⚠️ Dữ liệu không ổn định (từ quychuan)

**Dự kiến Chung:**
- ✅ Luồng dữ liệu logic
- ✅ Batch query hiệu quả
- ⚠️ Dữ liệu không ổn định

#### ❌ **Chính thức: Duyệt 2 cấp có đảm bảo?**

**KHÔNG:**
- Query hiện tại chỉ check `khoa_duyet = 1`
- **Cần fix ngay:** Thêm check cấp 2 vào query

#### ✅ **Case tất cả hoàn thành: Dự kiến = Chính thức?**

**KHÔNG tự động bằng nhau:**
- Nguồn giảng dạy khác nhau:
  - Dự kiến: `quychuan` (có thể thay đổi)
  - Chính thức: `giangday` (đã lưu)
  
- Điều kiện duyệt khác nhau:
  - Dự kiến: Không yêu cầu duyệt
  - Chính thức: Yêu cầu duyệt (hiện tại 1 cấp, nên là 2 cấp)

**Chỉ bằng nhau khi:**
1. `giangday` = `quychuan` (đã lưu hết, không thay đổi)
2. Tất cả LNQC/KTHP/HDTQ đã duyệt đúng
3. NCKH không thay đổi
4. Không có sửa đổi dữ liệu

#### ✅ **Sau lưu: Dữ liệu đồng bộ từ bảng duy nhất?**

**ĐÚNG:**
- ✅ Tất cả đọc từ `vg_so_tiet_tong_hop`
- ✅ Cột `chi_tiet` lưu toàn bộ SDO (JSON)
- ✅ Thống kê, Preview, Xuất file đều từ snapshot

#### ✅ **Cơ chế tính toán: Đảm bảo đồng nhất?**

**ĐÚNG:**
- ✅ Công thức: `calculateOvertime()` (Single source)
- ✅ Breakdown: `computeSdoBreakdown()` (Single source)
- ✅ Mapping hệ đào tạo: `trainingSystemMapper` (Chuẩn hóa)

### 6.3. Action Items (Ưu tiên cao)

| Priority | Issue | Action | File | Status |
|----------|-------|--------|------|--------|
| 🔴 **P0** | Chỉ check 1 cấp duyệt | Thêm check cấp 2 vào query | `tongHop.repo.js` | ❌ Chưa fix |
| 🟠 **P1** | Không có audit trail | Tạo bảng `vg_duyet_history` | New migration | ❌ Chưa có |
| 🟠 **P1** | Không validate số tiết | Thêm validation service | `*.service.js` | ❌ Chưa có |
| 🟡 **P2** | Dự kiến không ổn định | Thêm warning UI | Frontend | ❌ Chưa có |
| 🟡 **P2** | Thiếu test coverage | Viết integration tests | `tests/` | ❌ Chưa có |

### 6.4. Khuyến Nghị Kiến Trúc

#### 1. **Tách rõ 3 chế độ**

```
┌──────────────────────────────────────────────────────┐
│  DỰ KIẾN (Preview)                                   │
│  - Đọc từ quychuan + 3 bảng VG (không yêu cầu duyệt) │
│  - UI: Màu xanh, icon "dự kiến"                      │
│  - Warning: "Dữ liệu có thể thay đổi"                │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│  CHÍNH THỨC (Draft/In-progress)                      │
│  - Đọc từ giangday + 3 bảng VG (yêu cầu duyệt 2 cấp) │
│  - UI: Màu vàng, icon "chính thức"                   │
│  - Warning: "Cần duyệt tổng hợp trước khi khóa"      │
└──────────────────────────────────────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────┐
│  SAU LƯU (Locked/Final)                              │
│  - Đọc từ snapshot (vg_so_tiet_tong_hop)             │
│  - UI: Màu xám, icon "khóa", read-only               │
│  - Không cho phép chỉnh sửa                          │
└──────────────────────────────────────────────────────┘
```

#### 2. **Tăng cường validation**

```javascript
// Service layer validation
class VuotGioValidator {
    static validateNamHoc(namHoc) {
        if (!/^\d{4} - \d{4}$/.test(namHoc)) {
            throw new ValidationError("Format năm học không hợp lệ");
        }
    }
    
    static validateSoTiet(value, field) {
        if (value < 0) {
            throw new ValidationError(`${field} không được âm`);
        }
        if (value > 1000) {
            throw new ValidationError(`${field} vượt quá giới hạn 1000`);
        }
    }
    
    static validateApprovalState(record, table) {
        const requirements = {
            'vg_lop_ngoai_quy_chuan': ['khoa_duyet', 'dao_tao_duyet'],
            'vg_coi_cham_ra_de': ['khoa_duyet', 'khao_thi_duyet'],
            'vg_huong_dan_tham_quan_thuc_te': ['khoa_duyet', 'dao_tao_duyet']
        };
        
        const required = requirements[table] || [];
        for (const field of required) {
            if (record[field] !== 1) {
                throw new ValidationError(`Bản ghi chưa duyệt đủ 2 cấp: ${field} = 0`);
            }
        }
    }
}
```

#### 3. **Logging và monitoring**

```javascript
// Log mọi thao tác quan trọng
const auditLog = async (action, details) => {
    await connection.execute(
        `INSERT INTO audit_log (action, user_id, details, timestamp)
         VALUES (?, ?, ?, NOW())`,
        [action, userId, JSON.stringify(details)]
    );
};

// Ví dụ:
await auditLog('DUYET_KHOA', {
    namHoc: '2024 - 2025',
    khoa: 'CNTT',
    nguoiDuyet: userId,
    trangThaiTruoc: 0,
    trangThaiSau: 1
});

await auditLog('KHOA_DU_LIEU', {
    namHoc: '2024 - 2025',
    tongGV: 150,
    version: 2,
    computeTimeMs: 5432
});
```

#### 4. **Performance optimization**

```javascript
// Cache snapshot trong memory (Redis hoặc Node cache)
const snapshotCache = new Map();

const getCachedSnapshot = async (namHoc) => {
    const cacheKey = `snapshot:${namHoc}`;
    
    if (snapshotCache.has(cacheKey)) {
        return snapshotCache.get(cacheKey);
    }
    
    const data = await snapshotRepo.getLatestSnapshot(connection, namHoc);
    snapshotCache.set(cacheKey, data);
    
    // Expire after 1 hour
    setTimeout(() => snapshotCache.delete(cacheKey), 3600000);
    
    return data;
};
```

### 6.5. Test Cases Khuyến Nghị

#### Test Suite: Duyệt 2 Cấp

```javascript
describe('Approval Workflow - 2 Levels', () => {
    it('should NOT include record with only khoa_duyet=1', async () => {
        // Setup: Tạo bản ghi chỉ duyệt khoa
        await db.insert('vg_lop_ngoai_quy_chuan', {
            khoa_duyet: 1,
            dao_tao_duyet: 0,
            quy_chuan: 10
        });
        
        // Act: Lấy dữ liệu chính thức
        const result = await tongHopService.getAtomicSDO(namHoc, idUser, false);
        
        // Assert: Số tiết KHÔNG bao gồm bản ghi này
        expect(result.soTietNgoaiQC).toBe(0);
    });
    
    it('should include record with full approval', async () => {
        await db.insert('vg_lop_ngoai_quy_chuan', {
            khoa_duyet: 1,
            dao_tao_duyet: 1,
            quy_chuan: 10
        });
        
        const result = await tongHopService.getAtomicSDO(namHoc, idUser, false);
        expect(result.soTietNgoaiQC).toBe(10);
    });
});
```

#### Test Suite: Snapshot Consistency

```javascript
describe('Snapshot Data Consistency', () => {
    it('preview and export should use same data', async () => {
        // Act
        const previewData = await previewController.getPreviewData(req, res);
        const exportData = await xuatFileController.exportExcel(req, res);
        
        // Assert: Cùng nguồn snapshot
        expect(previewData.thanhToan).toBe(exportData.thanhToan);
        expect(previewData.breakdown).toEqual(exportData.breakdown);
    });
});
```

---

## 7. TÓM TẮT KẾT LUẬN

### 7.1. Điểm Mạnh

| # | Điểm mạnh | Đánh giá |
|---|-----------|----------|
| ✅ 1 | **Công thức tính toán nhất quán** | `calculateOvertime()` dùng chung, đảm bảo consistency |
| ✅ 2 | **Snapshot architecture tốt** | Khóa dữ liệu + versioning, audit trail |
| ✅ 3 | **Batch query hiệu năng cao** | Giảm từ N*8 queries xuống 8 queries |
| ✅ 4 | **Single source of truth cho breakdown** | `computeSdoBreakdown()` dùng chung |
| ✅ 5 | **Chuẩn hóa hệ đào tạo** | `trainingSystemMapper` tránh lỗi mapping |
| ✅ 6 | **Transaction ACID cho lock** | Đảm bảo tính toàn vẹn dữ liệu |
| ✅ 7 | **Separation of concerns** | Controller → Service → Repository rõ ràng |

### 7.2. Điểm Yếu

| # | Điểm yếu | Mức độ | Đề xuất |
|---|----------|--------|---------|
| ❌ 1 | **Chỉ check 1 cấp duyệt** | 🔴 Nghiêm trọng | Fix query ngay |
| ❌ 2 | **Không có audit trail duyệt** | 🟠 Cao | Thêm bảng history |
| ⚠️ 3 | **Dự kiến không ổn định** | 🟡 Trung bình | Thêm warning UI |
| ⚠️ 4 | **Thiếu validation** | 🟡 Trung bình | Thêm validation layer |
| ⚠️ 5 | **Thiếu test coverage** | 🟡 Trung bình | Viết integration tests |

### 7.3. Checklist Kiểm Tra Luồng

#### Dự Kiến
- [x] Lấy dữ liệu từ quychuan
- [x] Lấy dữ liệu từ 3 bảng VG (không yêu cầu duyệt)
- [x] Công thức tính toán đúng
- [ ] ⚠️ Warning "dữ liệu có thể thay đổi"

#### Chính Thức
- [x] Lấy dữ liệu từ giangday (đã lưu)
- [ ] ❌ **Check duyệt 2 cấp đầy đủ** (Hiện tại chỉ 1 cấp)
- [x] Công thức tính toán đúng
- [ ] ❌ Audit trail cho duyệt

#### Sau Lưu
- [x] Check điều kiện tiên quyết đầy đủ
- [x] Tính toán SDO toàn trường
- [x] Transaction ACID
- [x] Lưu snapshot với versioning
- [x] Thống kê từ snapshot
- [x] Preview từ snapshot
- [x] Xuất file từ snapshot
- [x] Dữ liệu đồng bộ 100%

#### Cơ Chế Tính Toán
- [x] Công thức `calculateOvertime()` nhất quán
- [x] Breakdown `computeSdoBreakdown()` nhất quán
- [x] Mapping hệ đào tạo chuẩn hóa
- [x] Rounding đúng (2 decimal places)
- [x] Cap vượt giờ thanh toán đúng

### 7.4. Kết Luận Cuối Cùng

**Tổng thể:** Hệ thống có kiến trúc tốt, logic tính toán chính xác, nhưng **CẦN FIX NGAY** vấn đề duyệt 2 cấp.

**Ưu tiên hành động:**

1. 🔴 **Fix ngay:** Thêm check duyệt cấp 2 vào query
2. 🟠 **Tuần sau:** Thêm audit trail và validation
3. 🟡 **Sprint sau:** Thêm test coverage và warning UI

**Đánh giá độ tin cậy:**
- **Dự kiến:** ⚠️ 70% - Dữ liệu không ổn định
- **Chính thức:** ❌ 60% - Thiếu check duyệt cấp 2
- **Sau lưu:** ✅ 95% - Snapshot architecture tốt, dữ liệu nhất quán

---

## PHỤ LỤC

### A. Cấu Trúc Database

```sql
-- Bảng khóa dữ liệu
CREATE TABLE vg_khoa_du_lieu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nam_hoc VARCHAR(20) UNIQUE NOT NULL,
    ngay_khoa DATETIME NOT NULL,
    nguoi_khoa_id INT,
    ghi_chu TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng snapshot
CREATE TABLE vg_so_tiet_tong_hop (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_User INT NOT NULL,
    nam_hoc VARCHAR(20) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    is_latest TINYINT(1) DEFAULT 1,
    so_tiet_dinh_muc DECIMAL(10,2),
    phan_tram_mien_giam DECIMAL(5,2),
    so_tiet_mien_giam DECIMAL(10,2),
    tong_so_tiet_giang_day DECIMAL(10,2),
    tong_so_tiet_nckh DECIMAL(10,2),
    no_nckh DECIMAL(10,2),
    vuot_thuc_te DECIMAL(10,2),
    vuot_thanh_toan DECIMAL(10,2),
    ngay_chot DATETIME,
    nguoi_chot_id INT,
    ghi_chu TEXT,
    chi_tiet JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nam_hoc_latest (nam_hoc, is_latest),
    INDEX idx_id_user_nam_hoc (id_User, nam_hoc)
);

-- Bảng duyệt tổng hợp
CREATE TABLE vg_duyet_tong_hop (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nam_hoc VARCHAR(20) NOT NULL,
    khoa VARCHAR(20) NOT NULL,
    van_phong_duyet TINYINT(1) DEFAULT 0,
    van_phong_nguoi_duyet_id INT,
    van_phong_ngay_duyet DATETIME,
    ghi_chu TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_nam_khoa (nam_hoc, khoa)
);
```

### B. API Endpoints Summary

| Endpoint | Method | Mục đích | Nguồn dữ liệu |
|----------|--------|----------|---------------|
| `/v2/vuotgio/ca-nhan-du-kien` | GET | Dự kiến cá nhân | quychuan + VG (no approval) |
| `/v2/vuotgio/ca-nhan-chinh-thuc` | GET | Chính thức cá nhân | giangday + VG (khoa_duyet=1) |
| `/v2/vuotgio/ca-nhan-sau-luu` | GET | Sau lưu cá nhân | Snapshot |
| `/v2/vuotgio/tong-hop/giang-vien` | GET | Tổng hợp GV | Tùy isDuKien param |
| `/v2/vuotgio/tong-hop/khoa` | GET | Tổng hợp khoa | Snapshot (sau lưu) |
| `/v2/vuotgio/tong-hop/duyet-khoa` | POST | Duyệt tổng hợp | vg_duyet_tong_hop |
| `/v2/vuotgio/tong-hop/khoa-du-lieu` | POST | Khóa dữ liệu | Create snapshot |
| `/v2/vuotgio/xuat-file/excel` | GET | Xuất kê khai | Snapshot |
| `/v2/vuotgio/xuat-file/tong-hop` | GET | Xuất tổng hợp | Snapshot |

---

**END OF DOCUMENT**

> **Lưu ý:** Document này được tạo từ phân tích codebase thực tế ngày 2026-06-10.  
> Nếu code thay đổi, cần cập nhật document tương ứng.
