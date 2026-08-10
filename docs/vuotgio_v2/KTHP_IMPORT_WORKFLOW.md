# Luồng import Kết thúc học phần

## Contract chung

Cả file Excel và form nhập thủ công đều được đổi sang KTHP DTO trước khi kiểm tra.
Pipeline xử lý theo thứ tự:

```text
Input strategy
  -> normalize
  -> resolve nhân viên
  -> resolve hệ đào tạo
  -> type policy
  -> validate
  -> duplicate detection
  -> preview token
  -> recheck duplicate
  -> transactional save
```

Năm học được lưu ở dạng `YYYY - YYYY`. Ngày thi được chuẩn hóa thành
`YYYY-MM-DD`. Ô số trống được giữ là `null`, không tự đổi thành `0`.

## Quy tắc chặn lưu

- Nhân viên phải resolve được thành đúng một `nhanvien.id_User` và phải có
  `MaPhongBan`.
- Hệ đào tạo phải resolve được từ ID hoặc tên tồn tại trong bảng
  `he_dao_tao`; không có giá trị mặc định.
- Số giờ quy chuẩn phải lớn hơn `0`.
- Giá trị số chi tiết không được âm.
- Ngày thi bắt buộc đối với Coi thi. Ra đề và Chấm thi được phép để trống ngày
  vì các biểu mẫu nghiệp vụ hiện hành không cung cấp trường này.
- Dòng trùng trong batch hoặc trong DB không được insert.
- Bất kỳ dòng lỗi nào cũng làm preview không phát hành token commit.

Tên nhân viên được so khớp sau khi chuẩn hóa Unicode, khoảng trắng, chữ hoa
thường và dấu tiếng Việt. Nếu có nhiều nhân viên cùng khóa tên chuẩn hóa,
preview trả `EMPLOYEE_AMBIGUOUS` thay vì chọn ngẫu nhiên.

## API

### Preview Excel hoặc dữ liệu/form

`POST /v2/vuotgio/kthp-import/preview`

Endpoint nhận cả hai dạng input:

- `multipart/form-data`: có field `file` là `.xlsx` hoặc `.xls`, tối đa 10 MB,
  kèm các field context `academicYear`, `semester`, `round`,
  `educationSystemId` và tùy chọn `educationSystemName`.
- `application/json`: dùng cho form thủ công hoặc các dòng Excel đã chỉnh sửa.

```json
{
  "source": "EXCEL | MANUAL",
  "input": {},
  "context": {
    "academicYear": "2025 - 2026",
    "semester": 1,
    "round": 1,
    "educationSystemId": 7
  }
}
```

Response chung:

```json
{
  "summary": {
    "total": 10,
    "valid": 8,
    "warning": 1,
    "invalid": 1,
    "duplicate": 1
  },
  "rows": [],
  "errors": [],
  "warnings": [],
  "previewToken": "server-generated-token"
}
```

### Commit

`POST /v2/vuotgio/kthp-import/commit`

```json
{ "previewToken": "server-generated-token" }
```

Token hết hạn sau 15 phút, thuộc riêng người tạo và chỉ dùng thành công một
lần. Commit không nhận lại DTO từ client. Năm học dùng để kiểm tra khóa dữ
liệu cũng được lấy từ token phía server.

Preview token hiện lưu trong bộ nhớ tiến trình. Khi triển khai nhiều Node
process/instance, cần thay `KthpPreviewStore` bằng shared store (Redis hoặc DB)
để token dùng được xuyên instance.

## Persistence

Policy tạo persistence model đầy đủ trước khi mapper chuyển thành thứ tự cột
repository. Tám trường chi tiết luôn đi qua mapper chung:

- `ma_hoc_phan`
- `hinh_thuc_thi`
- `he_so`
- `ngay_thi`
- `ca_thi`
- `thoi_gian`
- `phong_thi`
- `vai_tro`

Save service recheck duplicate trong transaction. Lỗi insert làm rollback toàn
bộ batch. Duplicate xuất hiện sau preview được bỏ qua và trả trong `skipped`;
không cập nhật đè bản ghi cũ.

## Kiểm thử

- Unit/contract: `test/vuotgio_v2/kthp-import/unit/`
- Regression file thật (read-only):
  `test/vuotgio_v2/kthp-import/regression/`
- Chạy toàn bộ: `npm test`
