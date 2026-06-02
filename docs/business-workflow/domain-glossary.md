# Domain Glossary

This glossary defines Vietnamese business terms used throughout the codebase. Understanding these terms is required to interpret variable names, table columns, and function logic.

---

## Core Workload Terms

| Vietnamese Term | Code Alias | English Meaning |
|----------------|-----------|----------------|
| Số tiết | `soTiet`, `SoTiet` | Number of teaching periods/hours (1 tiết ≈ 45 min) |
| Số tiết quy chuẩn | `QuyChuan`, `quy_chuan` | Normalized teaching hours — raw periods converted to a standard unit |
| Định mức | `dinhMuc`, `DinhMuc` | Quota — the standard number of hours a lecturer is expected to complete |
| Vượt giờ | `vuotGio`, `tongVuot` | Overtime — hours worked beyond the defined quota |
| Miễn giảm | `mienGiam`, `MienGiam` | Exemption — a percentage reduction applied to a lecturer's quota |
| Phần trăm miễn giảm | `phanTramMienGiam` | Exemption percentage (stored on `nhanvien` record) |
| Lý do miễn giảm | `lyDoMienGiam` | Textual reason for the exemption |
| Thanh toán | `thanhToan` | Payable overtime amount (capped at `dinhMucSauMienGiam`) |
| Thiếu tiết giảng dạy | `thieuTietGiangDay` | Shortfall in teaching hours relative to quota (display only) |
| Thiếu NCKH | `thieuNCKH` | Shortfall in research hours — directly penalises overtime payment |

---

## Workload Sources

| Vietnamese Term | Code / Table | Description |
|----------------|-------------|-------------|
| Giảng dạy | `giangday` | Standard teaching records (imported via TKB) |
| Lớp ngoài quy chuẩn (LNQC) | `vg_lop_ngoai_quy_chuan` | Non-standard classes not in the official timetable |
| Kết thúc học phần (KTHP) | `vg_coi_cham_ra_de` | Exam/proctoring, grading, and exam-paper setting work |
| Đồ án tốt nghiệp (DATN) | `exportdoantotnghiep` | Thesis and graduation project supervision |
| Hướng dẫn tham quan thực tế (HDTQ) | `vg_huong_dan_tham_quan_thuc_te` | Field-trip and practical training guidance |
| NCKH | `nckh_chung`, `nckh_so_tiet` | Scientific research work |

---

## Approval Terms

| Vietnamese Term | Code Alias | Meaning |
|----------------|-----------|---------|
| Khoa duyệt | `khoa_duyet` | Level-1 approval by department head |
| Đào tạo duyệt | `dao_tao_duyet` | Level-2 approval by Training Office (for LNQC, HDTQ) |
| Khảo thí duyệt | `khao_thi_duyet` | Level-2 approval by Exam Office (for KTHP) |
| Viện NC duyệt | `vien_nc_duyet` | Research Institute approval (for NCKH) |
| Văn phòng duyệt | `van_phong_duyet` | Office-level synthesis approval for a whole faculty |
| Duyệt tổng hợp | `vg_duyet_tong_hop` | Table storing per-faculty synthesis approval state |
| Khóa dữ liệu | `vg_khoa_du_lieu` | Year-level data lock — blocks all writes after this point |

---

## Document / Contract Terms

| Vietnamese Term | Code / File | Meaning |
|----------------|------------|---------|
| Hợp đồng | `HopDong*.docx` | Formal work contract |
| Phụ lục hợp đồng | — | Contract appendix (content of generated documents) |
| Hệ đào tạo | `he_dao_tao` | Training system / education level |
| Cấp độ | `cap_do` | Education level: 1=Undergraduate, 2=Master, 3=Postgrad, 4=PhD |
| Loại hình | `loai_hinh` | Contract type: `mời giảng` (guest lecture) or `đồ án` (thesis) |
| Mời giảng | — | Guest lecturer engagement |
| Đồ án | — | Thesis/project supervision engagement |
| Đợt | `Dot` | Batch/wave number within a semester |
| Kỳ học | `KiHoc` | Semester number |
| Năm học | `NamHoc`, `nam_hoc` | Academic year in format `YYYY - YYYY` |

---

## Organizational Terms

| Vietnamese Term | Code Alias | Meaning |
|----------------|-----------|---------|
| Khoa | `Khoa`, `maKhoa`, `MaPhongBan` | Faculty (academic department) — `phongban.isKhoa = 1` |
| Phòng ban | `phongban` | All departments (includes non-faculty units) |
| Chủ nhiệm khoa | `chuNhiemKhoa` | Head of Faculty |
| BGĐ & PHÒNG | `NON_KHOA_GROUP_CODE` | Non-faculty staff group (management + administrative offices) |
| Giảng viên | `giangVien`, `GiangVien` | Lecturer |
| GV mời | `gvmoi` | Guest lecturer (external) |
| Mã số cán bộ | `MaSoCanBo` | Staff identification code |

---

## Technical Abbreviations

| Abbreviation | Expansion | Meaning |
|-------------|-----------|---------|
| SDO | Standardized Data Object | Per-lecturer aggregated workload object produced by `getAtomicSDO()` |
| LNQC | Lớp Ngoài Quy Chuẩn | Non-standard classes |
| KTHP | Kết Thúc Học Phần | End-of-module exam work |
| DATN | Đồ Án Tốt Nghiệp | Graduation thesis/project |
| HDTQ | Hướng Dẫn Tham Quan | Field-trip guidance |
| NCKH | Nghiên Cứu Khoa Học | Scientific research |
| TKB | Thời Khóa Biểu | Course timetable (external import source) |
| DM | Định Mức | Quota |
| HSL | Hệ Số Lương | Salary coefficient |
| STK | Số Tài Khoản | Bank account number |

---

## Data Object Shapes

### Atomic SDO (per-lecturer aggregated object)

Produced by `tongHop.service.js → getAtomicSDO()` via `summary.mapper.js → toAtomicSDO()`.

```
{
  id_User, giangVien, maKhoa, khoa, isKhoa, chucVu,
  soTaiKhoan, nganHang, lyDoMienGiam, phanTramMienGiam, hsl, luong,
  soTietGiangDay,   // from giangday (no approval gate)
  soTietNgoaiQC,    // from vg_lop_ngoai_quy_chuan (khoa_duyet=1 only)
  soTietKTHP,       // from vg_coi_cham_ra_de (khoa_duyet=1 only)
  soTietDoAn,       // from exportdoantotnghiep (isMoiGiang=0 only)
  soTietHDTQ,       // from vg_huong_dan_tham_quan_thuc_te (khoa_duyet=1 only)
  soTietNCKH,       // injected from NCKH module total
  tongThucHien,     // sum of all 5 teaching sources
  mienGiam,         // quota × (phanTramMienGiam / 100)
  dinhMucSauMienGiam,
  thieuTietGiangDay,
  thieuNCKH,
  tongVuot,         // overtime hours (may be zero)
  thanhToan,        // payable hours (capped at dinhMucSauMienGiam)
  dinhMucChuan,
  nam_hoc,
  tableF,           // breakdown by training system (5 rows)
  breakdown         // detailed per-source breakdown
}
```
