# NCKH + Vượt Giờ — Bộ tài liệu nghiệp vụ và E2E

> **Source-of-truth status:** Bộ tài liệu này được chuẩn hóa theo nghiệp vụ đã thống nhất và source hiện tại vào **ngày 10/09/2026**. Khi tài liệu mâu thuẫn với source hoặc kết quả chạy mới có evidence, phải cập nhật tài liệu; không tự suy diễn nghiệp vụ từ giao diện.

## 1. Mục đích

Bộ tài liệu này mô tả trọn vòng đời dữ liệu từ lúc nhập liệu đến lúc thống kê và xuất file cho hai phân hệ **Nghiên cứu khoa học (NCKH V3)** và **Vượt Giờ V2**.

Luồng chuẩn bắt buộc là:

```text
NCKH nhập đủ dữ liệu
  → Khoa duyệt
  → Viện NCKH duyệt
  → NCKH dự kiến/chính thức
  → NCKH official làm đầu vào/chặn trần Vượt Giờ
  → Vượt Giờ dự kiến
  → duyệt Khoa
  → Đào tạo hoặc Khảo thí duyệt
  → Văn phòng duyệt tổng hợp từng khoa
  → lưu/khóa năm học
  → snapshot
  → thống kê Vượt Giờ
  → xuất file
  → đối chiếu dự kiến = chính thức khi mọi record đã đủ duyệt
  → cleanup fixture và lock/snapshot test theo marker
```

Không được chạy NCKH và Vượt Giờ song song nếu mục tiêu là kiểm tra nghiệp vụ end-to-end. Vượt Giờ chỉ có giá trị khi NCKH official của **cùng một năm học** đã hoàn thành.

> **Kịch bản chuẩn được khuyến nghị:** backup Mời Giảng Kỳ 2 → duyệt/lưu Kỳ 2 bằng đúng nghiệp vụ → chạy NCKH full → chạy Vượt Giờ → đối chiếu projected = official → rollback fixture Kỳ 2 bằng contract được xác minh. Nhánh giữ Kỳ 2 pending chỉ dùng để kiểm tra riêng chênh lệch projected/official, không được gọi là full E2E pass.

## 2. Kiến trúc tài liệu

Đọc theo thứ tự dưới đây:

| Tài liệu | Vai trò | Câu hỏi trả lời |
|---|---|---|
| [`01-nghiep-vu-va-bat-bien.md`](./01-nghiep-vu-va-bat-bien.md) | Chuẩn nghiệp vụ | Dữ liệu nào được tính, ai duyệt, điều kiện nào luôn đúng? |
| [`02-vong-doi-du-lieu.md`](./02-vong-doi-du-lieu.md) | Vòng đời và state machine | Một bản ghi đi qua những trạng thái nào từ nhập đến official? |
| [`03-tinh-toan-va-snapshot.md`](./03-tinh-toan-va-snapshot.md) | Tính toán và snapshot | NCKH chặn trần Vượt Giờ như thế nào; live và snapshot khác gì? |
| [`04-pipeline-e2e.md`](./04-pipeline-e2e.md) | Runbook E2E | Phải thao tác tuần tự và assert những gì? |
| [`05-roles-backup-rollback.md`](./05-roles-backup-rollback.md) | Role, profile, backup, rollback | Dùng tài khoản/profile nào; backup kỳ 2 ra sao; phục hồi thế nào? |
| [`06-evidence-template.md`](./06-evidence-template.md) | Biểu mẫu evidence | Log run, request, status, số liệu và lỗi thế nào? |
| [`07-assertion-matrix.md`](./07-assertion-matrix.md) | Oracle pass/fail | Điều kiện nhập, duyệt, tính toán, snapshot, export và equality là gì? |

Tài liệu run thực tế có evidence cụ thể vẫn được giữ tại [`../nckh-vuotgio-e2e-pipeline.md`](../nckh-vuotgio-e2e-pipeline.md). File đó là nhật ký chạy, còn thư mục này là chuẩn nghiệp vụ/runbook có thể tái sử dụng.

## 3. Quy tắc ưu tiên nguồn

1. Source code và schema là nguồn kiểm chứng kỹ thuật.
2. Nghiệp vụ đã chốt trong tài liệu này là điều kiện pass/fail của E2E.
3. API response + dữ liệu persisted là evidence bắt buộc; dialog UI một mình không đủ.
4. Nếu source, UI và tài liệu khác nhau, ghi thành defect/clarification, không âm thầm bỏ qua.
5. Không ghi username/password thật vào repo, docs hoặc log.

## 4. Phạm vi không được bỏ sót

- NCKH đủ **8 loại**: Đề tài, dự án; Bài báo khoa học; Sáng kiến; Giải thưởng và sáng chế; Đề xuất nghiên cứu; Sách, giáo trình; Hướng dẫn SV NCKH; Thành viên hội đồng khoa học.
- Tối thiểu **2 giảng viên cơ hữu thuộc 2 khoa**; có thể và nên dùng nhiều hơn 2 tài khoản để tăng độ phủ; ít nhất một lecturer có NCKH để kiểm tra chặn trần.
- Tất cả dữ liệu của một run phải cùng **một năm học**.
- NCKH dự kiến lấy toàn bộ record; NCKH chính thức chỉ lấy record đã duyệt đủ Khoa + Viện.
- Vượt Giờ dự kiến lấy toàn bộ record; Vượt Giờ chính thức chỉ lấy record đạt cấp duyệt tối đa.
- Tách dữ liệu kế thừa từ Mời Giảng/Đồ Án với dữ liệu nhập trực tiếp LNQC/KTHP/HDTQ.
- Mời Giảng Kỳ 1 hiện là fixture đã duyệt; Kỳ 2 hiện là fixture chưa duyệt. Kịch bản full phải backup rồi duyệt/lưu Kỳ 2 trước khi so sánh projected/official.
- Phải đi qua Văn phòng duyệt và bước lưu/khóa năm học để tạo snapshot trước khi gọi thống kê/export chính thức.
- Khi toàn bộ record đã approved max cấp, tổng projected và official phải bằng nhau theo từng lecturer, khoa và tổng toàn hệ thống.
- Sau khi lock để test thống kê, cleanup phải dùng marker `ghiChu` của run và
  `scripts/clear-vuotgio-snapshot-lock.js`; script được phép dùng SQL hành
  chính để xóa snapshot rồi mở khóa trong môi trường E2E sau khi đã lưu
  evidence. Không xóa snapshot/lock theo mỗi `NamHoc` nếu chưa kiểm tra marker,
  và không dùng script này cho rollback nghiệp vụ/production.

## 5. Source anchors

Các file/bảng dưới đây là điểm kiểm chứng khi tài liệu cần cập nhật:

| Nhóm | Source anchors |
|---|---|
| NCKH input/approval | `src/routes/nckhV3Route.js`, `src/controllers/nckh_v3/record.controller.js`, `src/repositories/nckh_v3/stats.repo.js`, `nckh_chung`, `nckh_so_tiet` |
| Vượt Giờ aggregation | `src/services/vuotgio_v2/tongHop.service.js`, `src/repositories/vuotgio_v2/tongHop.repo.js`, `src/mappers/vuotgio_v2/summary.mapper.js` |
| Vượt Giờ approval | `src/services/vuotgio_v2/duyetTongHop.service.js`, `src/repositories/vuotgio_v2/duyetTongHop.repo.js`, `src/controllers/vuotgio_v2/duyetTongHop.controller.js` |
| Lock/snapshot | `src/services/vuotgio_v2/dataLock.service.js`, `src/services/vuotgio_v2/snapshotData.service.js`, `src/repositories/vuotgio_v2/soTietTongHop.repo.js`, `vg_khoa_du_lieu`, `vg_so_tiet_tong_hop` |
| Stats/export | `src/services/vuotgio_v2/thongKe.service.js`, `src/services/vuotgio_v2/xuatFile.service.js` |
| Mời Giảng fixture | `src/controllers/importController.js`, `src/controllers/hopdong.duyetHopDongMoiGiangController.js`, `/phong-ban-duyet`, `/submitData2`, `/api/v1/moi-giang/unsave-all`, `quychuan`, `giangday`, `hopdonggvmoi` |
| Department grouping | `phongban.isKhoa`, canonical `BGĐ&PHONG` |

Các endpoint cụ thể có thể thay đổi theo route wiring; khi chạy test phải lấy request thực tế từ MCP Network và ghi vào evidence.
