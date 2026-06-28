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
const getAtomicSDO = async (namHocInput, id_User, connection = null, isDuKien = false) => withConnection(connection, async (activeConnection) => {
    const namHoc = chuanHoaNamHoc(namHocInput);
    const nv = await repo.getNhanVienById(activeConnection, id_User);
    if (!nv) return null;
    const requireApproval = !isDuKien;

    const [giangDay, lopNgoaiQC, kthp, doAn, hdtq, nckhRecords, dinhMuc, chuNhiemKhoa] = await Promise.all([
        repo.getGiangDayByIdUser(activeConnection, { namHoc, idUser: id_User, isDuKien }),
        repo.getLopNgoaiQCByIdUser(activeConnection, { namHoc, idUser: id_User, requireApproval }),
        repo.getKthpByIdUser(activeConnection, { namHoc, idUser: id_User, requireApproval }),
        repo.getDoAnByIdUser(activeConnection, { namHoc, idUser: id_User, isDuKien }),
        repo.getHuongDanThamQuanByIdUser(activeConnection, { namHoc, idUser: id_User, requireApproval }),
        id_User ? statsService.getLecturerRecords(id_User, namHoc) : [],
        repo.getDinhMuc(activeConnection),
        repo.getChuNhiemKhoaByKhoa(activeConnection, nv.maKhoa)
    ]);

    return mapper.toAtomicSDO(nv, { giangDay, lopNgoaiQC, kthp, doAn, hdtq, nckhRecords }, namHoc, dinhMuc, { chuNhiemKhoa });
});

/**
 * Lấy danh sách SDO cho tất cả GV trong khoa
 */
const getCollectionSDO = async (namHocInput, khoa, isDuKien = false) => withConnection(null, async (connection) => {
    const namHoc = chuanHoaNamHoc(namHocInput);
    const [rawData, nckhData, dinhMuc] = await Promise.all([
        repo.getDuLieuThoTongHop(connection, { namHoc, khoa, isDuKien, requireApproval: !isDuKien }),
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

    const sdoList = mapper.toCollectionSDO(rawData, nckhMap, namHoc, dinhMuc);
    return {
        data: sdoList,
        warnings: missingNckh.length
            ? {
                missingNckhCount: missingNckh.length,
                message: `${missingNckh.length} giảng viên chưa có dữ liệu NCKH — có thể ảnh hưởng đến tính vượt giờ.`,
                sample: missingNckh.slice(0, 20),
            }
            : null,
    };
});

/**
 * Lấy danh sách SDO chi tiết (bao gồm tableF) cho tất cả GV trong khoa.
 * Sử dụng batch fetch để giảm số lượng queries (từ N*8 xuống ~8).
 */
const getCollectionSDODetail = async (namHocInput, khoa, isDuKien = false) => withConnection(null, async (connection) => {
    const namHoc = chuanHoaNamHoc(namHocInput);
    const requireApproval = !isDuKien;
    const rawData = await repo.getDuLieuThoTongHop(connection, { namHoc, khoa, isDuKien, requireApproval });

    if (!rawData.length) return [];

    // Lấy danh sách ID (đã là số nguyên từ DB, an toàn cho parameterized query)
    const ids = rawData.map(r => r.id_User);

    // Batch fetch tất cả dữ liệu nguồn song song (~7 queries thay vì N*8)
    const [allGD, allLNQC, allKTHP, allDA, allHDTQ, nckhData, dinhMuc, allNV] = await Promise.all([
        repo.getGiangDayByIds(connection, { namHoc, ids, isDuKien }),
        repo.getLopNgoaiQCByIds(connection, { namHoc, ids, requireApproval }),
        repo.getKthpByIds(connection, { namHoc, ids, requireApproval }),
        repo.getDoAnByIds(connection, { namHoc, ids, isDuKien }),
        repo.getHuongDanThamQuanByIds(connection, { namHoc, ids, requireApproval }),
        statsService.getLecturerSummary(namHoc, "ALL"),
        repo.getDinhMuc(connection),
        repo.getNhanVienByIds(connection, ids),
    ]);

    // Group by id_User trong memory
    const groupByUser = (arr, key = 'id_User') => {
        const map = new Map();
        for (const r of arr) {
            const id = r[key];
            if (!map.has(id)) map.set(id, []);
            map.get(id).push(r);
        }
        return map;
    };

    const gdMap = groupByUser(allGD);
    const lnqcMap = groupByUser(allLNQC);
    const kthpMap = groupByUser(allKTHP);
    const daMap = groupByUser(allDA);
    const hdtqMap = groupByUser(allHDTQ);
    const nvMap = new Map(allNV.map(nv => [nv.id_User, nv]));
    const nckhMap = new Map(nckhData.map(r => [Number(r.lecturerId), r.tongSoTietGiangVien]));

    // Fetch chuNhiemKhoa — deduplicate theo khoa
    const uniqueKhoas = [...new Set(allNV.map(nv => nv.maKhoa).filter(Boolean))];
    const chuNhiemMap = new Map();
    await Promise.all(uniqueKhoas.map(async (k) => {
        const name = await repo.getChuNhiemKhoaByKhoa(connection, k);
        chuNhiemMap.set(k, name);
    }));

    // Map từng GV với data đã có sẵn (pure computation, không query thêm)
    const sdoList = [];
    for (const row of rawData) {
        const nv = nvMap.get(row.id_User);
        if (!nv) continue;

        const userRawData = {
            giangDay: gdMap.get(row.id_User) || [],
            lopNgoaiQC: lnqcMap.get(row.id_User) || [],
            kthp: kthpMap.get(row.id_User) || [],
            doAn: daMap.get(row.id_User) || [],
            hdtq: hdtqMap.get(row.id_User) || [],
            // Tạo mảng giả lập nckhRecords với tổng số tiết (đủ cho calculateOvertime)
            nckhRecords: [{ soTietGiangVien: nckhMap.get(Number(row.id_User)) || 0 }],
        };

        const sdo = mapper.toAtomicSDO(nv, userRawData, namHoc, dinhMuc, {
            chuNhiemKhoa: chuNhiemMap.get(nv.maKhoa) || ""
        });
        if (!sdo) continue;

        // Giữ nguyên toàn bộ SDO (bao gồm raw, tableE, tableF, breakdown)
        // để hỗ trợ snapshot lưu trữ đầy đủ dữ liệu chi tiết
        sdo.isKhoa = sdo.isKhoa ?? row.isKhoa ?? 1;
        sdoList.push(sdo);
    }

    // console.info(`[getCollectionSDODetail] Aggregated ${sdoList.length} records. Total luong: ${sdoList.reduce((s, r) => s + (r.luong || 0), 0)}. Sample:`, 
    //     sdoList.slice(0, 51).map(r => ({ gv: r.giangVien, luong: r.luong })));

    return sdoList;
});

module.exports = {
    getAtomicSDO,
    getCollectionSDO,
    getCollectionSDODetail,
    chuanHoaNamHoc
};
