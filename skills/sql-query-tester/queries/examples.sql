-- SQL Query Tester - Example Queries
-- Copy, edit, and run with: node skills/sql-query-tester/scripts/run-multi.js skills/sql-query-tester/queries/examples.sql

-- 1. Danh sach nhan vien (5 ban ghi)
SELECT id_User, TenNhanVien, MaPhongBan FROM NhanVien LIMIT 5;

-- 2. Kiem tra cau truc bang (thay 'NhanVien' bang ten bang muon xem)
SHOW COLUMNS FROM NhanVien;

-- 3. Dem so luong nhan vien theo phong ban
SELECT MaPhongBan, COUNT(*) AS so_luong FROM NhanVien GROUP BY MaPhongBan ORDER BY so_luong DESC LIMIT 20;
