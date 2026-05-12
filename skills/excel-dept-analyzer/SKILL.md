---
name: excel-dept-analyzer
description: Analyze, extract, and document business logic from department-specific Excel sheets (e.g., 'CNTT-092025', 'CB-092025', 'DTVM-092025', 'ATTT-092025', 'PHÂN HIỆU', etc.). Use this skill whenever the user asks to explain calculations for a specific faculty or department, especially regarding unit rates, the 300-hour cap, and workload distribution across different funding sources.
---

# Excel Department Sheet Analyzer

Skill này chuyên dùng để mổ xẻ các sheet chi tiết của từng Khoa/Phòng. Tất cả các sheet này đều tuân theo một bộ quy tắc tính toán thống nhất nhưng có dữ liệu đầu vào khác nhau.

## 1. Quy trình Phân tích (Analysis Workflow)

Khi nhận được yêu cầu cho một sheet Khoa cụ thể:

1.  **Xác định biến đầu vào (Inputs):**
    *   `base_income` (Cột C): Lương thực nhận.
    *   `required_hours` (Cột G): Định mức giờ giảng.
    *   `hours_by_source`: Tiết thực dạy chia theo các nguồn (VN, Lào, CPC, Đóng HP...).

2.  **Trích xuất Logic đặc trưng:**
    *   **Tính Đơn giá:** Kiểm tra công thức tại cột `AE`. Quy tắc chuẩn: `TRUNC(base_income / 176, 1)`.
    *   **Áp trần 300:** Kiểm tra công thức tại cột `AD`. Quy tắc: Nếu vượt > 300 thì chỉ tính 300.
    *   **Phân bổ nguồn:** Kiểm tra cách chia số tiết vượt đã áp trần cho từng nguồn quỹ tương ứng.

3.  **Tạo Đặc tả Kỹ thuật (Technical Spec):**
    *   Liệt kê các hằng số (Magic numbers) tìm thấy (VD: 176).
    *   Viết mã Python minh họa cho logic của sheet đó.

## 2. Quy tắc về Độ chính xác (Precision Rules)

*   **Hàm TRUNC:** Luôn dịch sang `math.floor(x * 10**n) / 10**n` hoặc xử lý tương đương để đảm bảo tiền không bị lệch 1 đồng.
*   **Hàm ROUND:** Dùng trong bước phân bổ tiết (thường làm tròn đến số nguyên).

## 3. Mẫu kết quả đầu ra (Required Output Format)

### [Tên Sheet] - Phân tích Logic Tính toán

**1. Từ điển dữ liệu ô:**
- `AE14`: Đơn giá thanh toán.
- `AD14`: Tiết vượt áp trần.

**2. Mô tả Logic:**
[Giải thích bằng lời các bước tính toán]

**3. Mã Python minh họa:**
```python
import math

def calculate_payment(base_income, actual_excess):
    unit_rate = math.floor(base_income / 176 * 10) / 10
    capped_excess = min(max(0, actual_excess), 300)
    # ... logic tiếp theo
```

## 4. Tài liệu tham khảo
*   [EXCEL_FORMULA_SPEC.md](./references/EXCEL_FORMULA_SPEC.md): Tài liệu gốc về hệ thống tính toán vượt giờ.
