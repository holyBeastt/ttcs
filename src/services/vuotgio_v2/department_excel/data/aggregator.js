/**
 * Data Aggregator — Groups and aggregates department-level data from SDO list.
 *
 * Grouping rules:
 *   - isKhoa = 1 (or truthy)  → individual khoa group (e.g. "Khoa CNTT")
 *   - isKhoa = 0              → all merged into "Ban giám đốc & các phòng"
 *
 * Sort order: Khoa groups first (alpha), "Ban giám đốc & các phòng" last.
 */

const { NON_KHOA_GROUP_CODE } = require('../../../../repositories/vuotgio_v2/tongHop.repo.js');
const PaymentCalculator = require('./calculator');

const NON_KHOA_DISPLAY = 'Ban giám đốc & các phòng';

class DataAggregator {
    /**
     * Group flat SDO list by department.
     *
     * @param {Array} summaries - flat list of SDO objects (each must have .isKhoa, .khoa, .maKhoa)
     * @returns {Array<DepartmentGroup>}  sorted: Khoa first, non-Khoa last
     */
    static groupByDepartment(summaries) {
        const groupMap = new Map();

        summaries.forEach(sdo => {
            const isNonKhoa = Number(sdo.isKhoa) === 0;
            const displayName = isNonKhoa
                ? NON_KHOA_DISPLAY
                : (sdo.khoa || sdo.maKhoa || 'Khác');
            const groupKey = displayName;

            if (!groupMap.has(groupKey)) {
                groupMap.set(groupKey, {
                    khoa         : displayName,
                    maKhoa       : isNonKhoa ? NON_KHOA_GROUP_CODE : sdo.maKhoa,
                    isNonKhoa,
                    summaries    : [],
                    tongThucHien : 0,
                    totalVuot    : 0,
                    totalThanhToan: 0,
                    dataRowCount : 0,
                });
            }

            const group = groupMap.get(groupKey);
            group.summaries.push(sdo);
            group.tongThucHien  += (sdo.tongThucHien || 0);
            group.totalVuot     += (sdo.thanhToan     || 0);
            group.totalThanhToan += PaymentCalculator.calculatePaymentAmount(sdo.thanhToan || 0);
            group.dataRowCount  += 1;
        });

        // Sort: Khoa groups alphabetically first, non-Khoa last
        return Array.from(groupMap.values()).sort((a, b) => {
            if (a.isNonKhoa !== b.isNonKhoa) return a.isNonKhoa ? 1 : -1;
            return (a.khoa || '').localeCompare(b.khoa || '', 'vi');
        });
    }

    /**
     * Calculate grand totals across all departments.
     */
    static calculateGrandTotals(departmentList, allSummaries) {
        return {
            totalDepartments : departmentList.length,
            totalTeachers    : allSummaries.length,
            totalVuotGio     : departmentList.reduce((s, d) => s + (d.totalVuot     || 0), 0),
            totalThanhToan   : departmentList.reduce((s, d) => s + (d.totalThanhToan || 0), 0),
            totalThucHien    : departmentList.reduce((s, d) => s + (d.tongThucHien   || 0), 0),
        };
    }

    /**
     * Create full consolidated data structure (for preview API and export).
     */
    static createConsolidatedData(namHoc, allSummaries) {
        const departmentList = this.groupByDepartment(allSummaries);
        const grandTotals    = this.calculateGrandTotals(departmentList, allSummaries);

        return {
            namHoc,
            departmentList,
            grandTotals,
            meta: {
                generatedAt    : new Date().toISOString(),
                paymentRate    : PaymentCalculator.PAYMENT_RATE,
                standardHours  : PaymentCalculator.STANDARD_HOURS,
                maxPayableHours: PaymentCalculator.MAX_PAYABLE_HOURS,
            },
        };
    }
}

module.exports = DataAggregator;