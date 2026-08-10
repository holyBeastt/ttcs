"use strict";

const { KTHP_TYPES } = require("../dto/kthpImport.dto");
const RaDeImportPolicy = require("./raDeImport.policy");
const CoiThiImportPolicy = require("./coiThiImport.policy");
const ChamThiImportPolicy = require("./chamThiImport.policy");
const NganHangCauHoiImportPolicy = require("./nganHangCauHoiImport.policy");

class KthpTypePolicyFactory {
    static create(type) {
        if (type === KTHP_TYPES.RA_DE) return new RaDeImportPolicy();
        if (type === KTHP_TYPES.NGAN_HANG_CAU_HOI) return new NganHangCauHoiImportPolicy();
        if (type === KTHP_TYPES.COI_THI) return new CoiThiImportPolicy();
        if (type === KTHP_TYPES.CHAM_THI) return new ChamThiImportPolicy();
        throw new Error(`Unsupported KTHP type: ${type}`);
    }
}

module.exports = KthpTypePolicyFactory;
