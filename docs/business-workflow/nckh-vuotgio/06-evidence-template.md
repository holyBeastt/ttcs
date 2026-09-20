# 06 — Evidence template cho mỗi lần chạy

Template này dùng cho run business E2E. Không ghi secret, password hoặc cookie.

## 1. Run metadata

```markdown
## Run YYYY-MM-DD HH:mm (Asia/Ho_Chi_Minh)
- App/base URL:
- Năm học duy nhất:
- Browser/MCP:
- Profile/context map:
- Test title/code prefix:
- Backup path (nếu có):
- Snapshot/version trước run:
- Snapshot/version sau run:
- Người phê duyệt cleanup/rollback (nếu có):
```

## 2. Stage log

| Seq | Stage | Actor/profile | Method + URL | Target ID | HTTP | Persisted assertion | Evidence path |
|---:|---|---|---|---:|---:|---|---|
| 1 | Baseline | | | | | | |
| 2 | NCKH create | | | | | | |
| 3 | NCKH preview | | | | | | |
| 4 | NCKH Khoa | | | | | | |
| 5 | NCKH Viện | | | | | | |
| 6 | NCKH official stats/export | | | | | | |
| 7 | Mời Giảng backup | | | | | | |
| 8 | Mời Giảng Kỳ 2 approve/save | | | | | | |
| 9 | Vượt Giờ projected input | | | | | | |
| 10 | Vượt Giờ Khoa | | | | | | |
| 11 | Đào tạo/Khảo thí | | | | | | |
| 12 | Vượt Giờ official live | | | | | | |
| 13 | VP pre-check/approval | | | | | | |
| 14 | Lock/snapshot | | | | | | |
| 15 | Stats/export official | | | | | | |
| 16 | Equality | | | | | | |
| 17 | Cleanup/rollback | | | | | | |

## 3. NCKH type coverage

| Type | Code | Record ID | Lecturer/id_User | Khoa | Preview | Khoa duyệt | Viện duyệt | Official stats | Cleanup |
|---|---|---:|---|---|---:|---:|---:|---:|---:|
| Đề tài, dự án | `DETAI_DUAN` | | | | | | | | |
| Bài báo khoa học | `BAIBAO` | | | | | | | | |
| Sáng kiến | `SANGKIEN` | | | | | | | | |
| Giải thưởng và sáng chế | `GIAITHUONG` | | | | | | | | |
| Đề xuất nghiên cứu | `DEXUAT` | | | | | | | | |
| Sách, giáo trình | `SACHGIAOTRINH` | | | | | | | | |
| Hướng dẫn SV NCKH | `HUONGDAN` | | | | | | | | |
| Thành viên hội đồng khoa học | `HOIDONG` | | | | | | | | |

## 4. Workload/approval coverage

| Source | Draft/staging ID | Projected observed | Khoa | Phòng cấp 2 | Official observed | Snapshot raw ID |
|---|---:|---:|---:|---:|---:|---:|
| Giảng dạy | | | | | | |
| Đồ Án | | | | | | |
| Mời Giảng Kỳ 1 | | | | | | |
| Mời Giảng Kỳ 2 | | | | | | |
| LNQC | | | | Đào tạo | | |
| KTHP | | | | Khảo thí | | |
| HDTQ | | | | Đào tạo | | |

## 5. Equality report

| Key `(NamHoc,id_User,khoa)` | Projected | Official/snapshot | Delta | Raw explanation |
|---|---:|---:|---:|---|
| | | | | |

So sánh tối thiểu: số lecturer, `soTietGiangDay`, `soTietNgoaiQC`, `soTietKTHP`, `soTietDoAn`, `soTietHDTQ`, `soTietNCKH`, `tongThucHien`, `thieuNCKH`, `tongVuot`, `thanhToan`.

## 6. Approval/recovery log

| Time | Error/status | Exact response/body | Root cause | Recovery | Retest |
|---|---|---|---|---|---|
| | | | | | |

## 7. Final checklist

- [ ] NCKH đủ 8 loại.
- [ ] Có ít nhất 2 lecturer cơ hữu thuộc 2 khoa.
- [ ] Tất cả nguồn cùng một năm học.
- [ ] NCKH preview lấy pending, Khoa-only và full approval.
- [ ] NCKH official chỉ lấy đủ Khoa + Viện.
- [ ] NCKH official đã được Vượt Giờ sử dụng.
- [ ] Vượt Giờ projected lấy mọi record đã vào nguồn aggregation.
- [ ] Vượt Giờ official lọc đủ Khoa + Đào tạo/Khảo thí.
- [ ] VP đã duyệt từng khoa thật.
- [ ] Năm đã lock; snapshot có version, raw, SDO và NCKH.
- [ ] Stats/export official đọc snapshot và file hợp lệ.
- [ ] Khi all approved/materialized, projected = official ở lecturer/khoa/tổng.
- [ ] Backup/rollback có manifest và evidence.
- [ ] Không có mutation chạy song song hoặc SQL bypass.
- [ ] Console/network errors đã được phân loại.
