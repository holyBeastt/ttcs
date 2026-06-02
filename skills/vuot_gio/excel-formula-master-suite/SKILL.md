# Skill: Excel Formula Analysis & Visualization Suite (Master)

Hệ thống chuyên gia phân tích, xử lý và trực quan hóa dữ liệu Excel cho bài toán tính toán vượt giờ.

## Overview
Bộ Skill này là "bộ não" tổng hợp, điều phối 4 Skill chuyên biệt để giải quyết trọn vẹn quy trình từ phân tích logic thô, đối soát dữ liệu đa tầng, cho đến xuất báo cáo HTML chuyên nghiệp.

## Architecture & Sub-Skills
Hệ thống được chia thành 4 phân khu chức năng (Sub-Skills) hoạt động phối hợp:

### 1. `excel-dept-analyzer` (Chuyên gia Phân tích Khoa)
*   **Chức năng:** Giải mã logic tính toán tại các sheet Khoa chi tiết.
*   **Nhiệm vụ trọng tâm:** 
    *   Xử lý quy trình tính đơn giá, áp trần 300 tiết/năm.
    *   Kiểm tra logic phân bổ nguồn (Ngân sách nhà nước vs. Nguồn thu học phí).
    *   Nhận diện các hằng số kế toán (ví dụ: định mức 176 tiết).

### 2. `excel-master-consolidator` (Chuyên gia Đối soát & Mapping)
*   **Chức năng:** Quản lý mối liên kết giữa sheet Tổng hợp và các sheet con.
*   **Nhiệm vụ trọng tâm:**
    *   Phân tích các hàm `VLOOKUP`, `INDEX/MATCH` để xác định luồng dữ liệu.
    *   Đảm bảo tính nhất quán khi dữ liệu được kéo từ sheet Khoa về sheet Master.
    *   Phát hiện lỗi lệch tên, lệch mã nhân viên giữa các bảng.

### 3. `excel-payment-generator` (Chuyên gia Quyết toán)
*   **Chức năng:** Tổng hợp kết quả thanh toán cuối cùng.
*   **Nhiệm vụ trọng tâm:**
    *   Tính toán dòng tiền chuyển khoản thực tế sau thuế/khấu trừ.
    *   Kiểm tra các hàm `SUM`, `ROUND`, `TRUNC` ở cấp độ toàn hệ thống.
    *   Đảm bảo số liệu khớp với sheet "Tiền chuyển khoản".

### 4. `excel-to-html-converter` (Chuyên gia Trực quan hóa)
*   **Chức năng:** Chuyển đổi bảng tính Excel sang giao diện HTML.
*   **Nhiệm vụ trọng tâm:**
    *   Tạo bản xem trước (Preview) chuyên nghiệp với style "Clean & Professional".
    *   Giữ nguyên cấu trúc ô gộp (Merged Cells).
    *   Tự động lọc bỏ các cột rác, cột thừa không có tiêu đề.

## Workflow Example
1.  **Analyze**: Dùng `excel-dept-analyzer` để hiểu cách tính tiết của Khoa CNTT.
2.  **Verify**: Dùng `excel-master-consolidator` để check xem tiết đó đã được kéo đúng về sheet TỔNG HỢP chưa.
3.  **Generate**: Dùng `excel-payment-generator` để chốt số tiền cuối cùng ở sheet Tiền chuyển khoản.
4.  **Visualize**: Dùng `excel-to-html-converter` để xuất file HTML gửi cho Ban giám đốc duyệt.

## User Persona
Dành cho kế toán, quản lý nhân sự và các chuyên gia dữ liệu cần độ chính xác tài chính tuyệt đối trong môi trường Excel phức tạp.

## Reference Documents
*   `references/EXCEL_FORMULA_SPEC.md`: Tài liệu kỹ thuật chi tiết về các hàm và logic làm tròn.
