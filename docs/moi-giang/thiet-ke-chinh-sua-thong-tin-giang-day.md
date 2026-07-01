# Thiết kế Cơ chế Chỉnh sửa Thông tin Giảng dạy & Mời giảng (Admin Only)

> **Phạm vi:** Chức năng này sẽ được tách riêng ra một màn hình dành riêng cho ADMIN (sử dụng `adminHeader`), cho phép ADMIN chỉnh sửa các cột thông tin lõi. Không làm ảnh hưởng đến màn hình hiện tại của Khoa/Phòng ban.

---

## 1. Hiện trạng các cột dữ liệu

Bảng dữ liệu nguồn (trước khi chỉnh sửa) có cấu trúc như sau:

| # | Tên cột (Header) | Field DB | Loại hiển thị | Có thể sửa? |
|---|---|---|---|---|
| 1 | STT | - | Text | ❌ |
| 2 | Lớp học phần | `LopHocPhan` | Text | ❌ (cần mở) |
| 3 | Tên lớp | `TenLop` | Text | ❌ (cần mở) |
| 4 | Số TC | `SoTinChi` | Text | ❌ (cần mở) |
| 5 | GV theo TKB | `GiaoVien` | Text | ❌ (cần mở) |
| 6 | Khoa | `Khoa` | Text | ❌ (cần mở) |
| 7 | Số tiết LL | `LL` | Text | ❌ (cần mở) |
| 8 | Số tiết QC | `QuyChuan` | Text | ❌ (cần mở) |
| 9 | Mời giảng? | `MoiGiang` | Checkbox | ✅ (role phù hợp) |
| 10 | GV giảng dạy | `GiaoVienGiangDay` | Input Text | ✅ (role phù hợp) |
| 11 | Bộ môn | `BoMon` | Input Text | ✅ (role phù hợp) |
| 12 | Hệ đào tạo | `he_dao_tao` | Select | ✅ (role phù hợp) |
| 13 | Ngày bắt đầu | `NgayBatDau` | Input Date | ✅ (role phù hợp) |
| 14 | Ngày kết thúc | `NgayKetThuc` | Input Date | ✅ (role phù hợp) |
| 15 | Ghi chú | `GhiChu` | Modal | ✅ (role phù hợp) |
| 16 | Khoa Duyệt | `KhoaDuyet` | Checkbox ẩn | ✅ (lãnh đạo khoa) |
| 17 | Đào tạo Duyệt | `DaoTaoDuyet` | Checkbox ẩn | ❌ (chỉ hiển thị) |
| 18 | Văn phòng Duyệt | `TaiChinhDuyet` | Checkbox ẩn | ❌ (chỉ hiển thị) |

**Cột gốc "Học phần"** (hiển thị `${LopHocPhan} (${TenLop})`) sẽ được tách thành 2 cột riêng biệt trong màn hình Admin để ánh xạ đúng với cấu trúc DB.

---

## 2. Mục tiêu

Tạo ra một **màn hình độc lập (Dedicated Admin Site)** với `adminHeader`, cho phép duy nhất role ADMIN chỉnh sửa trực tiếp các cột thông tin lõi (cột 2–8), sử dụng **AG Grid**.

**Ràng buộc bắt buộc:**
- Route màn hình riêng (`GET /api/v1/admin/moi-giang/core-info/site`).
- Chỉ ADMIN mới được truy cập vào màn hình này — các role khác bị chặn ở cả server-side (session/middleware) lẫn redirect phía client.
- Viết endpoint hoàn toàn mới cho việc lấy giao diện và cập nhật dữ liệu, **không chỉnh sửa hay tái sử dụng** giao diện của màn hình cũ.
- Không yêu cầu gọi lại hàm tính toán tổng số tiết sau khi lưu.
- Áp dụng **Optimistic Locking** để tránh xung đột khi nhiều phiên ADMIN sửa cùng lúc.

---

## 3. Kiến trúc & Cấu trúc File Mới

```
src/
├── constants/
│   └── moigiang/
│       └── errorCodes.constant.js      [NEW] Mã lỗi cho module này
├── validators/
│   └── moigiang/
│       └── adminCoreInfo.validator.js  [NEW] Validation cụ thể cho payload
├── middlewares/
│   └── adminRoleMiddleware.js          [NEW] Middleware chặn quyền truy cập server-side
├── controllers/
│   └── moigiang/
│       └── adminCoreInfo.controller.js [NEW] Controller xử lý request update và render view
├── services/
│   └── moigiang/
│       └── adminCoreInfo.service.js    [NEW] Business logic
├── repositories/
│   └── moigiang/
│       └── adminCoreInfo.repository.js [NEW] Truy vấn DB
├── routes/
│   └── adminMoiGiangCoreInfoRoute.js   [NEW] Route định nghĩa endpoint update & render view
└── views/
    └── admin_moigiang_core_info.ejs    [NEW] Màn hình UI với AG Grid dành cho ADMIN

tests/
└── moigiang/
    ├── unit/
    │   ├── adminCoreInfo.validator.test.js
    │   └── adminCoreInfo.service.test.js
    ├── integration/
    │   └── adminCoreInfo.api.test.js
    └── regression/
        └── adminCoreInfo.regression.test.js
```

---

## 4. Cơ chế Bảo mật (Security Mechanism)

### 4.1. Bảo mật cấp Server-Side (Session & Middleware) — Yếu tố cốt lõi

> **Không tin vào localStorage.** Role, userId phải luôn được xác thực từ server-side session hoặc JWT đã được decode server-side.

Cơ chế hoạt động:
1. Khi user đăng nhập, server ghi `req.session.userId`, `req.session.role` vào session.
2. Mọi request vào route của tính năng này đều đi qua `adminRoleMiddleware.js`.
3. Middleware đọc `req.session.role` (hoặc `req.user.role` từ JWT đã decode) — **không đọc bất kỳ giá trị nào từ body hay header do client tự gửi**.
4. Nếu role không phải `ADMIN`: trả về `403 Forbidden` ngay lập tức.

```javascript
// src/middlewares/adminRoleMiddleware.js
const { ERROR_CODES } = require('../constants/moigiang/errorCodes.constant');

const requireAdminRole = (req, res, next) => {
  const role = req.session?.role || req.user?.role; // server-side only
  if (!role || role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      errorCode: ERROR_CODES.AUTH.FORBIDDEN,
      message: 'Bạn không có quyền thực hiện thao tác này.',
    });
  }
  next();
};

module.exports = { requireAdminRole };
```

### 4.2. Bảo mật cấp Frontend (UI Level)

Vì màn hình toàn bộ chỉ dành cho ADMIN, frontend chỉ là lớp UX bổ sung:
- Khi trang load, gọi server để lấy thông tin session (VD: `GET /api/v1/auth/me`), **không dùng localStorage**.
- Nếu role trả về từ server khác `ADMIN` → redirect về trang chủ hoặc hiển thị trang lỗi 403.
- Tất cả các cột thông tin lõi (cột 2–8) luôn ở trạng thái `editable = true` trong AG Grid vì màn hình này chỉ dành cho ADMIN.

### 4.3. Optimistic Locking

Để tránh xung đột khi nhiều phiên ADMIN cùng sửa một bản ghi:
- Mỗi bản ghi trong DB có cột `version` (integer, default 0).
- Khi ADMIN load dữ liệu, giá trị `version` được trả về kèm trong payload.
- Khi gửi request cập nhật, client gửi kèm `version` hiện tại.
- Server thực hiện `UPDATE ... WHERE ID = ? AND version = ?` và kiểm tra `affectedRows`:
  - Nếu `affectedRows === 0` → trả về lỗi `409 Conflict` (bản ghi đã bị sửa bởi phiên khác).
  - Nếu `affectedRows > 0` → tăng `version` lên 1 và lưu thành công.

---

## 5. Mã lỗi (Error Codes)

> File: `src/constants/moigiang/errorCodes.constant.js`

Mã lỗi có cấu trúc: `MG_[NHÓM]_[3 CHỮ SỐ]`

| Mã lỗi | HTTP Status | Mô tả |
|---|---|---|
| `MG_AUTH_001` | 401 | Chưa đăng nhập |
| `MG_AUTH_002` | 403 | Không đủ quyền (yêu cầu ADMIN) |
| `MG_VAL_001` | 400 | Thiếu ID bản ghi |
| `MG_VAL_002` | 400 | `LopHocPhan` rỗng hoặc quá dài (> 100 ký tự) |
| `MG_VAL_003` | 400 | `TenLop` rỗng hoặc quá dài (> 200 ký tự) |
| `MG_VAL_004` | 400 | `SoTinChi` không phải số nguyên dương (1–10) |
| `MG_VAL_005` | 400 | `LL` (số tiết lên lớp) không phải số thực dương |
| `MG_VAL_006` | 400 | `QuyChuan` (số tiết quy chuẩn) không phải số thực dương |
| `MG_VAL_007` | 400 | `GiaoVien` (GV theo TKB) rỗng hoặc quá dài (> 200 ký tự) |
| `MG_VAL_008` | 400 | `Khoa` rỗng hoặc quá dài (> 50 ký tự) |
| `MG_VAL_009` | 400 | Thiếu `version` (optimistic lock) |
| `MG_DB_001` | 409 | Xung đột phiên (Optimistic Lock conflict) — bản ghi đã bị thay đổi |
| `MG_DB_002` | 404 | Không tìm thấy bản ghi với ID tương ứng |
| `MG_DB_003` | 500 | Lỗi database không xác định |
| `MG_SRV_001` | 500 | Lỗi server không xác định |

---

## 6. Validation Chi tiết

> File: `src/validators/moigiang/adminCoreInfo.validator.js`

Mỗi field được validate với các quy tắc cụ thể:

| Field | Bắt buộc | Kiểu | Giới hạn | Mã lỗi |
|---|---|---|---|---|
| `id` | ✅ | Integer > 0 | - | `MG_VAL_001` |
| `LopHocPhan` | ✅ | String (trim) | 1–100 ký tự, không rỗng | `MG_VAL_002` |
| `TenLop` | ✅ | String (trim) | 1–200 ký tự, không rỗng | `MG_VAL_003` |
| `SoTinChi` | ✅ | Integer | 1 ≤ x ≤ 10 | `MG_VAL_004` |
| `LL` | ✅ | Float | > 0, tối đa 2 chữ số thập phân | `MG_VAL_005` |
| `QuyChuan` | ✅ | Float | > 0, tối đa 2 chữ số thập phân | `MG_VAL_006` |
| `GiaoVien` | ✅ | String (trim) | 1–200 ký tự | `MG_VAL_007` |
| `Khoa` | ✅ | String (trim) | 1–50 ký tự | `MG_VAL_008` |
| `version` | ✅ | Integer ≥ 0 | - | `MG_VAL_009` |

**Lưu ý sanitization:**
- Tất cả các String field phải được `.trim()` trước khi validate.
- Phòng chống XSS: loại bỏ các ký tự HTML đặc biệt (`<`, `>`, `&`, `"`, `'`).
- Phòng chống SQL Injection: sử dụng Parameterized Query / Prepared Statement ở tầng Repository.

---

## 7. Frontend: AG Grid

Bảng tại `moigiang.thongTinGiangVienSiteKhoa.ejs` **sẽ được chuyển sang AG Grid** (không còn là option "cân nhắc").

### 7.1. Cấu hình cột AG Grid (cho ADMIN)

```javascript
const columnDefs = [
  { field: 'stt',         headerName: 'STT',            editable: false, width: 60 },
  { field: 'LopHocPhan',  headerName: 'Lớp học phần',   editable: true,  width: 150 },
  { field: 'TenLop',      headerName: 'Tên lớp',         editable: true,  width: 180 },
  { field: 'SoTinChi',    headerName: 'Số TC',           editable: true,  width: 70 },
  { field: 'GiaoVien',    headerName: 'GV theo TKB',     editable: true,  width: 150 },
  { field: 'Khoa',        headerName: 'Khoa',            editable: true,  width: 80 },
  { field: 'LL',          headerName: 'Số tiết LL',      editable: true,  width: 90 },
  { field: 'QuyChuan',    headerName: 'Số tiết QC',      editable: true,  width: 90 },
  // --- Các cột còn lại như trước ---
  { field: 'MoiGiang',    headerName: 'Mời giảng?',      editable: true,  width: 90 },
  // ...
];
```

### 7.2. Xử lý lưu: Auto-save theo ô (giống TKB)

> **Không có nút "Cập nhật".** Mỗi khi ADMIN thay đổi giá trị trong một ô và rời khỏi ô đó, `onCellValueChanged` sẽ tự động gọi API để lưu ngay lập tức — giống hệt cơ chế tại `tkb.thoiKhoaBieuChinhThuc.ejs`.

```javascript
async function onCellValueChanged(event) {
  const { data, colDef, newValue, oldValue } = event;

  // Không làm gì nếu giá trị không đổi
  if (newValue === oldValue) return;

  try {
    const response = await fetch('/api/v1/admin/moi-giang/core-info', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      // Gửi từng ô thay đổi: id + field + newValue + version
      body: JSON.stringify({
        records: [{
          id: data.ID,
          LopHocPhan: data.LopHocPhan,
          TenLop: data.TenLop,
          SoTinChi: data.SoTinChi,
          GiaoVien: data.GiaoVien,
          Khoa: data.Khoa,
          LL: data.LL,
          QuyChuan: data.QuyChuan,
          version: data.version,   // Optimistic lock
        }]
      }),
    });

    const result = await response.json();

    if (response.ok) {
      // Cập nhật version mới vào data của row (tránh conflict lần sau)
      const rowNode = gridOptions.api.getRowNode(String(data.ID));
      if (rowNode) {
        rowNode.data.version = result.updated[0].version;
      }
      Toastify({ text: '✅ Cập nhật thành công!', duration: 1500,
        gravity: 'top', position: 'right', backgroundColor: '#4CAF50' }).showToast();
    } else {
      // Hiển thị lỗi và revert giá trị cũ
      Swal.fire({ title: '❌ Lỗi', html: result.message, icon: 'error' });
      const rowNode = gridOptions.api.getRowNode(String(data.ID));
      if (rowNode) {
        rowNode.data[colDef.field] = oldValue;
        gridOptions.api.refreshCells({ rowNodes: [rowNode], force: true });
      }
    }
  } catch (err) {
    console.error('Lỗi kết nối server:', err);
    // Revert về giá trị cũ nếu lỗi mạng
    const rowNode = gridOptions.api.getRowNode(String(data.ID));
    if (rowNode) {
      rowNode.data[colDef.field] = oldValue;
      gridOptions.api.refreshCells({ rowNodes: [rowNode], force: true });
    }
  }
}

// Gắn vào gridOptions
gridOptions = {
  getRowId: (params) => String(params.data.ID),
  columnDefs,
  rowData: [],
  onCellValueChanged,   // ← tự động lưu khi ô thay đổi
  singleClickEdit: true,
  enterMovesDownAfterEdit: true,
  // ...
};
```

**Luồng xử lý khi ô thay đổi:**
```
ADMIN sửa ô → onCellValueChanged → PUT /api/v1/admin/moi-giang/core-info
    ├── 200 OK  → Cập nhật version mới cho row → Toast ✅
    ├── 409     → Swal cảnh báo conflict → Revert giá trị cũ
    ├── 400     → Swal hiển thị lỗi validation → Revert giá trị cũ
    └── Network error → Revert giá trị cũ
```

### 7.3. Xử lý phản hồi lỗi

| HTTP | Error Code | Hành động trên UI |
|---|---|---|
| `200` | - | Toast xanh ✅, cập nhật `version` mới cho row |
| `400` | `MG_VAL_XXX` | SweetAlert2 hiển thị message lỗi cụ thể, revert giá trị cũ vào ô |
| `409` | `MG_DB_001` | SweetAlert2 cảnh báo "Bản ghi đã bị thay đổi — vui lòng tải lại", revert |
| `403` | `MG_AUTH_002` | Redirect về trang chủ (session hết hạn) |
| Network error | - | Toast đỏ ❌ lỗi kết nối, revert giá trị cũ |

---

## 8. Backend: Endpoint Mới

**Endpoint:** `PUT /api/v1/admin/moi-giang/core-info`

Route được khai báo trong file `adminMoiGiangCoreInfoRoute.js` (mới hoàn toàn), **không liên quan đến bất kỳ route file nào đang tồn tại.**

### 8.1. Middleware Chain

```
verifyToken (jwt) → requireAdminRole (session/role check) → validateCoreInfoPayload → controller
```

### 8.2. Request Payload

> Mỗi lần gọi API chỉ gửi **1 record** (tương ứng 1 ô vừa được sửa). Đây là thiết kế chủ động để đồng bộ với `onCellValueChanged`.

```json
{
  "records": [
    {
      "id": 123,
      "LopHocPhan": "ATTT101",
      "TenLop": "ATTT101.1",
      "SoTinChi": 3,
      "GiaoVien": "Nguyễn Văn A",
      "Khoa": "ATTT",
      "LL": 45,
      "QuyChuan": 45.0,
      "version": 2
    }
  ]
}
```

### 8.3. Quy trình xử lý

1. Middleware xác thực token & role ADMIN (server-side).
2. Validate toàn bộ array `records` — nếu bất kỳ record nào lỗi, trả về `400` với danh sách lỗi.
3. Với mỗi record (trong một transaction):
   - Thực hiện `UPDATE ... WHERE ID = ? AND version = ?`
   - Kiểm tra `affectedRows`:
     - `=== 0` → rollback, trả về `409` với mã `MG_DB_001`
     - `> 0` → tiếp tục, ghi audit log
4. Commit transaction.
5. Trả về `200 OK` với danh sách các record đã cập nhật thành công (kèm `version` mới).

### 8.4. Response thành công

```json
{
  "success": true,
  "updated": [
    { "id": 123, "version": 3 }
  ]
}
```

---

## 9. Kiểm thử

### 9.1. Unit Test

> `tests/moigiang/unit/`

**`adminCoreInfo.validator.test.js`** — Test thuần hàm validation (không cần DB/server):

| Test Case | Input | Expected |
|---|---|---|
| Thiếu `id` | `{ id: null }` | Throw `MG_VAL_001` |
| `LopHocPhan` rỗng | `{ LopHocPhan: '' }` | Throw `MG_VAL_002` |
| `LopHocPhan` > 100 ký tự | `{ LopHocPhan: 'a'.repeat(101) }` | Throw `MG_VAL_002` |
| `SoTinChi` = 0 | `{ SoTinChi: 0 }` | Throw `MG_VAL_004` |
| `SoTinChi` = 11 | `{ SoTinChi: 11 }` | Throw `MG_VAL_004` |
| `SoTinChi` = 'abc' | `{ SoTinChi: 'abc' }` | Throw `MG_VAL_004` |
| `LL` âm | `{ LL: -5 }` | Throw `MG_VAL_005` |
| `version` thiếu | `{ version: undefined }` | Throw `MG_VAL_009` |
| Payload hợp lệ | *(full valid object)* | Không throw |

**`adminCoreInfo.service.test.js`** — Test business logic với mock repository:

| Test Case | Setup mock | Expected |
|---|---|---|
| Update thành công | `repository.update()` trả về `{ affectedRows: 1 }` | Trả về record updated |
| Optimistic lock conflict | `repository.update()` trả về `{ affectedRows: 0 }` | Throw `MG_DB_001` |
| DB lỗi unexpected | `repository.update()` throw Error | Throw `MG_SRV_001` |

### 9.2. Integration Test

> `tests/moigiang/integration/adminCoreInfo.api.test.js`

Test API thực tế với server chạy thật (có thể dùng test DB hoặc transaction rollback):

| Test Case | Request | Expected Response |
|---|---|---|
| Không có token | `PUT` (no Authorization header) | `401 MG_AUTH_001` |
| Token hợp lệ nhưng role = `GV` | JWT role=GV | `403 MG_AUTH_002` |
| Token ADMIN, payload thiếu `id` | `{ records: [{ LopHocPhan: 'X' }] }` | `400 MG_VAL_001` |
| Token ADMIN, `SoTinChi` = -1 | `{ records: [{ SoTinChi: -1 }] }` | `400 MG_VAL_004` |
| Token ADMIN, payload hợp lệ, version đúng | *(full valid payload)* | `200 { success: true }` |
| Token ADMIN, payload hợp lệ, version sai | `version: 999` (không tồn tại) | `409 MG_DB_001` |

### 9.3. Regression Test

> `tests/moigiang/regression/adminCoreInfo.regression.test.js`

Đảm bảo tính năng mới **không phá vỡ** các endpoint cũ liên quan:

| Test Case | Mục đích |
|---|---|
| `POST /check-teaching` vẫn hoạt động bình thường sau khi thêm route mới | Không xung đột routing |
| `POST /api/v1/qc/thong-tin-giang-day` vẫn trả về đúng dữ liệu | Không ảnh hưởng query layer |
| `PUT /updateDateAll` vẫn update ngày bình thường | Không chia sẻ transaction pool bị ảnh hưởng |

---

## 10. Definition of Done (DoD)

Một task được coi là **hoàn thành** khi thỏa mãn **tất cả** các điều kiện sau:

### Bảo mật
- [ ] Middleware `adminRoleMiddleware.js` kiểm tra role từ **server-side session/JWT**, không tin localStorage.
- [ ] Mọi request vào endpoint mới của role không phải ADMIN đều nhận `403 MG_AUTH_002`.
- [ ] Redirect client về trang chủ (hoặc hiển thị lỗi 403) nếu role không phải ADMIN khi truy cập màn hình.

### Frontend
- [ ] Bảng tại page đã được **chuyển sang AG Grid** hoàn toàn.
- [ ] Cột "Học phần" gốc đã tách thành 2 cột riêng: `Lớp học phần` và `Tên lớp`.
- [ ] Tất cả cột thông tin lõi (cột 2–8) đều có `editable: true` trong AG Grid config.
- [ ] Màn hình gọi API lấy role từ server, không dùng `localStorage.getItem('userRole')`.

### Backend
- [ ] File `errorCodes.constant.js` đã được tạo với đầy đủ mã lỗi theo bảng trên.
- [ ] File `adminCoreInfo.validator.js` đã validate đầy đủ tất cả field theo bảng validation.
- [ ] Endpoint `PUT /api/v1/admin/moi-giang/core-info` hoàn toàn mới, **không tái sử dụng** code cũ.
- [ ] Optimistic Locking hoạt động đúng: version sai → `409 MG_DB_001`.
- [ ] Audit log được ghi sau mỗi lần UPDATE thành công.

### Kiểm thử
- [ ] **Unit Test**: Tất cả test case trong `unit/` đã viết và **pass 100%**.
- [ ] **Integration Test**: Tất cả test case trong `integration/` đã viết và **pass 100%**.
- [ ] **Regression Test**: Tất cả test case trong `regression/` đã viết và **pass 100%** — xác nhận không có API cũ nào bị ảnh hưởng.

### Code Quality
- [ ] Code tuân theo pattern đã có trong project (cấu trúc controller → service → repository).
- [ ] Không có `console.log` debug trong code production.
- [ ] Mọi error đều được handle và trả về đúng mã lỗi định nghĩa trong `errorCodes.constant.js`.
