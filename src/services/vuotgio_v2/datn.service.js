/**
 * VUOT GIO V2 - Đồ án tốt nghiệp Service
 */

const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/datn.repo");

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

const getTable = async (filters) => withConnection(null, async (connection) => {
    const rows = await repo.getTable(connection, filters);

     const gvTotals = {};
    rows.forEach(row => {
        const key = `${row.Khoa}_${row.GiangVien}`;
        gvTotals[key] = (gvTotals[key] || 0) + (parseFloat(row.SoTiet) || 0);
    });
    rows.forEach(row => {
        const key = `${row.Khoa}_${row.GiangVien}`;
        row.TongSoTietGV = gvTotals[key];
    });

    const tongSoTiet = rows.reduce((sum, row) => sum + (parseFloat(row.SoTiet) || 0), 0);
    return {
        data: rows,
        tongSoTiet
    };
});

const getChiTiet = async (params) => withConnection(null, async (connection) => {
    const rows = await repo.getChiTiet(connection, params);
    const tongSoTiet = rows.reduce((sum, row) => sum + (parseFloat(row.SoTiet) || 0), 0);
    return {
        data: rows,
        giangVien: params.giangVien,
        tongSoTiet
    };
});

module.exports = {
    getTable,
    getChiTiet
};
