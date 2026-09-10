# Kiến trúc và Luồng Xử Lý Vượt Giờ V2

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**. When this document conflicts with source code, source code is authoritative.

Tài liệu này mô tả kiến trúc, vòng đời dữ liệu và các hàm/file tương ứng trong hệ thống **Vượt Giờ V2** của giảng viên cơ hữu.

## 1. Nguyên tắc thiết kế

1. **Tách dữ liệu và logic:** Repository lấy dữ liệu; service điều phối; mapper/policy thực hiện chuẩn hóa và tính toán.
2. **SDO:** `summary.mapper.toAtomicSDO()` và `toCollectionSDO()` tạo cùng một cấu trúc SDO cho API, giao diện, snapshot và báo cáo.
3. **Hai nguồn live + snapshot:** Trước khi khóa, hệ thống có live projected (`isDuKien=true`) và live official (`isDuKien=false`). Sau khi khóa, snapshot là nguồn bắt buộc cho thống kê khoa và xuất file.
4. **Policy theo năm học:** `OvertimePolicyFactory` chọn `PolicyV1` hoặc `PolicyV2`; không dùng trực tiếp hàm nội bộ `calculateOvertime()` làm entry point production.

## 2. Cấu trúc thư mục lõi

```text
src/
├── routes/vuotGioV2Route.js
├── controllers/vuotgio_v2/
│   ├── base.controller.js
│   ├── tongHop.controller.js
│   ├── preview.controller.js
│   └── dataLock.controller.js
├── services/vuotgio_v2/
│   ├── tongHop.service.js
│   ├── snapshotData.service.js
│   ├── dataLock.service.js
│   ├── xuatFile.service.js
│   └── thongKe.service.js
├── mappers/vuotgio_v2/
│   ├── summary.mapper.js
│   └── policies/{OvertimePolicyFactory,PolicyV1,PolicyV2}.js
└── repositories/vuotgio_v2/
    ├── tongHop.repo.js
    ├── kthp.repo.js
    ├── soTietTongHop.repo.js
    └── dataLock.repo.js
```

## 3. Luồng dữ liệu

### 3.1 Live projected (`isDuKien=true`)

- `GET /v2/vuotgio/ca-nhan-du-kien` hoặc API tổng hợp với `isDuKien=true`.
- Giảng dạy đọc từ `quychuan`, được `processQuyChuanData()` map về giảng viên cơ hữu trong bộ nhớ.
- DATN đọc từ `doantotnghiep` rồi transform; LNQC, KTHP và HDTQ đọc bảng runtime mà không thêm điều kiện duyệt.
- NCKH vẫn được lấy qua `stats.service.js` với scope mặc định `OFFICIAL`, nên phải đủ `khoa_duyet=1` và `vien_nc_duyet=1`.
- Kết quả là live preview, có thể thay đổi khi dữ liệu nguồn thay đổi.

### 3.2 Live official (`isDuKien=false`)

- `GET /v2/vuotgio/ca-nhan-chinh-thuc`, `/tong-hop/giang-vien?isDuKien=false`.
- Giảng dạy đọc `giangday`; DATN đọc `exportdoantotnghiep`.
- LNQC phải có `khoa_duyet=1 AND dao_tao_duyet=1`.
- KTHP phải có `khoa_duyet=1 AND khao_thi_duyet=1` trên bảng cha `vg_kthp`.
- HDTQ phải có `khoa_duyet=1 AND dao_tao_duyet=1`.
- Service map dữ liệu vào SDO và gọi `OvertimePolicyFactory` để tính kết quả.

### 3.3 Snapshot sau khóa

`dataLock.service.lockData()` thực hiện trong transaction:

1. kiểm tra định dạng và sự tồn tại của `NamHoc`;
2. từ chối năm đã có trong `vg_khoa_du_lieu`;
3. kiểm tra đủ duyệt hai cấp trên LNQC/KTHP/HDTQ;
4. kiểm tra mọi khoa (`phongban.isKhoa=1`) đã có `van_phong_duyet=1`;
5. tính `getCollectionSDODetail(namHoc, "ALL")` bằng nguồn official;
6. lưu toàn bộ SDO JSON vào `vg_so_tiet_tong_hop` và ghi bản ghi khóa;
7. commit hoặc rollback toàn bộ thao tác.

Snapshot chứa `version`, `is_latest` và `chi_tiet` là JSON SDO đầy đủ. Thống kê khoa và export đọc snapshot; dữ liệu nền không được truy vấn lại cho các luồng này.

**Preview tự chọn nguồn:** endpoint preview cá nhân/khoa dùng snapshot nếu năm đã khóa; nếu chưa khóa thì tính live theo `isDuKien` (mặc định projected). Vì vậy không phải mọi preview đều bắt buộc snapshot.

## 4. Bảng hàm lõi

| File | Hàm | Nhiệm vụ |
|---|---|---|
| `tongHop.repo.js` | `getDuLieuThoTongHop()` | Batch lấy danh sách giảng viên và tổng giờ theo nguồn. |
| `tongHop.service.js` | `getAtomicSDO()` | Lấy dữ liệu một giảng viên và map thành SDO. |
| `tongHop.service.js` | `getCollectionSDO()` | Tổng hợp nhẹ theo danh sách, kèm cảnh báo thiếu NCKH. |
| `tongHop.service.js` | `getCollectionSDODetail()` | Batch lấy dữ liệu chi tiết, bao gồm `tableF`, dùng cho snapshot/export preview. |
| `summary.mapper.js` | `toAtomicSDO()` / `toCollectionSDO()` | Chuẩn hóa SDO và gọi policy calculator. |
| `OvertimePolicyFactory.js` | `getCalculator(namHoc)` | Chọn Policy V1/V2 theo danh sách năm được cấu hình. |
| `snapshotData.service.js` | `getSnapshotSDOList()` / `getSnapshotSDOByUser()` | Đọc và parse SDO từ `vg_so_tiet_tong_hop`. |
| `dataLock.service.js` | `lockData()` | Kiểm tra điều kiện, tính SDO, lưu snapshot và khóa năm. |
| `xuatFile.service.js` | `exportExcel()` | Xuất Excel từ snapshot; năm chưa khóa sẽ bị từ chối. |

## 5. Công thức hiện hành

```text
tongThucHien = giangDay + LNQC + KTHP + DATN + HDTQ
thieuNCKH = max(0, dinhMucNCKH - soTietNCKH)
tongVuot = max(0, tongThucHien - thieuNCKH - dinhMucSauMienGiam)
thanhToan = min(tongVuot, dinhMucSauMienGiam)
```

- Mặc định khi thiếu dòng `sotietdinhmuc`: `dinhMucChuan=280`, `dinhMucNCKH=200`.
- V1 áp dụng phần trăm miễn giảm trực tiếp cho định mức giảng dạy.
- V2 chỉ được factory chọn cho các năm `2025 - 2026` đến `2031 - 2032`; nếu có miễn giảm (`phanTramMienGiam > 0`) thì định mức giảng dạy là `224` và `mienGiam=56`.
- Định mức NCKH không được miễn giảm.

## 6. Phê duyệt và khóa dữ liệu

```text
Nhập dữ liệu
  → Khoa duyệt (khoa_duyet)
  → Đào tạo/Khảo thí duyệt cấp 2
  → Văn phòng duyệt tổng hợp theo khoa (van_phong_duyet)
  → Khóa năm học
  → Snapshot / thống kê / export
```

`checkDataLock` chỉ chặn các route ghi Vượt Giờ có gắn middleware sau khi khóa.
Các route duyệt tổng hợp không gắn middleware: `revokeKhoa()` tự kiểm tra khóa ở
service, còn `approveKhoa()` không có guard khóa riêng. Không có route mở khóa
công khai.
