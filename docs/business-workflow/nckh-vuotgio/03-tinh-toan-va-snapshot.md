# 03 — Tính toán, nguồn dữ liệu và snapshot

## 1. NCKH là precondition của Vượt Giờ

Đây là invariant riêng, không phải một bước tùy chọn:

```text
NCKH full data
  → Khoa duyệt
  → Viện NCKH duyệt
  → NCKH official stats/export
  → Vượt Giờ đọc NCKH official
  → tính/chặn trần Vượt Giờ
```

Source hiện tại gọi stats NCKH từ Vượt Giờ mà không truyền scope riêng, nên scope mặc định là **official** (`khoa_duyet=1 AND vien_nc_duyet=1`). Vì vậy ngay cả màn hình Vượt Giờ dự kiến cũng không dùng NCKH preview/pending để kết luận `soTietNCKH`.

Nếu chạy Vượt Giờ trước NCKH hoặc dùng khác năm học, `soTietNCKH` có thể bằng `0`; đó là run không phù hợp, không phải bằng chứng NCKH không được tích hợp.

## 2. Ma trận nguồn theo mode

| Workload | Projected/live | Official/live | Điều kiện official |
|---|---|---|---|
| Giảng dạy cơ hữu | `quychuan`, map bằng `MoiGiang=0` | `giangday` | Đã materialize/lưu; chỉ lecturer cơ hữu |
| Đồ Án cơ hữu | `doantotnghiep`, `isMoiGiang=0` | `exportdoantotnghiep`, `isMoiGiang=0` | Đã export/materialize |
| LNQC | `vg_lop_ngoai_quy_chuan`, không lọc approval | Cùng bảng | `khoa_duyet=1 AND dao_tao_duyet=1` |
| KTHP | `vg_kthp` và child, không lọc approval | Cùng parent/child | `khoa_duyet=1 AND khao_thi_duyet=1` |
| HDTQ | `vg_huong_dan_tham_quan_thuc_te`, không lọc approval | Cùng bảng | `khoa_duyet=1 AND dao_tao_duyet=1` |
| NCKH | Cross-module gọi stats official | NCKH official | `khoa_duyet=1 AND vien_nc_duyet=1` |

`course_schedule_details` là upstream draft của LNQC, không phải official aggregation source. Phải assert draft đã được ban hành trước khi mong đợi projected Vượt Giờ nhìn thấy nó.

## 3. Tính chặn trần NCKH

Với lecturer cơ hữu và cùng `NamHoc`:

```text
soTietNCKHOfficial
  = SUM(nckh_so_tiet.so_tiet)
  trên các record nckh_chung
  thỏa khoa_duyet=1 AND vien_nc_duyet=1

thieuNCKH = max(0, dinhMucNCKH - soTietNCKHOfficial)

tongThucHien = giangDay + LNQC + KTHP + DATN + HDTQ

tongVuot = max(
  0,
  tongThucHien - thieuNCKH - dinhMucSauMienGiam
)

thanhToan = min(tongVuot, dinhMucSauMienGiam)
```

E2E phải có ít nhất một lecturer vừa có NCKH official vừa có workload Vượt Giờ; phải ghi được `soTietNCKH > 0` trong SDO/snapshot hoặc giải thích rõ tại sao không có participant allocation. Chỉ thấy snapshot chạy thành công nhưng `tong_so_tiet_nckh=0` không đủ để kết luận pass cross-module.

## 4. SDO và dữ liệu chi tiết

Đối chiếu ít nhất các trường:

```text
id_User, giangVien, maKhoa, khoa, isKhoa
soTietGiangDay, soTietNgoaiQC, soTietKTHP, soTietDoAn, soTietHDTQ
soTietNCKH, tongThucHien, dinhMucChuan, mienGiam
thieuNCKH, thieuTietGiangDay, dinhMucSauMienGiam
tongVuot, thanhToan, nam_hoc
raw, breakdown, tableE, tableF
```

`getCollectionSDODetail()` dùng để lấy batch SDO đầy đủ cho snapshot/export preview; evidence nên giữ cả tổng scalar và raw IDs để truy ngược.

`tableF` dùng năm nhóm chuẩn (`vn`, `lao`, `cuba`, `cpc`, `dongHP`). DATN/HDTQ không mang kỳ riêng và được mapper phân bổ theo quy ước hiện hành; khi đối chiếu phải ghi quy ước này, không tự gán kỳ khác.

## 5. Cơ hữu và Mời Giảng

- Standard teaching projected/official có filter `MoiGiang=0` ở các query aggregation chính.
- Một số query detail official hiện thiếu filter `MoiGiang=0`; nếu invited row có `id_User` hợp lệ, detail có thể lệch aggregate. Đây là candidate defect phải giữ trong assertion.
- KTHP chỉ resolve nhân viên cơ hữu; LNQC aggregation dựa vào `id_User`, nên mapping lecturer là điều kiện bắt buộc.
- Nếu official row có `id_User=null` hoặc map nhầm username thay vì `HoTen`/employee ID, lock có thể thất bại hoặc SDO bị thiếu. Phải bắt lỗi mapping sớm ở bước nhập/confirm.

## 6. BGĐ&PHONG

- Canonical code: `BGĐ&PHONG`.
- Mọi `phongban.isKhoa=0` được gom thành “Ban giám đốc & các phòng” ở snapshot/thống kê/export tổng hợp.
- UI approval có thể hiển thị tất cả phòng/ban, nhưng lock chỉ xét khoa thật `isKhoa=1`.
- Assertion phải dùng tập khoa thật từ DB; không dùng số dòng trạng thái UI làm điều kiện pass.

## 7. Lock và snapshot

`dataLock.service.lockData()` phải hoàn tất tuần tự:

1. Validate format `NamHoc` (`YYYY - YYYY`) và năm tồn tại.
2. Từ chối nếu năm đã có lock.
3. Kiểm tra mọi LNQC/KTHP/HDTQ đủ cấp hai.
4. Kiểm tra mọi khoa thật đã `van_phong_duyet=1`.
5. Tính collection SDO official.
6. Từ chối nếu không có lecturer/SDO map được.
7. Ghi `vg_so_tiet_tong_hop` với JSON SDO đầy đủ, scalar totals, `version`, `is_latest`.
8. Ghi `vg_khoa_du_lieu` và commit; lỗi phải rollback.

Sau lock:

- snapshot mới nhất trở thành nguồn cho preview cá nhân/khoa theo endpoint tương ứng;
- thống kê khoa và export Vượt Giờ official bắt buộc đọc snapshot;
- source mutation không được làm thay đổi số liệu snapshot;
- không có public unlock route; cleanup production vẫn là blocker nếu không có
  contract admin/rebuild. E2E test environment có script hành chính marker-scoped
  được phê duyệt để clear lock/snapshot sau khi lưu evidence.

## 8. Oracle projected = official

So sánh theo khóa `(NamHoc, id_User, khoa)` ở ba cấp:

1. lecturer;
2. khoa;
3. tổng toàn hệ thống.

So sánh `soTiet*`, `soTietNCKH`, `tongThucHien`, `thieuNCKH`, `tongVuot`, `thanhToan` và số lượng lecturer.

Expected:

- Trước khi duyệt/lưu hết: projected có thể lớn hơn official vì còn pending.
- Sau khi toàn bộ record đạt max approval và đã materialize: projected = official.
- Nếu vẫn lệch: phải liệt kê raw record, nguồn (`quychuan`/`giangday`, `doantotnghiep`/`exportdoantotnghiep`), cờ duyệt và mapping gây lệch.
