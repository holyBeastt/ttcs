# 04 — Pipeline E2E tuần tự

Đây là runbook cho một vòng kiểm thử nghiệp vụ thật bằng MCP Chrome DevTools. Mục tiêu là mô phỏng dữ liệu nhập thật, approval thật, lock/snapshot thật, thống kê và export; không phải smoke test vài endpoint.

## 1. Điều kiện bắt đầu

- App chạy được và browser MCP truy cập được.
- Chọn một `NamHoc` duy nhất, chưa lock hoặc đã có fixture/rollback plan được phê duyệt.
- Tối thiểu hai giảng viên **cơ hữu** thuộc hai khoa thật khác nhau; nếu có
  account phù hợp thì dùng từ ba giảng viên trở lên để tăng độ phủ.
- NCKH và tất cả nguồn Vượt Giờ của run dùng chính `NamHoc` đó.
- Xác định account/profile cho Khoa, Viện NCKH, Đào tạo, Khảo thí và Văn phòng.
- Nếu dùng dữ liệu Mời Giảng Kỳ 2 để đạt equality, hoàn tất backup trước mọi mutation.

## 2. Nguyên tắc điều phối

1. Một luồng mutation duy nhất: stage trước phải có response + GET/DB assertion rồi mới sang stage sau.
2. Mỗi actor/agent dùng `isolatedContext` riêng.
3. Read-only có thể chạy song song khi không ảnh hưởng race, nhưng mutation không chạy song song trên cùng năm/record.
4. Sau mỗi POST/PATCH/DELETE/approve/lock, ghi method, URL, payload đã loại secret, status, response và dữ liệu GET lại.
5. Không lấy dialog UI làm bằng chứng duy nhất.
6. Nếu blocker lặp lại hoặc precondition fail, dừng stage; không bypass bằng DB.

## 3. Stage 0 — Baseline và fixture

Ghi baseline trước mutation:

- lock status và snapshot/version của năm;
- các khoa thật (`isKhoa=1`) và phòng không phải khoa (`isKhoa=0`);
- NCKH record count theo tám loại và theo scope preview/official;
- Vượt Giờ source counts theo `giangday`, `quychuan`, `doantotnghiep`, `exportdoantotnghiep`, LNQC, KTHP, HDTQ;
- approval flags và `DaLuu` của Mời Giảng Kỳ 1/Kỳ 2;
- official rows hiện có và lecturer IDs;
- prefix/title/code dùng riêng cho run.

Nếu baseline đã có dữ liệu thật chưa đủ duyệt, không tự ép lock; chọn năm khác hoặc ghi rõ run bị chặn.

## 4. Stage NCKH — phải hoàn tất trước Vượt Giờ

### N1. Nhập đủ tám loại

Tạo ít nhất một record cho mỗi type:

| Type | Mã | Kiểm tra đặc thù |
|---|---|---|
| Đề tài, dự án | `DETAI_DUAN` | Chủ nhiệm, phân loại, ngày, mã đề tài. |
| Bài báo khoa học | `BAIBAO` | Tên tạp chí/hội thảo bắt buộc. |
| Sáng kiến | `SANGKIEN` | Kết quả/xếp loại, ngày, tác giả chính. |
| Giải thưởng và sáng chế | `GIAITHUONG` | Mã số/quyết định nếu form hiển thị. |
| Đề xuất nghiên cứu | `DEXUAT` | Equal-hour, duration, participant. |
| Sách, giáo trình | `SACHGIAOTRINH` | Publication/code field nếu hiển thị. |
| Hướng dẫn SV NCKH | `HUONGDAN` | Mã đề tài, cán bộ hướng dẫn. |
| Thành viên hội đồng khoa học | `HOIDONG` | Số quyết định/mã số, vai trò `chu_tich`/`phan_bien`/`uy_vien`. |

Phân record cho tối thiểu hai lecturer ở hai khoa. Sau mỗi create:

- HTTP đúng (`201` cho create API);
- GET record/list xác nhận title, type, năm, khoa, participant, tổng giờ;
- `nckh_so_tiet` có participant allocation đúng;
- nếu có sửa/xóa trước duyệt, GET xác nhận CRUD và chỉ tác động test record.

### N2. NCKH dự kiến

Chạy preview theo năm trước khi duyệt:

- pending, Khoa-only (nếu đã tạo fixture), full approval đều xuất hiện;
- đủ cả tám loại;
- tổng theo lecturer/khoa bằng tổng participant rows;
- không có record khác năm;
- export preview (nếu UI/API cung cấp) có status/MIME/filename/bytes đúng.

### N3. Duyệt Khoa rồi Viện

Tuần tự theo từng record hoặc batch đã được kiểm tra target:

1. Khoa duyệt → GET → `khoa_duyet=1`.
2. Viện duyệt → GET → `vien_nc_duyet=1`.
3. Dữ liệu nội dung không bị thay đổi.
4. Payload không gửi lại cờ cũ `0` cho row đã duyệt.

### N4. NCKH chính thức

- Chạy official stats theo năm và khoa/lecturer.
- Assert đủ tám type và đúng số participant hours.
- Export official XLSX: HTTP `200`, MIME XLSX, `Content-Disposition` `.xlsx`, byte length > 0.
- Khi tất cả NCKH test rows đã đủ hai cấp: NCKH projected = NCKH official.
- Chỉ sau khi các assertion này pass mới tạo/duyệt workload Vượt Giờ.

## 5. Stage fixture Mời Giảng/Đồ Án

Không test nghiệp vụ Mời Giảng như module độc lập. Chỉ làm các bước cần để nguồn kế thừa đúng:

1. Kỳ 1 đã duyệt/lưu: ghi baseline.
2. Kỳ 2 chưa duyệt/lưu: backup toàn bộ row và official rows liên quan.
3. **Kịch bản chuẩn:** duyệt/lưu Kỳ 2 qua đúng UI/API, tuần tự, sau khi backup đã verify.
4. Verify projected và official teaching có Kỳ 1 + Kỳ 2; lecturer mapping là cơ hữu hợp lệ.
5. Nếu không thể rollback, ghi blocker và không tuyên bố equality cuối run. Nếu cố ý giữ Kỳ 2 pending, đó chỉ là nhánh kiểm thử chênh lệch projected/official, không phải full E2E.

Đồ Án phải được kiểm tra source projected/official nếu fixture được đưa vào phạm vi; không dùng `isMoiGiang=1` làm dữ liệu cơ hữu.

## 6. Stage Vượt Giờ projected

Nhập direct input tối thiểu:

- LNQC: ít nhất một pending, một Khoa-only và một full approval;
- KTHP: parent + child, có pending/partial/full nếu dữ liệu cho phép;
- HDTQ: có pending/partial/full nếu dữ liệu cho phép.

Sau mỗi create/confirm/edit/delete:

- assert HTTP và response body;
- GET row theo ID;
- lecturer phải map đúng `id_User`, không dùng username thay cho tên cán bộ;
- draft chưa ban hành không được nhầm là projected aggregation.

Chạy projected Vượt Giờ và assert:

- mọi row đã ở nguồn aggregation đều được xét, kể cả chưa duyệt;
- pending vẫn xuất hiện projected;
- `soTietNCKH` của lecturer có giá trị official từ Stage N4;
- SDO, `thieuNCKH`, `tongVuot` phản ánh NCKH làm chặn trần.

## 7. Stage Vượt Giờ official approvals

### 7.1 Khoa

Duyệt từng record đúng khoa; GET xác nhận `khoa_duyet=1`. Không gửi nhầm record khoa khác.

### 7.2 Phòng tương ứng

- LNQC/HDTQ: profile Đào tạo duyệt `dao_tao_duyet=1`.
- KTHP: profile Khảo thí duyệt `khao_thi_duyet=1`.

Chạy official live trước VP để assert pending bị loại và full-approved được tính. Chênh lệch projected/official phải truy ra được bằng ID/cờ duyệt.

## 8. Stage Văn phòng, lock, snapshot

Với mỗi khoa thật, tuần tự:

1. GET pre-check.
2. Chỉ POST VP approve khi `passed=true` và errors rỗng.
3. GET status; xác nhận khoa đã `van_phong_duyet=1`.
4. Lặp cho khoa tiếp theo.

Sau khi tất cả khoa thật đạt:

1. GET lock pre-check.
2. POST lock năm với `ghiChu` marker duy nhất của run, ví dụ
   `E2E-NCKH-VG-20260910-R01`; marker là precondition để cleanup snapshot sau
   test không đụng baseline.
3. Assert `success=true`, version tăng, `totalGV>0`, lock=true.
4. GET snapshot; assert có lecturer test, raw IDs direct input, NCKH official và scalar totals.

## 9. Stage thống kê và export

- Thống kê khoa/lecturer phải đọc snapshot sau lock.
- Export cá nhân và tổng hợp phải trả HTTP `200`, MIME XLSX, filename `.xlsx`, bytes > 0.
- Nội dung file phải đối chiếu với stats/snapshot, không chỉ kiểm tra tải được.
- Không export official trước lock để làm pass giả.

## 10. Stage equality và cleanup

So sánh projected live với official snapshot theo `(NamHoc,id_User,khoa)` ở lecturer, khoa và tổng hệ thống. Khi mọi record đạt max cấp/materialize:

```text
projected = official
```

Nếu lệch, in danh sách raw IDs và phân loại: pending approval, khác source materialize, khác kỳ, khác lecturer mapping, invited row lọt vào cơ hữu hoặc bug tính toán.

Cleanup được thực hiện sau khi đã lưu đầy đủ evidence của stats, export,
snapshot, raw IDs và checksum backup:

1. **Clear lock/snapshot trước:** gửi `ghiChu` marker ngay từ request lock,
   rồi dùng `scripts/clear-vuotgio-snapshot-lock.js` ở primary thread để clear
   đúng `NamHoc + marker`. Script mặc định dry-run, yêu cầu `--apply`,
   `--confirm-year` và `--confirm-marker`, đồng thời ghi manifest pre-delete.
   Script thực hiện SQL `DELETE` snapshot trước rồi xóa lock trong cùng
   transaction; sau commit phải báo `verifiedUnlocked=true`. Bước này mở lại
   các route mutation bị `checkDataLock` chặn.
2. **Nguồn NCKH:** dùng đúng thứ tự nghiệp vụ Viện → Khoa → DELETE trên các
   record test; GET lại xác nhận `404`. Không xóa record không thuộc manifest.
3. **Nguồn Vượt Giờ:** hạ approval đúng actor rồi xóa theo UI/API và ID
   manifest. Không `DELETE` theo cả năm.
4. **Mời Giảng:** dùng contract bỏ lưu/unsave đã xác minh và đối chiếu với
   `/tmp/ttcs-e2e-backup-*.json`; không xóa mù các row Kỳ 1.
5. GET lại lock status, snapshot count và toàn bộ source counts; chỉ kết luận
   cleanup đạt khi lock, snapshot test và mọi fixture theo manifest đã về
   baseline.

SQL cleanup chỉ là administrative test cleanup, không phải public rollback và
không được chạy trên production. Các bảng `nckh_*`, nguồn Vượt Giờ và
`vg_duyet_tong_hop` không bị script snapshot đụng tới.
