const express = require("express");
const createPoolConnection = require("../config/databasePool");


const getDeTaiDuAn = (req, res) => {
    res.render("nckhDeTaiDuAn.ejs");
};
const getBaiBaoKhoaHoc = (req, res) => {
    res.render("nckhBaiBaoKhoaHoc.ejs");
};
const getBangSangCheVaGiaiThuong = (req, res) => {
    res.render("nckhBangSangCheVaGiaiThuong.ejs");
};
const getSachVaGiaoTrinh = (req, res) => {
    res.render("nckhSachVaGiaoTrinh.ejs");
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


const quyDoiSoTietDeTaiDuAn = (body) => {
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
    } = body;

    // Hàm tách tên và đơn vị
    const extractNameAndUnit = (fullName) => {
        if (fullName && fullName.includes(" - ")) {
            const [name, unit] = fullName.split(" - ");
            return { name, unit };
        }
        return { name: fullName, unit: "" };
    };

    let soTietChuNhiem = 0;
    let soTietThuKy = 0;
    let soTietThanhVien = [];

    // Kiểm tra cấp đề tài và tính toán số tiết quy đổi
    if (capDeTai === "Quốc gia, Nghị định thư") {
        if (chuNhiem) soTietChuNhiem = 400;  // Chủ nhiệm cấp quốc gia được 400 tiết
        if (thuKy) soTietThuKy = 120;  // Thư ký cấp quốc gia được 120 tiết
        if (thanhVien && Array.isArray(thanhVien) && thanhVien.length > 0) {
            soTietThanhVien = Array(thanhVien.length).fill(280 / thanhVien.length);  // 280 tiết chia đều cho thành viên
        }
    } else if (capDeTai === "Ban, Bộ và tương đương") {
        if (chuNhiem) soTietChuNhiem = 250;  // Chủ nhiệm cấp ban bộ được 250 tiết
        if (thuKy) soTietThuKy = 75;  // Thư ký cấp ban bộ được 75 tiết
        if (thanhVien && Array.isArray(thanhVien) && thanhVien.length > 0) {
            soTietThanhVien = Array(thanhVien.length).fill(125 / thanhVien.length);  // 125 tiết chia đều cho thành viên
        }
    } else if (capDeTai === "Cơ sở, Học viện") {
        if (chuNhiem) soTietChuNhiem = 150;  // Chủ nhiệm cấp học viện cơ sở được 150 tiết
        if (thanhVien && Array.isArray(thanhVien) && thanhVien.length > 0) {
            soTietThanhVien = Array(thanhVien.length).fill(50 / thanhVien.length);  // 50 tiết chia đều cho thành viên
        } else {
            // Nếu không có thành viên, cộng thêm 50 tiết cho chủ nhiệm
            soTietChuNhiem += 50;
        }
    }

    // Tách và format thông tin của chủ nhiệm
    if (chuNhiem) {
        const { name, unit } = extractNameAndUnit(chuNhiem);
        body.chuNhiem = `${name} (${unit} - ${soTietChuNhiem} tiết)`;
    }

    // Tách và format thông tin của thư ký
    if (thuKy) {
        const { name, unit } = extractNameAndUnit(thuKy);
        body.thuKy = `${name} (${unit} - ${soTietThuKy} tiết)`;
    }

    // Tách và format thông tin của thành viên
    if (thanhVien && Array.isArray(thanhVien)) {
        body.thanhVien = thanhVien.map((member, index) => {
            const { name, unit } = extractNameAndUnit(member);
            return `${name} (${unit} - ${soTietThanhVien[index]} tiết)`;
        }).join(", ");
    }

    // Trả về body đã được cập nhật
    return body;
};

// thêm đề tài dự án
const saveDeTaiDuAn = async (req, res) => {
    const data = quyDoiSoTietDeTaiDuAn(req.body)
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
    } = data;

    // Xử lý: ghép danh sách thành viên thành chuỗi cách nhau bởi dấu phẩy
    // const danhSachThanhVien = thanhVien ? thanhVien.join(",") : "";

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
                thanhVien,
            ]
        );

        // Trả về phản hồi thành công cho client
        console.log('Thêm đề tài dự án thành công')
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

// thêm bài báo khoa học
const saveBaiBaoKhoaHoc = async (req, res) => {
    // Lấy dữ liệu từ body
    const {
        // loaiBaiBao,
        namHoc,
        tenBaiBao,
        loaiTapChi,
        chiSoTapChi,
        tacGia,
        thanhVien, // Đây là một mảng từ client
    } = req.body;

    // Xử lý: ghép danh sách thành viên thành chuỗi cách nhau bởi dấu phẩy
    const danhSachThanhVien = thanhVien ? thanhVien.join(",") : "";

    const connection = await createPoolConnection(); // Tạo kết nối từ pool

    try {
        // Chèn dữ liệu vào bảng baibaokhoahoc
        await connection.execute(
            `
            INSERT INTO baibaokhoahoc (
                 NamHoc, TenBaiBao, LoaiTapChi, ChiSoTapChi, TacGia, DanhSachThanhVien
            ) 
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                // loaiBaiBao,
                namHoc,
                tenBaiBao,
                loaiTapChi,
                chiSoTapChi,
                tacGia,
                danhSachThanhVien,
            ]
        );

        // Trả về phản hồi thành công cho client
        console.log('Thêm bài báo khoa học thành công')
        res.status(200).json({
            message: "Thêm bài báo khoa học thành công!",
        });
    } catch (error) {
        console.error("Error while saving research paper data:", error);
        // Trả về phản hồi lỗi cho client
        res.status(500).json({
            message: "Có lỗi xảy ra khi thêm bài báo khoa học.",
            error: error.message,
        });
    } finally {
        connection.release(); // Giải phóng kết nối sau khi hoàn thành
    }
};

// thêm bằng sáng chế và giải thưởng
const saveBangSangCheVaGiaiThuong = async (req, res) => {
    // Lấy dữ liệu từ body
    const {
        phanLoai, // Phân loại
        namHoc,
        tenBangSangCheVaGiaiThuong, // Tên bằng sáng chế / giải thưởng
        SoQDCongNhan, // Số quyết định công nhận
        NgayQDCongNhan, // Ngày quyết định công nhận
        tacGia,
        thanhVien, // Đây là một mảng từ client
    } = req.body;

    // Xử lý: ghép danh sách thành viên thành chuỗi cách nhau bởi dấu phẩy
    const danhSachThanhVien = thanhVien ? thanhVien.join(",") : "";

    const connection = await createPoolConnection(); // Tạo kết nối từ pool

    try {
        // Chèn dữ liệu vào bảng bangsangchevagiaithuong
        await connection.execute(
            `
            INSERT INTO bangsangchevagiaithuong (
                 PhanLoai, NamHoc, TenBangSangCheVaGiaiThuong, SoQDCongNhan, NgayQDCongNhan, TacGia, DanhSachThanhVien
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                phanLoai,  // Phân loại
                namHoc,
                tenBangSangCheVaGiaiThuong,  // Tên bằng sáng chế / giải thưởng
                SoQDCongNhan,  // Số quyết định công nhận
                NgayQDCongNhan,  // Ngày quyết định công nhận
                tacGia,
                danhSachThanhVien,  // Danh sách thành viên
            ]
        );

        // Trả về phản hồi thành công cho client
        console.log('Thêm bằng sáng chế và giải thưởng thành công')
        res.status(200).json({
            message: "Thêm bằng sáng chế và giải thưởng thành công!",
        });
    } catch (error) {
        console.error("Error while saving research paper data:", error);
        // Trả về phản hồi lỗi cho client
        res.status(500).json({
            message: "Có lỗi xảy ra khi thêm bằng sáng chế và giải thưởng.",
            error: error.message,
        });
    } finally {
        connection.release(); // Giải phóng kết nối sau khi hoàn thành
    }
};

// thêm sách và giáo trình 
const saveSachVaGiaoTrinh = async (req, res) => {
    // Lấy dữ liệu từ body
    const {
        namHoc,
        tenSachVaGiaoTrinh, // Tên sách, giáo trình
        soXuatBan, // Số xuất bản
        soTrang, // Số trang
        tacGia,
        thanhVien, // Đây là một mảng từ client
    } = req.body;

    // Xử lý: ghép danh sách thành viên thành chuỗi cách nhau bởi dấu phẩy
    const danhSachThanhVien = thanhVien ? thanhVien.join(",") : "";

    const connection = await createPoolConnection(); // Tạo kết nối từ pool

    try {
        // Chèn dữ liệu vào bảng sachvagiaotrinh
        await connection.execute(
            `
            INSERT INTO sachvagiaotrinh (
                NamHoc, TenSachVaGiaoTrinh, SoXuatBan, SoTrang, TacGia, DanhSachThanhVien
            ) 
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                namHoc,
                tenSachVaGiaoTrinh, // Tên sách, giáo trình
                soXuatBan, // Số xuất bản
                soTrang, // Số trang
                tacGia,
                danhSachThanhVien, // Danh sách thành viên
            ]
        );

        // Trả về phản hồi thành công cho client
        console.log('Thêm sách và giáo trình thành công');
        res.status(200).json({
            message: "Thêm sách và giáo trình thành công!",
        });
    } catch (error) {
        console.error("Error while saving data to sachvagiaotrinh:", error);
        // Trả về phản hồi lỗi cho client
        res.status(500).json({
            message: "Có lỗi xảy ra khi thêm sách và giáo trình.",
            error: error.message,
        });
    } finally {
        connection.release(); // Giải phóng kết nối sau khi hoàn thành
    }
};


module.exports = {
    getDeTaiDuAn,
    saveDeTaiDuAn,
    getTeacher,
    getBaiBaoKhoaHoc,
    saveBaiBaoKhoaHoc,
    getBangSangCheVaGiaiThuong,
    saveBangSangCheVaGiaiThuong,
    getSachVaGiaoTrinh,
    saveSachVaGiaoTrinh,
};