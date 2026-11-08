/**
 * VUOT GIO V2 - Hướng dẫn tham quan Service
 */

const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/huongDanThamQuan.repo");
const LogService = require("../../services/logService");

const withConnection = async (connection, callback) => {
    let shouldRelease = false;
    if (!connection) {
        connection = await createPoolConnection();
        shouldRelease = true;
    }
    try {
        return await callback(connection);
    } finally {
        if (shouldRelease && connection) {
            connection.release();
        }
    }
};

const getFilters = async () => withConnection(null, async (connection) => {
    const [namRows] = await connection.query('SELECT NamHoc, trangthai FROM namhoc ORDER BY NamHoc DESC');
    const activeNamHoc = namRows.find(r => r.trangthai === 1)?.NamHoc || null;
    const [khoaRows] = await connection.query('SELECT DISTINCT MaPhongBan FROM phongban ORDER BY MaPhongBan');
    const [heDaoTaoRows] = await connection.query("SELECT id, he_dao_tao FROM he_dao_tao WHERE LOWER(he_dao_tao) NOT LIKE '%đồ án%' ORDER BY he_dao_tao");
    const [gvRows] = await connection.query('SELECT id_User, TenNhanVien AS HoTen, MaPhongBan AS Khoa FROM nhanvien ORDER BY TenNhanVien');

    return {
        namHoc: namRows.map(r => r.NamHoc),
        activeNamHoc,
        khoa: khoaRows.map(r => r.MaPhongBan),
        heDaoTao: heDaoTaoRows,
        teachers: gvRows,
        dot: [1, 2],
        ki: [1, 2]
    };
});

const getTable = async (filters) => withConnection(null, async (connection) => {
    return await repo.getTable(connection, filters);
});

const assertCanEditDelete = (record, user) => {
    if (!record) {
        const error = new Error("Không tìm thấy bản ghi hướng dẫn tham quan.");
        error.statusCode = 404;
        throw error;
    }

    const role = user?.role || user?.Quyen || "";
    const maPhongBan = user?.MaPhongBan || "";
    const gvCnbm = process.env.ROLE_KHOA_GV_CNBM || "GV_CNBM";
    const lanhDaoKhoa = process.env.ROLE_KHOA_LANHDAO || "Lãnh đạo khoa";
    const lanhDaoPhong = process.env.ROLE_PHONGBAN_LANHDAO || "Lãnh đạo phòng";
    const daoTao = process.env.DAO_TAO || "DAOTAO";
    const isDaoTaoLeader = maPhongBan === daoTao && role === lanhDaoPhong;
    const isFacultyEditor = role === gvCnbm || role === lanhDaoKhoa;

    if (!isDaoTaoLeader && !isFacultyEditor) {
        const error = new Error("Bạn không có quyền sửa hoặc xóa bản ghi này.");
        error.statusCode = 403;
        throw error;
    }

    if (Number(record.khoa_duyet || 0) === 1) {
        const error = new Error("Không thể sửa hoặc xóa vì Khoa đã duyệt bản ghi này.");
        error.statusCode = 403;
        throw error;
    }

    if (!isDaoTaoLeader && Number(record.dao_tao_duyet || 0) === 1) {
        const error = new Error("Không thể sửa hoặc xóa vì Phòng Đào tạo đã duyệt bản ghi này.");
        error.statusCode = 403;
        throw error;
    }

    return isDaoTaoLeader;
};

const save = async (data, user) => withConnection(null, async (connection) => {
    const so_ngay = parseInt(data.so_ngay) || 0;
    const so_tiet_quy_doi = so_ngay * 3;
    
    const insertData = { ...data, so_ngay, so_tiet_quy_doi };
    const insertId = await repo.save(connection, insertData);
    
    try {
        await LogService.logChange(user.id, user.name, 'Thêm hướng dẫn tham quan', `ID: ${insertId}`);
    } catch (e) {}
    
    return insertId;
});

const edit = async (id, data, user) => withConnection(null, async (connection) => {
    await connection.beginTransaction();
    try {
        const record = await repo.getById(connection, id, true);
        const isDaoTaoLeader = assertCanEditDelete(record, user);

        const so_ngay = parseInt(data.so_ngay) || 0;
        const so_tiet_quy_doi = so_ngay * 3;
        const updateData = { ...data, so_ngay, so_tiet_quy_doi };
        await repo.update(connection, id, updateData);
        if (isDaoTaoLeader && Number(record.dao_tao_duyet || 0) === 1) {
            await repo.updateApproval(connection, id, Number(record.khoa_duyet || 0), 0);
        }
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    }
    
    try {
        await LogService.logChange(user.id, user.name, 'Sửa hướng dẫn tham quan', `ID: ${id}`);
    } catch (e) {}
});

const deleteRecord = async (id, user) => withConnection(null, async (connection) => {
    await connection.beginTransaction();
    try {
        const record = await repo.getById(connection, id, true);
        assertCanEditDelete(record, user);
        await repo.delete(connection, id);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    }
    try {
        await LogService.logChange(user.id, user.name, 'Xóa hướng dẫn tham quan', `ID: ${id}`);
    } catch (e) {}
});

const batchApprove = async (records, user) => withConnection(null, async (connection) => {
    let count = 0;
    await connection.beginTransaction();
    try {
        for (const record of records) {
            const khoaDuyet = parseInt(record.khoa_duyet) || 0;
            const daoTaoDuyet = parseInt(record.dao_tao_duyet) || 0;
            await repo.updateApproval(connection, record.id, khoaDuyet, daoTaoDuyet);
            count++;
        }
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    }
    try {
        await LogService.logChange(user.id, user.name, 'Batch duyệt hướng dẫn tham quan', `Cập nhật ${count} bản ghi`);
    } catch (e) {}
    return count;
});

module.exports = {
    getFilters,
    getTable,
    save,
    edit,
    batchApprove,
    delete: deleteRecord
};
