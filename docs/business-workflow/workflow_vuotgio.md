# Kiến trúc và Luồng Xử Lý Vượt Giờ V2

Tài liệu này mô tả chi tiết kiến trúc, vòng đời dữ liệu và các hàm/file tương ứng trong hệ thống **Vượt Giờ V2** của giảng viên cơ hữu.

## 1. Tổng quan Triết lý Thiết kế

Hệ thống Vượt Giờ V2 được thiết kế dựa trên các nguyên tắc:
1. **Tách biệt Dữ liệu và Logic (Separation of Concerns):** Logic tính toán toán học (cộng trừ, chặn trần, quy đổi) được gom về một mối duy nhất (Mapper). Lớp Repo chỉ làm nhiệm vụ kéo dữ liệu.
2. **SDO (Service Data Object) Pattern:** Chuẩn hóa đầu ra dưới dạng một object thống nhất (SDO). Giao diện (UI) và tính năng In Ấn/Xuất File chỉ cần quan tâm đến cấu trúc của SDO, bất kể dữ liệu nguồn được lấy từ đâu.
3. **Phân chia 3 Giai đoạn Rõ rệt:** Quản lý vòng đời dữ liệu qua 3 phase: Dự kiến (Preview) ➔ Chính thức (Official) ➔ Sau lưu (Snapshot/Immutable).

---

## 2. Cấu Trúc Thư Mục (Directory Structure)

```text
src/
├── routes/
│   └── vuotGioV2Route.js                # Chứa toàn bộ API và Routing điều hướng UI của Vượt giờ V2
├── controllers/vuotgio_v2/
│   ├── base.controller.js               # Render HTML Views (giao diện cá nhân, tổng hợp, duyệt)
│   ├── tongHop.controller.js            # API cung cấp dữ liệu SDO cho Frontend
│   ├── preview.controller.js            # API phục vụ tạo file PDF/in ấn cho Tài chính
│   └── dataLock.controller.js           # Xử lý khóa dữ liệu (Snapshot)
├── services/vuotgio_v2/
│   ├── tongHop.service.js               # Service Core: Kéo dữ liệu Repo và gọi Mapper (Tạo SDO)
│   ├── snapshotData.service.js          # Đọc dữ liệu từ bảng lưu vết sau khi khóa
│   ├── xuatFile.service.js              # Xuất Excel bảng biểu
│   └── templatePreview.service.js       # Template build file PDF 
├── mappers/vuotgio_v2/
│   └── summary.mapper.js                # Core Business Logic: Tính toán công thức vượt giờ, map SDO
└── repositories/vuotgio_v2/
    ├── tongHop.repo.js                  # Truy vấn CSDL, điều khiển cờ `isDuKien` để đổi nguồn (quychuan/giangday)
    ├── soTietTongHop.repo.js            # Đọc/Ghi dữ liệu snapshot (vg_so_tiet_tong_hop)
    └── dataLock.repo.js                 # Truy vấn trạng thái khóa năm học
```

---

## 3. Phân Tích Chi Tiết 3 Giai Đoạn (Phases)

Hệ thống có 3 phase dữ liệu. Cả 3 phase đều có chung định dạng output (SDO) nhưng nguồn vào (Input) và cách lấy khác nhau. Cả "Dự kiến" và "Chính thức" đều dùng chung Mapper.

### Phase 1: Dự kiến (Projected / Preview)
- **Mục đích:** Xem nháp số tiết vượt giờ đang diễn ra trong năm học.
- **Cách nhận diện:** Tham số `isDuKien = true`.
- **Hàm/Flow tương ứng:**
  - **Route:** `router.get("/ca-nhan-du-kien", baseController.getVuotGioCaNhanDuKien)`
  - **Controller:** `tongHop.controller.js` ➔ `getStandardSummaryData(req, res, { isDuKien: true })`
  - **Service:** `tongHop.service.js` ➔ `getAtomicSDO(namHoc, id_User, conn, isDuKien = true)`
  - **Repository (`tongHop.repo.js`):** 
    - Lấy giảng dạy: `getVirtualGiangDay` ➔ Trỏ tới bảng **`quychuan`**.
    - Các mảng khác (KTHP, HD TQTT): Bỏ qua check `khoa_duyet = 1`.
    - Đồ án: Chạy `getPredictedDoAnRows` trực tiếp từ bảng `doantotnghiep`.
  - **Mapper:** Dữ liệu thô đưa vào `summary.mapper.js` tính toán.

### Phase 2: Chính thức (Official / Tài chính duyệt)
- **Mục đích:** Bảng chốt số liệu với dữ liệu sạch (đã qua duyệt), chuẩn bị thanh toán.
- **Cách nhận diện:** Tham số `isDuKien = false`.
- **Hàm/Flow tương ứng:**
  - **Route:** `router.get("/tai-chinh-duyet", baseController.getTaiChinhDuyet)`
  - **Controller:** `tongHop.controller.js` ➔ `tongHopTheoGV` (với cờ `isDuKien = false`)
  - **Service:** `tongHop.service.js` ➔ `getCollectionSDODetail(namHoc, khoa, isDuKien = false)`
  - **Repository (`tongHop.repo.js`):** 
    - Lấy giảng dạy: Trỏ tới bảng **`giangday`** (đã lưu).
    - Các mảng khác: Ép buộc `requireApproval = true` ➔ Thêm câu lệnh SQL `AND khoa_duyet = 1`.
    - Đồ án: Lấy từ **`exportdoantotnghiep`**.
  - **Mapper:** Dữ liệu thô tiếp tục đưa vào `summary.mapper.js` tính toán realtime.

### Phase 3: Sau Lưu (Snapshot / Xuất File Cuối Cùng)
- **Mục đích:** Xem và xuất dữ liệu lịch sử bất biến sau khi năm học đã bị khóa chốt.
- **Đặc thù:** Không gọi qua `tongHop.service.js` hay Mapper nữa, mà lấy kết quả đã được tính sẵn.
- **Hàm/Flow tương ứng:**
  - **Route:** `router.get("/thong-ke-sau-luu", baseController.getThongKeSauLuu)`
  - **Controller:** `tongHop.controller.js` ➔ `getSnapshotSummaryData`, `tongHopTheoGVSnapshot`
  - **Service:** `snapshotData.service.js` ➔ `getSnapshotSDOList`, `getSnapshotSDOByUser`
  - **Bảo mật:** `requireLocked(namHoc)` để quăng lỗi nếu năm đó chưa khóa.
  - **Repository:** Đọc từ bảng `vg_so_tiet_tong_hop`. Cột `chi_tiet` chứa cục JSON của đối tượng SDO được tạo ra ở Phase 2. `JSON.parse` nó ra và đưa cho UI.

---

## 4. Bảng Tra Cứu Các Hàm Lõi Quan Trọng (Core Map)

| Module / File | Hàm (Function) | Nhiệm Vụ |
| :--- | :--- | :--- |
| `tongHop.repo.js` | `getVirtualGiangDay(isDuKien)` | Query quyết định lấy từ `quychuan` (Dự kiến) hay `giangday` (Chính thức). |
| `tongHop.repo.js` | `getDuLieuThoTongHop()` | Tối ưu hóa Database: Query Batch tất cả data của tất cả GV trong 1 Khoa. |
| `tongHop.service.js` | `getAtomicSDO()` | Gom dữ liệu 1 GV từ các Repo ➔ Gửi qua Mapper ➔ Trả về SDO chi tiết. |
| `tongHop.service.js` | `getCollectionSDODetail()` | Gom dữ liệu toàn bộ Khoa ➔ Chạy vòng lặp gọi Mapper ➔ Trả về mảng SDO. |
| `snapshotData.service.js` | `getSnapshotSDOList()` | Kéo danh sách SDO của Khoa từ bảng lưu vết JSON (`vg_so_tiet_tong_hop`). |
| `summary.mapper.js` | `calculateOvertime()` | **Trái tim toán học:** Cộng tiết, trừ Mãn tải/NCKH, nhân hệ số. |
| `summary.mapper.js` | `toAtomicSDO()` | Định dạng lại cấu trúc JSON object đầu ra chuẩn chỉ để Frontend dễ render. |
| `dataLock.controller.js` | `lockData()` | Chuyển trạng thái từ Phase 2 sang Phase 3, biến SDO thành string JSON để insert database. |

---

## 5. Luồng Tính Toán Logic Trong Mapper (Tóm tắt)

Bất chấp Phase 1 hay Phase 2, một khi dữ liệu thô chạm đến `summary.mapper.js`, nó sẽ qua công thức chung:
1. `tongThucHien` = Tiết giảng dạy + Lớp Ngoài QC + KTHP + Đồ án + HD Tham Quan.
2. `mienGiam` = (Phần trăm miễn giảm / 100) * Định mức.
3. `tongVuot` = `tongThucHien` - (Định mức chuẩn - `mienGiam`).
4. Nếu GV nợ NCKH ➔ Tiến hành cấn trừ NCKH vào số tiết vượt.
5. Kiểm tra chặn trần (Ví dụ: Không được vượt quá 300 tiết/năm).
6. Kết quả ra `thanhToan` (Số tiết thực nhận tiền).
