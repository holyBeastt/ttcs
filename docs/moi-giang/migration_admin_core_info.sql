-- ============================================================
-- Migration: Admin Mời Giảng Core Info
-- Mô tả: Thêm cột 'version' cho Optimistic Locking
--        và bảng audit log cho tính năng ADMIN chỉnh sửa
--        thông tin lõi mời giảng
-- Bảng ảnh hưởng: quychuan (DB_TABLE_QC)
-- Ngày: 2026-07-02
-- ============================================================

-- Bước 1: Thêm cột version vào bảng quychuan (nếu chưa có)
-- Chạy lệnh này một lần, an toàn với IF NOT EXISTS
ALTER TABLE quychuan
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 0 COMMENT 'Optimistic locking version counter';

-- Bước 2: Tạo bảng audit log (nếu chưa có)
CREATE TABLE IF NOT EXISTS audit_log_moi_giang_core (
  id           BIGINT       NOT NULL AUTO_INCREMENT,
  record_id    INT          NOT NULL COMMENT 'ID bản ghi trong bảng quychuan',
  changed_by   VARCHAR(100) NOT NULL COMMENT 'userId của ADMIN thực hiện thay đổi',
  changed_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  new_version  INT          NOT NULL COMMENT 'Version mới sau khi UPDATE',
  changes_json TEXT         NOT NULL COMMENT 'JSON các trường đã thay đổi',
  PRIMARY KEY (id),
  INDEX idx_record_id   (record_id),
  INDEX idx_changed_by  (changed_by),
  INDEX idx_changed_at  (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Audit log cho tính năng ADMIN chỉnh sửa thông tin lõi mời giảng';

-- Bước 3: Kiểm tra (optional - chạy để verify)
-- SHOW COLUMNS FROM quychuan LIKE 'version';
-- SHOW CREATE TABLE audit_log_moi_giang_core;
