/**
 * VUOT GIO V2 - Base Controller
 * Render các views cơ bản cho module Vượt Giờ V2
 * Date: 2026-01-29
 */

const createPoolConnection = require("../../config/databasePool");

// =====================================================
// RENDER VIEWS
// =====================================================

/**
 * Render trang Thêm Lớp Ngoài Quy Chuẩn
 */
const getThemLopNgoaiQC = (req, res) => {
    res.render("vuotgio.themLopNgoaiQC.ejs");
};

/**
 * Render trang Danh Sách Lớp Ngoài Quy Chuẩn
 */
const getDanhSachLopNgoaiQC = (req, res) => {
    res.render("vuotgio.danhSachLopNgoaiQC.ejs");
};

/**
 * Render trang Thêm Kết Thúc Học Phần
 */
const getThemKTHP = (req, res) => {
    res.render("vuotgio.themKTHP.ejs");
};

/**
 * Render trang Duyệt Kết Thúc Học Phần
 */
const getDuyetKTHP = (req, res) => {
    res.render("vuotgio.duyetKTHP.ejs");
};

/**
 * Render trang Tổng Hợp Giảng Viên
 */
const getTongHopGV = (req, res) => {
    res.render("vuotgio.tongHopGV.ejs");
};

/**
 * Render trang Tổng Hợp Khoa
 */
const getTongHopKhoa = (req, res) => {
    res.render("vuotgio.tongHopKhoa.ejs");
};

/**
 * Render trang Xuất File
 */
const getXuatFile = (req, res) => {
    res.render("vuotgio.xuatFile.ejs");
};

/**
 * Render trang Hướng Dẫn Đồ Án Tốt Nghiệp
 */
const getHuongDanDATN = (req, res) => {
    res.render("vuotgio.huongDanDATN.ejs");
};

// =====================================================
// API DÙNG CHUNG
// =====================================================

/**
 * Lấy danh sách giảng viên theo khoa
 */
const getTeachers = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const { Khoa } = req.query;
        
        let query = `SELECT TenNhanVien AS HoTen, MaPhongBan AS Khoa FROM nhanvien WHERE 1=1`;
        const params = [];
        
        if (Khoa && Khoa !== 'ALL') {
            query += ` AND MaPhongBan = ?`;
            params.push(Khoa);
        }
        
        query += ` ORDER BY TenNhanVien`;
        
        const [results] = await connection.execute(query, params);
        res.json(results);
    } catch (error) {
        console.error("Error fetching teachers:", error);
        res.status(500).json({ message: "Lỗi khi lấy dữ liệu giảng viên" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy danh sách học phần
 */
const getHocPhan = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        
        const query = `
            SELECT DISTINCT TenHP, MaHP, SoTC 
            FROM quychuan 
            ORDER BY TenHP
        `;
        
        const [results] = await connection.execute(query);
        res.json(results);
    } catch (error) {
        console.error("Error fetching hoc phan:", error);
        res.status(500).json({ message: "Lỗi khi lấy dữ liệu học phần" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy danh sách lớp học
 */
const getLopHoc = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const { NamHoc } = req.query;
        
        let query = `SELECT DISTINCT MaLop FROM giangday WHERE 1=1`;
        const params = [];
        
        if (NamHoc) {
            query += ` AND NamHoc = ?`;
            params.push(NamHoc);
        }
        
        query += ` ORDER BY MaLop`;
        
        const [results] = await connection.execute(query, params);
        res.json(results);
    } catch (error) {
        console.error("Error fetching lop hoc:", error);
        res.status(500).json({ message: "Lỗi khi lấy dữ liệu lớp học" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy định mức giảng dạy và NCKH
 */
const getDinhMuc = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        
        const [results] = await connection.execute(
            `SELECT GiangDay, NCKH FROM sotietdinhmuc LIMIT 1`
        );
        
        res.json(results[0] || { GiangDay: 280, NCKH: 280 });
    } catch (error) {
        console.error("Error fetching dinh muc:", error);
        res.status(500).json({ message: "Lỗi khi lấy định mức" });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    // Render views
    getThemLopNgoaiQC,
    getDanhSachLopNgoaiQC,
    getThemKTHP,
    getDuyetKTHP,
    getTongHopGV,
    getTongHopKhoa,
    getXuatFile,
    getHuongDanDATN,

    // API chung
    getTeachers,
    getHocPhan,
    getLopHoc,
    getDinhMuc
};
