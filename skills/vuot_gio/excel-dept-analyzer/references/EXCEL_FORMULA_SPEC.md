## 1. Kiến trúc Hệ thống (System Architecture)

Hệ thống bao gồm 3 loại sheet chính được liên kết chặt chẽ:

1.  **Worksheets Chi tiết (Dept Sheets):** Mỗi khoa/phòng có 1 sheet riêng (VD: `CNTT-092025`, `CB-092025`, `DTVM-092025`,...). Cấu trúc nội bộ các sheet này là **giống hệt nhau**.
2.  **Sheet Tổng hợp (Master):** Duy nhất sheet `TỔNG HỢP 2025`. Sheet này chứa bảng tính tập hợp, mỗi khối dòng sẽ đại diện cho một Khoa và liên kết đến sheet chi tiết tương ứng.
3.  **Sheet Thanh toán (Payment):** Duy nhất sheet `Tiền chuyển khoản`. Tổng hợp số tiền từ Master để kết xuất danh sách ngân hàng.

---

## 2. Từ điển Dữ liệu (Data Dictionary)

Dưới đây là ánh xạ giữa các cột Excel và biến logic:

| Excel Col | Tên biến (Logic Name) | Ý nghĩa |
| :--- | :--- | :--- |
| **C** | `base_income` | Thu nhập cơ bản (lương thực nhận). |
| **G** | `required_hours` | Định mức giờ giảng phải hoàn thành. |
| **H** | `s1_hours_vn` | Tiết thực dạy VN - Học kỳ I. |
| **M** | `s2_hours_vn` | Tiết thực dạy VN - Học kỳ II. |
| **R** | `total_hours_vn` | Tổng tiết thực dạy nguồn VN. |
| **W** | `grand_total_hours` | Tổng cộng tiết thực dạy tất cả các nguồn. |
| **AC** | `actual_excess_hours` | Số tiết vượt thực tế (chưa áp trần). |
| **AD** | `capped_excess_hours` | Số tiết vượt được thanh toán (đã áp trần 300). |
| **AE** | `unit_rate` | Mức thanh toán chuẩn (Đơn giá mỗi tiết). |
| **AK** | `total_payment` | Tổng số tiền vượt giờ thực nhận. |

---

## 2. Quy trình Tính toán Chi tiết (Calculation Logic)

Các bước này phải được thực hiện theo đúng trình tự để đảm bảo độ chính xác.

### Bước 1: Tính Đơn giá (Unit Rate)
Công thức dựa trên thu nhập và hằng số giờ chuẩn (176).
```python
# Excel: AE14 = TRUNC(C14/176, 1)
unit_rate = floor(base_income / 176, 1) # Lấy 1 chữ số thập phân
```

### Bước 2: Tổng hợp tiết dạy theo nguồn
Thực hiện cho từng nguồn (VN, Lào, Cuba, CPC, Đóng HP).
```python
# Excel: R = H + M
total_hours_vn = s1_hours_vn + s2_hours_vn
# Tương tự cho các nguồn khác...
grand_total_hours = sum(total_hours_all_sources)
```

### Bước 3: Xác định số tiết vượt và Áp trần (Capping)
Quy tắc: Không thanh toán quá 300 tiết vượt giờ.
```python
# Excel: AC = W - G
actual_excess_hours = grand_total_hours - required_hours

# Excel: AD = IF(AC>=0, IF(AC<=300, AC, 300), 0)
if actual_excess_hours < 0:
    capped_excess_hours = 0
else:
    capped_excess_hours = min(actual_excess_hours, 300)
```

### Bước 4: Phân bổ tiết vượt theo tỷ lệ (Distribution)
Nếu giảng viên dạy nhiều nguồn, số tiết `capped_excess_hours` phải được chia tỷ lệ.
```python
# Excel: X = IF(W>0, ROUND(R/W * AD, 0), 0)
distributed_hours_vn = round((total_hours_vn / grand_total_hours) * capped_excess_hours, 0)

# Lưu ý: Nguồn cuối cùng (AB) dùng phép trừ để đảm bảo tổng các phần lẻ bằng đúng số tổng (tránh lệch do làm tròn)
# AB = AD - (X + Y + Z + AA)
distributed_hours_last = capped_excess_hours - sum(other_distributed_hours)
```

### Bước 5: Tính Tiền thực nhận
Áp dụng đơn giá cho từng nguồn đã phân bổ.
```python
# Excel: AF = TRUNC(X * AE, 2)
payment_vn = floor(distributed_hours_vn * unit_rate, 2)

# Excel: AK = TRUNC(AD * AE, 2)
grand_total_payment = floor(capped_excess_hours * unit_rate, 2)
```

---

## 3. Quy tắc làm tròn & Chính xác (Precision Rules)

Đây là phần quan trọng nhất để AI gen code không bị lệch tiền với Excel:

1.  **Hàm TRUNC (Excel):** Tương đương với việc cắt cụt phần thập phân (không phải làm tròn `ROUND`).
    *   `TRUNC(x, 1)`: Cắt lấy 1 số sau phẩy.
    *   `TRUNC(x, 2)`: Cắt lấy 2 số sau phẩy.
2.  **Hàm ROUND (Excel):** Làm tròn thông thường đến số nguyên gần nhất (trong bước phân bổ tiết).
3.  **Hằng số:** Giá trị `176` là cố định trong hệ thống này.

---

## 4. Đặc tả liên kết Đa sheet (Multi-sheet Mapping)

Để gen code hoặc xử lý tự động, AI cần hiểu cách các sheet liên kết:

### 4.1. Quy tắc đặt tên Sheet Khoa
Các sheet chi tiết thường có hậu tố ngày tháng (VD: `-092025`). Khi lập trình, cần xử lý danh sách tên sheet động.

### 4.2. Luồng liên kết Master -> Detail
Trong sheet `TỔNG HỢP 2025`:
*   Dữ liệu từ cột A đến Q và cột AE đến AK được **Link trực tiếp** từ sheet chi tiết tương ứng.
*   Ví dụ: Tại khối của khoa CNTT, ô `A38` sẽ có công thức `='CNTT-092025'!A15`.
*   AI cần tạo một vòng lặp (Loop) qua danh sách các Khoa để ánh xạ (Map) dữ liệu vào bảng tổng hợp.

### 4.3. Luồng liên kết Master -> Payment
Trong sheet `Tiền chuyển khoản`:
*   Số tiền được tính bằng hàm `SUM` theo từng khối đơn vị từ sheet `TỔNG HỢP 2025`.

---

## 5. Các quy tắc kỹ thuật cần lưu ý
*Tài liệu đặc tả này được thiết kế để Model AI có thể hiểu và chuyển đổi thành code logic tương đương 100%.*
