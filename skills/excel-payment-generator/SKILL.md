---
name: excel-payment-generator
description: Analyze and document the final payment logic in the 'Tiền chuyển khoản' sheet. Use this skill when the user asks about the final amounts to be paid to each department or the bank transfer list generation. It focuses on the final aggregation of calculated values for payout.
---

# Excel Payment Sheet Generator

Skill này tập trung vào giai đoạn cuối cùng của quy trình: Kết xuất số tiền cần thanh toán cho từng đơn vị/cá nhân dựa trên kết quả từ sheet Tổng hợp.

## 1. Quy trình Phân tích (Payment Analysis)

1.  **Xác định nguồn tiền (Payment Sources):**
    *   Trace ngược các ô trong sheet `Tiền chuyển khoản` về sheet `TỔNG HỢP 2025`.
    *   Thường là các hàm `SUM` các ô tổng cộng của từng Khoa.

2.  **Kiểm tra tính toàn vẹn (Integrity Check):**
    *   Đảm bảo tổng tiền tại sheet Payment khớp chính xác với tổng tiền tại sheet Master.
    *   Phát hiện các khoản phụ thu hoặc khấu trừ (nếu có) được thực hiện ở bước này.

3.  **Định dạng đầu ra (Output Formatting):**
    *   Mô tả cấu trúc danh sách ngân hàng (Số tài khoản, Tên đơn vị, Số tiền).

## 2. Mẫu kết quả đầu ra (Required Output Format)

### Phân tích Sheet Tiền chuyển khoản

**1. Nguồn dữ liệu:**
Dữ liệu được tổng hợp từ các dòng tổng cộng của sheet `TỔNG HỢP 2025`.

**2. Bảng đối soát nhanh:**
| Đơn vị | Số tiền (Master) | Số tiền (Payment) | Trạng thái |
| :--- | :--- | :--- | :--- |
| Khoa CNTT | [Amount] | [Amount] | OK |

**3. Mã Python minh họa (Bank List):**
```python
def generate_bank_list(master_summary):
    payment_list = []
    for dept, amount in master_summary.items():
        payment_list.append({
            "dept": dept,
            "total": amount
        })
    return payment_list
```

## 3. Tài liệu tham khảo
*   [EXCEL_FORMULA_SPEC.md](./references/EXCEL_FORMULA_SPEC.md): Xem phần 4.3 về Luồng liên kết Master -> Payment.
