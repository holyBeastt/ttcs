# 07 — Assertion matrix và tiêu chí pass/fail

Một run chỉ được đánh dấu **PASS** khi tất cả lớp assertion dưới đây đạt. `200` hoặc dialog thành công không đủ nếu DB/snapshot/file không đúng.

## 1. Nhập liệu và persistence

| ID | Assertion | Evidence bắt buộc | Fail khi |
|---|---|---|---|
| IN-01 | NCKH form validate theo rendered form | Snapshot form, request/response | Thiếu field bắt buộc vẫn tạo hoặc lỗi SQL mơ hồ |
| IN-02 | Đủ 8 type NCKH | Type matrix + record IDs | Thiếu bất kỳ type nào |
| IN-03 | Cùng năm học | Payload + GET/DB của mọi nguồn | Có record khác `NamHoc` |
| IN-04 | Tối thiểu 2 lecturer cơ hữu/2 khoa | `id_User`, `MaPhongBan`, `phongban.isKhoa=1` | Dùng guest hoặc chỉ một khoa |
| IN-05 | Participant allocation chính xác | `nckh_chung` ↔ `nckh_so_tiet` | Tổng master khác tổng participant ngoài delta được code cho phép |
| IN-06 | CRUD đúng target | Request + GET/404 | Sửa/xóa nhầm record hoặc row vẫn tồn tại sau DELETE |
| IN-07 | Mapping lecturer Vượt Giờ | Official row `id_User` + employee GET | `id_User=null`, map username, hoặc map nhầm khoa |
| IN-08 | Direct input đã vào nguồn aggregation | Confirm response + GET source table | Chỉ còn ở draft/staging nhưng bị tính như projected |

## 2. Approval và quyền

| ID | Assertion | Evidence bắt buộc | Fail khi |
|---|---|---|---|
| AP-01 | NCKH Khoa duyệt trước Viện | Timestamps/request sequence + flags | Viện duyệt khi Khoa chưa duyệt hoặc UI gửi stale `0` |
| AP-02 | NCKH official predicate | Stats query/result + flags | Record pending/Khoa-only xuất hiện official |
| AP-03 | LNQC/HDTQ cấp hai là Đào tạo | Role/profile + `dao_tao_duyet` | Duyệt sai phòng hoặc thiếu cấp |
| AP-04 | KTHP cấp hai là Khảo thí | Role/profile + `khao_thi_duyet` | Duyệt sai phòng hoặc chỉ duyệt child không duyệt parent |
| AP-05 | Vượt Giờ official predicate | Before/after stats by raw ID | Pending vẫn được tính official |
| AP-06 | VP duyệt từng khoa | Pre-check/approve/status per `MaPhongBan` | Chỉ duyệt một cờ chung hoặc bỏ qua khoa thật |
| AP-07 | Không tính phòng `isKhoa=0` vào prerequisite | `phongban.isKhoa` + lock check | Dùng tổng dòng UI làm mẫu số |
| AP-08 | Approval không thay đổi input | GET before/after | Số tiết/lecturer/năm bị đổi khi chỉ duyệt |

## 3. Cross-module NCKH → Vượt Giờ

| ID | Assertion | Evidence bắt buộc | Fail khi |
|---|---|---|---|
| XM-01 | NCKH chạy hoàn toàn trước Vượt Giờ | Ordered stage log | Có mutation Vượt Giờ trước NCKH official |
| XM-02 | NCKH cùng năm học | Năm trong stats/SDO | `soTietNCKH` lấy nhầm năm |
| XM-03 | Vượt Giờ đọc NCKH official | SDO raw/stats scope | Sử dụng pending/preview NCKH để kết luận official |
| XM-04 | Có tác động chặn trần quan sát được | `soTietNCKH`, `thieuNCKH`, expected policy | Chỉ có `soTietNCKH=0` mà vẫn tuyên bố pass |
| XM-05 | Chỉ cơ hữu được tính | `MoiGiang`, `isMoiGiang`, `id_User` | Guest row lọt vào SDO cơ hữu |
| XM-06 | Tách source projected/official | Source table + raw ID | Dùng `quychuan` như official hoặc draft như projected |

## 4. Lock, snapshot, statistics

| ID | Assertion | Evidence bắt buộc | Fail khi |
|---|---|---|---|
| LK-01 | Năm hợp lệ và chưa lock | Pre-check response | Lock năm sai format hoặc đã lock |
| LK-02 | Direct data đủ cấp hai | Pre-lock check | Thiếu một row pending nhưng lock vẫn thành công |
| LK-03 | VP đủ các khoa thật | Approval status + `isKhoa=1` | Bỏ sót khoa thật |
| LK-04 | Snapshot không rỗng | Lock response + snapshot count | `totalGV=0` hoặc snapshot không có lecturer test |
| LK-05 | Snapshot giữ raw/SDO/NCKH | Parse `chi_tiet` + scalar totals | Chỉ có tổng số, mất raw hoặc `soTietNCKH` |
| LK-06 | Versioning đúng | `version`, `is_latest` | Không tăng version hoặc có nhiều latest không hợp lệ |
| LK-07 | Stats đọc snapshot sau lock | Network/source evidence | Stats re-query live khiến số liệu khác snapshot |
| LK-08 | Không mutate sau lock | API status + lock flag | Mutation vẫn thành công hoặc cleanup SQL bypass |
| LK-09 | Stats bị chặn trước lock | HTTP response của `/tong-hop/khoa` và endpoint snapshot stats | Pre-lock stats trả `200` hoặc đọc dữ liệu live thay vì `403` |

## 5. Export

| ID | Assertion | Evidence bắt buộc | Fail khi |
|---|---|---|---|
| EX-01 | NCKH export official đúng năm | Status, MIME, filename, bytes | File rỗng/sai năm/sai scope |
| EX-02 | Vượt Giờ export cá nhân | Status, MIME, filename, bytes | Không có lecturer test hoặc số liệu khác snapshot |
| EX-03 | Vượt Giờ export tổng hợp | Status, MIME, filename, bytes | Thiếu khoa hoặc gom sai `BGĐ&PHONG` |
| EX-04 | Nội dung file khớp stats | Parse workbook hoặc kiểm tra sheet/row/tổng | Chỉ xác nhận browser download |

## 6. Equality cuối run

So sánh theo `(NamHoc, id_User, khoa)` ở lecturer, khoa và tổng toàn hệ thống:

```text
projected == official/snapshot
```

Các trường bắt buộc:

```text
soTietGiangDay
soTietNgoaiQC
soTietKTHP
soTietDoAn
soTietHDTQ
soTietNCKH
tongThucHien
thieuNCKH
tongVuot
thanhToan
```

Nếu chưa bằng, report phải có danh sách raw record gây lệch và phân loại một trong các nguyên nhân: pending approval, chưa materialize, khác kỳ, khác năm, lecturer mapping, guest lecturer lọt vào query, snapshot cũ, hoặc defect tính toán.

## 7. Phân loại kết quả

- **PASS:** tất cả assertion pass; equality đạt khi điều kiện all-approved/materialized đã thỏa; cleanup/rollback có evidence.
- **PASS WITH BLOCKER:** pipeline tính toán đã chứng minh được nhưng cleanup/
  rollback nghiệp vụ sau lock bị chặn bởi thiếu public contract. Với E2E test
  environment, chỉ coi cleanup đạt khi script marker-scoped đã chạy, manifest
  pre-delete đã lưu và GET xác nhận lock/snapshot test không còn.
- **FAIL:** bất kỳ assertion nghiệp vụ nào sai, đặc biệt NCKH chưa official, khác năm, thiếu cấp duyệt, SDO thiếu NCKH, hoặc equality không giải thích được.
- **NOT APPLICABLE:** source fixture không có loại workload; phải ghi lý do và không tính là coverage pass.
