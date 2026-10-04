# Kế hoạch chuẩn hóa QC TKB (phạm vi tối thiểu)

## 1. Mục tiêu và nguyên tắc

- Chỉ chuẩn hóa **số tiết quy chuẩn QC của module Quy chuẩn thời khóa biểu**.
- Công thức nguồn:
  `QC_raw = LL × HeSoLopDong × HeSoT7CN`.
- Giá trị lưu/đọc chuẩn là **truncate về 2 chữ số thập phân**, không round-nearest:
  - `1.2678 → 1.26`
  - `1.2699 → 1.26`
  - `1.2700 → 1.27`
- Dùng `src/services/qcTkb/QcTkbFactory.js` làm policy boundary duy nhất cho QC TKB/QC dự kiến.
- Không áp dụng factory cho các số tiết khác, công thức khác hoặc module khác.
- Không migrate dữ liệu cũ.
- Không đổi CRUD, quyền sửa, khả năng nhập QC, SQL chia số tiết hoặc công thức 30/70.
- Không refactor các luồng tổng hợp ngoài TKB/QC dự kiến.

## 2. Mapping source of truth

### Boundary A — TKB chính thức

| Điểm vào | Bảng/cột | Xử lý |
|---|---|---|
| Import Excel TKB: `TKBImportController.importExcelTKB` | `room_timetable.qc` → `course_schedule_details.qc` | Tính từ LL và hai hệ số qua factory trước INSERT; câu `SELECT MAX(qc)` chỉ copy lại giá trị đã chuẩn hóa |
| Sửa LL/Số SV/Hệ số ngoài giờ/Hệ đào tạo: `TKBController.updateRowTKB` | `course_schedule_details.qc` | Tính lại qua factory trước UPDATE |
| Nhập trực tiếp ô QC TKB | `course_schedule_details.qc` | Giữ khả năng nhập như hiện tại, nhưng normalize giá trị nhập qua factory |

Sau khi ghi vào `course_schedule_details.qc`, màn hình TKB và luồng chuyển sang QCDK chỉ đọc giá trị đã chuẩn hóa; không tính lại ở UI.

### Boundary B — Quy chuẩn dự kiến (bảng tạm)

| Điểm vào | Bảng/cột | Xử lý |
|---|---|---|
| `moiGiangQCDKController.quyDoiHeSo`, dùng bởi `updateTableTam`/`updateRow` | `tam.QuyChuan` | Tính từ LL và hai hệ số qua factory |
| Thêm dòng trực tiếp bảng tạm | `tam.QuyChuan` | Normalize QC nhập trực tiếp |
| Import bảng tạm | `tam.QuyChuan` | Normalize cột QC đã có trong file; giữ nguyên điều kiện/lọc import |

Luồng TKB → QCDK (`themTKBVaoQCDK`) **copy** QC đã canonical từ TKB, không tính/round lần hai.

### Ngoài phạm vi

- `quychuan.QuyChuan` chính thức, màn hình GVM chính thức và các service tổng hợp mời giảng/vượt giờ.
- Các trường LL, số tiết CTĐT, hệ số, tổng tiết không phải QC.
- SQL `30/70`, chia tiết, snapshot, migrate dữ liệu.

Đặc biệt, các biểu thức SQL đang phân bổ `QuyChuan * 0.7`/`* 1` vẫn giữ nguyên. Không thêm `ROUND`, `CEIL` hay `TRUNCATE` vào các truy vấn tổng hợp; QC đã được canonicalize trước khi đi vào luồng đó.

## 3. Triển khai

1. Thêm factory decimal-string/BigInt, truncate toward zero.
2. Thay phép nhân QC tại hai boundary bằng `calculate(...).canonical`.
3. Thay normalize/round-nearest trực tiếp trên QC input bằng `normalize`.
4. Xóa `toFixed`/round riêng tại chính boundary sau khi factory đã trả giá trị canonical.
5. Không sửa view để khóa ô QC; UI vẫn thao tác như trước và nhận giá trị canonical từ backend.
6. Giữ thay đổi trong 4 controller + factory/test; không chạm downstream aggregation/view.

## 4. Self-test và E2E

### Test tự động

- `npx jest test/services/qcTkb --runInBand`
- `npm run test:node`
- `git diff --check`

### E2E đã kiểm chứng trên web

- Tài khoản test được cung cấp: `tuonghs / 1`.
- Fixture fractional QC: `/tmp/e2e-tkb-qc-fractional-20261004.xlsx`.
- Kết quả kỳ vọng/đã quan sát:
  - Import TKB HTTP 200.
  - `course_schedule_details.qc = 1.26`.
  - `room_timetable.qc = 1.26`.
  - UI TKB hiển thị `1.26`.
  - Chuyển TKB → QCDK HTTP 201.
  - `tam.QuyChuan`/UI QCDK hiển thị `1.26`.
- Dữ liệu E2E đã được xóa sau kiểm thử.

> Không dùng tài khoản/fixture này cho production; chỉ dùng trên môi trường test được cấp quyền.
