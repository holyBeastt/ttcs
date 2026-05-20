/**
 * Department Excel Module
 *
 * Handles department-level and consolidated Excel generation for Vượt Giờ V2.
 *
 * Generators:
 *   - DepartmentGenerator    → One sheet per khoa (36-column detail table)
 *   - ConsolidatedGenerator  → Full multi-sheet workbook (Dept + Master + Payment)
 *   - MasterSheetGenerator   → "TỔNG HỢP" sheet mirroring tongHopGV.ejs
 *   - PaymentGenerator       → "Tiền chuyển khoản" sheet (bank transfer list)
 *
 * Layouts:
 *   - DepartmentLayout → 36-column widths (shared by Dept + Master sheets)
 *   - MasterLayout     → (legacy, kept for compat — use DepartmentLayout for new Master)
 *   - PaymentLayout    → 7-column widths
 *
 * Data:
 *   - DataAggregator   → Groups SDOs by department, handles isKhoa=0 merging
 *   - PaymentCalculator → Financial calculations (100k/tiết, TRUNC rules)
 */

module.exports = {
    // Generators
    DepartmentGenerator  : require('./generators/department.generator'),
    ConsolidatedGenerator: require('./generators/consolidated.generator'),
    MasterSheetGenerator : require('./generators/master.generator'),
    PaymentGenerator     : require('./generators/payment.generator'),
    FormulaGenerator     : require('./generators/formula.generator'),

    // Components (legacy — prefer dedicated generators)
    HeaderComponent  : require('./components/header.component'),
    SummaryComponent : require('./components/summary.component'),

    // Layouts
    DepartmentLayout : require('./layouts/department.layout'),
    MasterLayout     : require('./layouts/master.layout'),
    PaymentLayout    : require('./layouts/payment.layout'),

    // Data utilities
    DataAggregator  : require('./data/aggregator'),
    PaymentCalculator: require('./data/calculator'),
};