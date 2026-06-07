const createPoolConnection = require("../../config/databasePool");
const datnRepo = require("../../repositories/vuotgioDuKien/datn.repo");

const getDoAnTotNghiepDuKien = async (namHoc, khoaId, dot, kiHoc) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const rows = await datnRepo.getDoAnTotNghiepDuKien(connection, namHoc, khoaId, dot, kiHoc);
        return rows;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    getDoAnTotNghiepDuKien
};