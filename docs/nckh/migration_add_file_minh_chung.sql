-- ============================================================
-- Migration: NCKH V3 - Thêm cột file_minh_chung
-- Mô tả: Thêm cột file_minh_chung để lưu đường dẫn file minh chứng bài báo khoa học
-- Bảng ảnh hưởng: nckh_chung
-- ============================================================

-- Chạy lệnh này trên database (ví dụ: app_dbt hoặc database trường)
ALTER TABLE nckh_chung 
  ADD COLUMN file_minh_chung VARCHAR(500) NULL COMMENT 'Đường dẫn file minh chứng bài báo khoa học (PDF/Word)';

-- Kiểm tra lại sau khi thêm:
-- DESCRIBE nckh_chung;
