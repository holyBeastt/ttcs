const express = require("express");
const createPoolConnection = require("../config/databasePool");


const getDeTaiDuAn = (req, res) => {
    res.render("nckhDeTaiDuAn.ejs");
};

// Hàm lấy dữ liệu tổng hợp của giảng viên đang giảng dạy
const tongHopDuLieuGiangVien = async () => {
    const connection = await createPoolConnection(); // Tạo kết nối từ pool

    try {
        // Thực hiện hai truy vấn song song bằng Promise.all
        const [results1, results2] = await Promise.all([
            connection.execute(`SELECT HoTen, MonGiangDayChinh 
            FROM gvmoi 
            WHERE TinhTrangGiangDay = 1;
        `),
            connection.execute(
                "SELECT TenNhanVien AS HoTen, MonGiangDayChinh FROM nhanvien"
            ),
        ]);

        // Kết hợp kết quả từ hai truy vấn thành một mảng duy nhất
        const allResults = results1[0].concat(results2[0]);

        return allResults;
    } catch (error) {
        console.error("Error while fetching lecturer data:", error);
        return []; // Trả về mảng rỗng nếu có lỗi
    } finally {
        connection.release(); // Giải phóng kết nối sau khi hoàn thành
    }
};

// lấy dữ liệu giảng viên cơ hữu để thêm vào danh sách thành viên
const getTeacher = async (req, res) => {
    const connection = await createPoolConnection(); // Tạo kết nối từ pool

    try {
        // Truy vấn lấy dữ liệu giảng viên từ bảng nhanvien
        const [results] = await connection.execute(
            `SELECT TenNhanVien AS HoTen, MonGiangDayChinh 
             FROM nhanvien`
        );
        
        // Trả luôn kết quả vào response (res) ngay trong hàm getTeacher
        res.json(results); // Trả về kết quả trực tiếp từ đây
    } catch (error) {
        console.error("Error while fetching lecturer data:", error);
        // Trả lỗi nếu có bất kỳ vấn đề nào trong truy vấn
        res.status(500).json({ message: "Lỗi khi lấy dữ liệu giảng viên", error: error.message });
    } finally {
        connection.release(); // Giải phóng kết nối sau khi hoàn thành
    }
};


const saveDeTaiDuAn = async (req, res) => {
    // Lấy dữ liệu từ body
    const {
        capDeTai,
        namHoc,
        tenDeTai,
        maDeTai,
        chuNhiem,
        thuKy,
        ngayNghiemThu,
        xepLoaiKetQua,
        thanhVien, // Đây là một mảng từ client
    } = req.body;

    // Xử lý: ghép danh sách thành viên thành chuỗi cách nhau bởi dấu phẩy
    const danhSachThanhVien = thanhVien ? thanhVien.join(",") : "";

    const connection = await createPoolConnection(); // Tạo kết nối từ pool

    try {
        // Chèn dữ liệu vào bảng detaiduan
        await connection.execute(
            `
            INSERT INTO detaiduan (
                CapDeTai, NamHoc, TenDeTai, MaDeTai, ChuNhiem, ThuKy, NgayNghiemThu, XepLoai, DanhSachThanhVien
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                capDeTai,
                namHoc,
                tenDeTai,
                maDeTai,
                chuNhiem,
                thuKy,
                ngayNghiemThu,
                xepLoaiKetQua,
                danhSachThanhVien,
            ]
        );

        // Trả về phản hồi thành công cho client
        res.status(200).json({
            message: "Thêm đề tài, dự án thành công!",
        });
    } catch (error) {
        console.error("Error while saving project data:", error);
        // Trả về phản hồi lỗi cho client
        res.status(500).json({
            message: "Có lỗi xảy ra khi thêm đề tài, dự án.",
            error: error.message,
        });
    } finally {
        connection.release(); // Giải phóng kết nối sau khi hoàn thành
    }
};

module.exports = {
    getDeTaiDuAn,
    saveDeTaiDuAn,
    getTeacher
};