/**
 * VUOT GIO V2 - Tổng Hợp Service (Core SDO Engine)
 * Lõi tính toán số tiết vượt giờ
 */

const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/tongHop.repo");
const statsService = require("../nckh_v3/stats.service");

const mapper = require("../../mappers/vuotgio_v2/summary.mapper");

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

const chuanHoaNamHoc = (namHoc) => {
    if (!namHoc) return "";
    let clean = namHoc.toString().replace(/\s+/g, "");
    if (clean.length === 8 && !clean.includes("-")) {
        return clean.substring(0, 4) + " - " + clean.substring(4);
    }
    if (clean.includes("-")) {
        let parts = clean.split("-");
        return parts[0] + " - " + parts[1];
    }
    return namHoc;
};

/**
 * Lấy SDO nguyên bản (Atomic SDO) cho 1 giảng viên
 */
const getAtomicSDO = async (namHocInput, id_User, connection) => withConnection(connection, async (activeConnection) => {
    const namHoc = chuanHoaNamHoc(namHocInput);
    const nv = await repo.getNhanVienById(activeConnection, id_User);
    if (!nv) return null;

    const [giangDay, lopNgoaiQC, kthp, doAn, hdtq, nckhRecords, dinhMuc, chuNhiemKhoa] = await Promise.all([
        repo.getGiangDayByIdUser(activeConnection, { namHoc, idUser: id_User }),
        repo.getLopNgoaiQCByIdUser(activeConnection, { namHoc, idUser: id_User }),
        repo.getKthpByIdUser(activeConnection, { namHoc, idUser: id_User }),
        repo.getDoAnByIdUser(activeConnection, { namHoc, idUser: id_User }),
        repo.getHuongDanThamQuanByIdUser(activeConnection, { namHoc, idUser: id_User }),
        id_User ? statsService.getLecturerRecords(id_User, namHoc) : [],
        repo.getDinhMuc(activeConnection),
        repo.getChuNhiemKhoaByKhoa(activeConnection, nv.maKhoa)
    ]);

    return mapper.toAtomicSDO(nv, { giangDay, lopNgoaiQC, kthp, doAn, hdtq, nckhRecords }, namHoc, dinhMuc, { chuNhiemKhoa });
});

/**
 * Lấy danh sách SDO cho tất cả GV trong khoa
 */
const getCollectionSDO = async (namHocInput, khoa) => withConnection(null, async (connection) => {
    const namHoc = chuanHoaNamHoc(namHocInput);
    const [rawData, nckhData, dinhMuc] = await Promise.all([
        repo.getDuLieuThoTongHop(connection, { namHoc, khoa }),
        statsService.getLecturerSummary(namHoc, "ALL"),
        repo.getDinhMuc(connection)
    ]);

    const nckhMap = new Map(nckhData.map(r => [Number(r.lecturerId), r.tongSoTietGiangVien]));

    return mapper.toCollectionSDO(rawData, nckhMap, namHoc, dinhMuc);
});

module.exports = {
    getAtomicSDO,
    getCollectionSDO,
    chuanHoaNamHoc
};
