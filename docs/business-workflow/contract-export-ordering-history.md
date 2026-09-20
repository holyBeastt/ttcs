# Lịch sử thứ tự xuất file hợp đồng

## 2026-09-20 — Sắp xếp theo số hợp đồng

### Phạm vi

Áp dụng cho hai endpoint xuất nhiều hợp đồng:

- Mời Giảng: `/exportHD/downloadAll`
- Đồ Án tốt nghiệp: `/exportHDDA/Dowload`

Mỗi endpoint tạo ba file:

- Thống kê chuyển khoản sau thuế
- Thống kê chuyển khoản trước thuế
- Bảng kê tổng hợp thuế

### Vấn đề trước khi sửa

Các query export có `GROUP BY` nhưng không có `ORDER BY`. Vì vậy thứ tự bản ghi phụ thuộc vào thứ tự MySQL trả về, không được bảo đảm theo tên, khoa hoặc số hợp đồng. Ba file thường dùng cùng thứ tự mảng đầu vào nhưng thứ tự đó không ổn định giữa các scope hoặc các lần chạy.

### Quy tắc số hợp đồng

`SoHopDong` là chuỗi số hợp đồng đầy đủ, ví dụ `001/HĐ-ĐT` hoặc chuỗi có tiền tố/hậu tố cấu hình. `SoThanhLyHopDong` là số thanh lý và không được dùng để sắp xếp.

Comparator lấy chuỗi số đầu tiên trong `SoHopDong` và sắp xếp tăng dần theo giá trị số. Khi trùng phần số, comparator dùng toàn bộ chuỗi hợp đồng, họ tên và CCCD để tạo thứ tự ổn định. Bản ghi không có số hợp đồng được đưa xuống cuối.

### Cách đã sửa

- Thêm `src/utils/contract-number-sort.js` làm comparator dùng chung.
- Sort kết quả ngay sau khi query trả về và trước khi tạo hợp đồng, `summaryData` và bảng kê.
- Mời Giảng dùng cùng mảng đã sort cho cả ba file, bất kể scope là toàn bộ, theo khoa hay theo tên giảng viên.
- Đồ Án dùng cùng mảng đã sort cho cả ba file, bất kể scope lọc được truyền vào query.
- Không thay đổi logic sinh số hợp đồng; chỉ thay đổi thứ tự hiển thị trong các file export.

### Lý do sort sau query

Mời Giảng có nhiều nhánh query khác nhau, còn Đồ Án dựng query theo các điều kiện lọc. Sort một lần trên kết quả cuối bảo đảm mọi scope đi qua cùng một quy tắc, đồng thời không phụ thuộc vào hàm regex hoặc phiên bản MySQL.

### Kết quả mong đợi

Ba file trong cùng một lần export có cùng thứ tự bản ghi theo phần số của `SoHopDong`: `001`, `002`, `003`, ...

### Bổ sung cùng ngày — Sửa scope của helper template

Trong lúc kiểm tra luồng Mời Giảng phát hiện `resolveContractNumberForTemplate` được khai báo bên trong `exportMultipleContracts` nhưng cũng được gọi bởi `generateContractForTeacher`, là hàm ở module scope. Đã đưa helper lên module scope để cả hai luồng dùng chung; đây là sửa lỗi phạm vi biến, không phải thay đổi template.
