/**
 * Consolidated Generator — Generates the full multi-department workbook (Type B).
 *
 * Sheet order:
 *   1. [N] Sheet per Khoa/Phòng   — DepartmentGenerator (36 columns per khoa)
 *      → isKhoa=0 units are merged into ONE sheet: "Ban giám đốc & các phòng"
 *   2. Sheet "TỔNG HỢP"           — MasterSheetGenerator (mirrors tongHopGV.ejs)
 *   3. Sheet "Tiền chuyển khoản"  — PaymentGenerator (flat GV list)
 */

const WorkbookFactory      = require('../../shared_excel/core/workbook.factory');
const DepartmentGenerator  = require('./department.generator');
const MasterSheetGenerator = require('./master.generator');
const PaymentGenerator     = require('./payment.generator');
const DataAggregator       = require('../data/aggregator');
const tongHopService       = require('../../tongHop.service.js');
const createPoolConnection = require('../../../../config/databasePool.js');

class ConsolidatedGenerator {
    /**
     * Generate the full consolidated workbook for all departments.
     *
     * @param {string} namHoc
     * @returns {Promise<ExcelJS.Workbook>}
     */
    static async generateConsolidatedWorkbook(namHoc) {
        if (!namHoc) throw new Error('Thiếu thông tin Năm học');

        let connection;
        try {
            connection = await createPoolConnection();

            // ── 1. Fetch all Atomic SDOs ─────────────────────────────────────────
            const allSummaries = await tongHopService.getCollectionSDODetail(namHoc, 'ALL');
            if (!allSummaries.length) throw new Error('Không có dữ liệu để xuất file');

            console.info('[ConsolidatedGenerator] start', {
                namHoc,
                totalSDOs: allSummaries.length,
            });

            // ── 2. Group by department ───────────────────────────────────────────
            // - isKhoa=1 → one group per khoa
            // - isKhoa=0 → all merged into "Ban giám đốc & các phòng" (last in list)
            const departmentList = DataAggregator.groupByDepartment(allSummaries);

            // ── 3. Create workbook ───────────────────────────────────────────────
            const workbook = WorkbookFactory.createWorkbook({
                title  : `Tổng hợp vượt giờ ${namHoc}`,
                subject: `Báo cáo vượt giờ V2 ${namHoc}`,
                creator: 'VuotGioV2',
            });

            // ── 4. Department sheets ─────────────────────────────────────────────
            for (const dept of departmentList) {
                const result = DepartmentGenerator.createDepartmentSheet(workbook, {
                    khoa     : dept.khoa,
                    maKhoa   : dept.maKhoa,
                    summaries: dept.summaries,
                    namHoc,
                    isExport : true,   // ← Excel formulas for dynamic recalculation
                });
                // Write back actual totals for use in master/payment sheets
                dept.totalThanhToan = result.totalThanhToan;
                dept.totalVuot      = result.totalVuot;
                dept.dataRowCount   = result.dataRowCount;
            }

            // ── 5. Master summary sheet (mirrors tongHopGV.ejs) ─────────────────
            MasterSheetGenerator.createMasterSheet(workbook, { departmentList, namHoc, isExport: true });

            // ── 6. Payment sheet (flat list of all lecturers, sorted by dept) ────
            PaymentGenerator.createPaymentSheet(workbook, {
                summaries: allSummaries,
                namHoc,
            });

            return workbook;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * Return structured preview data (no Excel generated).
     * Used by the web UI preview endpoint.
     *
     * @param {string} namHoc
     */
    static async getConsolidatedPreviewData(namHoc) {
        if (!namHoc) throw new Error('Thiếu thông tin Năm học');

        let connection;
        try {
            connection = await createPoolConnection();
            const allSummaries = await tongHopService.getCollectionSDODetail(namHoc, 'ALL');
            if (!allSummaries.length) throw new Error('Không có dữ liệu để xuất file');
            return DataAggregator.createConsolidatedData(namHoc, allSummaries);
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = ConsolidatedGenerator;