---
name: excel-to-html-converter
description: Convert an Excel sheet into a professional, clean HTML table. Use this skill when the user wants to preview a sheet, export data for a report, or create a web-friendly version of a spreadsheet. It handles merged cells, basic formatting, and provides a modern, responsive design.
---

# Excel to HTML Converter

Skill này giúp bạn biến những bảng tính Excel khô khan thành các trang HTML chuyên nghiệp, dễ đọc và sẵn sàng để trình chiếu hoặc nhúng vào báo cáo.

## 1. Hướng dẫn sử dụng (Usage Instructions)

Khi người dùng yêu cầu convert hoặc preview một sheet:

1.  **Xác định Sheet mục tiêu:** Nếu người dùng không nói rõ, hãy hỏi hoặc mặc định là sheet đang được thảo luận.
2.  **Chạy script chuyển đổi:** Sử dụng script `scripts/converter.py` đi kèm.
    ```bash
    python scripts/converter.py "file_name.xlsx" "Sheet Name" "output_name.html"
    ```
3.  **Cung cấp kết quả:** Trả về đường dẫn file HTML và gợi ý người dùng mở để xem kết quả.

## 2. Đặc điểm kỹ thuật (Technical Features)

- **Merged Cells:** Tự động nhận diện và xử lý `rowspan`, `colspan`.
- **Clean Design (Option A):** 
    - Font: Inter (Google Fonts).
    - Header: Sticky header (cố định khi cuộn).
    - Responsive: Tự động co dãn theo màn hình.
    - Hover effect: Highlight dòng đang di chuột.
- **Data Formatting:** Tự động căn phải số, định dạng phân cách hàng nghìn.

## 3. Quy trình thực hiện (Workflow)

1.  **Kiểm tra file:** Đảm bảo file Excel tồn tại.
2.  **Thực thi:** Gọi script Python để tạo file HTML.
3.  **Thông báo:** "Tao đã chuyển đổi xong sheet [Tên Sheet]. Mày có thể xem file HTML tại đây: [Link file]"

## 4. Tài nguyên đi kèm
- `scripts/converter.py`: Core logic chuyển đổi.
- `assets/`: Chứa các file bổ trợ (nếu có).
