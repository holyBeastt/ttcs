const createPoolConnection = require("../../config/databasePool");
const LogService = require("../logService");
const repo = require("../../repositories/vuotgio_v2/kthp.repo");

const mapper = require("../../mappers/vuotgio_v2/kthp.mapper");
const baseMapper = require("../../mappers/vuotgio_v2/base.mapper");
const { pick, toInt, toDecimal } = baseMapper;

const getUserContext = (req) => {
    if (!req.session?.userId) {
        console.warn("[KTHP] getUserContext: session.userId is missing — request may be unauthenticated");
    }
    return {
        userId: req.session?.userId || null,
        userName: req.session?.TenNhanVien || req.session?.username || "Unknown",
    };
};

const getLecturerIdByName = async (connection, name) => {
    if (!name) return null;
    const [rows] = await connection.execute(`SELECT id_User FROM nhanvien WHERE TenNhanVien = ? LIMIT 1`, [name]);
    return rows[0]?.id_User || null;
};

const getHeDaoTaoIdByName = async (connection, name) => {
    if (!name) return 1;
    const [rows] = await connection.execute(`SELECT id FROM he_dao_tao WHERE he_dao_tao = ? LIMIT 1`, [name]);
    return rows[0]?.id || 1;
};

const save = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    let connection;
    try {
        connection = await createPoolConnection();
        const data = mapper.toEntity(req.body);

        if (!data.nam_hoc || !data.ten_hoc_phan || !data.giang_vien || !data.khoa || !data.hinh_thuc) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc: Năm học, Tên HP, Giảng viên, Khoa, Hình thức" });
        }

        const lecturerId = await getLecturerIdByName(connection, data.giang_vien);
        const heDaoTaoId = await getHeDaoTaoIdByName(connection, data.doi_tuong);
        const [result] = await repo.insert(connection, [
            lecturerId || userId,
            data.giang_vien,
            data.khoa,
            data.hoc_ky,
            data.nam_hoc,
            data.dot || 1,
            data.hinh_thuc,
            data.ten_hoc_phan,
            data.lop_hoc_phan,
            data.doi_tuong,
            heDaoTaoId,
            data.bai_cham_1,
            data.bai_cham_2,
            data.tong_so,
            data.quy_chuan,
            data.ghi_chu,
            data.so_tc,
            data.so_sv,
        ]);

        try { await LogService.logChange(userId, userName, "Thêm KTHP", `Thêm KTHP "${data.hinh_thuc}" - HP: "${data.ten_hoc_phan}" cho GV: "${data.giang_vien}"`); } catch (error) { console.error("Lỗi khi ghi log:", error); }
        res.status(200).json({ success: true, message: "Thêm kết thúc học phần thành công!", id: result.insertId });
    } catch (error) {
        console.error("Lỗi khi thêm KTHP:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra khi thêm kết thúc học phần." });
    } finally {
        if (connection) connection.release();
    }
};

const saveBatch = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    let connection;
    try {
        connection = await createPoolConnection();
        const baseData = mapper.toEntity(req.body);
        const details = Array.isArray(req.body?.details) ? req.body.details : [];

        if (!baseData.nam_hoc || !baseData.ten_hoc_phan || !baseData.giang_vien || !baseData.khoa) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc: Năm học, Tên HP, Giảng viên, Khoa" });
        }
        if (details.length === 0) {
            return res.status(400).json({ success: false, message: "Không có dữ liệu hình thức để lưu." });
        }

        const normalizedDetails = details.map((item) => ({
            hinh_thuc: pick(item, "hinh_thuc", "hinhthuc", "HinhThuc") || "",
            quy_chuan: toDecimal(pick(item, "quy_chuan", "sotietqc", "SoTietQC"), 0),
            doi_tuong: pick(item, "doi_tuong", "doituong", "DoiTuong") || baseData.doi_tuong || "",
        })).filter((item) => item.hinh_thuc && item.quy_chuan > 0);

        if (normalizedDetails.length === 0) {
            return res.status(400).json({ success: false, message: "Vui lòng nhập số tiết > 0 cho ít nhất 1 hình thức." });
        }

        const lecturerId = await getLecturerIdByName(connection, baseData.giang_vien);
        const baseHeDaoTaoId = await getHeDaoTaoIdByName(connection, baseData.doi_tuong);
        const query = `
            INSERT INTO vg_coi_cham_ra_de
            (id_user, giang_vien, khoa, hoc_ky, nam_hoc, dot, hinh_thuc, ten_hoc_phan, lop_hoc_phan, doi_tuong, he_dao_tao_id, bai_cham_1, bai_cham_2, tong_so, quy_chuan, ghi_chu, khoa_duyet, khao_thi_duyet, so_tc, so_sv)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
        `;

        await connection.beginTransaction();
        const insertedIds = [];
        for (const detail of normalizedDetails) {
            const detailHeDaoTaoId = detail.doi_tuong === baseData.doi_tuong ? baseHeDaoTaoId : await getHeDaoTaoIdByName(connection, detail.doi_tuong);
            const [result] = await connection.execute(query, [
                lecturerId || userId,
                baseData.giang_vien,
                baseData.khoa,
                baseData.hoc_ky,
                baseData.nam_hoc,
                baseData.dot || 1,
                detail.hinh_thuc,
                baseData.ten_hoc_phan,
                baseData.lop_hoc_phan,
                detail.doi_tuong,
                detailHeDaoTaoId,
                baseData.bai_cham_1,
                baseData.bai_cham_2,
                baseData.tong_so,
                detail.quy_chuan,
                baseData.ghi_chu,
                baseData.so_tc,
                baseData.so_sv,
            ]);
            insertedIds.push(result.insertId);
        }
        await connection.commit();

        try { await LogService.logChange(userId, userName, "Thêm KTHP batch", `Thêm batch KTHP gồm ${normalizedDetails.length} hình thức - HP: "${baseData.ten_hoc_phan}" - GV: "${baseData.giang_vien}"`); } catch (error) { console.error("Lỗi khi ghi log:", error); }
        res.status(200).json({ success: true, message: `Đã lưu ${normalizedDetails.length} hình thức cho giảng viên ${baseData.giang_vien}.`, ids: insertedIds });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (rollbackError) { console.error("Lỗi rollback khi lưu batch KTHP:", rollbackError); }
        }
        console.error("Lỗi khi thêm batch KTHP:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra khi thêm batch kết thúc học phần." });
    } finally {
        if (connection) connection.release();
    }
};

const getTable = async (req, res) => {
    const { NamHoc } = req.params;
    // enforceKhoaFilter middleware đã override req.params.Khoa nếu user là khoa
    const Khoa = req.params.Khoa;
    let connection;
    try {
        connection = await createPoolConnection();
        const results = await repo.getTable(connection, { namHoc: NamHoc, khoa: Khoa });
        res.json(results);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách KTHP:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

const getTableData = async (req, res) => {
    const { NamHoc, heDaoTao, dot, ki } = req.body;
    const khoa = req.body.khoa || req.body.Khoa;
    
    let connection;
    try {
        connection = await createPoolConnection();
        const results = await repo.getTable(connection, { 
            namHoc: NamHoc, 
            khoa: khoa,
            heDaoTao: heDaoTao,
            dot: dot,
            ki: ki
        });
        res.json({ success: true, data: results });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách KTHP (POST):", error);
        res.status(500).json({ success: false, message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

const edit = async (req, res) => {
    const { ID } = req.params;
    const { userId, userName } = getUserContext(req);
    if (!ID) return res.status(400).json({ message: "Thiếu ID cần cập nhật." });

    let connection;
    try {
        connection = await createPoolConnection();
        const data = mapper.toEntity(req.body);
        const lecturerId = await getLecturerIdByName(connection, data.giang_vien);
        const heDaoTaoId = await getHeDaoTaoIdByName(connection, data.doi_tuong);

        const [result] = await repo.update(connection, ID, [
            lecturerId || userId,
            data.giang_vien,
            data.khoa,
            data.hoc_ky,
            data.nam_hoc,
            data.dot || 1,
            data.hinh_thuc,
            data.ten_hoc_phan,
            data.lop_hoc_phan,
            data.doi_tuong,
            heDaoTaoId,
            data.bai_cham_1,
            data.bai_cham_2,
            data.tong_so,
            data.quy_chuan,
            data.ghi_chu,
            data.so_tc,
            data.so_sv,
        ]);

        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi để cập nhật." });
        try { await LogService.logChange(userId, userName, "Sửa KTHP", `Sửa KTHP ID: ${ID} - Hình thức: "${data.hinh_thuc}"`); } catch (error) { console.error("Lỗi khi ghi log:", error); }
        res.status(200).json({ success: true, message: "Cập nhật thành công!" });
    } catch (error) {
        console.error("Lỗi khi cập nhật KTHP:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra khi cập nhật." });
    } finally {
        if (connection) connection.release();
    }
};

const deleteRecord = async (req, res) => {
    const { ID } = req.params;
    const { userId, userName } = getUserContext(req);
    if (!ID) return res.status(400).json({ message: "Thiếu ID cần xóa." });

    let connection;
    try {
        connection = await createPoolConnection();
        const existing = await repo.getById(connection, ID);
        if (!existing) return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi." });
        if (existing.khoa_duyet === 1 || existing.khao_thi_duyet === 1) {
            return res.status(400).json({ success: false, message: "Không thể xóa bản ghi đã được duyệt." });
        }

        await repo.remove(connection, ID);
        try { await LogService.logChange(userId, userName, "Xóa KTHP", `Xóa KTHP: "${existing.hinh_thuc}" - HP: "${existing.ten_hoc_phan}" - GV: "${existing.giang_vien}"`); } catch (error) { console.error("Lỗi khi ghi log:", error); }
        res.status(200).json({ success: true, message: "Xóa thành công!" });
    } catch (error) {
        console.error("Lỗi khi xóa KTHP:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra khi xóa." });
    } finally {
        if (connection) connection.release();
    }
};

const batchApprove = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    const records = req.body.updates || req.body;
    if (!records || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, message: "Thiếu dữ liệu cần cập nhật." });
    }

    let connection;
    try {
        connection = await createPoolConnection();
        const updatedCount = await repo.updateBatchApproval(connection, records.map((record) => ({
            id: record.id || record.ID,
            khoa_duyet: toInt(pick(record, "khoaduyet", "khoa_duyet"), 0),
            khao_thi_duyet: toInt(pick(record, "khaothiduyet", "khao_thi_duyet"), 0),
        })));

        try { await LogService.logChange(userId, userName, "Batch Duyệt KTHP", `Cập nhật trạng thái duyệt cho ${updatedCount} bản ghi KTHP`); } catch (error) { console.error("Lỗi khi ghi log:", error); }
        res.status(200).json({ success: true, message: `Đã cập nhật ${updatedCount} bản ghi!` });
    } catch (error) {
        console.error("Lỗi khi batch approve KTHP:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra khi cập nhật." });
    } finally {
        if (connection) connection.release();
    }
};

const approve = async (req, res) => {
    const { ID } = req.params;
    const { userId, userName } = getUserContext(req);
    if (!ID) return res.status(400).json({ message: "Thiếu ID cần duyệt." });

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await repo.updateApproval(connection, ID, 1);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi." });
        try { await LogService.logChange(userId, userName, "Duyệt KTHP", `Duyệt KTHP ID: ${ID}`); } catch (error) { console.error("Lỗi khi ghi log:", error); }
        res.status(200).json({ success: true, message: "Duyệt thành công!" });
    } catch (error) {
        console.error("Lỗi khi duyệt KTHP:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra khi duyệt." });
    } finally {
        if (connection) connection.release();
    }
};

const getList = async (req, res) => {
    const { MaPhongBan, Ki, Nam } = req.params;
    let connection;
    try {
        connection = await createPoolConnection();
        const query = `
            SELECT 
              t.id,
              t.id_user,
              t.giang_vien AS giangvien,
              t.giang_vien,
              t.khoa,
              t.hoc_ky AS ki,
              t.hoc_ky,
              t.nam_hoc AS namhoc,
              t.nam_hoc,
              t.hinh_thuc AS hinhthuc,
              t.hinh_thuc,
              t.ten_hoc_phan AS tenhocphan,
              t.ten_hoc_phan,
              t.lop_hoc_phan AS lophocphan,
              t.lop_hoc_phan,
              h.he_dao_tao AS doituong,
              h.he_dao_tao AS doi_tuong,
              t.bai_cham_1 AS baicham1,
              t.bai_cham_1,
              t.bai_cham_2 AS baicham2,
              t.bai_cham_2,
              t.tong_so AS tongso,
              t.tong_so,
              t.quy_chuan AS sotietqc,
              t.quy_chuan,
              t.ghi_chu AS ghichu,
              t.ghi_chu,
              t.khoa_duyet AS khoaduyet,
              t.khoa_duyet,
              t.khao_thi_duyet AS khaothiduyet,
              t.khao_thi_duyet,
              t.so_tc,
              t.so_sv
            FROM ${repo.COI_CHAM_RA_DE_TABLE} t
            LEFT JOIN he_dao_tao h ON t.he_dao_tao_id = h.id
            WHERE t.khoa = ? AND t.hoc_ky = ? AND t.nam_hoc = ?
        `;
        const [rows] = await connection.execute(query, [MaPhongBan, Ki, Nam]);
        res.json({ success: true, list: rows });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách KTHP:", error);
        res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách" });
    } finally {
        if (connection) connection.release();
    }
};

const getMyList = async (req, res) => {
    const { TenNhanVien, Ki, Nam } = req.params;
    const nameClean = TenNhanVien.replace(/-/g, ' ').trim();
    let connection;
    try {
        connection = await createPoolConnection();
        const rows = await repo.getByLecturerName(connection, { name: nameClean, hocKy: Ki, namHoc: Nam });
        res.json({ success: true, list: rows });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách cá nhân KTHP:", error);
        res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách" });
    } finally {
        if (connection) connection.release();
    }
};

const deleteByFilter = async (req, res) => {
    const { Ki, Nam, hocKy, namHoc, dot } = req.body;
    const kiVal = hocKy || Ki;
    const namVal = namHoc || Nam;
    const { userId, userName } = getUserContext(req);
    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await repo.deleteByYearAndSemester(connection, { hocKy: kiVal, namHoc: namVal, dot: dot });
        await LogService.logChange(userId, userName, "Xóa KTHP theo năm/kỳ/đợt", `Xóa ${result.affectedRows} bản ghi - Học kỳ ${kiVal}, Năm ${namVal}, Đợt ${dot || 'Tất cả'}`);
        res.json({ success: true, message: "Xóa dữ liệu thành công", affectedRows: result.affectedRows });
    } catch (error) {
        console.error("Lỗi khi xóa dữ liệu KTHP:", error);
        res.status(500).json({ success: false, message: "Lỗi khi xóa dữ liệu" });
    } finally {
        if (connection) connection.release();
    }
};

const checkExistence = async (req, res) => {
    const { Ki, Nam, hocKy, namHoc, dot } = req.body;
    const kiVal = hocKy || Ki;
    const namVal = namHoc || Nam;
    let connection;
    try {
        connection = await createPoolConnection();
        const count = await repo.countByYearAndSemester(connection, { hocKy: kiVal, namHoc: namVal, dot: dot });
        res.json({ exists: count > 0 });
    } catch (error) {
        console.error("Lỗi khi kiểm tra dữ liệu KTHP:", error);
        res.status(500).json({ success: false, message: "Lỗi khi kiểm tra dữ liệu" });
    } finally {
        if (connection) connection.release();
    }
};

const updateBatch = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    const dataList = req.body.data;
    if (!Array.isArray(dataList)) return res.status(400).json({ error: "Dữ liệu không hợp lệ" });

    let connection;
    try {
        connection = await createPoolConnection();
        await connection.beginTransaction();

        for (const item of dataList) {
            const id = item.id || item.ID;
            const existing = await repo.getById(connection, id);
            if (!existing) continue;

            const loai = item.loai || item.hinh_thuc || item.Type;
            let baicham1 = 0, baicham2 = 0, tongso = 0;
            if (loai === "Ra Đề" || loai === "Ra đề") tongso = item.soDe || item.tong_so || 0;
            else if (loai === "Coi Thi" || loai === "Coi thi") tongso = item.soCa || item.tong_so || 0;
            else if (loai === "Chấm Thi" || loai === "Chấm thi") {
                baicham1 = item.soBaiCham1 || item.bai_cham_1 || 0;
                baicham2 = item.soBaiCham2 || item.bai_cham_2 || 0;
                tongso = item.tongSoBai || item.tong_so || 0;
            }

            await connection.execute(
                `UPDATE ${repo.COI_CHAM_RA_DE_TABLE} SET 
                    ten_hoc_phan = ?, lop_hoc_phan = ?, hinh_thuc = ?, 
                    bai_cham_1 = ?, bai_cham_2 = ?, tong_so = ?, quy_chuan = ?,
                    khoa_duyet = ?, khao_thi_duyet = ?
                WHERE id = ?`,
                [
                    item.tenHocPhan || item.ten_hoc_phan,
                    item.lopHocPhan || item.lop_hoc_phan,
                    loai,
                    baicham1, baicham2, tongso,
                    item.soTietQC || item.quy_chuan || 0,
                    item.khoaduyet || item.khoa_duyet || 0,
                    item.khaothiduyet || item.khao_thi_duyet || 0,
                    id
                ]
            );
        }

        await connection.commit();
        await LogService.logChange(userId, userName, "Cập nhật KTHP hàng loạt", `Cập nhật ${dataList.length} bản ghi`);
        res.json({ success: true, message: "Cập nhật dữ liệu thành công!" });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Lỗi khi cập nhật KTHP hàng loạt:", error);
        res.status(500).json({ success: false, message: "Lỗi khi cập nhật dữ liệu" });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    save,
    saveBatch,
    getTable,
    getTableData,
    edit,
    delete: deleteRecord,
    batchApprove,
    approve,
    getList,
    getMyList,
    deleteByFilter,
    checkExistence,
    updateBatch
};
