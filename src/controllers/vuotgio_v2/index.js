/**
 * VUOT GIO V2 Controllers - Entry Point
 * Export tất cả controllers cho module Vượt Giờ V2
 * Date: 2026-01-29
 */

const baseController = require('./base.controller');
const lopNgoaiQCController = require('./lopNgoaiQC.controller');
const themKTHPController = require('./themKTHP.controller');
const duyetKTHPController = require('./duyetKTHP.controller');
const tongHopController = require('./tongHop.controller');
const xuatFileController = require('./xuatFile.controller');

module.exports = {
    // Base controller - render views
    ...baseController,

    // CRUD Controllers
    lopNgoaiQC: lopNgoaiQCController,
    themKTHP: themKTHPController,
    duyetKTHP: duyetKTHPController,

    // Tổng hợp & Export
    tongHop: tongHopController,
    xuatFile: xuatFileController
};
