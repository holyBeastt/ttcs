const express = require("express");
const createPoolConnection = require("../config/databasePool");


const addDeTaiDuAn = async (req, res) => {
    const { MaBang, CapDeTaiDuAn, ChuNhiem, ThuKy, ThanhVien } = req.body; // Lấy dữ liệu từ form (req.body)

    console.log("Thêm mới dữ liệu vào bảng quydinhsogionckh:", { MaBang, CapDeTaiDuAn, ChuNhiem, ThuKy, ThanhVien });

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            INSERT INTO quydinhsogionckh (MaBang, CapDeTaiDuAn, ChuNhiem, ThuKy, ThanhVien)
            VALUES (?, ?, ?, ?, ?)
        `;

        const queryParams = [MaBang, CapDeTaiDuAn, ChuNhiem, ThuKy, ThanhVien];

        // Thực hiện truy vấn
        const [result] = await connection.execute(query, queryParams);

        console.log("Dữ liệu đã được thêm thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Thêm mới thành công!",
            data: { CapDeTaiDuAn, ChuNhiem, ThuKy, ThanhVien }
        });

    } catch (error) {
        console.error("Lỗi khi thêm mới dữ liệu:", error);
        res.status(500).json({ message: "Không thể thêm dữ liệu vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};

const editDeTaiDuAn = async (req, res) => {
    const { id, CapDeTaiDuAn, ChuNhiem, ThuKy, ThanhVien } = req.body; // Lấy dữ liệu từ form (req.body)

    console.log("Cập nhật dữ liệu vào bảng quydinhsogionckh:", { id, CapDeTaiDuAn, ChuNhiem, ThuKy, ThanhVien });

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            UPDATE quydinhsogionckh
            SET CapDeTaiDuAn = ?, ChuNhiem = ?, ThuKy = ?, ThanhVien = ?
            WHERE ID = ?
        `;

        const queryParams = [CapDeTaiDuAn, ChuNhiem, ThuKy, ThanhVien, id];

        // Thực hiện truy vấn UPDATE
        const [result] = await connection.execute(query, queryParams);

        // Kiểm tra nếu không có bản ghi nào được cập nhật
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy đề tài/dự án để cập nhật." });
        }

        console.log("Dữ liệu đã được cập nhật thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Cập nhật thành công!",
            data: { id, CapDeTaiDuAn, ChuNhiem, ThuKy, ThanhVien }
        });

    } catch (error) {
        console.error("Lỗi khi cập nhật dữ liệu:", error);
        res.status(500).json({ message: "Không thể cập nhật dữ liệu vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};

const addBaiBaoKhoaHoc = async (req, res) => {
    const { MaBang, LoaiTapChi, ChiSoTapChi, SoGio } = req.body; // Lấy dữ liệu từ form (req.body)

    console.log("Thêm mới dữ liệu vào bảng quydinhsogionckh:", { MaBang, LoaiTapChi, ChiSoTapChi, SoGio });

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            INSERT INTO quydinhsogionckh (MaBang, LoaiTapChi, ChiSoTapChi, SoGio)
            VALUES (?, ?, ?, ?)
        `;

        const queryParams = [MaBang, LoaiTapChi, ChiSoTapChi, SoGio];

        // Thực hiện truy vấn
        const [result] = await connection.execute(query, queryParams);

        console.log("Dữ liệu đã được thêm thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Thêm mới thành công!",
            data: { MaBang, LoaiTapChi, ChiSoTapChi, SoGio }
        });

    } catch (error) {
        console.error("Lỗi khi thêm mới dữ liệu:", error);
        res.status(500).json({ message: "Không thể thêm dữ liệu vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};

const editBaiBaoKhoaHoc = async (req, res) => {
    const { id, LoaiTapChi, ChiSoTapChi, SoGio } = req.body; // Lấy dữ liệu từ form (req.body)


    console.log("Cập nhật dữ liệu vào bảng quydinhsogionckh:", { id, LoaiTapChi, ChiSoTapChi, SoGio });

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            UPDATE quydinhsogionckh
            SET LoaiTapChi = ?, ChiSoTapChi = ?, SoGio = ?
            WHERE ID = ?
        `;

        const queryParams = [LoaiTapChi, ChiSoTapChi, SoGio, id];

        // Thực hiện truy vấn UPDATE
        const [result] = await connection.execute(query, queryParams);

        // Kiểm tra nếu không có bản ghi nào được cập nhật
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy đề bài báo khoa học để cập nhật." });
        }

        console.log("Dữ liệu đã được cập nhật thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Cập nhật thành công!",
            data: { LoaiTapChi, ChiSoTapChi, SoGio }
        });

    } catch (error) {
        console.error("Lỗi khi cập nhật dữ liệu:", error);
        res.status(500).json({ message: "Không thể cập nhật dữ liệu vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};



const addBangSangCheVaGiaiThuong = async (req, res) => {
    const { MaBang, BangSangCheGiaiThuong, SoGio } = req.body; // Lấy dữ liệu từ form (req.body)

    console.log("Thêm mới dữ liệu vào bảng quydinhsogionckh:", { MaBang, BangSangCheGiaiThuong, SoGio });

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            INSERT INTO quydinhsogionckh (MaBang, BangSangCheGiaiThuong, SoGio)
            VALUES (?, ?, ?)
        `;

        const queryParams = [MaBang, BangSangCheGiaiThuong, SoGio];

        // Thực hiện truy vấn
        const [result] = await connection.execute(query, queryParams);

        console.log("Dữ liệu đã được thêm thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Thêm mới thành công!",
            data: { MaBang, BangSangCheGiaiThuong, SoGio }
        });

    } catch (error) {
        console.error("Lỗi khi thêm mới dữ liệu:", error);
        res.status(500).json({ message: "Không thể thêm dữ liệu vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};

const editBangSangCheVaGiaiThuong = async (req, res) => {
    const { id, BangSangCheGiaiThuong, SoGio } = req.body; // Lấy dữ liệu từ form (req.body)


    console.log("Cập nhật dữ liệu vào bảng quydinhsogionckh:", { id, BangSangCheGiaiThuong, SoGio });

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            UPDATE quydinhsogionckh
            SET BangSangCheGiaiThuong = ?, SoGio = ?
            WHERE ID = ?
        `;

        const queryParams = [BangSangCheGiaiThuong, SoGio, id];

        // Thực hiện truy vấn UPDATE
        const [result] = await connection.execute(query, queryParams);

        // Kiểm tra nếu không có bản ghi nào được cập nhật
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy bằng sáng chế và giải thưởng để cập nhật." });
        }

        console.log("Dữ liệu đã được cập nhật thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Cập nhật thành công!",
            data: { id, BangSangCheGiaiThuong, SoGio }
        });

    } catch (error) {
        console.error("Lỗi khi cập nhật dữ liệu:", error);
        res.status(500).json({ message: "Không thể cập nhật dữ liệu vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};

const addSachVaGiaoTrinh = async (req, res) => {
    const { MaBang, SachGiaoTrinh, SoGio } = req.body; // Lấy dữ liệu từ form (req.body)

    console.log("Thêm mới dữ liệu vào bảng quydinhsogionckh:", { MaBang, SachGiaoTrinh, SoGio });

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            INSERT INTO quydinhsogionckh (MaBang, SachGiaoTrinh, SoGio)
            VALUES (?, ?, ?)
        `;

        const queryParams = [MaBang, SachGiaoTrinh, SoGio];

        // Thực hiện truy vấn
        const [result] = await connection.execute(query, queryParams);

        console.log("Dữ liệu đã được thêm thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Thêm mới thành công!",
            data: { MaBang, SachGiaoTrinh, SoGio }
        });

    } catch (error) {
        console.error("Lỗi khi thêm mới dữ liệu:", error);
        res.status(500).json({ message: "Không thể thêm dữ liệu vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};

const editSachVaGiaoTrinh = async (req, res) => {
    const { id, SachGiaoTrinh, SoGio } = req.body; // Lấy dữ liệu từ form (req.body)


    console.log("Cập nhật dữ liệu vào bảng quydinhsogionckh:", { id, SachGiaoTrinh, SoGio });

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            UPDATE quydinhsogionckh
            SET SachGiaoTrinh = ?, SoGio = ?
            WHERE ID = ?
        `;

        const queryParams = [SachGiaoTrinh, SoGio, id];

        // Thực hiện truy vấn UPDATE
        const [result] = await connection.execute(query, queryParams);

        // Kiểm tra nếu không có bản ghi nào được cập nhật
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy bằng sáng chế và giải thưởng để cập nhật." });
        }

        console.log("Dữ liệu đã được cập nhật thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Cập nhật thành công!",
            data: { id, SachGiaoTrinh, SoGio }
        });

    } catch (error) {
        console.error("Lỗi khi cập nhật dữ liệu:", error);
        res.status(500).json({ message: "Không thể cập nhật dữ liệu vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};

const addNCKHVaHuanLuyenDoiTuyen = async (req, res) => {
    const { MaBang, NCKHHuanLuyenDoiTuyen, SoGio } = req.body; // Lấy dữ liệu từ form (req.body)

    console.log("Thêm mới dữ liệu vào bảng quydinhsogionckh:", { MaBang, NCKHHuanLuyenDoiTuyen, SoGio });

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            INSERT INTO quydinhsogionckh (MaBang, NCKHHuanLuyenDoiTuyen, SoGio)
            VALUES (?, ?, ?)
        `;

        const queryParams = [MaBang, NCKHHuanLuyenDoiTuyen, SoGio];

        // Thực hiện truy vấn
        const [result] = await connection.execute(query, queryParams);

        console.log("Dữ liệu đã được thêm thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Thêm mới thành công!",
            data: { MaBang, NCKHHuanLuyenDoiTuyen, SoGio }
        });

    } catch (error) {
        console.error("Lỗi khi thêm mới dữ liệu:", error);
        res.status(500).json({ message: "Không thể thêm dữ liệu vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};

const editNCKHVaHuanLuyenDoiTuyen = async (req, res) => {
    const { id, NCKHHuanLuyenDoiTuyen, SoGio } = req.body; // Lấy dữ liệu từ form (req.body)


    console.log("Cập nhật dữ liệu vào bảng quydinhsogionckh:", { id, NCKHHuanLuyenDoiTuyen, SoGio });

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            UPDATE quydinhsogionckh
            SET NCKHHuanLuyenDoiTuyen = ?, SoGio = ?
            WHERE ID = ?
        `;

        const queryParams = [NCKHHuanLuyenDoiTuyen, SoGio, id];

        // Thực hiện truy vấn UPDATE
        const [result] = await connection.execute(query, queryParams);

        // Kiểm tra nếu không có bản ghi nào được cập nhật
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy bằng sáng chế và giải thưởng để cập nhật." });
        }

        console.log("Dữ liệu đã được cập nhật thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Cập nhật thành công!",
            data: { id, NCKHHuanLuyenDoiTuyen, SoGio }
        });

    } catch (error) {
        console.error("Lỗi khi cập nhật dữ liệu:", error);
        res.status(500).json({ message: "Không thể cập nhật dữ liệu vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};


const addXayDungCTDT = async (req, res) => {
    const { MaBang, XayDungCTDT, SoGio } = req.body; // Lấy dữ liệu từ form (req.body)

    console.log("Thêm mới dữ liệu vào bảng quydinhsogionckh:", { MaBang, XayDungCTDT, SoGio });

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            INSERT INTO quydinhsogionckh (MaBang, XayDungCTDT, SoGio)
            VALUES (?, ?, ?)
        `;

        const queryParams = [MaBang, XayDungCTDT, SoGio];

        // Thực hiện truy vấn
        const [result] = await connection.execute(query, queryParams);

        console.log("Dữ liệu đã được thêm thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Thêm mới thành công!",
            data: { MaBang, XayDungCTDT, SoGio }
        });

    } catch (error) {
        console.error("Lỗi khi thêm mới dữ liệu:", error);
        res.status(500).json({ message: "Không thể thêm dữ liệu vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};

const editXayDungCTDT = async (req, res) => {
    const { id, XayDungCTDT, SoGio } = req.body; // Lấy dữ liệu từ form (req.body)


    console.log("Cập nhật dữ liệu vào bảng quydinhsogionckh:", { id, XayDungCTDT, SoGio });

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            UPDATE quydinhsogionckh
            SET XayDungCTDT = ?, SoGio = ?
            WHERE ID = ?
        `;

        const queryParams = [XayDungCTDT, SoGio, id];

        // Thực hiện truy vấn UPDATE
        const [result] = await connection.execute(query, queryParams);

        // Kiểm tra nếu không có bản ghi nào được cập nhật
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy bằng sáng chế và giải thưởng để cập nhật." });
        }

        console.log("Dữ liệu đã được cập nhật thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Cập nhật thành công!",
            data: { id, XayDungCTDT, SoGio }
        });

    } catch (error) {
        console.error("Lỗi khi cập nhật dữ liệu:", error);
        res.status(500).json({ message: "Không thể cập nhật dữ liệu vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};


const addBienSoanGiaoTrinhBaiGiang = async (req, res) => {
    const { MaBang, BienSoanGiaoTrinhBaiGiang, SoGio } = req.body; // Lấy dữ liệu từ form (req.body)

    console.log("Thêm mới dữ liệu vào bảng quydinhsogionckh:", { MaBang, BienSoanGiaoTrinhBaiGiang, SoGio });

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            INSERT INTO quydinhsogionckh (MaBang, BienSoanGiaoTrinhBaiGiang, SoGio)
            VALUES (?, ?, ?)
        `;

        const queryParams = [MaBang, BienSoanGiaoTrinhBaiGiang, SoGio];

        // Thực hiện truy vấn
        const [result] = await connection.execute(query, queryParams);

        console.log("Dữ liệu đã được thêm thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Thêm mới thành công!",
            data: { MaBang, BienSoanGiaoTrinhBaiGiang, SoGio }
        });

    } catch (error) {
        console.error("Lỗi khi thêm mới dữ liệu:", error);
        res.status(500).json({ message: "Không thể thêm dữ liệu vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};

const editBienSoanGiaoTrinhBaiGiang = async (req, res) => {
    const { id, BienSoanGiaoTrinhBaiGiang, SoGio } = req.body; // Lấy dữ liệu từ form (req.body)


    console.log("Cập nhật dữ liệu vào bảng quydinhsogionckh:", { id, BienSoanGiaoTrinhBaiGiang, SoGio });

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            UPDATE quydinhsogionckh
            SET BienSoanGiaoTrinhBaiGiang = ?, SoGio = ?
            WHERE ID = ?
        `;

        const queryParams = [BienSoanGiaoTrinhBaiGiang, SoGio, id];

        // Thực hiện truy vấn UPDATE
        const [result] = await connection.execute(query, queryParams);

        // Kiểm tra nếu không có bản ghi nào được cập nhật
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy bằng sáng chế và giải thưởng để cập nhật." });
        }

        console.log("Dữ liệu đã được cập nhật thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Cập nhật thành công!",
            data: { id, BienSoanGiaoTrinhBaiGiang, SoGio }
        });

    } catch (error) {
        console.error("Lỗi khi cập nhật dữ liệu:", error);
        res.status(500).json({ message: "Không thể cập nhật dữ liệu vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};


const addNhiemVuKhoaHocCongNghe = async (req, res) => {
    const { MaBang, NhiemVuKhoaHocCongNghe, ChuNhiem, ThuKy, SoGio } = req.body; // Lấy dữ liệu từ form (req.body)

    console.log("Thêm mới dữ liệu vào bảng quydinhsogionckh:", { MaBang, NhiemVuKhoaHocCongNghe, ChuNhiem, ThuKy, SoGio });

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            INSERT INTO quydinhsogionckh (MaBang, NhiemVuKhoaHocCongNghe, ChuNhiem, ThuKy, SoGio)
            VALUES (?, ?, ?, ?, ?)
        `;

        const queryParams = [MaBang, NhiemVuKhoaHocCongNghe, ChuNhiem, ThuKy, SoGio];

        // Thực hiện truy vấn
        const [result] = await connection.execute(query, queryParams);

        console.log("Dữ liệu đã được thêm thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Thêm mới thành công!",
            data: { NhiemVuKhoaHocCongNghe, ChuNhiem, ThuKy, SoGio }
        });

    } catch (error) {
        console.error("Lỗi khi thêm mới dữ liệu:", error);
        res.status(500).json({ message: "Không thể thêm dữ liệu vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};

const edtiNhiemVuKhoaHocCongNghe = async (req, res) => {
    const { id, NhiemVuKhoaHocCongNghe, ChuNhiem, ThuKy, SoGio, PhanBien, UyVien } = req.body; // Lấy dữ liệu từ form (req.body)

    console.log("Cập nhật dữ liệu vào bảng quydinhsogionckh:", { id, NhiemVuKhoaHocCongNghe, ChuNhiem, ThuKy, SoGio, PhanBien, UyVien });
    // 
    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            UPDATE quydinhsogionckh
            SET NhiemVuKhoaHocCongNghe = ?, ChuNhiem = ?, ThuKy = ?, SoGio = ?, PhanBien = ?, UyVien = ?
            WHERE ID = ?
        `;

        const queryParams = [NhiemVuKhoaHocCongNghe, ChuNhiem, ThuKy, SoGio, PhanBien, UyVien, id];

        // Thực hiện truy vấn UPDATE
        const [result] = await connection.execute(query, queryParams);

        // Kiểm tra nếu không có bản ghi nào được cập nhật
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy đề tài/dự án để cập nhật." });
        }

        console.log("Dữ liệu đã được cập nhật thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Cập nhật thành công!",
            data: { id, NhiemVuKhoaHocCongNghe, ChuNhiem, ThuKy, SoGio, PhanBien, UyVien }
        });

    } catch (error) {
        console.error("Lỗi khi cập nhật dữ liệu:", error);
        res.status(500).json({ message: "Không thể cập nhật dữ liệu vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};

const deleteRowQuyDinhSoGioNCKH = async (req, res) => {
    const { id } = req.body; // Lấy dữ liệu từ form (req.body)

    console.log("Xóa id bảng quydinhsogionckh: ", id);

    let connection;
    try {
        connection = await createPoolConnection(); // Lấy kết nối từ pool

        const query = `
            DELETE FROM quydinhsogionckh WHERE ID = ?
        `;

        const queryParams = [id];

        // Thực hiện truy vấn
        const [result] = await connection.execute(query, queryParams);

        console.log("Xóa thành công:", result);

        // Trả về kết quả cho client
        res.status(200).json({
            message: "Xóa thành công!",
            data: { id }
        });

    } catch (error) {
        console.error("Lỗi khi xóa dữ liệu:", error);
        res.status(500).json({ message: "Không thể xóa vào cơ sở dữ liệu." });
    } finally {
        if (connection) connection.release(); // Trả lại kết nối cho pool
    }
};

module.exports = {
    addDeTaiDuAn,
    editDeTaiDuAn,
    addBaiBaoKhoaHoc,
    editBaiBaoKhoaHoc,
    addBangSangCheVaGiaiThuong,
    editBangSangCheVaGiaiThuong,
    addSachVaGiaoTrinh,
    editSachVaGiaoTrinh,
    addNCKHVaHuanLuyenDoiTuyen,
    editNCKHVaHuanLuyenDoiTuyen,
    addXayDungCTDT,
    editXayDungCTDT,
    addBienSoanGiaoTrinhBaiGiang,
    editBienSoanGiaoTrinhBaiGiang,
    addNhiemVuKhoaHocCongNghe,
    edtiNhiemVuKhoaHocCongNghe,
    deleteRowQuyDinhSoGioNCKH
};