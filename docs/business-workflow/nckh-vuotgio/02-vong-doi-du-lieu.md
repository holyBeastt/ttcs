# 02 — Vòng đời dữ liệu và state machine

Tài liệu này mô tả trạng thái nghiệp vụ, điều kiện chuyển trạng thái và tập dữ liệu được phép đi vào từng loại thống kê. **Có dữ liệu trong bảng không đồng nghĩa với dữ liệu đã sẵn sàng cho official.** Phải phân biệt rõ `draft/staging`, `projected`, `official live` và `snapshot`.

## 1. Quy ước trạng thái

| Tên | Ý nghĩa | Có thể thay đổi? | Có được official dùng? |
|---|---|---:|---:|
| Draft/staging | Dữ liệu mới nhập nhưng chưa được ban hành/chuyển vào bảng mà aggregation đọc | Có | Không |
| Projected/live | Dữ liệu đã ở nguồn projected mà màn hình dự kiến đọc; chưa yêu cầu duyệt đủ cấp | Có | Không phải official |
| Official live | Dữ liệu đã ở nguồn official và thỏa predicate duyệt của nguồn | Có trước lock | Có cho live official |
| Snapshot | Bản chụp SDO official tại thời điểm khóa năm | Không được sửa trực tiếp | Là nguồn stats/export sau lock |

Ví dụ: một dòng LNQC còn ở `course_schedule_details` là **draft**, không tự động có nghĩa là nó đã nằm trong Vượt Giờ dự kiến. Chỉ sau khi ban hành/chuyển vào `vg_lop_ngoai_quy_chuan` mới được xét ở projected theo source hiện tại.

## 2. State machine NCKH

```text
Nhập form/import
  → nckh_chung + nckh_so_tiet (pending)
  → Khoa duyệt: khoa_duyet=1
  → Viện NCKH duyệt: vien_nc_duyet=1
  → NCKH official stats/export
```

### 2.1 Bảng trạng thái

| Trạng thái | Điều kiện | NCKH dự kiến | NCKH chính thức | Vượt Giờ có thể dùng |
|---|---|---:|---:|---:|
| Pending | `khoa_duyet=0`, `vien_nc_duyet=0` | Có | Không | Không |
| Khoa-only | `khoa_duyet=1`, `vien_nc_duyet=0` | Có | Không | Không |
| Full approval | `khoa_duyet=1`, `vien_nc_duyet=1` | Có | Có | Có |
| Thu hồi một cấp | Một cờ bị hạ qua route nghiệp vụ | Có nếu record còn tồn tại | Không | Không |
| Đã xóa | Không còn record | Không | Không | Không |

### 2.2 Quy tắc NCKH

- NCKH **dự kiến/preview** lọc theo `NamHoc`, lấy cả pending, Khoa-only và full approval.
- NCKH **chính thức/official** lọc theo `NamHoc` và đồng thời `khoa_duyet=1 AND vien_nc_duyet=1`.
- `listUnified()`/management list có thể hiện pending; không dùng riêng list này để kết luận official stats.
- Sau khi full approval, phải kiểm tra lại participant/hour rows trong `nckh_so_tiet` và tổng master trong `nckh_chung`.
- Duyệt một record không được làm thay đổi nội dung nhập (type, năm, participant, tổng giờ); nếu có thay đổi phải ghi rõ là mutation khác.
- Không được duyệt Viện cho record chưa được Khoa duyệt; nếu API cho phép thì ghi defect về thứ tự/authorization.
- Sau mỗi PATCH duyệt phải GET lại chính record đó; không tin checkbox/dialog hoặc payload UI cũ.

## 3. State machine Vượt Giờ direct input

### 3.1 LNQC và HDTQ

```text
Nhập draft
  → ban hành/chuyển vào nguồn aggregation
  → Khoa duyệt: khoa_duyet=1
  → Đào tạo duyệt: dao_tao_duyet=1
  → official live đủ điều kiện
```

### 3.2 KTHP

```text
Nhập parent + child rows
  → Khoa duyệt parent
  → Khảo thí duyệt parent
  → official live đủ điều kiện
```

### 3.3 Bảng predicate

| Nguồn | Projected predicate | Official predicate | Cấp 1 | Cấp 2 |
|---|---|---|---|---|
| LNQC | Không lọc `khoa_duyet`/`dao_tao_duyet` sau khi đã vào nguồn | `khoa_duyet=1 AND dao_tao_duyet=1` | Khoa | Đào tạo |
| HDTQ | Không lọc `khoa_duyet`/`dao_tao_duyet` | `khoa_duyet=1 AND dao_tao_duyet=1` | Khoa | Đào tạo |
| KTHP | Không lọc `khoa_duyet`/`khao_thi_duyet` | `khoa_duyet=1 AND khao_thi_duyet=1` | Khoa | Khảo thí |

## 4. Cấp Văn phòng và khóa năm

Sau khi direct input đạt cấp hai, dữ liệu chưa thể xuất official cuối nếu chưa qua Văn phòng:

```text
Official live đủ cấp nguồn
  → VP pre-check từng khoa
  → VP duyệt khoa: van_phong_duyet=1
  → đủ mọi khoa thật
  → lock năm học
  → tính SDO official
  → snapshot version mới
```

- VP duyệt **theo từng khoa**, không duyệt một cờ chung thay cho từng khoa.
- Pre-check phải trả `passed=true` và không có lỗi trước khi gọi approve.
- Điều kiện lock chỉ yêu cầu các đơn vị `phongban.isKhoa=1` (khoa thật) có `van_phong_duyet=1`.
- Danh sách trạng thái UI có thể hiển thị cả đơn vị `isKhoa=0`; không lấy số dòng UI làm mẫu số.
- `BGĐ&PHONG` là nhóm báo cáo cho mọi `isKhoa=0`; nhóm này không tự trở thành khoa bắt buộc của lock.

## 5. Nguồn kế thừa Mời Giảng/Đồ Án

### 5.1 Mời Giảng

Luồng Mời Giảng là fixture, không phải mục tiêu test nghiệp vụ riêng:

```text
quychuan (projected)
  → Khoa/Đào tạo/Tài chính duyệt theo workflow legacy
  → submitData2/materialize
  → giangday (official giảng dạy)
  → Vượt Giờ official
```

- Bản ghi `MoiGiang=1` không phải lecturer cơ hữu.
- Kỳ 1 đã duyệt/lưu và Kỳ 2 chưa duyệt/lưu tạo ra chênh lệch projected/official hợp lệ về mặt kỹ thuật nhưng làm E2E toàn năm không đồng nhất.
- Kịch bản full mặc định phải backup Kỳ 2 trước, sau đó duyệt/lưu Kỳ 2 và verify official rows. Chỉ giữ Kỳ 2 pending nếu đang chạy một test riêng về chênh lệch pending; không dùng nhánh đó để kết luận full E2E.

### 5.2 Đồ Án

```text
doantotnghiep (projected)
  → export/materialize
  → exportdoantotnghiep (official)
  → Vượt Giờ
```

Chỉ record cơ hữu (`isMoiGiang=0`) được tính trong luồng Vượt Giờ cơ hữu. Phải ghi riêng nếu source fixture chưa có Đồ Án; không tự coi thiếu fixture là pass coverage.

## 6. Chuyển trạng thái và rollback

- Mọi chuyển trạng thái phải đi qua UI/API nghiệp vụ đúng actor.
- Dữ liệu Vượt Giờ còn ở draft, chưa ban hành/chưa lưu hoặc chưa được Khoa duyệt có thể không xuất hiện trong nguồn thống kê tương ứng; phải phân biệt “chưa được xét” với “hệ thống tính sai”.
- Không cập nhật trực tiếp các cờ duyệt/`DaLuu` bằng SQL để giả lập thao tác người dùng.
- Trước lock, có thể thu hồi/xóa khi đúng role và predicate cho phép.
- Sau lock, sản phẩm không có public unlock route. Không sửa/xóa source hoặc
  snapshot trực tiếp trong rollback nghiệp vụ; riêng môi trường E2E được owner
  cho phép dùng `scripts/clear-vuotgio-snapshot-lock.js` với marker để dọn lock/
  snapshot test sau khi đã lưu evidence.
- Nếu rollback fixture làm thay đổi dữ liệu đã snapshot, phải dừng và xin quy trình rebuild/unlock được owner xác nhận.
