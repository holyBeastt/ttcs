---
name: excel-dept-analyzer
description: Analyze, extract, and document business logic from department-specific Excel sheets (e.g., 'CNTT-092025', 'CB-092025', 'DTVM-092025', 'ATTT-092025', 'PHÂN HIỆU', etc.). Use this skill for historical workbook forensics and for comparing workbook formulas with the current Vượt Giờ V2 runtime; do not assume a 300-hour cap or TRUNC unit-rate formula is active without source-code evidence.
---

# Excel Department Sheet Analyzer

> **Source-of-truth status:** This skill analyzes workbook artifacts. The current application runtime is authoritative and is implemented in `src/mappers/vuotgio_v2/`, `src/services/vuotgio_v2/department_excel/data/calculator.js`, and the snapshot services. Existing workbook fixtures may encode historical formulas; label those findings as historical rather than presenting them as current policy.

Skill này chuyên dùng để mổ xẻ các sheet chi tiết của từng Khoa/Phòng. Tất cả các sheet này đều tuân theo một bộ quy tắc tính toán thống nhất nhưng có dữ liệu đầu vào khác nhau.

## 1. Quy trình Phân tích (Analysis Workflow)

Khi nhận được yêu cầu cho một sheet Khoa cụ thể:

1.  **Xác định biến đầu vào (Inputs):**
    *   `base_income` (Cột C): Lương thực nhận.
    *   `required_hours` (Cột G): Định mức giờ giảng.
    *   `hours_by_source`: Tiết thực dạy chia theo các nguồn (VN, Lào, CPC, Đóng HP...).

2.  **Trích xuất Logic đặc trưng:**
    *   **Tính đơn giá:** Ghi lại đúng công thức trong workbook. Runtime hiện hành dùng `ROUND(luong / 176, 0)` trong `PaymentCalculator`; nếu workbook dùng `TRUNC`, đó là khác biệt cần gắn nhãn.
    *   **Áp trần:** Ghi lại đúng công thức trong workbook. Runtime hiện hành khai báo `MAX_PAYABLE_HOURS = 300` nhưng calculator không áp dụng hằng số này; không gọi 300 là policy hiện hành nếu chưa có source evidence.
    *   **Phân bổ nguồn:** So sánh cách workbook phân bổ với `computeSdoBreakdown()` (năm nhóm `vn`, `lao`, `cuba`, `cpc`, `dongHP`).

3.  **Tạo Đặc tả Kỹ thuật (Technical Spec):**
    *   Liệt kê các hằng số (Magic numbers) tìm thấy (VD: 176).
    *   Viết mã Python minh họa cho logic của sheet đó.

## 2. Quy tắc về Độ chính xác (Precision Rules)

*   **Hàm TRUNC:** Luôn dịch sang `math.floor(x * 10**n) / 10**n` hoặc xử lý tương đương để đảm bảo tiền không bị lệch 1 đồng.
*   **Hàm ROUND:** Dùng trong bước phân bổ tiết (thường làm tròn đến số nguyên).

## 3. Mẫu kết quả đầu ra (Required Output Format)

### [Tên Sheet] - Phân tích Logic Tính toán

Ghi rõ một trong hai kết luận:

- **Khớp runtime hiện hành**, hoặc
- **Công thức lịch sử của workbook** — nêu khác biệt với source hiện hành.

**1. Từ điển dữ liệu ô:**
- `AE14`: Đơn giá thanh toán.
- `AD14`: Tiết vượt áp trần.

**2. Mô tả Logic:**
[Giải thích bằng lời các bước tính toán]

**3. Mã Python minh họa:**
```python
import math

def calculate_payment(base_income, payable_hours):
    # Current runtime rate; a historical workbook may use another formula.
    unit_rate = round(base_income / 176)
    payable = max(0, payable_hours)
    # MAX_PAYABLE_HOURS = 300 exists in source but is not applied here.
    return payable * unit_rate
```

## 4. Tài liệu tham khảo
*   [EXCEL_FORMULA_SPEC.md](./references/EXCEL_FORMULA_SPEC.md): Tài liệu gốc về hệ thống tính toán vượt giờ.
