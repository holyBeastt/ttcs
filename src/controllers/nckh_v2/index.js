/**
 * NCKH V2 Controllers - Index
 * Entry point cho tất cả NCKH V2 controllers
 * Date: 2026-01-16
 */

const baseController = require('./base.controller');
const deTaiDuAnController = require('./deTaiDuAn.controller');

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    // Base controller
    ...baseController,

    // Đề tài, Dự án
    ...deTaiDuAnController
};
