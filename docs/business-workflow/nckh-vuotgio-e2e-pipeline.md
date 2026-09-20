# NCKH + Vượt Giờ E2E Pipeline — Historical Run Log

> **Important:** File này là nhật ký của các lần chạy kỹ thuật trước đây, không phải một business E2E pass hoàn chỉnh. Run ngày **10/09/2026** dùng NCKH `2025 - 2026` nhưng Vượt Giờ `2026 - 2027`, vì vậy **không đáp ứng** bất biến “NCKH official cùng năm học phải chạy trước và làm đầu vào Vượt Giờ”. Không dùng các số liệu trong phần evidence cũ để kết luận nghiệp vụ đã pass.
>
> Chuẩn nghiệp vụ và runbook mới nằm tại thư mục [`nckh-vuotgio/`](./nckh-vuotgio/). Đọc [`nckh-vuotgio/README.md`](./nckh-vuotgio/README.md) trước khi chạy lại.

> **Source-of-truth status:** Reconciled against the current source and the MCP Chrome DevTools run on **2026-09-10**. When this document conflicts with runtime behavior, the current source code and a new verified run are authoritative.

> **Run decision update (2026-09-10):** Được phép khóa năm học để kiểm tra thống kê/export. Sau khi chụp đủ evidence, được phép clear `vg_so_tiet_tong_hop` và mở khóa bằng SQL hành chính thông qua script marker-scoped; không chạy trên production. Có thể dùng hơn hai tài khoản giảng viên, nhưng mỗi actor/agent phải có profile MCP riêng. Các defect/limitation chỉ ghi nhận trong log để kiểm tra, chưa sửa business code trong run này.

Tài liệu này ghi lại cách chạy một vòng kiểm thử end-to-end cho hai phân hệ **NCKH V3** và **Vượt Giờ V2**: nhập dữ liệu → duyệt → khóa năm học/snapshot → thống kê → xuất Excel. Đây là runbook và evidence log, không phải fixture dữ liệu cố định.

## 1. Mục tiêu và phạm vi

### 1.1 Mục tiêu

Xác minh rằng:

```text
NCKH input
  → Khoa duyệt + Viện duyệt
  → NCKH official statistics/export

Vượt Giờ input
  → Khoa duyệt + Đào tạo/Khảo thí duyệt
  → VP duyệt tổng hợp từng khoa
  → khóa năm học + snapshot
  → thống kê khoa
  → Excel kê khai + Excel tổng hợp
```

Vượt Giờ gọi NCKH theo **official scope**, vì vậy một record NCKH chỉ được tính vào SDO khi cả `khoa_duyet=1` và `vien_nc_duyet=1`.

### 1.2 Phạm vi của run ngày 10/09/2026

| Phân hệ | Năm học dùng trong run | Kết quả |
|---|---|---|
| NCKH V3 | `2025 - 2026` | Tạo, duyệt, thống kê official, xuất Excel, cleanup thành công |
| Vượt Giờ V2 | `2026 - 2027` | Tạo, duyệt, VP tổng hợp, lock/snapshot, thống kê, xuất Excel thành công |

Không dùng cùng một năm học cho hai phân hệ ở run này: năm `2025 - 2026` của Vượt Giờ có nhiều dữ liệu KTHP/LNQC thật chưa đủ duyệt. Vì vậy snapshot Vượt Giờ cuối có `tong_so_tiet_nckh=0`; run này chứng minh được pipeline của từng phân hệ, nhưng **chưa chứng minh NCKH làm tăng SDO trong cùng một snapshot**.

### 1.3 Ngoài phạm vi

- Chưa chạy bước tài chính/payment.
- Không sửa source application trong lúc chạy.
- Không dùng SQL/DB để bypass prerequisite hoặc làm test xanh giả. Riêng sau khi đã thu đủ evidence, môi trường E2E được owner cho phép dùng script marker-scoped để xóa lock/snapshot test và mở khóa hành chính.
- Không ghi password vào tài liệu, log hoặc commit.

## 2. Quy tắc bất biến của pipeline

Đây là phần bắt buộc khi điều phối agent hoặc chạy lại bằng MCP:

1. **Một luồng mutation tuần tự:** stage trước phải hoàn tất và có GET/response xác minh trước khi stage sau bắt đầu.
2. **Mỗi agent một browser context riêng:** dùng `isolatedContext` riêng; không dùng chung cookie/session giữa agent.
3. **Không chạy song song các POST/PATCH/DELETE ảnh hưởng cùng năm học hoặc cùng record.** Read-only GET có thể chạy song song khi không tạo race, nhưng log vẫn phải theo thứ tự.
4. **POST/PATCH chỉ sau precondition:** ví dụ chỉ VP duyệt khoa sau khi `GET /tong-hop/duyet-kiem-tra` trả `passed:true`.
5. **Sau mỗi mutation phải GET lại:** kiểm tra ID, năm học, khoa, trạng thái duyệt và các giá trị tính toán.
6. **Không export trước lock:** thống kê khoa và export Vượt Giờ chính thức phải đọc snapshot; năm chưa khóa phải bị từ chối `403`.
7. **Xác định target trước khi xóa:** kiểm tra title + ID + năm học; không bulk-delete dữ liệu thật.
8. **Phân biệt official/live và snapshot:** live aggregation không thay thế snapshot sau lock.
9. **Không tin dialog UI một mình:** phải có HTTP status và dữ liệu persisted.
10. **Dừng khi blocker lặp lại:** ghi exact status/body, không bypass bằng DB trực tiếp.

## 3. Môi trường và profile

### 3.1 Runtime

- App: `http://localhost:3000`
- Công cụ: MCP Chrome DevTools
- Ngày chạy: **2026-09-10** (Asia/Ho_Chi_Minh)
- Browser evidence cần giữ: URL, page ID, isolated context, request URL, HTTP status, response/body tóm tắt, response headers khi download.

### 3.2 Profile matrix

| Context/profile | Vai trò dùng trong run | Phạm vi thao tác |
|---|---|---|
| `root-main` | Trợ lý Viện/NC | NCKH list/stats và duyệt Viện |
| `root-khoa` | Lãnh đạo khoa CNTT | NCKH duyệt Khoa; kiểm tra dữ liệu khoa |
| `agent-vuotgio-data-entry` | Lãnh đạo khoa CNTT | Vượt Giờ draft → official → Khoa duyệt |
| `agent-vuotgio-prereq` | Trợ lý Đào tạo | Vượt Giờ cấp Đào tạo |
| `agent-stats-export` | Lãnh đạo phòng VP | prerequisite, VP duyệt, lock, snapshot, stats, export |

Tên đăng nhập/mật khẩu là secret runtime; **không ghi vào repo**. Khi cấp lại quyền, chỉ cần map account vào đúng vai trò và isolated context tương ứng.

## 4. Pipeline chuẩn cần chạy

### Stage 0 — Chuẩn bị và baseline

1. Mở app bằng MCP.
2. Login từng vai trò trong context riêng.
3. Chọn năm học test chưa bị khóa.
4. Nếu kịch bản có đụng tới Mời Giảng Kỳ 2, phải backup dữ liệu Kỳ 2 trước mọi thao tác duyệt/lưu hoặc mutation; ghi manifest backup và owner có quyền phục hồi.
5. Ghi baseline:
   - `GET /v2/vuotgio/trang-thai-khoa?namHoc=...`
   - `GET /v2/vuotgio/tong-hop/duyet-trang-thai?namHoc=...`
   - `GET /v2/vuotgio/snapshot?namHoc=...`
6. Với năm đã có dữ liệu thật chưa đủ duyệt, dừng nhánh đó; không ép lock.

### Stage 1 — NCKH tạo record

1. Dùng form `/v3/nckh/them-moi-nckh`.
2. Chọn một loại NCKH hợp lệ, năm học hợp lệ, phân loại hợp lệ.
3. Thêm participant nội bộ đã map `nhanvien.id_User`.
4. Gửi form và bắt request create.
5. Expected: HTTP `201`.
6. Ghi `record ID`, title unique, type, participant, tổng tiết.

### Stage 2 — NCKH list và approval

1. `GET /v3/nckh/records?namHoc=...` hoặc mở `/v3/nckh/xem-chung`.
2. Xác minh title, loại, participant, tổng tiết.
3. Khoa duyệt bằng đúng role/context:

   ```http
   PATCH /v3/nckh/records/:id/khoa-duyet
   {"khoaDuyet":1}
   ```

4. Viện duyệt bằng đúng role/context:

   ```http
   PATCH /v3/nckh/records/:id/vien-duyet
   {"vienNcDuyet":1}
   ```

5. GET `/v3/nckh/records/:id` sau từng PATCH; expected cả hai cờ bằng `1`.
6. Nếu bulk UI gửi payload stale (ví dụ gửi lại cờ `0`), dùng per-record API và ghi lỗi UI riêng; không coi dialog thành công là evidence.

### Stage 3 — NCKH official statistics/export

1. Mở `/v3/nckh/thong-ke`.
2. Chọn đúng năm học và khoa/phạm vi.
3. Xác minh record test xuất hiện trong bảng và tổng tiết đúng.
4. Gọi/nắm request export:

   ```http
   GET /v3/nckh/export/stats/giang-vien?namHoc=...&khoaId=ALL&keyword=
   ```

5. Expected: HTTP `200`, MIME `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `Content-Disposition` có filename `.xlsx`.

### Stage 4 — Vượt Giờ nhập LNQC

1. Dùng `/v2/vuotgio/them-lop-ngoai-qc`.
2. Tạo draft với title/code unique, `dot`, `ki_hoc`, `nam_hoc`, khoa và lecturer.
3. **Lecturer phải là exact `HoTen` từ** `/v2/vuotgio/api/teachers?Khoa=CNTT`; không dùng username login. Nếu không map được, `confirm` có thể tạo official row với `id_user=null`.
4. Expected create draft HTTP `200`; ghi draft ID.

### Stage 5 — Ban hành và duyệt hai cấp

1. Ban hành draft:

   ```http
   POST /v2/vuotgio/lop-ngoai-quy-chuan/confirm
   ```

2. GET official list theo năm/khoa; ghi official ID và `id_user`.
3. Khoa duyệt đúng record.
4. Đào tạo (hoặc Khảo thí đối với KTHP) duyệt đúng record. Payload LNQC phải chứa `NamHoc` để `checkDataLock` xác định năm:

   ```json
   [{
     "ID": 258,
     "KhoaDuyet": 1,
     "DaoTaoDuyet": 1,
     "NamHoc": "2026 - 2027"
   }]
   ```

5. GET lại record; expected `KhoaDuyet=1`, `DaoTaoDuyet=1`, `id_user` khác null.

### Stage 6 — VP kiểm tra và duyệt tổng hợp

Với mỗi khoa, chạy **tuần tự**:

```http
GET  /v2/vuotgio/tong-hop/duyet-kiem-tra?namHoc=...&khoa=CNTT
POST /v2/vuotgio/tong-hop/duyet-khoa
     {"namHoc":"...","khoa":"CNTT","ghiChu":"E2E ..."}
GET  /v2/vuotgio/tong-hop/duyet-trang-thai?namHoc=...
```

Chỉ POST khi response đầu có `passed:true`. Danh sách trạng thái có thể chứa phòng/ban ngoài `phongban.isKhoa=1`; khi đánh giá điều kiện lock phải dùng summary theo khoa thật (`isKhoa=1`), không lấy nguyên số dòng UI làm mẫu số.

### Stage 7 — Khóa năm và snapshot

Pre-check:

```http
GET /v2/vuotgio/trang-thai-khoa?namHoc=...
```

Lock bằng role lãnh đạo phòng VP:

```http
POST /v2/vuotgio/tong-hop/khoa-du-lieu
{"namHoc":"2026 - 2027","ghiChu":"E2E ..."}
```

Expected:

- HTTP `200`
- `success=true`
- `stats.version >= 1`
- `stats.totalGV > 0`
- lock status `locked=true`
- snapshot `total > 0`
- snapshot có `id_User` của lecturer test và raw record input.

Nếu nhận `400 Không tìm thấy dữ liệu giảng viên nào để chốt`, kiểm tra official rows có `id_user=null` hoặc không có workload map được; không retry mù.

### Stage 8 — Thống kê và export Vượt Giờ

Thống kê chỉ chạy sau lock. Trước lock, gọi các endpoint dưới đây để xác nhận guard trả HTTP `403`; không coi dữ liệu live/prelock là thống kê chính thức:

```http
GET /v2/vuotgio/tong-hop/khoa?namHoc=...
GET /v2/vuotgio/xuat-file/excel?namHoc=...&khoa=CNTT&giangVien=8
GET /v2/vuotgio/xuat-file/tong-hop?namHoc=...
```

Expected pre-lock: cả ba request bị từ chối `403`.

Sau khi lock, gọi thống kê:

```http
GET /v2/vuotgio/tong-hop/khoa?namHoc=...
GET /v2/vuotgio/tong-hop/giang-vien-snapshot?namHoc=...
```

Export:

```http
GET /v2/vuotgio/xuat-file/excel?namHoc=...&khoa=CNTT&giangVien=8
GET /v2/vuotgio/xuat-file/tong-hop?namHoc=...
```

Expected cho mỗi file sau lock: HTTP `200`, MIME XLSX, filename `.xlsx`, byte length > 0. Ghi `Content-Disposition`; `net::ERR_ABORTED` sau browser download không phải failure nếu response headers/status đã xác nhận file.

### Stage 9 — Cleanup và dừng

1. NCKH: verify exact title/ID → revoke Viện → revoke Khoa → DELETE → GET phải `404`.
2. Vượt Giờ chưa khóa: chỉ revoke/delete nếu đúng role có quyền và middleware cho phép.
3. Vượt Giờ đã khóa: trong môi trường E2E được owner cho phép, dùng
   `scripts/clear-vuotgio-snapshot-lock.js` để xóa snapshot và lock bằng SQL
   hành chính theo đúng `NamHoc + marker`; không dùng thao tác này như rollback
   nghiệp vụ và không chạy trên production.
4. Nếu đã mutation Mời Giảng Kỳ 2, rollback phải do owner/account có quyền thực hiện theo contract phục hồi đã xác minh; không thay bằng SQL hoặc suy đoán từ fixture.
5. Chỉ dùng marker cleanup cho snapshot/lock trong môi trường E2E được ủy quyền, sau khi lưu manifest pre-delete và xác minh đúng `ghiChu`/run marker.
6. Đóng các browser pages/contexts tạm thời.
7. Ghi run summary, defects và evidence.

## 5. Evidence log của run ngày 10/09/2026

### 5.1 NCKH

| Bước | Target/evidence | HTTP | Kết quả |
|---|---|---:|---|
| Create | NCKH ID `135`, title `E2E NCKH 20260910 1153` | 201 | Tạo thành công, 400 tiết |
| List | `/v3/nckh/records` | 200 | Title, participant Lê Đức Thuận, 400 tiết xuất hiện |
| Khoa approval | `PATCH .../135/khoa-duyet` | 200 | `khoaDuyet=1` |
| Viện approval | `PATCH .../135/vien-duyet` | 200 | `vienNcDuyet=1` |
| Official stats | `/v3/nckh/thong-ke` | 200 | 7 GV, 21 công trình, 2366,67 tiết |
| Export | `/v3/nckh/export/stats/giang-vien` | 200 | XLSX `ThongKe_NCKH_GiangVien_2025 - 2026.xlsx` |
| Cleanup | revoke → DELETE `/v3/nckh/records/135` | 200/404 | Đã xóa, GET sau xóa 404 |
| R01 create/approval | NCKH IDs `136–143`, đủ 8 loại, 2 khoa (`ATTT`, `ĐTVM`), 2 lecturer chính + participant | 201/200 | Tất cả từng có `khoa_duyet=1`, `vien_nc_duyet=1`; preview/official có record; Vượt Giờ preview đọc được `soTietNCKH` 29 và 11,67 cho lecturer test |
| R01 cleanup | IDs `136–143`: revoke Viện → revoke Khoa → DELETE | 200/404 | Đã xóa theo route; DB verify `nckh_chung=0`, `nckh_so_tiet=0` cho marker |

### 5.2 Vượt Giờ baseline và failed attempt

| Bước | Target/evidence | HTTP | Kết quả |
|---|---|---:|---|
| Baseline `2025 - 2026` | lock/status/snapshot | 200 | lock false, snapshot 0, approval chỉ 2/12; nhiều prerequisite fail |
| Draft cũ | Draft `9503` → official `256` | 200 | Tạo được, nhưng các field tính toán bằng 0; đủ kiểm tra trạng thái approval |
| Đào tạo lần 1 | batch approval thiếu `NamHoc` | 400 | Middleware không xác định được năm học |
| Đào tạo retry | batch approval ID256 có `NamHoc` | 200 | `KhoaDuyet=1`, `DaoTaoDuyet=1` |
| Draft 2026–2027 lỗi mapping | Draft `9504` → official `257` | 200 | Lecturer dùng username, official `id_user=null` |
| Lock lỗi | `/tong-hop/khoa-du-lieu` | 400 | `Không tìm thấy dữ liệu giảng viên nào để chốt` |
| Mời Giảng Kỳ 2 approve | `POST /api/approve-contracts` | 200 | `affectedRows=511`; `POST /submitData2` sau đó trả 400 `ER_DUP_ENTRY uk_hop_donggvmoi`; rollback bằng `/api/v1/moi-giang/unsave-all` đã về baseline |
| Pre-check Vượt Giờ cùng năm | `/tong-hop/duyet-kiem-tra` theo khoa | 200/400 | Dữ liệu thật cũ KTHP/LNQC chưa đủ duyệt (ví dụ ATTT 64/64 KTHP, CNTT còn pending); VP approve/lock trả `Chưa đủ điều kiện duyệt/khóa`, không mass-approve dữ liệu thật |

### 5.3 Vượt Giờ recovery và happy path

| Bước | Target/evidence | HTTP | Kết quả |
|---|---|---:|---|
| Revoke CNTT VP | `/tong-hop/huy-duyet-khoa` | 200 | Hủy đúng approval CNTT trước recovery |
| Teacher mapping | `/api/teachers?Khoa=CNTT` | 200 | `Bùi Thu Lâm` → `id_User=8` |
| Draft mapped | Draft `9505`, title `E2E VG 20260910 mapped - Lop ngoai QC` | 200 | `LL=30`, `QC=30` |
| Ban hành | `/lop-ngoai-quy-chuan/confirm` | 200 | Official ID `258`, `id_user=8` |
| Khoa approval | `/batch-approve` | 200 | ID258 được duyệt; UI gửi kèm ID257 nên response báo cập nhật 2 dòng |
| Đào tạo approval | `/batch-approve` ID258 + `NamHoc` | 200 | ID258 đủ hai cấp |
| VP prerequisite | `/tong-hop/duyet-kiem-tra` CNTT | 200 | `passed=true`, `errors=[]` |
| VP approval | `/tong-hop/duyet-khoa` CNTT | 200 | CNTT `van_phong_duyet=1` |
| Lock | `/tong-hop/khoa-du-lieu` | 200 | version 1, `totalGV=1` |
| Snapshot | `/snapshot` + `/snapshot/chi-tiet?idUser=8` | 200 | 1 row; raw ID258; `soTietNgoaiQC=30` |
| Stats | `/tong-hop/khoa` | 200 | CNTT: 1 GV, 30 giờ LNQC, tổng thực hiện 30 |
| Excel cá nhân | `/xuat-file/excel?...giangVien=8` | 200 | `KeKhai_VuotGio_Bùi_Thu_Lâm_2026-2027.xlsx`, 15.565 bytes |
| Excel tổng hợp | `/xuat-file/tong-hop` | 200 | `TongHop_VuotGio_2026-2027.xlsx`, 12.997 bytes |

### 5.4 Cleanup result của run

| Record | Trạng thái cuối | Lý do |
|---|---|---|
| NCKH ID135 | Đã xóa; GET sau xóa trả 404 | Đã revoke Viện → revoke Khoa → DELETE theo đúng thứ tự |
| NCKH IDs136–143 (R01) | Đã xóa; DB verify không còn marker ở `nckh_chung`/`nckh_so_tiet` | Đã revoke Viện → revoke Khoa → DELETE theo route; account/profile dùng tạm đã restore hash gốc |
| Vượt Giờ ID256 (`2025 - 2026`) | Còn lại | Năm chưa khóa nhưng account Trợ lý Đào tạo không có quyền bỏ duyệt cấp Đào tạo sau khi đã duyệt; cần Lãnh đạo phòng Đào tạo/admin |
| Vượt Giờ ID257 (`2026 - 2027`) | Còn lại, `id_user=null` | Historical run giữ lại; từ quyết định 10/09/2026, chỉ được clear bằng marker-scoped SQL script nếu có evidence/marker phù hợp; chưa đụng row này |
| Vượt Giờ ID258 (`2026 - 2027`) | Còn lại, được dùng làm evidence snapshot/export | Năm đã khóa; giữ lại để đối chiếu snapshot ID129 và file Excel |
| R01 Vượt Giờ fixtures `259`, `260`, `1258`, `3` | Đã xóa/cleanup; không còn marker trong source tables | LNQC official/draft, KTHP và HDTQ được tạo để kiểm tra mapping/approval; cleanup theo route/SQL transaction có target ID |
| R01 snapshot dry-run | `/tmp/ttcs-e2e-vuotgio-snapshot-dry-run-20260910-r01.json` | read-only | `2025 - 2026`: `lockCount=0`, `snapshotCount=0`, không có gì bị xóa |

Payment chưa chạy trong run này vì mục tiêu được chốt là thống kê và xuất file.

## 6. Defect/blocker log

| ID | Phát hiện | Phân loại | Evidence | Cách xử lý trong run |
|---|---|---|---|---|
| E2E-01 | NCKH bulk checkbox hiển thị checked/dialog success nhưng request gửi cờ `0` | UI stale-state / approval bug | Network payload `updates[].vienNcDuyet=0,khoaDuyet=0` | Dùng per-record PATCH, ghi defect |
| E2E-02 | LNQC confirm chấp nhận lecturer không map, tạo `id_user=null` | Data-integrity validation gap | Official ID257 `id_user=null`; lock 400 | Tạo lại với exact HoTen → ID258 |
| E2E-03 | `/duyet-trang-thai` trả cả đơn vị không phải khoa thật | Contract/UI ambiguity | UI 11/12, nhưng `isKhoa=1` là 7/7 | Lock dùng summary theo `isKhoa`; không ép duyệt VP |
| E2E-04 | UI LNQC batch gửi cả record cũ khi duyệt record mới | Stale selection / over-update risk | Response ID258 thao tác nhưng cập nhật 2 dòng | GET xác minh từng ID; ghi defect |
| E2E-05 | Lock không tạo snapshot khi không có SDO map được | Business guard | HTTP 400 `Không tìm thấy dữ liệu giảng viên nào để chốt` | Không bypass DB; sửa input mapping rồi chạy recovery |
| E2E-06 | Unapprove LNQC cần `NamHoc` trong body; thiếu → 400 | API contract | Middleware trả `Không xác định được năm học` | Gửi lại payload có `NamHoc` |

| E2E-07 | `/submitData2` materialize Mời Giảng Kỳ 2 có thể đụng duplicate `uk_hop_donggvmoi` | Data-integrity/idempotency defect | HTTP 400, duplicate key `1-2-2025 - 2026-027188003408-1-2026-01-19-2026-04-10` | Rollback contract về baseline; ghi nhận defect; chưa sửa code |
| E2E-08 | Dữ liệu KTHP/LNQC cũ pending làm pre-check cùng năm fail | Test-environment blocker | ATTT/CNTT/ĐTVM còn unapproved; VP approve/lock 400 | Không mass-approve dữ liệu thật; cần DB clone/năm sạch cho full pass; chưa sửa code |
| E2E-09 | Sau lock không có public unlock API | Product limitation | Chỉ có `vg_khoa_du_lieu`/snapshot; stats/export phụ thuộc lock | Dùng script marker-scoped được owner cho phép để clear sau evidence; limitation vẫn được note, chưa sửa code |

## 7. Điều kiện để chạy full same-year E2E lại

Run R01 chưa phải full pass vì NCKH test (`2025 - 2026`) và Vượt Giờ lock
happy path (`2026 - 2027`) khác năm học. Không được dùng snapshot R01 để kết luận
NCKH đã chặn trần trong cùng snapshot.

Read-only khảo sát ngày **10/09/2026** cho thấy `2027 - 2028` đang sạch các nguồn
Vượt Giờ/NCKH và đã có trong bảng `namhoc`, nhưng `trangthai=0`. Năm này chỉ là
ứng viên cho run kế tiếp sau khi owner xác nhận có thể dùng năm inactive; vẫn phải:

1. Tạo đủ 8 loại NCKH cùng năm, ít nhất hai khoa và từ hai giảng viên cơ hữu.
2. Duyệt Khoa → Viện, xác nhận NCKH official trước khi tạo Vượt Giờ.
3. Tạo ít nhất một nguồn Vượt Giờ official có `id_User` map được để lock tạo SDO;
   NCKH-only không thể tạo snapshot (`total SDO=0`).
4. Duyệt đủ cấp nguồn, VP duyệt đủ `7/7` khoa thật, rồi lock bằng marker.
5. Assert `soTietNCKH > 0` trong SDO/snapshot, stats/export đọc snapshot, và
   projected = official khi mọi record đã đạt max cấp.
6. Sau khi lưu evidence, dùng script marker-scoped để clear snapshot/lock; chỉ
   sau đó cleanup source fixtures theo ID manifest.

Không mass-approve dữ liệu thật của `2025 - 2026` để làm cho run xanh; đó là
blocker môi trường và được giữ nguyên trong defect log.

## 8. Ma trận endpoint/role

| Giai đoạn | Endpoint chính | Role/profile |
|---|---|---|
| NCKH create/list | `/v3/nckh/de-tai-du-an`, `/v3/nckh/records` | Người nhập/khoa |
| NCKH Khoa | `PATCH /v3/nckh/records/:id/khoa-duyet` | Lãnh đạo khoa |
| NCKH Viện | `PATCH /v3/nckh/records/:id/vien-duyet` | Trợ lý/lãnh đạo Viện |
| NCKH stats/export | `/v3/nckh/thong-ke`, `/v3/nckh/export/stats/*` | User đã đăng nhập |
| LNQC create/confirm | `/v2/vuotgio/lop-ngoai-quy-chuan*` | Lãnh đạo khoa |
| LNQC cấp 2 | `/batch-approve` | Trợ lý/lãnh đạo Đào tạo |
| VP prerequisite/approval | `/tong-hop/duyet-kiem-tra`, `/tong-hop/duyet-khoa` | Trợ lý/lãnh đạo VP |
| Lock | `/tong-hop/khoa-du-lieu` | Lãnh đạo phòng VP |
| Snapshot/stats/export | `/snapshot*`, `/tong-hop/khoa`, `/xuat-file/*` | User đã đăng nhập; lock bắt buộc cho stats/export |

## 9. Template log cho lần chạy sau

Copy bảng này cho mỗi run; không ghi username/password:

```markdown
## Run YYYY-MM-DD
- App/base URL:
- Browser/MCP:
- Isolated contexts:
- Năm học NCKH:
- Năm học Vượt Giờ:
- Test title/code:

### Stage log
| Seq | Time | Actor role | Profile | Method/URL | Target ID | HTTP | Assertion | Evidence |
|---:|---|---|---|---|---:|---:|---|---|
| 1 | | | | | | | | |

### Stop/recovery log
| Error/status | Exact body | Root cause | Recovery | Retest result |
|---|---|---|---|---|

### Cleanup
- NCKH IDs removed:
- Vượt Giờ IDs removed:
- Locked-year blockers:
- Remaining test data and reason:

### Final result
- NCKH stats:
- NCKH export:
- Vượt Giờ lock/snapshot:
- Vượt Giờ stats:
- Vượt Giờ exports:
- Payment (optional):
- Console errors:
```

## 10. Cleanup và rollback rules

- Chỉ xóa record có title/code prefix của run hiện tại.
- NCKH approved record phải revoke Viện trước, rồi revoke Khoa, sau đó mới DELETE.
- Vượt Giờ record official phải hạ cả hai cờ duyệt bằng đúng role trước khi delete.
- Sau lock không có public unlock route. Đây là defect/limitation cần note;
  riêng test E2E được phép dùng script SQL marker-scoped để clear snapshot và
  mở khóa sau khi đã lưu evidence. Không sửa business code trong run này.
- Rollback Mời Giảng Kỳ 2 phải dùng contract/owner có quyền phục hồi đã xác minh; marker cleanup chỉ áp dụng cho lock/snapshot của run E2E được ủy quyền và phải match marker, không xóa theo riêng `NamHoc`.
- Nếu cleanup bị block, ghi ID, năm học, HTTP/body và account role còn thiếu.

## 11. Source references

- `docs/business-workflow/system-overview.md`
- `docs/business-workflow/workload-aggregation.md`
- `docs/business-workflow/workflow_vuotgio.md`
- `docs/vuotgio_v2/LUONG_VUOT_GIO_ANALYSIS.md`
- `.agents/skills/nckh-e2e-testing/SKILL.md`
- `src/routes/nckhV3Route.js`
- `src/routes/vuotGioV2Route.js`
- `src/services/vuotgio_v2/duyetTongHop.service.js`
- `src/services/vuotgio_v2/dataLock.service.js`
- `src/services/vuotgio_v2/tongHop.service.js`
- `src/services/vuotgio_v2/xuatFile.service.js`
- `src/repositories/vuotgio_v2/tongHop.repo.js`
- `src/mappers/vuotgio_v2/summary.mapper.js`
