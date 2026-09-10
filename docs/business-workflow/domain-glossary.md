# Domain Glossary

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**. When this document conflicts with source code, source code is authoritative.

## Core workload terms

| Vietnamese term | Code alias | Meaning |
|---|---|---|
| Số tiết | `soTiet`, `SoTiet` | Workload period/hour unit used by the system |
| Số tiết quy chuẩn | `QuyChuan`, `quy_chuan` | Normalized workload used by Vượt Giờ |
| Định mức | `dinhMucChuan`, `dinhMucNCKH` | Teaching and NCKH quota values |
| Vượt giờ | `tongVuot` | Overtime after teaching quota and NCKH shortfall |
| Miễn giảm | `mienGiam`, `phanTramMienGiam` | Teaching-quota reduction under the selected policy |
| Định mức sau miễn giảm | `dinhMucSauMienGiam` | Effective teaching quota used in overtime formula |
| Thiếu NCKH | `thieuNCKH` | `max(0, dinhMucNCKH - soTietNCKH)`; reduces eligible overtime |
| Thanh toán | `thanhToan` | Payable overtime hours; capped by the effective teaching quota |
| SDO | `Standardized Data Object` | Per-lecturer object produced by the summary mapper |

## Vượt Giờ workload sources

| Term | Current table(s) | Description |
|---|---|---|
| Giảng dạy | `quychuan` (projected), `giangday` (official) | Standard teaching workload; internal lecturers only |
| Lớp ngoài quy chuẩn (LNQC) | `course_schedule_details` (draft), `vg_lop_ngoai_quy_chuan` (official) | Non-standard classes; official aggregation requires two-level approval |
| Kết thúc học phần (KTHP) | `vg_kthp` + `vg_kthp_ra_de` + `vg_kthp_coi_thi` + `vg_kthp_cham_thi` | Exam, paper-setting, proctoring, and grading activities |
| Đồ án tốt nghiệp (DATN) | `doantotnghiep` (projected), `exportdoantotnghiep` (official) | Thesis/project supervision; guest rows are excluded |
| Hướng dẫn tham quan thực tế (HDTQ) | `vg_huong_dan_tham_quan_thuc_te` | Field-trip/practical guidance; official aggregation requires two-level approval |
| NCKH | `nckh_chung`, `nckh_so_tiet` | Research work and persisted participant allocations |

`vg_coi_cham_ra_de` is a legacy/historical KTHP name. It is not the current runtime table for KTHP aggregation.

## Approval terms

| Term | Field/table | Meaning |
|---|---|---|
| Khoa duyệt | `khoa_duyet` | Faculty-level approval |
| Đào tạo duyệt | `dao_tao_duyet` | Second-level approval for LNQC and HDTQ |
| Khảo thí duyệt | `khao_thi_duyet` | Second-level approval for KTHP |
| Viện NC duyệt | `vien_nc_duyet` | Institute NCKH approval |
| Văn phòng duyệt | `vg_duyet_tong_hop.van_phong_duyet` | Faculty synthesis approval before year lock |
| Khóa dữ liệu | `vg_khoa_du_lieu` | Year-level lock that blocks Vượt Giờ writes |
| Snapshot | `vg_so_tiet_tong_hop` | Versioned JSON SDO data stored at lock time |

## NCKH formula terms

| Term | Meaning |
|---|---|
| `standard` | Weighted allocation: main authors, including `tac_gia_lien_he`, receive a larger share |
| `equal` | Equal allocation by participant count and duration, with final delta correction |
| `fixed` | Full declared total assigned to one manual HOIDONG participant |
| `tongSoTiet` | Work-level declared total stored on `nckh_chung` |
| `so_tiet` | Participant/year allocation stored on `nckh_so_tiet` |
| `soNamThucHien` | Duration; values over 1900 are treated as literal years |
| `OFFICIAL` | NCKH stats scope requiring both approval flags |
| `PREVIEW` | NCKH stats scope filtering only by academic year |

## Organizational terms

| Term | Code | Meaning |
|---|---|---|
| Khoa | `phongban.isKhoa = 1`, `MaPhongBan` | Teaching faculty |
| Phòng ban không phải khoa | `phongban.isKhoa = 0` | Office/support unit; grouped by `BGĐ&PHONG` in Vượt Giờ |
| Giảng viên | `id_User`/`giangVien` | Internal lecturer/staff row |
| Mã số cán bộ | `MaSoCanBo` / employee fields | Identifier used during NCKH import name resolution |
| Năm học | `NamHoc`, `nam_hoc` | Academic year, normally `YYYY - YYYY` |

## SDO fields

`toAtomicSDO()` returns, among other fields:

```text
id_User, giangVien, maKhoa, khoa, isKhoa, chucVu
soTietGiangDay, soTietNgoaiQC, soTietKTHP, soTietDoAn, soTietHDTQ
soTietNCKH, tongThucHien, dinhMucChuan, mienGiam
thieuNCKH, thieuTietGiangDay, dinhMucSauMienGiam
tongVuot, thanhToan, tableE, tableF, breakdown, raw, nam_hoc
```

`tableF` always contains the normalized training-system categories `vn`, `lao`, `cuba`, `cpc`, and `dongHP`. DATN and HDTQ are assigned to HK2 in this breakdown because they have no semester field.
