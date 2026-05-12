---
name: excel-master-consolidator
description: Analyze and document the consolidation logic in the 'TỔNG HỢP' (Master) sheet. Use this skill when the user asks how data from individual department sheets is gathered, mapped, and summarized into the main report. It focuses on cross-sheet references and the structure of the summary table.
---

# Excel Master Sheet Consolidator

Skill này chuyên dùng để giải mã "bản đồ tham chiếu" trong sheet Tổng hợp. Nhiệm vụ chính là xác định xem mỗi ô trong sheet Tổng hợp đang lấy dữ liệu từ đâu và theo quy tắc nào.

## 1. Quy trình Phân tích (Consolidation Analysis)

1.  **Nhận diện cấu trúc Khối (Block Identification):**
    *   Xác định các vùng dòng tương ứng với từng Khoa (VD: Dòng 14-30 là khoa CNTT).
    *   Tìm các ô chứa công thức tham chiếu sang sheet khác (VD: `='CNTT-092025'!A15`).

2.  **Lập bản đồ Tham chiếu (Reference Mapping):**
    *   Tạo bảng đối chiếu giữa Cột trong Master và Cột trong Dept Sheet.
    *   Phát hiện các ô có logic tính toán thêm tại Master (không chỉ là link đơn thuần).

3.  **Xác định Logic Tổng hợp (Aggregation Logic):**
    *   Kiểm tra các dòng "Cộng" hoặc "Tổng cộng" ở cuối mỗi khối hoặc cuối sheet.
    *   Sử dụng regex hoặc scripts để đếm số lượng tham chiếu ngoại.

## 2. Lưu ý về Liên kết (Link Integrity)

*   **Tên Sheet động:** Chú ý các hậu tố như `-092025`. Skill phải có khả năng nhận diện pattern tên sheet.
*   **Lỗi tham chiếu:** Cảnh báo nếu có ô #REF! hoặc link đến sheet không tồn tại.

## 3. Mẫu kết quả đầu ra (Required Output Format)

### Phân tích Sheet TỔNG HỢP 2025

**1. Bản đồ tham chiếu các Khoa:**
| Khoa | Vùng dòng (Master) | Sheet Nguồn (Source) |
| :--- | :--- | :--- |
| CNTT | 38 - 50 | `CNTT-092025` |
| ... | ... | ... |

**2. Logic ánh xạ cột:**
- Cột A (Master) -> Lấy từ Cột A (Source).
- Cột AK (Master) -> Lấy từ Cột AK (Source).

**3. Mã Python minh họa (Data Loading):**
```python
# Ví dụ loop qua các sheet để lấy dữ liệu
faculty_sheets = ['CNTT-092025', 'CB-092025', ...]
for sheet in faculty_sheets:
    data = load_from_sheet(sheet)
    # Map to master layout...
```

## 4. Tài liệu tham khảo
*   [EXCEL_FORMULA_SPEC.md](./references/EXCEL_FORMULA_SPEC.md): Xem phần 4.2 về Luồng liên kết Master -> Detail.
