/**
 * NCKH V2 Controller
 * Version 2 - Công thức tính tiết mới theo PHỤ LỤC II
 * Date: 2026-01-16
 */

const express = require("express");
const createPoolConnection = require("../config/databasePool");
const LogService = require("../services/logService");

// =====================================================
// CÔNG THỨC TÍNH TIẾT MỚI V2
// =====================================================

/**
 * Quy đổi số tiết theo công thức v2
 * @param {number} T - Tổng số tiết chuẩn
 * @param {number} tongSoTacGia - Số người tham gia (bao gồm cả chủ nhiệm)
 * @param {number} soDongChuNhiem - Số đồng chủ nhiệm (default: 1)
 * @param {number} soNamThucHien - Số năm thực hiện (default: 1)
 * @returns {Object} { chuNhiem, thanhVien } - Số tiết cho từng vai trò
 */
const quyDoiSoTietV2 = (T, tongSoTacGia, soDongChuNhiem = 1, soNamThucHien = 1) => {
    let chuNhiem = 0;
    let thanhVien = 0;

    if (tongSoTacGia === 1) {
        // Chỉ có 1 người (chủ nhiệm)
        chuNhiem = T;
        thanhVien = 0;
    } else if (tongSoTacGia === 2) {
        // 2 người: CN = 2T/3, TV = T/3
        chuNhiem = (2 * T) / 3;
        thanhVien = T / 3;
    } else if (tongSoTacGia === 3) {
        // 3 người: CN = T/2, mỗi TV = T/4
        chuNhiem = T / 2;
        thanhVien = T / 4;
    } else {
        // >3 người: CN = T/3 + (2T/3)/n, mỗi TV = (2T/3)/n
        const phanChia = (2 * T / 3) / tongSoTacGia;
        chuNhiem = T / 3 + phanChia;
        thanhVien = phanChia;
    }

    // Chia cho số đồng chủ nhiệm nếu có
    chuNhiem = chuNhiem / soDongChuNhiem;

    // Chia cho số năm thực hiện
    chuNhiem = chuNhiem / soNamThucHien;
    thanhVien = thanhVien / soNamThucHien;

    return {
        chuNhiem: Math.round(chuNhiem * 100) / 100,
        thanhVien: Math.round(thanhVien * 100) / 100
    };
};

// =====================================================
// HÀM TIỆN ÍCH
// =====================================================

// Hàm tách tên và đơn vị từ chuỗi "Nguyễn Văn A - Khoa CNTT"
const extractNameAndUnit = (fullName) => {
    if (fullName && fullName.includes(" - ")) {
        const [name, unit] = fullName.split(" - ");
        return { name: name.trim(), unit: unit.trim() };
    }
    return { name: fullName ? fullName.trim() : "", unit: "" };
};

// Hàm format số tiết
const formatHours = (num) => num.toFixed(2).replace(/,/g, ".");

// Hàm convert định dạng ngày
const convertDateFormat = (dateStr) => {
    if (!dateStr) return null;

    // Nếu là định dạng ISO (từ DB)
    if (dateStr.includes("T")) {
        return dateStr.split("T")[0];
    }

    // Nếu là định dạng dd/mm/yyyy
    if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
    }

    return dateStr;
};

// =====================================================
// RENDER VIEWS
// =====================================================

const getDanhSachNCKHV2 = (req, res) => {
    res.render("nckh.danhSachNCKH.ejs");
};

// =====================================================
// ĐỀ TÀI DỰ ÁN V2
// =====================================================

/**
 * Quy đổi số tiết cho Đề tài Dự án theo công thức V2
 */
const quyDoiSoGioDeTaiDuAnV2 = async (body, MaBang) => {
    const {
        capDeTai,
        chuNhiem,
        thanhVien,
        tongSoTacGia,
        tongSoThanhVien,
        soDongChuNhiem = 1,
        soNamThucHien = 1
    } = body;

    let connection;

    try {
        connection = await createPoolConnection();

        // Lấy số tiết chuẩn từ DB - sử dụng SoGio làm tổng tiết
        const [rows] = await connection.execute(
            `SELECT SoGio FROM quydinhsogionckh WHERE CapDeTaiDuAn = ? AND MaBang = ?`,
            [capDeTai, MaBang]
        );

        if (rows.length === 0) {
            throw new Error("Không tìm thấy quy định số tiết cho cấp đề tài này.");
        }

        const T = parseFloat(rows[0].SoGio) || 0;

        // Sử dụng TongSoTacGia từ body thay vì tự tính
        const finalTongSoTacGia = parseInt(tongSoTacGia) || 0;

        if (finalTongSoTacGia === 0) {
            throw new Error("Phải có ít nhất 1 tác giả.");
        }

        // Tính tiết theo công thức V2
        const { chuNhiem: tietChuNhiem, thanhVien: tietThanhVien } = quyDoiSoTietV2(
            T,
            finalTongSoTacGia,
            parseInt(soDongChuNhiem) || 1,
            parseInt(soNamThucHien) || 1
        );

        // Format kết quả
        if (chuNhiem) {
            const { name, unit } = extractNameAndUnit(chuNhiem);
            if (unit) {
                // Ngoài học viện: "Tên (Đơn vị - Số tiết)"
                body.chuNhiem = `${name} (${unit} - ${formatHours(tietChuNhiem)})`;
            } else {
                // Trong học viện: "Tên (Số tiết)"
                body.chuNhiem = `${name} (${formatHours(tietChuNhiem)})`;
            }
        }

        if (thanhVien && Array.isArray(thanhVien)) {
            body.thanhVien = thanhVien
                .map((member) => {
                    const { name, unit } = extractNameAndUnit(member);
                    if (unit) {
                        // Ngoài học viện: "Tên (Đơn vị - Số tiết)"
                        return `${name} (${unit} - ${formatHours(tietThanhVien)})`;
                    } else {
                        // Trong học viện: "Tên (Số tiết)"
                        return `${name} (${formatHours(tietThanhVien)})`;
                    }
                })
                .join(", ");
        }

        return body;
    } catch (error) {
        console.error("Lỗi khi quy đổi số tiết V2:", error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lưu đề tài dự án mới (V2)
 */
const saveDeTaiDuAnV2 = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    let connection;

    try {
        // Quy đổi số tiết theo công thức V2
        const data = await quyDoiSoGioDeTaiDuAnV2(req.body, "detaiduan");

        const {
            capDeTai,
            namHoc,
            tenDeTai,
            maDeTai,
            chuNhiem,
            ngayNghiemThu,
            khoa,
            thanhVien,
            ketQua,
            soDongChuNhiem = 1,
            soNamThucHien = 1
        } = data;

        // Convert array thành string nếu cần
        const thanhVienString = Array.isArray(thanhVien) ? thanhVien.join(", ") : (thanhVien || "");

        connection = await createPoolConnection();

        // Chèn dữ liệu với fields mới
        await connection.execute(
            `INSERT INTO detaiduan (
        CapDeTai, NamHoc, TenDeTai, MaSoDeTai, ChuNhiem, 
        NgayNghiemThu, Khoa, DanhSachThanhVien, KetQua,
        SoDongChuNhiem, SoNamThucHien, TongSoTacGia, TongSoThanhVien
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                capDeTai,
                namHoc,
                tenDeTai,
                maDeTai,
                chuNhiem,
                ngayNghiemThu,
                khoa,
                thanhVienString,
                ketQua,
                soDongChuNhiem,
                soNamThucHien,
                data.tongSoTacGia || 0,
                data.tongSoThanhVien || 0
            ]
        );

        // Ghi log
        try {
            await LogService.logChange(
                userId,
                userName,
                'Thêm thông tin NCKH V2',
                `Thêm đề tài dự án "${tenDeTai}"`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Thêm đề tài, dự án thành công!",
        });
    } catch (error) {
        console.error("Lỗi khi lưu đề tài dự án V2:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thêm đề tài, dự án.",
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy danh sách đề tài dự án (V2)
 */
const getTableDeTaiDuAnV2 = async (req, res) => {
    const { NamHoc, Khoa } = req.params;
    console.log(`[V2] Lấy dữ liệu bảng detaiduan Năm: ${NamHoc} Khoa: ${Khoa}`);

    let connection;
    try {
        connection = await createPoolConnection();

        let query, params;
        
        if (Khoa === "ALL") {
            // Lấy tất cả records của năm học
            query = `SELECT * FROM detaiduan WHERE NamHoc = ?`;
            params = [NamHoc];
        } else {
            // Lọc theo Khoa - đơn giản hóa vì bảng đã có field Khoa
            query = `SELECT * FROM detaiduan WHERE NamHoc = ? AND Khoa = ?`;
            params = [NamHoc, Khoa];
        }
        
        console.log("Executing query:", query, "with params:", params);
        
        const [results] = await connection.execute(query, params);
        console.log(`Found ${results.length} records for NamHoc ${NamHoc}, Khoa ${Khoa}`);
        
        if (results.length > 0) {
            console.log("Sample record:", JSON.stringify(results[0], null, 2));
        }

        res.json(results);
    } catch (error) {
        console.error("Lỗi trong hàm getTableDeTaiDuAnV2:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Cập nhật một field cụ thể (V2)
 */
const updateFieldNckhV2 = async (req, res) => {
    const { ID, namHoc, MaBang } = req.params;
    const { field, value } = req.body;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    if (!ID || !MaBang || !field) {
        return res.status(400).json({ 
            success: false,
            message: "Thiếu thông tin cần thiết." 
        });
    }

    let connection;
    try {
        connection = await createPoolConnection();

        const [rows] = await connection.execute(
            `SELECT * FROM ${MaBang} WHERE ID = ?`,
            [ID]
        );

        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: "Không tìm thấy bản ghi." 
            });
        }

        const oldData = rows[0];

        await connection.execute(
            `UPDATE ${MaBang} SET ${field} = ? WHERE ID = ?`,
            [value, ID]
        );

        if (field === 'DaoTaoDuyet' && oldData.DaoTaoDuyet !== value) {
            try {
                const action = value === 1 ? 'Duyệt' : 'Bỏ duyệt';
                await LogService.logChange(
                    userId,
                    userName,
                    `${action} NCKH V2`,
                    `${action} ${MaBang} ID: ${ID}`
                );
            } catch (logError) {
                console.error("Lỗi khi ghi log:", logError);
            }
        }

        res.status(200).json({
            success: true,
            message: "Cập nhật thành công!",
        });
    } catch (error) {
        console.error("Lỗi khi cập nhật field V2:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi cập nhật.",
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Sửa thông tin NCKH (V2)
 * Giữ nguyên logic v1: check validate, log thay đổi
 */
const editNckhV2 = async (req, res) => {
    const { ID, MaBang } = req.params;
    const namHoc = req.body.namHoc;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    if (!ID) {
        return res.status(400).json({ message: "Thiếu ID cần cập nhật." });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: "Dữ liệu gửi lên bị thiếu hoặc rỗng." });
    }

    let connection;
    try {
        connection = await createPoolConnection();

        // Lấy dữ liệu cũ
        const [oldRows] = await connection.execute(`SELECT * FROM ${MaBang} WHERE ID = ?`, [ID]);
        if (oldRows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật." });
        }
        const oldData = oldRows[0];

        let data = {};
        let updateQuery = "";
        let queryParams = [];

        switch (MaBang) {
            case "detaiduan":
                data = {
                    CapDeTai: req.body.CapDeTai,
                    TenDeTai: req.body.TenDeTai,
                    MaSoDeTai: req.body.MaSoDeTai,
                    ChuNhiem: req.body.ChuNhiem,
                    DanhSachThanhVien: req.body.DanhSachThanhVien,
                    NgayNghiemThu: convertDateFormat(req.body.NgayNghiemThu),
                    DaoTaoDuyet: req.body.DaoTaoDuyet,
                    Khoa: req.body.Khoa,
                    KetQua: req.body.KetQua,
                    SoDongChuNhiem: req.body.SoDongChuNhiem || 1,
                    SoNamThucHien: req.body.SoNamThucHien || 1,
                    TongSoTacGia: req.body.TongSoTacGia || 0,
                    TongSoThanhVien: req.body.TongSoThanhVien || 0
                };

                updateQuery = `
          UPDATE detaiduan 
          SET CapDeTai = ?, TenDeTai = ?, MaSoDeTai = ?, ChuNhiem = ?, 
              DanhSachThanhVien = ?, NgayNghiemThu = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ?,
              SoDongChuNhiem = ?, SoNamThucHien = ?, TongSoTacGia = ?, TongSoThanhVien = ?
          WHERE ID = ?`;

                queryParams = [
                    data.CapDeTai,
                    data.TenDeTai,
                    data.MaSoDeTai,
                    data.ChuNhiem,
                    data.DanhSachThanhVien,
                    data.NgayNghiemThu,
                    data.DaoTaoDuyet,
                    data.Khoa,
                    data.KetQua,
                    data.SoDongChuNhiem,
                    data.SoNamThucHien,
                    data.TongSoTacGia,
                    data.TongSoThanhVien,
                    ID
                ];
                break;

            default:
                return res.status(400).json({ message: "Loại bảng không hợp lệ cho V2." });
        }

        const [result] = await connection.execute(updateQuery, queryParams);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật." });
        }

        // Ghi log nếu có thay đổi duyệt
        if (oldData && oldData.DaoTaoDuyet !== data.DaoTaoDuyet) {
            try {
                await LogService.logNCKHChange(oldData, data, {
                    id: userId,
                    name: userName
                });
            } catch (logError) {
                console.error("Lỗi khi ghi log:", logError);
            }
        }

        res.status(200).json({
            success: true,
            message: "Cập nhật thành công!",
        });
    } catch (error) {
        console.error("Lỗi khi cập nhật V2:", error);
        res.status(500).json({
            message: "Có lỗi xảy ra khi cập nhật.",
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Xóa thông tin NCKH (V2)
 * Giữ nguyên logic v1: không xóa khi đã duyệt
 */
const deleteNckhV2 = async (req, res) => {
    const { ID, namHoc, MaBang } = req.params;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    if (!ID || !MaBang) {
        return res.status(400).json({ message: "Thiếu thông tin cần thiết." });
    }

    let connection;
    try {
        connection = await createPoolConnection();

        // Kiểm tra trạng thái duyệt trước khi xóa
        const [rows] = await connection.execute(
            `SELECT * FROM ${MaBang} WHERE ID = ?`,
            [ID]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi." });
        }

        // Không cho xóa nếu đã duyệt
        if (rows[0].DaoTaoDuyet === 1) {
            return res.status(403).json({
                success: false,
                message: "Không thể xóa bản ghi đã được duyệt."
            });
        }

        // Thực hiện xóa
        await connection.execute(`DELETE FROM ${MaBang} WHERE ID = ?`, [ID]);

        // Ghi log
        try {
            let entityName = rows[0].TenDeTai || rows[0].TenBaiBao || `ID:${ID}`;
            await LogService.logChange(
                userId,
                userName,
                'Xóa thông tin NCKH V2',
                `Xóa "${entityName}" từ bảng ${MaBang}`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log xóa:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Xóa thành công!",
        });
    } catch (error) {
        console.error("Lỗi khi xóa V2:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi xóa.",
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// API LẤY DỮ LIỆU
// =====================================================

/**
 * Lấy danh sách giảng viên cơ hữu (dùng chung với v1)
 */
const getTeacherV2 = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const [results] = await connection.execute(
            `SELECT TenNhanVien AS HoTen, MonGiangDayChinh FROM nhanvien`
        );
        res.json(results);
    } catch (error) {
        console.error("Error fetching teachers V2:", error);
        res.status(500).json({ message: "Lỗi khi lấy dữ liệu giảng viên" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy dữ liệu quy định số tiết cho dropdown
 */
const getDataV2 = async (req, res) => {
    const { MaBang } = req.params;

    let connection;
    try {
        connection = await createPoolConnection();

        let query = "";
        let field = "";

        switch (MaBang) {
            case "detaiduan":
                query = `SELECT DISTINCT CapDeTaiDuAn, SoGio FROM quydinhsogionckh WHERE MaBang = ? AND CapDeTaiDuAn IS NOT NULL`;
                field = "CapDeTaiDuAn";
                break;
            case "baibaokhoahoc":
                query = `SELECT DISTINCT LoaiTapChi, SoGio FROM quydinhsogionckh WHERE MaBang = ? AND LoaiTapChi IS NOT NULL`;
                field = "LoaiTapChi";
                break;
            case "bangsangchevagiaithuong":
                query = `SELECT DISTINCT BangSangCheGiaiThuong, SoGio FROM quydinhsogionckh WHERE MaBang = ? AND BangSangCheGiaiThuong IS NOT NULL`;
                field = "BangSangCheGiaiThuong";
                break;
            default:
                query = `SELECT * FROM quydinhsogionckh WHERE MaBang = ?`;
        }

        const [results] = await connection.execute(query, [MaBang]);
        res.json(results);
    } catch (error) {
        console.error("Error fetching data V2:", error);
        res.status(500).json({ message: "Lỗi khi lấy dữ liệu" });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    // Render views
    getDanhSachNCKHV2,

    // Đề tài dự án
    saveDeTaiDuAnV2,
    getTableDeTaiDuAnV2,

    // CRUD chung
    editNckhV2,
    updateFieldNckhV2,
    deleteNckhV2,

    // API dữ liệu
    getTeacherV2,
    getDataV2,

    // Helper functions
    quyDoiSoTietV2
};
