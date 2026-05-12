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

    console.info("[tongHopService] raw sizes", {
        namHoc,
        khoa,
        rawCount: Array.isArray(rawData) ? rawData.length : 0,
        nckhCount: Array.isArray(nckhData) ? nckhData.length : 0,
        hasDinhMuc: Boolean(dinhMuc)
    });

    const nckhMap = new Map(nckhData.map(r => [Number(r.lecturerId), r.tongSoTietGiangVien]));

    const missingNckh = rawData.filter(r => !nckhMap.has(Number(r.id_User))).map(r => r.id_User);
    if (missingNckh.length) {
        console.warn("[tongHopService] missing NCKH records", {
            count: missingNckh.length,
            sample: missingNckh.slice(0, 20)
        });
    }

    return mapper.toCollectionSDO(rawData, nckhMap, namHoc, dinhMuc);
});

/**
 * Lấy danh sách SDO chi tiết (bao gồm tableF) cho tất cả GV trong khoa
 * Không thay đổi cấu trúc SDO gốc, chỉ map sang shape collection đầy đủ hơn.
 */
const getCollectionSDODetail = async (namHocInput, khoa) => withConnection(null, async (connection) => {
    const namHoc = chuanHoaNamHoc(namHocInput);
    const rawData = await repo.getDuLieuThoTongHop(connection, { namHoc, khoa });

    if (!rawData.length) return [];

    const sdoList = [];
    for (const row of rawData) {
        const sdo = await getAtomicSDO(namHoc, row.id_User, connection);
        if (!sdo) continue;

        sdoList.push({
            id_User: sdo.id_User,
            giangVien: sdo.giangVien,
            maKhoa: sdo.maKhoa,
            khoa: sdo.khoa,
            // isKhoa: 0 = phòng/ban (gộp chung), 1 = khoa (sheet riêng)
            // Lấy từ sdo (đã fix repo+mapper), fallback về row từ rawData
            isKhoa: sdo.isKhoa ?? row.isKhoa ?? 1,
            chucVu: sdo.chucVu,
            soTaiKhoan: sdo.soTaiKhoan,
            nganHang: sdo.nganHang,
            lyDoMienGiam: sdo.lyDoMienGiam,
            phanTramMienGiam: sdo.phanTramMienGiam,
            hsl: sdo.hsl,
            luong: sdo.luong,
            soTietGiangDay: sdo.soTietGiangDay,
            soTietNgoaiQC: sdo.soTietNgoaiQC,
            soTietKTHP: sdo.soTietKTHP,
            soTietDoAn: sdo.soTietDoAn,
            soTietHDTQ: sdo.soTietHDTQ,
            tongThucHien: sdo.tongThucHien,
            mienGiam: sdo.mienGiam,
            dinhMucSauMienGiam: sdo.dinhMucSauMienGiam,
            thieuTietGiangDay: sdo.thieuTietGiangDay,
            thieuNCKH: sdo.thieuNCKH,
            tongVuot: sdo.tongVuot,
            thanhToan: sdo.thanhToan,
            dinhMucChuan: sdo.dinhMucChuan,
            soTietNCKH: sdo.soTietNCKH,
            nam_hoc: sdo.nam_hoc,
            tableF: sdo.tableF,
            breakdown: sdo.breakdown   // pre-computed: hk1/hk2/year/vuot/money đã tách sẵn
        });
    }

    console.info(`[getCollectionSDODetail] Aggregated ${sdoList.length} records. Total luong: ${sdoList.reduce((s, r) => s + (r.luong || 0), 0)}. Sample:`, 
        sdoList.slice(0, 5).map(r => ({ gv: r.giangVien, luong: r.luong })));

    return sdoList;
});

module.exports = {
    getAtomicSDO,
    getCollectionSDO,
    getCollectionSDODetail,
    chuanHoaNamHoc
};
