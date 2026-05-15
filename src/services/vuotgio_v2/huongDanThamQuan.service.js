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
    const [khoaRows] = await connection.query('SELECT DISTINCT MaPhongBan FROM phongban WHERE isKhoa = 1 ORDER BY MaPhongBan');
    const [heDaoTaoRows] = await connection.query('SELECT id, he_dao_tao FROM he_dao_tao ORDER BY he_dao_tao');
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
    const so_ngay = parseInt(data.so_ngay) || 0;
    const so_tiet_quy_doi = so_ngay * 3;
    
    const updateData = { ...data, so_ngay, so_tiet_quy_doi };
    await repo.update(connection, id, updateData);
    
    try {
        await LogService.logChange(user.id, user.name, 'Sửa hướng dẫn tham quan', `ID: ${id}`);
    } catch (e) {}
});

const deleteRecord = async (id, user) => withConnection(null, async (connection) => {
    await repo.delete(connection, id);
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
