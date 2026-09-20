# 05 — Role, browser profile, backup và rollback

## 1. Actor/profile matrix

Mỗi actor phải chạy trong browser context riêng (`isolatedContext` riêng), kể cả khi cùng một người đang thao tác nhiều màn hình. Không chia sẻ cookie/session giữa các agent.

| Profile logic | Actor/role | Công việc |
|---|---|---|
| `nckh-gv-a`, `nckh-gv-b`, `nckh-gv-c...` | Các giảng viên cơ hữu | Nhập, sửa, xem NCKH trong phạm vi; mỗi tài khoản/profile được cô lập. |
| `nckh-khoa-1` | Lãnh đạo Khoa 1 | Duyệt NCKH và Vượt Giờ của Khoa 1. |
| `nckh-khoa-2` | Lãnh đạo Khoa 2 | Duyệt NCKH và Vượt Giờ của Khoa 2. |
| `nckh-vien` | Viện NCKH | Duyệt Viện, stats/export NCKH. |
| `vg-daotao` | Đào tạo | Duyệt LNQC/HDTQ cấp hai. |
| `vg-khaothi` | Khảo thí | Duyệt KTHP cấp hai. |
| `vg-vp` | Văn phòng | Pre-check, duyệt tổng hợp, lock/snapshot, stats/export. |

Account thực tế được map tại runtime; không hard-code password trong tài liệu. Nếu một account có nhiều quyền, vẫn dùng profile riêng theo actor để evidence thể hiện đúng ranh giới quyền.

Mức tối thiểu là hai giảng viên thuộc hai khoa; nếu môi trường có đủ account,
run chuẩn nên dùng từ ba giảng viên trở lên để phủ thêm lecturer mapping,
participant và điều kiện cơ hữu.

## 2. An toàn tài khoản và dữ liệu

- Credentials chỉ tồn tại trong phiên chạy.
- Không ghi username/password vào Markdown, JSON evidence, screenshot filename hay commit.
- Không reset password/role hoặc sửa DB khi chưa xác định đúng account target và phạm vi ảnh hưởng.
- Destructive action (DELETE, hạ duyệt, rollback) phải chạy ở primary thread, sau khi xác minh ID/năm/khoa.
- Mọi backup/fixture thật lưu ngoài repo, ví dụ `/tmp/ttcs-e2e-backup-<timestamp>.json`.

## 3. Mời Giảng Kỳ 2 — khi nào cần backup

Trong **kịch bản full được khuyến nghị**, luôn backup trước khi duyệt/lưu Kỳ 2 để có thể chứng minh projected và official toàn năm đồng nhất:

- Kỳ 1 đã duyệt/lưu;
- Kỳ 2 còn pending hoặc chưa `DaLuu=1`;
- thao tác có thể đổi approval flags, `DaLuu`, hoặc insert vào `giangday`/`hopdonggvmoi`.

Nếu chỉ chạy nhánh kiểm tra pending/partial và chấp nhận Kỳ 2 là blocker/fixture pending, vẫn phải ghi rõ trong run log; nhánh đó không được gọi là full E2E pass và không được lờ đi chênh lệch.

### Baseline đã quan sát (read-only, 10/09/2026)

Đây là evidence tại thời điểm viết tài liệu, không thay thế bước re-query trước run:

| Phạm vi | `quychuan` | Khoa duyệt | Đào tạo duyệt | Tài chính duyệt | `DaLuu` | official `giangday`/`hopdonggvmoi` |
|---|---:|---:|---:|---:|---:|---:|
| `NamHoc=2025 - 2026`, `KiHoc=2`, `Dot=1` | 511 | 511 | 511 | 0 | 0 | Chưa có row tương ứng |

Kỳ 1 cùng năm đã có dữ liệu official/materialized. Vì vậy full E2E chuẩn phải backup và xử lý Kỳ 2 trước khi dùng năm này để assert equality.

## 4. Phạm vi backup bắt buộc

Định danh backup bằng:

```text
NamHoc + Dot + KiHoc=2 + khoa + lecturer + timestamp
```

Lưu tối thiểu:

1. **`quychuan` Kỳ 2:** toàn bộ row trong phạm vi năm/đợt/kỳ, gồm ID, khoa, lớp, giảng viên text, `MoiGiang`, hệ đào tạo, LL/QC, ngày, ba cờ `KhoaDuyet`, `DaoTaoDuyet`, `TaiChinhDuyet`, `DaLuu`, version và các field nghiệp vụ khác.
2. **`giangday` cùng phạm vi:** tất cả official rows đang tồn tại (kể cả zero rows phải ghi count `0`).
3. **`hopdonggvmoi` cùng phạm vi:** tất cả rows liên quan (kể cả zero rows).
4. **Bảng upstream nếu UI/API chạm tới:** `tam`, `course_schedule_details` hoặc bảng khác được request evidence xác định.
5. **Baseline hệ thống:** lock status, snapshot/version, thời điểm backup, actor/profile sẽ thao tác.

Không backup bằng `SELECT *` không có predicate định danh; phải lưu query/filter và số row trả về.

## 5. Manifest và verify backup

Manifest tối thiểu:

```json
{
  "createdAt": "2026-09-10T00:00:00+07:00",
  "namHoc": "YYYY - YYYY",
  "dot": "1",
  "kiHoc": "2",
  "scope": {"khoa": ["..."], "idUser": [0]},
  "tables": {
    "quychuan": {"rowCount": 0, "sha256": "..."},
    "giangday": {"rowCount": 0, "sha256": "..."},
    "hopdonggvmoi": {"rowCount": 0, "sha256": "..."}
  },
  "lockStatusBefore": {},
  "snapshotVersionBefore": null
}
```

Sau khi ghi file:

- đọc lại JSON;
- assert row count khớp query lần đầu;
- assert tập ID và approval flags khớp baseline;
- tính và kiểm tra checksum nếu run cần audit;
- ghi path backup vào evidence nhưng không đưa dữ liệu nhạy cảm vào git.

## 5.1 Script backup đã tạo

Script read-only dùng cho baseline là:

```text
scripts/backup-moi-giang-semester.js
```

Chạy backup Kỳ 2, Đợt 1:

```bash
node scripts/backup-moi-giang-semester.js \
  --year "2025 - 2026" \
  --semester 2 \
  --dot 1 \
  --output /tmp/ttcs-e2e-backup-20260910-ki2.json
```

Script:

- mở transaction `REPEATABLE READ` + `READ ONLY` + consistent snapshot;
- chỉ chạy `SELECT`/`SHOW`, không gọi API duyệt/lưu và không `INSERT/UPDATE/DELETE`;
- backup `quychuan`, `giangday`, `hopdonggvmoi`, `exportdoantotnghiep` tham chiếu và audit log phù hợp;
- lưu query, parameters, columns, toàn bộ rows, row count, SHA-256 và first/last row hash;
- ghi manifest có database, năm/kỳ/đợt và checksum toàn bộ artifact.

Baseline đã chạy ngày **10/09/2026**:

```text
output: /tmp/ttcs-e2e-backup-20260910-ki2.json
quychuan: 511
giangday: 0
hopdonggvmoi: 0
exportdoantotnghiep: 180 (reference)
audit log matching: 0
backup SHA-256: 07e0206c2658de3727499390c5ec3afa1154b46be6ed1b01b8890044fce5ab
```

Đây là backup ngoài repo. Trước khi duyệt Kỳ 2 phải chạy lại script với target đã xác minh và lưu path/checksum vào run log; không dùng file cũ nếu baseline đã thay đổi.

## 6. Duyệt/lưu Kỳ 2 sau backup

1. Chỉ bắt đầu sau khi manifest đã verify.
2. Dùng đúng UI/API nghiệp vụ cho Khoa → Đào tạo/Tài chính/Văn phòng theo workflow Mời Giảng hiện hành.
3. Sau mỗi cấp: GET/DB assert cờ vừa đổi và cờ cũ không bị reset.
4. Gọi thao tác materialize/lưu (`submitData2` hoặc UI tương ứng) tuần tự.
5. Assert `TaiChinhDuyet=1`, `DaLuu=1`, official rows xuất hiện và `id_User`/lecturer mapping hợp lệ.
6. Assert projected nhìn thấy Kỳ 1 + Kỳ 2 và official cũng nhìn thấy Kỳ 1 + Kỳ 2.

## 7. Rollback

### 7.1 Ưu tiên contract nghiệp vụ

Rollback phải dùng UI/API contract được source hỗ trợ (ví dụ thao tác bỏ lưu Mời Giảng) và sau đó đối chiếu với backup. Không tự viết `UPDATE`/`DELETE` SQL để mô phỏng rollback.

### 7.2 Điều kiện rollback đạt

- `quychuan` Kỳ 2 giống backup về row count, ID, field và approval flags;
- `giangday`/`hopdonggvmoi` Kỳ 2 trở về đúng baseline;
- Kỳ 1, năm khác, NCKH và nguồn Vượt Giờ không bị ảnh hưởng;
- GET UI/API trả đúng trạng thái trước backup;
- không có snapshot mới giữ dữ liệu đã rollback mà run lại không ghi nhận.

### 7.3 Dọn lock/snapshot sau E2E trên môi trường test

Sản phẩm hiện **không có public unlock route**. Theo quyết định phục vụ E2E,
môi trường test được phép dùng một script SQL hành chính riêng để xóa lock và
snapshot sau khi đã lấy đủ evidence. Đây không phải rollback nghiệp vụ và không
được chạy trên production.

Trước khi gọi lock, request phải truyền `ghiChu` là marker duy nhất của run,
ví dụ:

```text
E2E-NCKH-VG-20260910-R01
```

Lock row và mọi row `vg_so_tiet_tong_hop` do lần lock đó tạo sẽ giữ marker này.
Script cleanup bắt buộc kiểm tra:

- đúng `NamHoc`;
- đúng một lock row;
- `vg_khoa_du_lieu.ghi_chu` khớp marker;
- tất cả snapshot row của năm khớp marker, không có row baseline khác marker;
- tùy chọn `lock-id` khớp ID đã ghi trong evidence;
- đã ghi manifest các row trước khi xóa.

Script:

```text
scripts/clear-vuotgio-snapshot-lock.js
```

Dry-run (không xóa):

```bash
node scripts/clear-vuotgio-snapshot-lock.js \
  --year "2025 - 2026" \
  --marker "E2E-NCKH-VG-20260910-R01"
```

Thực thi chỉ khi đã kiểm tra evidence và muốn clear fixture:

```bash
node scripts/clear-vuotgio-snapshot-lock.js \
  --year "2025 - 2026" \
  --confirm-year "2025 - 2026" \
  --marker "E2E-NCKH-VG-20260910-R01" \
  --confirm-marker "E2E-NCKH-VG-20260910-R01" \
  --apply \
  --lock-id <LOCK_ID> \
  --output /tmp/vuotgio-snapshot-clear-20260910-r01.json
```

Thứ tự SQL trong transaction là:

```sql
DELETE FROM vg_so_tiet_tong_hop
 WHERE nam_hoc = ? AND ghi_chu = ?;
DELETE FROM vg_khoa_du_lieu
 WHERE nam_hoc = ? AND ghi_chu = ?;
```

Sau commit phải xác nhận không còn lock/snapshot của marker và kết quả phải có
`verifiedUnlocked=true`. Script **không**
xóa `nckh_*`, các bảng nguồn Vượt Giờ hoặc `vg_duyet_tong_hop`; các fixture đó
phải được cleanup theo ID manifest bằng UI/API nghiệp vụ trước hoặc sau bước
này theo đúng thứ tự khóa dữ liệu.

## 8. Defect/regression cần theo dõi

- Invited row lọt vào official SDO cơ hữu do detail query thiếu filter `MoiGiang=0`.
- `tongHop.service.js` gọi NCKH stats mà không truyền scope ở cả nhánh projected/official; cần kiểm tra projected có vô tình đọc OFFICIAL hay không.
- `getGiangDayByIdUser()`/`getGiangDayByIds()` trong `tongHop.repo.js` chưa lọc `gd.MoiGiang=0`; cần kiểm tra lệch giữa aggregate và detail.
- Batch approval gửi payload stale làm tụt cờ hoặc update nhầm record.
- API approval cấp hai yêu cầu `NamHoc` nhưng UI không gửi.
- UI liệt kê phòng `isKhoa=0` khiến người dùng tưởng lock còn thiếu.
- Confirm LNQC chấp nhận lecturer không map, tạo `id_user=null`.
- Lock không tạo snapshot khi không có SDO map được.
- Source SDO được tính bằng connection riêng với connection transaction lock; cần ghi nhận nguy cơ race nếu source bị mutate đồng thời.
- UI liệt kê cả phòng `isKhoa=0`, trong khi điều kiện lock chỉ bắt buộc các khoa `isKhoa=1`; cần đối chiếu approval summary với lock pre-check.
- NCKH vẫn có thể bị sửa sau khi Vượt Giờ đã lock nếu route NCKH không gọi `checkDataLock`; phải kiểm tra và ghi defect nếu reproduce.
