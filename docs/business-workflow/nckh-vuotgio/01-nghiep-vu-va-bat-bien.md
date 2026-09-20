# 01 — Nghiệp vụ và bất biến NCKH + Vượt Giờ

> **Ngày chuẩn hóa:** 10/09/2026.

## 1. Actors và phạm vi

| Actor | Trách nhiệm nghiệp vụ |
|---|---|
| Giảng viên/cán bộ nhập liệu | Nhập hoặc chỉnh dữ liệu thuộc phạm vi được cấp quyền; dữ liệu phải validate và ghi đúng DB. |
| Lãnh đạo Khoa | Duyệt dữ liệu thuộc khoa; là cấp đầu của NCKH và Vượt Giờ. |
| Viện NCKH | Duyệt cấp hai cho NCKH. |
| Đào tạo | Duyệt cấp hai cho LNQC và HDTQ. |
| Khảo thí | Duyệt cấp hai cho KTHP. |
| Văn phòng | Kiểm tra và duyệt tổng hợp theo từng khoa; sau đó khóa năm học/snapshot. |
| Hệ thống | Tính phân bổ NCKH, SDO Vượt Giờ, chặn trần NCKH, snapshot và export. |

## 2. Bất biến cấp run

Các điều kiện sau là bắt buộc, nếu vi phạm thì run không được đánh dấu pass:

1. **NCKH hoàn tất trước Vượt Giờ.** Không tạo hoặc duyệt workload Vượt Giờ trước khi NCKH official của cùng năm học đã được xác minh.
2. **Một năm học duy nhất.** NCKH, giảng dạy, Mời Giảng, Đồ Án, LNQC, KTHP, HDTQ, approval, lock, stats và export trong một run phải cùng `NamHoc`.
3. **Đủ phạm vi người dùng.** Tối thiểu hai tài khoản giảng viên cơ hữu thuộc hai khoa khác nhau; nên dùng từ ba tài khoản trở lên để kiểm tra grouping và luồng nhiều người dùng.
4. **Đủ phạm vi NCKH.** Phải phủ đủ cả tám loại NCKH, không chỉ kiểm tra Đề tài/dự án.
5. **Không tính lecturer mời như giảng viên cơ hữu.** Chỉ lecturer cơ hữu được đưa vào số tiết giảng dạy/chặn trần. Nếu record mời giảng lọt vào SDO cơ hữu thì đó là defect.
6. **Mutation tuần tự.** Mỗi POST/PATCH/DELETE/approval/lock phải hoàn tất, kiểm tra HTTP và GET lại trước khi bước sau bắt đầu.
7. **Profile riêng.** Mỗi actor/agent dùng một browser context/profile riêng; không chia sẻ cookie/session.
8. **Không khóa khi prerequisite thiếu.** Không bypass điều kiện bằng SQL trực tiếp để làm cho test xanh.
9. **Official stats/export sau snapshot.** Vượt Giờ chính thức chỉ được kết luận từ snapshot sau bước Văn phòng duyệt và khóa năm học.
10. **Đồng nhất cuối run.** Khi mọi record đã duyệt tới cấp tối đa và đã materialize/snapshot, projected và official phải bằng nhau theo cùng khóa so sánh.

## 3. Hai trạng thái tính toán

### 3.1 Dự kiến (projected/preview)

Dự kiến phản ánh dữ liệu đang có, chưa yêu cầu approval hoàn tất:

- NCKH: lấy mọi record trong năm học, kể cả chưa duyệt.
- Vượt Giờ direct input: lấy mọi bản ghi LNQC/KTHP/HDTQ, kể cả chưa duyệt.
- Giảng dạy/Mời Giảng/Đồ Án: dùng nguồn projected tương ứng; chỉ loại dữ liệu mời giảng theo rule hệ thống, không biến bản ghi mời thành lecturer cơ hữu.
- Dự kiến có thể thay đổi khi nguồn live thay đổi; không phải snapshot bất biến.

### 3.2 Chính thức (official)

Chính thức là tập dữ liệu đủ điều kiện nghiệp vụ:

- NCKH: `khoa_duyet=1` **và** `vien_nc_duyet=1`.
- LNQC: `khoa_duyet=1` **và** `dao_tao_duyet=1`.
- KTHP: `khoa_duyet=1` **và** `khao_thi_duyet=1` trên bản ghi cha.
- HDTQ: `khoa_duyet=1` **và** `dao_tao_duyet=1`.
- Giảng dạy/Mời Giảng: phải được lưu/materialize sang nguồn chính thức (`giangday` hoặc nguồn hợp đồng tương ứng) trước khi official Vượt Giờ đọc.
- Đồ Án: official đọc nguồn đã export/materialize và loại `isMoiGiang != 0`.

## 4. NCKH — nghiệp vụ bắt buộc

### 4.1 Đủ tám loại

| # | Loại nghiệp vụ | Mã kỹ thuật | Điểm phải kiểm tra |
|---:|---|---|---|
| 1 | Đề tài, dự án | `DETAI_DUAN` | Chủ nhiệm/participant, phân loại, mã đề tài, năm, ngày. |
| 2 | Bài báo khoa học | `BAIBAO` | Tên tạp chí/hội thảo là field bắt buộc. |
| 3 | Sáng kiến | `SANGKIEN` | Kết quả/xếp loại, ngày, tác giả chính. |
| 4 | Giải thưởng và sáng chế | `GIAITHUONG` | Mã số, quyết định nếu hiển thị, kết quả/xếp loại. |
| 5 | Đề xuất nghiên cứu | `DEXUAT` | Chế độ equal-hour, participant và thời lượng. |
| 6 | Sách, giáo trình | `SACHGIAOTRINH` | Thông tin xuất bản/mã, participant, thời lượng. |
| 7 | Hướng dẫn SV NCKH | `HUONGDAN` | Mã đề tài, cán bộ hướng dẫn, participant. |
| 8 | Thành viên hội đồng khoa học | `HOIDONG` | Số quyết định/mã số, một member, vai trò hợp lệ. |

Rendered form là nguồn xác định field required. Không suy ra required field chỉ từ tên type trong code.

### 4.2 Cấp duyệt

```text
NCKH nhập
  → Khoa duyệt (`khoa_duyet`)
  → Viện NCKH duyệt (`vien_nc_duyet`)
  → NCKH official
```

NCKH thống kê dự kiến và chính thức phải được chạy riêng và ghi rõ scope. Khi tất cả record đã qua hai cấp, dự kiến và chính thức của NCKH phải bằng nhau.

## 5. Vượt Giờ — nguồn và cấp duyệt

### 5.1 Nguồn workload

| Nguồn | Dự kiến | Chính thức | Cấp duyệt direct input |
|---|---|---|---|
| Giảng dạy | `quychuan`/mapping live | `giangday` | Theo luồng Mời Giảng/giảng dạy trước đó. |
| Đồ Án | `doantotnghiep` | `exportdoantotnghiep` | Theo luồng Đồ Án. |
| LNQC | Bản ghi hiện có, không lọc approval | `khoa_duyet=1` + `dao_tao_duyet=1` | Khoa → Đào tạo. |
| KTHP | Parent/child hiện có, không lọc approval | `khoa_duyet=1` + `khao_thi_duyet=1` | Khoa → Khảo thí. |
| HDTQ | Bản ghi hiện có, không lọc approval | `khoa_duyet=1` + `dao_tao_duyet=1` | Khoa → Đào tạo. |
| NCKH | Luôn gọi NCKH official trong cross-module | NCKH official | Khoa → Viện NCKH. |

### 5.2 Ba cấp của Vượt Giờ

```text
Khoa
  → Phòng xét duyệt tương ứng
      LNQC/HDTQ → Đào tạo
      KTHP      → Khảo thí
  → Văn phòng duyệt tổng hợp từng khoa
  → Lưu/khóa dữ liệu năm học
```

Văn phòng chỉ được duyệt khoa sau khi pre-check của khoa báo đạt. Điều kiện khóa yêu cầu các khoa thật (`phongban.isKhoa=1`) đã được Văn phòng duyệt. Nhóm `BGĐ&PHONG` được gom để báo cáo nhưng không làm mẫu số khóa như khoa thật.

## 6. Công thức nghiệp vụ cần assert

Với mỗi lecturer cơ hữu trong cùng một năm học:

```text
tongThucHien = giangDay + LNQC + KTHP + DATN + HDTQ
thieuNCKH = max(0, dinhMucNCKH - soTietNCKHOfficial)
tongVuot = max(0, tongThucHien - thieuNCKH - dinhMucSauMienGiam)
thanhToan = min(tongVuot, dinhMucSauMienGiam)
```

NCKH official làm giảm phần thiếu NCKH/chặn trần theo code hiện hành; không dùng NCKH preview để kết luận số liệu Vượt Giờ official.

## 7. Điều kiện pass/fail của nghiệp vụ

- **Nhập:** form cho nhập được; validation đúng; HTTP thành công; row trong DB đúng field/type/năm/khoa/lecturer.
- **CRUD:** sửa/xóa đúng quyền trước duyệt; dữ liệu đã duyệt bị bảo vệ theo rule; GET sau mutation trả dữ liệu đúng.
- **Duyệt:** đúng actor, đúng cấp, đúng thứ tự; payload không làm tụt cờ đã duyệt; DB phản ánh đúng cờ.
- **Dự kiến:** bao gồm mọi record trong phạm vi, kể cả chưa duyệt hoặc mới duyệt một phần.
- **Chính thức:** chỉ bao gồm record duyệt max cấp/materialize đúng nguồn.
- **NCKH:** sau đủ hai cấp, stats official phản ánh đủ tám loại và đúng tổng participant hours.
- **Vượt Giờ:** sau đủ cấp + VP + lock, snapshot có đúng raw data, SDO, NCKH và tổng tính toán.
- **Đồng nhất:** nếu mọi record đã duyệt tối đa, projected = official; nếu còn pending thì chênh lệch phải giải thích được bằng record pending.
