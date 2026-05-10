/**
 * VUOT GIO V2 - Base Controller
 * Render các views cơ bản cho module Vượt Giờ V2
 * Date: 2026-01-29
 */

const createPoolConnection = require("../../config/databasePool");
const sharedRepo = require("../../repositories/vuotgio_v2/shared.repo");

// =====================================================
// RENDER VIEWS
// =====================================================

/**
 * Render trang Thêm Lớp Ngoài Quy Chuẩn
 */
const getThemLopNgoaiQC = (req, res) => {
    res.render("vuotgio_v2/vuotgio.themLopNgoaiQC.ejs");
};

const getCoiChamRaDeThi = (req, res) => {
    res.render("vuotgio_v2/vuotgio.file.coiChamRaDe.ejs");
};

/**
 * Render trang Danh Sách Lớp Ngoài Quy Chuẩn
 */
const getDanhSachLopNgoaiQC = (req, res) => {
    res.render("vuotgio_v2/vuotgio.danhSachLopNgoaiQC.ejs");
};

/**
 * Render trang Thêm Kết Thúc Học Phần
 */
const getThemKTHP = (req, res) => {
    res.render("vuotgio_v2/vuotgio.add.coiChamRaDe.ejs");
};

/**
 * Render trang Duyệt Kết Thúc Học Phần
 */
const getDuyetKTHP = (req, res) => {
    res.render("vuotgio_v2/vuotgio.duyet.coiChamRaDe.ejs");
};

/**
 * Render trang Tổng Hợp Giảng Viên
 */
const getTongHopGV = (req, res) => {
    res.render("vuotgio_v2/vuotgio.tongHopGV.ejs");
};

/**
 * Render trang Tổng Hợp Khoa
 */
const getTongHopKhoa = (req, res) => {
    res.render("vuotgio_v2/vuotgio.tongHopKhoa.ejs");
};

/**
 * Render trang Xuất File
 */
const getXuatFile = (req, res) => {
    res.render("vuotgio_v2/vuotgio.xuatFile.ejs");
};

/**
 * Render trang Hướng Dẫn Đồ Án Tốt Nghiệp
 */
const getHuongDanDATN = (req, res) => {
    res.render("vuotgio_v2/vuotgio.huongDanDATN.ejs");
};

/**
 * Render trang Hướng Dẫn Tham Quan Thực Tế
 */
const getHuongDanThamQuan = (req, res) => {
    res.render("vuotgio_v2/vuotgio.huongDanThamQuan.ejs");
};

/**
 * Render trang Thong Ke Giang Day (Co huu)
 */
const getThongKeGiangDay = (req, res) => {
    res.render("vuotgio_v2/vuotgio.thongKeGiangDay.ejs");
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

        const results = await sharedRepo.getTeachers(connection, Khoa);
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

        const results = await sharedRepo.getHocPhan(connection);
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

        const results = await sharedRepo.getLopHoc(connection, NamHoc);
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

        const result = await sharedRepo.getDinhMuc(connection);

        res.json(result || { GiangDay: 280, NCKH: 280 });
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
    getHuongDanThamQuan,
    getThongKeGiangDay,
    getCoiChamRaDeThi,

    // API chung
    getTeachers,
    getHocPhan,
    getLopHoc,
    getDinhMuc
};
