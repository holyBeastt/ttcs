# Luồng Đồ Án Hợp Đồng Dự Kiến (Thống kê ĐATN dự kiến)

> **Trang**: `doAnHopDongDuKien.ejs`  
> **Chức năng**: Thống kê danh sách giảng viên mời hướng dẫn đồ án tốt nghiệp (ĐATN), phân loại Dân sự / Quân đội, hiển thị số tiết và cảnh báo vượt định mức.  
> **Menu truy cập**: Đồ án → Thống kê ĐATN dự kiến

---

## 1. Kiến trúc tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│  doAnHopDongDuKien.ejs                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Bộ lọc      │  │ Bảng Dân sự  │  │ Bảng Quân đội/Công an  │  │
│  │ (5 combobox)│  │ (14 cột)     │  │ (14 cột)               │  │
│  └──────┬──────┘  └──────────────┘  └────────────────────────┘  │
│         │                                                        │
│    click "Hiển thị"                                              │
│         │                                                        │
│  ┌──────▼──────────────────────────────────────────────────────┐ │
│  │  AJAX calls:                                                │ │
│  │  1. GET  /getNamHoc                    → load Đợt, Kỳ, Năm │ │
│  │  2. GET  /api/shared/faculty-code-list → load danh sách Khoa│ │
│  │  3. GET  /api/gvm/v1/he-do-an         → load Hệ đào tạo   │ │
│  │  4. POST /getInfoDoAnHopDongDuKien    → lấy data chính     │ │
│  └─────────────────────────┬───────────────────────────────────┘ │
└────────────────────────────┼─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                        SERVER (Node.js/Express)                  │
│                                                                  │
│  Route: doAnHopDongDuKienRoute.js                                │
│    GET  /doAnHopDongDuKienSite  → render EJS                     │
│    POST /getInfoDoAnHopDongDuKien → controller xử lý            │
│                                                                  │
│  Controller: doAnHopDongDuKienController.js                      │
│    → Build CTE SQL chain (hopdongQueries.js)                     │
│    → Query MySQL → Group by teacher → JSON response              │
│                                                                  │
│  Queries: hopdongQueries.js                                      │
│    CTE_DO_AN → CTE_DAI_HOC → CTE_SAU_DAI_HOC → CTE_TABLE_ALL   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                        DATABASE (MySQL)                           │
│  Bảng chính: doantotnghiep, sotietdoan, gvmoi, sotietdinhmuc    │
│  Bảng phụ:   phongban, namhoc, ki, dot, he_dao_tao, tienluong   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Route & Controller

### 2.1 Route

**File**: `src/routes/doAnHopDongDuKienRoute.js`  
**Đăng ký**: `server.js` dòng 73, 237 — `app.use("/", doAnHopDongDuKienRoute)`

| Method | URL | Handler | Mục đích |
|--------|-----|---------|----------|
| `GET` | `/doAnHopDongDuKienSite` | `getDoAnHopDongDuKienSite` | Render trang EJS |
| `POST` | `/getInfoDoAnHopDongDuKien` | `getInfoDoAnHopDongDuKien` | API lấy dữ liệu bảng (AJAX) |

### 2.2 Controller

**File**: `src/controllers/doAnHopDongDuKienController.js`

**Exported functions:**

| Hàm | Mô tả |
|-----|-------|
| `getDoAnHopDongDuKienSite` | Đơn giản `res.render("doAnHopDongDuKien.ejs")` |
| `getInfoDoAnHopDongDuKien` | Hàm chính — xây dựng CTE SQL, query DB, nhóm theo GV, trả JSON |
| `getCheckAllDoantotnghiep` | Kiểm tra trạng thái duyệt (KhoaDuyet / DaoTaoDuyet / TaiChinhDuyet) |

### 2.3 Các API phụ mà view gọi khi load trang

| API | Method | Handler | File | Mục đích |
|-----|--------|---------|------|----------|
| `/getNamHoc` | GET | `adminController.getNamHoc` | `adminRoute.js:152` | Load combobox Năm học, Kỳ, Đợt (từ bảng `namhoc`, `ki`, `dot`) |
| `/api/shared/faculty-code-list` | GET | `homeController.getFacultyCodeList` | `web.js:76` | Load combobox Khoa (từ bảng `phongban`) |
| `/api/gvm/v1/he-do-an` | GET | `gvmServices.getHeDoAnLists` | `gvmRoute.js:55` | Load combobox Hệ đào tạo đồ án (từ bảng `he_dao_tao` where `loai_hinh = 'đồ án'`) |

---

## 3. Cấu trúc bảng dữ liệu (Frontend)

### 3.1 Hai bảng song song

Dữ liệu được **phân loại theo field `isQuanDoi`** từ bảng `gvmoi`:

| # | Tiêu đề | `<tbody>` ID | Label tổng | Điều kiện |
|---|---------|-------------|------------|-----------|
| I | Giảng viên Dân sự | `tbody-civilian` | `qc-civilian` | `isQuanDoi == 0` |
| II | Giảng viên Quân đội/Công an | `tbody-military` | `qc-military` | `isQuanDoi == 1` |

### 3.2 Cấu trúc 14 cột

| STT | Header | Source field | Ghi chú |
|-----|--------|-------------|---------|
| 1 | STT | Auto-increment | `rowspan` theo nhóm GV |
| 2 | Giảng viên hướng | `HoTen` + `MaPhongBan` | `rowspan`, format: `Tên GV` + `(GVM MãKhoa)` |
| 3 | Tên đề tài | `TenDeTai` | Mỗi đề tài = 1 dòng |
| 4 | Sinh viên | `SinhVien` | |
| 5 | Mã sinh viên | `MaSV` | |
| 6 | Đợt | `Dot` | |
| 7 | Năm học | `NamHoc` | |
| 8 | Ngày bắt đầu | `NgayBatDau` | Format `dd/MM/yyyy` |
| 9 | Ngày kết thúc | `NgayKetThuc` | Format `dd/MM/yyyy` |
| 10 | Số tiết | `SoTiet` | Class `val-sotiet`, dùng tính tổng |
| 11 | Tổng số tiết | computed client-side | `rowspan`, `sum(SoTiet)` của GV trong filter hiện tại |
| 12 | Tổng số tiết cả năm | `TongSoTietCaNam` | `rowspan`, từ CTE `TongSoTietGV` |
| 13 | Khoa | `MaPhongBan` | `rowspan` |
| 14 | Chi tiết | Button `👁️` | `rowspan`, redirect `/viewGvm/{id_Gvm - 1}` |

### 3.3 Cơ chế rowspan & nhóm dữ liệu

Dữ liệu từ API trả về dạng:
```json
{
  "groupedByTeacher": {
    "Nguyễn Văn A": [
      { "TenDeTai": "Đề tài 1", "SoTiet": 15, ... },
      { "TenDeTai": "Đề tài 2", "SoTiet": 10, ... }
    ],
    "Trần Thị B": [ ... ]
  }
}
```

Client render sử dụng `rowspan` cho dòng đầu tiên của mỗi nhóm GV (STT, Tên GV, Tổng tiết, Khoa, Chi tiết). Các dòng tiếp theo chỉ chứa thông tin đề tài.

### 3.4 Cảnh báo vượt định mức

- Khi `TongSoTietCaNam > 300` → dòng được gán class `alert-sotiet` (highlight vàng)
- Giá trị 300 là **mặc định**, thực tế được query từ bảng `sotietdinhmuc` (field `GiangDay`)

---

## 4. Luồng xử lý dữ liệu (Backend)

### 4.1 Input từ client

```json
POST /getInfoDoAnHopDongDuKien
Content-Type: application/json

{
  "Khoa": "CNTT",       // Mã phòng ban hoặc "ALL"
  "Dot": "1",           // Đợt (1, 2, ...)
  "ki": "1",            // Kỳ (1, 2)
  "Nam": "2024-2025",   // Năm học
  "heDaoTaoValue": "3"  // ID hệ đào tạo từ bảng he_dao_tao
}
```

### 4.2 Server-side flow

```
1. Nhận req.body (Dot, ki, Nam, Khoa, heDaoTaoValue)
2. Kiểm tra isKhoa từ session:
   - isKhoa == 1 → ghi đè MaPhongBan = session.MaPhongBan (khoa chỉ xem data mình)
3. Build SQL CTE chain:
   CTE_DO_AN → CTE_DAI_HOC → CTE_SAU_DAI_HOC → CTE_TABLE_ALL
   + thêm 6 CTE nội tuyến (gv1, gv2, two_gv, one_gv, gv_doan, gv_with_tiet, final)
4. Execute query với params [NamHoc x3, Dot, ki, NamHoc, heDaoTaoValue]
5. Nếu Khoa != "ALL" → thêm điều kiện AND MaKhoa = ?
6. Nếu Khoa != "ALL" → query thêm SoQD (số quyết định) từ bảng doantotnghiep
7. Nhóm kết quả theo GV: reduce → { [HoTen]: [...courses] }
8. Query sotietdinhmuc → lấy SoTietDinhMuc
9. Trả JSON: { groupedByTeacher, SoTietDinhMuc, SoQDList }
```

### 4.3 SQL CTE Chain chi tiết

#### 4.3.1 CTE dùng chung (`hopdongQueries.js`)

Các CTE này được **chia sẻ** với module hợp đồng mời giảng, hợp đồng đồ án, và thông tin hợp đồng:

| CTE | Bảng nguồn | Mô tả |
|-----|-----------|-------|
| `DoAnHopDongDuKien` | `doantotnghiep` JOIN `gvmoi` JOIN `sotietdoan` | Lấy GV mời hướng dẫn ĐATN + tính số tiết + đơn giá + thành tiền. Xử lý cả GV1 và GV2 qua UNION ALL |
| `DaiHocHopDongDuKien` | `quychuan` JOIN `gvmoi` | Lấy GV mời giảng dạy bậc Đại học (hệ có `cap_do <= 2`) |
| `SauDaiHocHopDongDuKien` | `quychuan` JOIN `gvmoi` | Lấy GV mời giảng dạy bậc Sau đại học (hệ có `cap_do > 2`). Nhân hệ số 0.7 nếu GV có dấu `,` (đồng giảng) |
| `tableALL` | UNION ALL 3 CTE trên | Gộp toàn bộ: DoAn + DaiHoc + SauDaiHoc, thêm cột `LoaiHopDong` |
| `TongSoTietGV` | `tableALL` | `SUM(SoTiet) GROUP BY GiangVien` → tổng tiết **cả năm** (mọi loại HĐ) |

#### 4.3.2 CTE nội tuyến trong controller

Controller thêm các CTE riêng để tách logic GV1/GV2 từ bảng `doantotnghiep`:

| CTE | Mô tả |
|-----|-------|
| `gv1` | Lấy `GiangVien1` khi có 2 GV (GV2 != 'không') |
| `gv2` | Lấy `GiangVien2` khi GV2 tồn tại và != 'không' |
| `two_gv` | `UNION ALL gv1 + gv2` |
| `one_gv` | Lấy `GiangVien1` khi chỉ có 1 GV (GV2 = 'không') |
| `gv_doan` | `UNION ALL one_gv + two_gv` |
| `gv_with_tiet` | JOIN `sotietdoan` → phân bổ số tiết: ONE=tong_tiet, GV1=so_tiet_1, GV2=so_tiet_2 |
| `final` | JOIN `gvmoi` + LEFT JOIN `TongSoTietGV` → ghép thông tin GV + tổng tiết cả năm |

#### 4.3.3 Logic phân bổ số tiết

```
Nếu chỉ có 1 GV (GV2 = 'không'):
  → SoTiet = sotietdoan.tong_tiet

Nếu có 2 GV:
  → GV1: SoTiet = sotietdoan.so_tiet_1
  → GV2: SoTiet = sotietdoan.so_tiet_2
```

Bảng `sotietdoan` chứa cấu hình theo `he_dao_tao`:

| Field | Mô tả |
|-------|-------|
| `he_dao_tao` | FK → `he_dao_tao.id` |
| `tong_tiet` | Tổng tiết khi chỉ 1 GV |
| `so_tiet_1` | Tiết cho GV chính (GV1) khi 2 GV |
| `so_tiet_2` | Tiết cho GV phụ (GV2) khi 2 GV |

### 4.4 Output JSON

```json
{
  "groupedByTeacher": {
    "Nguyễn Văn A": [
      {
        "id_Gvm": 5,
        "HoTen": "Nguyễn Văn A - TS",
        "TenDeTai": "Xây dựng hệ thống quản lý...",
        "SinhVien": "Trần Văn B",
        "MaSV": "CT060001",
        "NoiCongTac": "Đại học ABC",
        "HocVi": "Tiến sĩ",
        "SoTiet": 20,
        "HSL": "3.0",
        "NgayBatDau": "2024-09-01T00:00:00.000Z",
        "NgayKetThuc": "2025-01-15T00:00:00.000Z",
        "Dot": "1",
        "ki": "1",
        "NamHoc": "2024-2025",
        "MaPhongBan": "CNTT",
        "TongSoTietCaNam": 280,
        "isQuanDoi": 0
      }
    ]
  },
  "SoTietDinhMuc": 300,
  "SoQDList": [
    { "SoQD": "QĐ-123/2024" }
  ]
}
```

---

## 5. Bảng DB liên quan

| Bảng | Vai trò | Các cột quan trọng |
|------|---------|-------------------|
| `doantotnghiep` | **Bảng chính** — thông tin ĐATN | `GiangVien1`, `GiangVien2`, `TenDeTai`, `SinhVien`, `MaSV`, `Dot`, `ki`, `NamHoc`, `MaPhongBan`, `he_dao_tao`, `SoQD`, `KhoaDuyet`, `DaoTaoDuyet`, `TaiChinhDuyet` |
| `sotietdoan` | Định mức số tiết theo hệ đào tạo | `he_dao_tao`, `tong_tiet`, `so_tiet_1`, `so_tiet_2` |
| `gvmoi` | Thông tin GV mời | `id_Gvm`, `HoTen`, `HocVi`, `HSL`, `MaPhongBan`, `isQuanDoi`, `STK`, `NganHang`, `CCCD`, ... |
| `he_dao_tao` | Danh mục hệ đào tạo | `id`, `he_dao_tao`, `loai_hinh` ('đồ án' / 'mời giảng'), `cap_do` |
| `sotietdinhmuc` | Cấu hình định mức tiết GD | `GiangDay` (mặc định 300) |
| `quychuan` | Bảng quy chuẩn giảng dạy | Dùng trong CTE_DAI_HOC, CTE_SAU_DAI_HOC |
| `tienluong` | Bảng đơn giá theo HocVi/HSL/ChucDanh | Dùng trong CTE tính `TienMoiGiang` |
| `phongban` | Danh sách phòng ban/khoa | `MaPhongBan`, `isKhoa` |
| `namhoc`, `ki`, `dot` | Danh mục năm học, kỳ, đợt | Populate combobox |

---

## 6. Phân quyền (Authorization)

### 6.1 Server-side (Session)

```javascript
// doAnHopDongDuKienController.js dòng 22-26
const isKhoa = req.session.isKhoa;
if (isKhoa == 1) {
  MaPhongBan = req.session.MaPhongBan; // Ghi đè → Khoa chỉ xem data mình
}
```

### 6.2 Client-side (localStorage)

| Kiểm tra | Hành vi | Dòng EJS |
|----------|---------|----------|
| `isKhoa == 1` | Ẩn combobox chọn khoa (`#departmentFilter`) | L647-649 |
| `role == troLy_phong \|\| lanhDao_phong` | Hiển thị nút "Thêm thông báo" (`#changeMessage`) | L715-719 |

### 6.3 Ma trận quyền

| Role | Xem dữ liệu | Chọn khoa | Nút thông báo |
|------|-------------|-----------|---------------|
| Trợ lý phòng (Đào tạo/Tài chính) | ✅ Tất cả | ✅ Dropdown đầy đủ | ✅ |
| Lãnh đạo phòng | ✅ Tất cả | ✅ Dropdown đầy đủ | ✅ |
| Lãnh đạo khoa | ⚠️ Chỉ khoa mình | ❌ Ẩn dropdown | ❌ |
| Trợ lý khoa / GV | ⚠️ Chỉ khoa mình | ❌ Ẩn dropdown | ❌ |

---

## 7. Tính năng UI

### 7.1 Bộ lọc (5 combobox)

| # | Combobox | ID | Load từ API | Ghi chú |
|---|----------|----|------------|---------|
| 1 | Đợt | `combobox-dot` | `/getNamHoc` → `Dot[]` | |
| 2 | Kỳ | `comboboxki` | `/getNamHoc` → `Ki[]` | |
| 3 | Năm học | `NamHoc` | `/getNamHoc` → `NamHoc[]` | |
| 4 | Khoa | `departmentFilter` | `/api/shared/faculty-code-list` | Ẩn nếu `isKhoa == 1` |
| 5 | Hệ đào tạo | `he_dao_tao` | `/api/gvm/v1/he-do-an` | Filter `loai_hinh = 'đồ án'` |

### 7.2 Tìm kiếm

- Input `#searchInput` — tìm theo tên GV
- Client-side filter dựa trên attribute `data-name` của mỗi `<tr>`
- Chỉ filter bảng Dân sự (`tbody-civilian`), bảng Quân đội không được filter (comment dòng 530)
- Sau khi lọc, tự động gọi `calculateTotals()` để cập nhật tổng

### 7.3 Hiển thị số Quyết định

- Khi chọn khoa cụ thể (≠ "ALL"), query thêm `SoQDList` từ bảng `doantotnghiep`
- Render vào `#SoQD-list` dưới dạng danh sách `* Theo QĐ số: xxx`

### 7.4 Nút Chi tiết

- Mỗi nhóm GV có nút 👁️ → redirect `/viewGvm/{id_Gvm - 1}`
- Mở trang xem chi tiết thông tin GV mời

---

## 8. File liên quan

```
src/
├── routes/
│   └── doAnHopDongDuKienRoute.js     # Route chính
├── controllers/
│   └── doAnHopDongDuKienController.js # Controller chính
├── queries/
│   └── hopdongQueries.js             # CTE SQL dùng chung (DoAn, DaiHoc, SauDaiHoc, TableAll)
├── services/
│   └── gvmServices.js                # getHeDoAnLists (API hệ đào tạo)
├── views/
│   └── doAnHopDongDuKien.ejs          # View chính
├── server.js                          # Đăng ký route (dòng 73, 237)
```

---

## 9. Lưu ý kỹ thuật

1. **CTE dùng chung**: `hopdongQueries.js` được import bởi nhiều controller (hợp đồng MG, hợp đồng ĐA, thông tin HĐ). Thay đổi CTE sẽ ảnh hưởng toàn bộ module hợp đồng.

2. **Tham số SQL**: Mảng `values` truyền `NamHoc` 3 lần (cho 3 CTE: DoAn, DaiHoc, SauDaiHoc) + Dot, ki, NamHoc, heDaoTaoValue. Thứ tự rất quan trọng.

3. **Phân biệt GV**: Field `isQuanDoi` trong bảng `gvmoi` quyết định GV xuất hiện ở bảng nào.

4. **Định mức 300 tiết**: Lấy từ bảng `sotietdinhmuc` (field `GiangDay`), không hardcode.

5. **Tìm kiếm bảng Quân đội**: Hiện tại bị comment out (dòng 530), chỉ tìm kiếm trên bảng Dân sự.

6. **TongSoTietCaNam**: Tính từ CTE `TongSoTietGV` = tổng tiết **tất cả loại hợp đồng** (Đồ án + Đại học + Sau đại học) trong cả năm, không chỉ ĐATN.
