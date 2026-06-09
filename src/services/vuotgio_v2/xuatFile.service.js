/**
 * VUOT GIO V2 - Xuất File Service (Type A: Kê khai cá nhân)
 *
 * Hỗ trợ 3 cấp độ granularity:
 *   1. giangVien (id_User) → 1 giảng viên cụ thể
 *   2. khoa (MaPhongBan)   → toàn bộ GV trong 1 khoa
 *   3. khoa = 'ALL' / không truyền → toàn bộ GV trong hệ thống
 *
 * Luồng mới (post-snapshot):
 *   BẮT BUỘC đọc từ snapshot (vg_so_tiet_tong_hop). Năm chưa khóa → throw lỗi.
 *   Dữ liệu SDO trong cột chi_tiet chứa đầy đủ raw, tableF, breakdown
 *   → đủ thông tin để tạo file Excel kê khai chi tiết.
 *
 * Output: ExcelJS Workbook — mỗi GV 1 sheet kê khai (A, B, C, D, E, F)
 */

const snapshotDataService = require('./snapshotData.service');
const { buildWorkbook } = require('./excel');

/**
 * Resolve danh sách SDO dựa theo scope, đọc từ snapshot.
 * @returns {Promise<Array>} summaries (SDO list từ snapshot)
 */
const _resolveSummaries = async (namHoc, { khoa, giangVien }) => {
    // ─── Scope: 1 giảng viên ───────────────────────────────────────────────────
    if (giangVien) {
        const sdo = await snapshotDataService.getSnapshotSDOByUser(namHoc, giangVien);
        return sdo ? [sdo] : [];
    }

    // ─── Scope: theo khoa hoặc toàn bộ ────────────────────────────────────────
    const khoaFilter = (!khoa || khoa === 'ALL') ? 'ALL' : khoa;
    return snapshotDataService.getSnapshotSDOList(namHoc, khoaFilter);
};

/**
 * Xuất workbook kê khai cá nhân.
 * Mỗi GV = 1 sheet. Không có sheet tổng hợp.
 *
 * @param {string} namHoc
 * @param {string|undefined} khoa     - mã khoa, hoặc 'ALL'
 * @param {string|undefined} giangVien - id_User
 * @returns {Promise<{workbook: ExcelJS.Workbook, meta: {giangVienName: string|null, maKhoa: string|null}}>}
 */
const exportExcel = async (namHoc, khoa, giangVien) => {
    if (!namHoc) throw new Error('Thiếu thông tin Năm học');

    const summaries = await _resolveSummaries(namHoc, { khoa, giangVien });

    if (!summaries.length) {
        throw new Error('Không có dữ liệu để xuất file');
    }

    console.info('[xuatFile.service] exportExcel (snapshot)', {
        namHoc,
        khoa: khoa || 'ALL',
        giangVien: giangVien || 'ALL',
        count: summaries.length,
    });

    // Extract metadata from summaries for filename generation
    const meta = {
        giangVienName: giangVien ? (summaries[0].giangVien || null) : null,
        maKhoa: (khoa && khoa !== 'ALL') ? (summaries[0].maKhoa || khoa) : null,
    };

    const workbook = await buildWorkbook(summaries, { useFormulas: true });
    return { workbook, meta };
};

module.exports = { exportExcel };
