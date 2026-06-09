# Phân tích Chi tiết Cơ chế Lưu Dữ liệu Giảng dạy (Legacy)

Tài liệu này phân tích chi tiết hai hàm lưu dữ liệu cốt lõi trong `importController.js`: `insertGiangDay` (Dành cho Giảng viên Mời) và `insertGiangDay2` (Dành cho Giảng viên Cơ hữu). Cả hai hàm này đều đảm nhiệm việc chuyển dữ liệu từ bảng tạm `quychuan` sang bảng chính thức `giangday`.

## 1. Tổng quan Kiến trúc
- **File:** `src/controllers/importController.js`
- **Tầng Service liên quan:** `giangDay.service.js` (Hàm `processQuyChuanData` & `joinData`)
- **Repository:** Không sử dụng Repository chuẩn (`vuotgioDuKien`). Sử dụng **Raw SQL (`INSERT INTO giangday`)** trực tiếp trong Controller.
- **Bảng đích (Target Table):** Cả 2 hàm đều insert chung vào một bảng vật lý duy nhất là `giangday`. Hệ thống không chia bảng lưu trữ giữa Mời giảng và Cơ hữu.

---

## 2. Hàm `insertGiangDay` (Xử lý Giảng viên Mời)
Hàm này chịu trách nhiệm xử lý các lớp học phần được gắn cờ `MoiGiang = 1` trong bảng `quychuan`.

### 2.1. Logic Mapping Dữ liệu (Tại Service)
- Đọc danh sách giảng viên mời từ bảng `gvmoi` (`gvmList`).
- Trích xuất tên từ cột `GiaoVienGiangDay` (Nếu lớp có nhiều giáo viên, hệ thống sẽ cắt chuỗi bằng dấu phẩy `,`).
- Dò tìm tên trong `gvmList` để lấy ID và thông tin CCCD, MST, Đơn giá, v.v.

### 2.2. Logic Ghi Database (Tại Controller)
Khi thực hiện vòng lặp `INSERT INTO giangday`:
- **Định danh User (`id_User`):** Bị ép cứng (hard-code) bằng **1**. Đây là ID ảo (dummy ID) dành cho tất cả giảng viên mời, vì họ không có tài khoản đăng nhập trên hệ thống nhân sự nội bộ.
- **Định danh GVM (`id_Gvm`):** Lấy đúng ID của họ trong bảng `gvmoi`.
- **Thông tin tài chính:** Lấy trực tiếp `DonGia` (Đơn giá) từ bảng `gvmoi` tương ứng với hợp đồng thỉnh giảng của họ để tính tiền khoán gọn.

---

## 3. Hàm `insertGiangDay2` (Xử lý Giảng viên Cơ hữu)
Hàm này chịu trách nhiệm xử lý các lớp học phần được gắn cờ `MoiGiang = 0` trong bảng `quychuan`. Dữ liệu từ hàm này là nền tảng cốt lõi để tính toán "Vượt giờ" vào cuối năm học.

### 3.1. Logic Mapping Dữ liệu (Tại Service)
- Đọc danh sách cán bộ cơ hữu từ bảng `nhanvien` (`nvList`).
- Bóc tách tên từ cột `GiaoVienGiangDay` (chia tỷ lệ bằng dấu phẩy `,`).
- **⚠️ Điểm rủi ro (Bug logic):** Nếu lớp có ghép 2 giảng viên (dạy 30/70 hoặc 50/50), logic hiện tại trong `joinData` đang mặc định ép người đứng tên đầu tiên (`gv.includes("(1)")`) phải là Giảng viên Cơ hữu, cho dù thực tế người đầu tiên có thể là giảng viên mời.
- Dò tìm và map thông tin dựa trên tên trong `nvList`.

### 3.2. Logic Ghi Database (Tại Controller)
Khi thực hiện vòng lặp `INSERT INTO giangday`:
- **Định danh User (`id_User`):** Lấy đúng ID tài khoản của giảng viên trong bảng `nhanvien`. Điều này cực kỳ quan trọng vì nó cho phép hệ thống Vượt giờ link các tiết dạy này với thông tin định mức, chức danh, học vị của GV đó.
- **Định danh GVM (`id_Gvm`):** Bị ép cứng (hard-code) bằng **1**. Số 1 ở đây đóng vai trò như một cờ (flag) báo hiệu *"Đây không phải là giảng viên mời"*. Tất cả các câu truy vấn thống kê Vượt giờ sau này đều dùng điều kiện `WHERE id_Gvm = 1` để gom số tiết cho cơ hữu.
- **Thông tin tài chính:** Không chốt đơn giá trực tiếp lúc này mà ghi nhận `HSL` (Hệ số lương) và `HocVi`. Tiền thanh toán vượt giờ sẽ được tính toán động ở module Thống kê Vượt giờ dựa trên số tiết dôi dư.

---

## 4. Tóm tắt So sánh (Bảng Đối chiếu)

| Tiêu chí | `insertGiangDay` (Xử lý Mời giảng) | `insertGiangDay2` (Xử lý Cơ hữu) |
| :--- | :--- | :--- |
| **Dấu hiệu nhận biết (`quychuan`)** | `MoiGiang = 1` | `MoiGiang = 0` |
| **Bảng Mapping (Lookup)** | `gvmoi` (`gvmList`) | `nhanvien` (`nvList`) |
| **Bảng Đích (Lưu trữ)** | **`giangday`** | **`giangday`** |
| **Cột `id_User` trong DB** | **Cố định = 1** (User ảo) | **ID thật** (Từ `nhanvien`) |
| **Cột `id_Gvm` trong DB** | **ID thật** (Từ `gvmoi`) | **Cố định = 1** (Flag cơ hữu) |
| **Mục đích nghiệp vụ** | Tính tiền hợp đồng thỉnh giảng | Tính Vượt giờ cơ hữu cuối năm |
| **Mức độ rủi ro Kiến trúc** | Dùng Raw SQL khó maintain | Dùng Raw SQL, có bug logic ghép lớp |

## 5. Kết luận cho việc Refactor (Agent Notes)
1. **Repository Ảo:** Không tồn tại một Repository chuẩn mực cho luồng này. Mọi thay đổi về cấu trúc lưu trữ phải tác động trực tiếp vào các hàm `insertGiangDay` / `insertGiangDay2` của `importController.js`.
2. **Hợp nhất Code:** Hai hàm này có logic vòng lặp và câu lệnh SQL giống nhau đến 90%. Trong tương lai, nên refactor thành một hàm `saveGiangDayToDB(data, type)` nằm trong `tongHop.repo.js` và truyền cờ phân biệt.
3. **Tuyệt đối không sửa `id_Gvm` của Cơ hữu:** Giá trị `id_Gvm = 1` là xương sống của toàn bộ hệ thống tính Vượt giờ V2. Nếu thay đổi giá trị này, toàn bộ báo cáo Vượt giờ sẽ bị sai số.

---

## 6. Phụ lục: Xử lý Dữ liệu Đồ án Tốt nghiệp (Cơ chế `transformDoAnData`)
Khác với Giảng dạy (dùng 1 cột `GiaoVienGiangDay` và cắt bằng dấu phẩy), module Đồ án Tốt nghiệp sử dụng 2 cột vật lý riêng biệt là `GiangVien1` và `GiangVien2` trong bảng `doantotnghiep`.

### 6.1. Cơ chế bóc tách thông tin
- Chuỗi lưu trữ trong Database (do thao tác import từ Excel) thường có định dạng: `Họ Tên - Loại Giảng Viên - CCCD` 
  *(Ví dụ: `Lê Đức Thuận - Cơ hữu - 001087043676`)*.
- Tầng Service (`datn.service.js`) sử dụng hàm `.split("-")` để trích xuất:
  - `[0]`: Tên giảng viên
  - `[1]`: Phân loại biên chế (`Cơ hữu` hoặc `Giảng viên mời`)
  - `[2]`: Số Căn cước công dân (Dùng để match với DB)

### 6.2. Lỗi ngầm (Bug) đã được khắc phục (Nhận diện sai Cơ hữu)
- **Nguyên nhân (Vấn đề):** Trước đây, logic xác định cờ `isMoiGiang` được viết như sau:
  ```javascript
  isMoiGiang = item.GiangVien1.split("-")[1].toLowerCase() == "cơ hữu" ? 0 : 1;
  ```
  Nếu dữ liệu Excel nhập vào có khoảng trắng thừa quanh dấu gạch nối (ví dụ `" - Cơ hữu - "`), chuỗi bóc ra sẽ là `" Cơ hữu "`. Khi so sánh `" cơ hữu " == "cơ hữu"`, kết quả trả về **FALSE**. 
  **Hậu quả:** Toàn bộ Giảng viên Cơ hữu có chuỗi nhập dư dấu cách bị hệ thống gán nhầm thành Giảng viên mời (`isMoiGiang = 1`) và bị đánh rớt, không được tính vào Vượt giờ dự kiến.
  
- **Giải pháp (Đã Fix):** Bổ sung hàm `.trim()` để tự động dọn dẹp khoảng trắng ở cả 2 cột `GiangVien1` và `GiangVien2`:
  ```javascript
  isMoiGiang = item.GiangVien1.split("-")[1].trim().toLowerCase() == "cơ hữu" ? 0 : 1;
  ```
- **Kết quả:** Hệ thống hiện tại có thể parse an toàn cả 2 định dạng gõ liền `"-"` và gõ cách `" - "`, triệt tiêu hoàn toàn rủi ro GV Cơ hữu bị mất tiết Vượt giờ Đồ án do lỗi gõ phím của giáo vụ.
