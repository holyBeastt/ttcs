/**
 * VUOT GIO V2 - Xuất File Service (Type A: Kê khai cá nhân)
 *
 * Hỗ trợ 3 cấp độ granularity:
 *   1. giangVien (id_User hoặc HoTen) → 1 giảng viên cụ thể
 *   2. khoa (MaPhongBan)              → toàn bộ GV trong 1 khoa
 *   3. khoa = 'ALL' / không truyền   → toàn bộ GV trong hệ thống
 *
 * Output: ExcelJS Workbook — mỗi GV 1 sheet kê khai (A, B, C, D, E, F)
 * Folder: src/services/vuotgio_v2/excel/  (keKhaiReport.generator.js)
 */

const tongHopService = require('./tongHop.service');
const createPoolConnection = require('../../config/databasePool');
const sharedRepo = require('../../repositories/vuotgio_v2/shared.repo');
const { buildWorkbook } = require('./excel/keKhaiReport.generator');

/**
 * Resolve danh sách SDO dựa theo scope (giangVien / khoa / toàn bộ)
 * @returns {Promise<Array>} summaries (Atomic SDO list)
 */
const _resolveSummaries = async (connection, namHoc, { khoa, giangVien }) => {
    // ─── Scope: 1 giảng viên ───────────────────────────────────────────────────
    if (giangVien) {
        let sdo = await tongHopService.getAtomicSDO(namHoc, giangVien, connection);

        // giangVien có thể là HoTen (string) thay vì id_User → fallback lookup
        if (!sdo) {
            const teachers = await sharedRepo.getTeachers(connection, khoa !== 'ALL' ? khoa : undefined);
            const matched = teachers.find(t =>
                String(t.id_User) === String(giangVien) ||
                String(t.HoTen || '').trim() === String(giangVien).trim()
            );
            if (matched) {
                sdo = await tongHopService.getAtomicSDO(namHoc, matched.id_User, connection);
            }
        }

        return sdo ? [sdo] : [];
    }

    // ─── Scope: theo khoa hoặc toàn bộ ────────────────────────────────────────
    const khoaFilter = (!khoa || khoa === 'ALL') ? undefined : khoa;
    const teachers = await sharedRepo.getTeachers(connection, khoaFilter);

    const summaries = [];
    for (const teacher of teachers) {
        const sdo = await tongHopService.getAtomicSDO(namHoc, teacher.id_User, connection);
        if (sdo) summaries.push(sdo);
    }
    return summaries;
};

/**
 * Xuất workbook kê khai cá nhân.
 * Mỗi GV = 1 sheet. Không có sheet tổng hợp.
 *
 * @param {string} namHoc
 * @param {string|undefined} khoa     - mã khoa, hoặc 'ALL'
 * @param {string|undefined} giangVien - id_User hoặc HoTen
 * @returns {Promise<ExcelJS.Workbook>}
 */
const exportExcel = async (namHoc, khoa, giangVien) => {
    if (!namHoc) throw new Error('Thiếu thông tin Năm học');

    let connection;
    try {
        connection = await createPoolConnection();

        const summaries = await _resolveSummaries(connection, namHoc, { khoa, giangVien });

        if (!summaries.length) {
            throw new Error('Không có dữ liệu để xuất file');
        }

        console.info('[xuatFile.service] exportExcel', {
            namHoc,
            khoa: khoa || 'ALL',
            giangVien: giangVien || 'ALL',
            count: summaries.length,
        });

        return buildWorkbook(summaries);
    } finally {
        if (connection) connection.release();
    }
};

module.exports = { exportExcel };
