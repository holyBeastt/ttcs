/**
 * VUOT GIO V2 - Xuất File Service
 * Chuyển đổi SDO thành file Excel
 */

const tongHopService = require("./tongHop.service");
const createPoolConnection = require("../../config/databasePool");
const sharedRepo = require("../../repositories/vuotgio_v2/shared.repo");
const { buildWorkbook } = require("./excel/keKhaiReport.generator");

const exportExcel = async (namHoc, khoa, giangVien) => {
    if (!namHoc) {
        throw new Error("Thiếu thông tin Năm học");
    }

    let connection;
    try {
        connection = await createPoolConnection();
        let summaries = [];

        if (giangVien) {
            let sdo = await tongHopService.getAtomicSDO(namHoc, giangVien, connection);
            if (!sdo) {
                const teachers = await sharedRepo.getTeachers(connection, khoa);
                const matched = teachers.find((teacher) => {
                    const idMatch = String(teacher.id_User) === String(giangVien);
                    const nameMatch = String(teacher.HoTen || "").trim() === String(giangVien || "").trim();
                    return idMatch || nameMatch;
                });
                if (matched) {
                    sdo = await tongHopService.getAtomicSDO(namHoc, matched.id_User, connection);
                }
            }

            if (sdo) {
                summaries = [sdo];
            }
        } else {
            const teachers = await sharedRepo.getTeachers(connection, khoa);
            for (const teacher of teachers) {
                const sdo = await tongHopService.getAtomicSDO(namHoc, teacher.id_User, connection);
                if (sdo) summaries.push(sdo);
            }
        }

        if (!summaries.length) {
            throw new Error("Không có dữ liệu để xuất file");
        }

        return buildWorkbook(summaries, { useFormulas: true });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    exportExcel
};
