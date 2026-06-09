# Kiến Trúc Tổng Hợp Dữ Liệu Vượt Giờ (Data Consolidation Architecture)

Tài liệu này làm rõ cơ chế lấy và tổng hợp dữ liệu từ nhiều nguồn khác nhau trong module Vượt Giờ V2, đặc biệt tập trung vào cách hệ thống định danh giảng viên (`id_User`) để gom nhóm dữ liệu một cách chính xác.

## 1. Nguyên Tắc Cốt Lõi: \`id_User\` là khóa chính (Core Key)
Mọi logic tính toán, gom nhóm, và hiển thị trên Dashboard hay báo cáo Tài chính đều dựa vào `id_User` của bảng `nhanvien` làm khóa chính. Bất kể dữ liệu đến từ môn học, đồ án, tham quan hay ngoại quy chuẩn, chúng đều phải được "quy về" một `id_User` duy nhất.

## 2. Hai Luồng Dữ Liệu Tách Biệt

Hệ thống vượt giờ hoạt động dựa trên 2 luồng trạng thái dữ liệu:

### A. Luồng Chính Thức (Official / Đã Lưu)
Đây là dữ liệu được chốt hạ (Snapshot) để tính tiền, xuất PDF, và gửi báo cáo Tài chính.

**Đặc điểm:** Dữ liệu được lưu trong các bảng tĩnh. Hầu hết các bảng này được thiết kế chuẩn từ đầu, ngoại trừ bảng Đồ án do kế thừa từ hệ thống cũ.

| Nguồn Dữ Liệu (Bảng) | Chứa \`id_User\`? | Cơ Chế Truy Vấn (Repository) |
| :--- | :--- | :--- |
| **\`giangday\`** (Môn học) | ✅ Có | Dùng trực tiếp: `WHERE id_User = ?` |
| **\`kiem_tra_hoc_phan\`** | ✅ Có | Dùng trực tiếp: `WHERE id_User = ?` |
| **\`loai_ngoai_quy_chuan\`** | ✅ Có | Dùng trực tiếp: `WHERE id_User = ?` |
| **\`huongdanthamquan\`** | ✅ Có | Dùng trực tiếp: `WHERE id_User = ?` |
| **\`exportdoantotnghiep\`** | ❌ Không (NULL) | Bắt buộc phải **`LEFT JOIN nhanvien`** thông qua `CCCD` để tự động đắp `id_User` vào kết quả trả về. |

*Lý do bảng exportdoantotnghiep thiếu `id_User`:* Do luồng import file Excel đồ án gốc không bóc tách và map `id_User` lúc lưu xuống DB, dẫn đến cột này bị rỗng. Việc sử dụng JOIN bằng CCCD (cột duy nhất không thay đổi) đảm bảo tính toàn vẹn dữ liệu.

---

### B. Luồng Dự Kiến (Projected / Tạm Tính)
Đây là luồng dữ liệu "sống", lấy trực tiếp từ các file Excel gốc tải lên, phục vụ việc xem trước số lượng tiết học khi chưa chính thức chốt.

**Đặc điểm:** Dữ liệu thô, 100% không có `id_User` ở dưới Database.

| Nguồn Dữ Liệu (Bảng) | Chứa \`id_User\`? | Cơ Chế Mapping (Service / Code JS) |
| :--- | :--- | :--- |
| **\`quychuan\`** (Môn học thô) | ❌ Không | Lấy toàn bộ danh sách lên bộ nhớ (RAM). Dùng logic code Node.js để tìm khớp `Tên Giảng Viên` với mảng `nhanvien` và tự gán `id_User` bằng code. |
| **Dữ liệu Excel Đồ Án thô** | ❌ Không | Tương tự như quy chuẩn, map bằng Javascript dựa vào `Tên Giảng Viên` hoặc `CCCD`. |

*Nhược điểm của luồng Dự kiến:* Rất dễ bị sai sót nếu có 2 giảng viên trùng tên ở 2 khoa khác nhau. Đó là lý do Luồng Chính Thức (dùng id_User và CCCD) được ưu tiên tuyệt đối cho báo cáo Tài chính.

## 3. Tổng Kết Luồng Code (Code Flow) trong \`tongHop.repo.js\`

Khi một request yêu cầu "Lấy toàn bộ dữ liệu vượt giờ của giảng viên X (`idUser = 123`)", `tongHop.repo.js` hoạt động như sau:

1. **Lấy Thông tin cá nhân:** Query bảng `nhanvien` bằng `idUser = 123`.
2. **Lấy Giảng dạy (Môn học):** Query bảng `giangday` với `WHERE id_User = 123`.
3. **Lấy Tham quan / Khảo sát:** Query bảng `huongdanthamquan` với `WHERE id_User = 123`.
4. **Lấy Ngoại quy chuẩn & Kiểm tra:** Query bảng `loai_ngoai_quy_chuan` và `kiem_tra_hoc_phan` với `WHERE id_User = 123`.
5. **Lấy Đồ án:**
   - Database truy vấn bảng `exportdoantotnghiep`.
   - Kết hợp `LEFT JOIN nhanvien ON exportdoantotnghiep.CCCD = nhanvien.CCCD`.
   - Lọc ra những dòng có `nhanvien.id_User = 123` *(Đã được fix)*.

## 4. Best Practices Khuyến Nghị Cho Tương Lai
- **Không bao giờ dùng Tên để JOIN trong SQL:** Nếu bảng bị thiếu khóa ngoại, hãy luôn dùng `CCCD` (Căn cước công dân) làm khóa phụ để JOIN với bảng `nhanvien`.
- **Tuyệt đối tuân thủ tham số \`isDuKien\`:** Ở Controller và Route phục vụ in ấn báo cáo tài chính (PDF/Excel), luôn phải cứng định `isDuKien = false` để ép hệ thống gọi vào Luồng Chính Thức (đã qua JOIN/chuẩn hóa) thay vì Luồng Dự Kiến (thiếu chính xác do map bằng Tên).
