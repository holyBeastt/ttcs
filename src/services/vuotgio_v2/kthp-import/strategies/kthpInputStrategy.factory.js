"use strict";

const { KTHP_SOURCES } = require("../dto/kthpImport.dto");
const ExcelKthpInputStrategy = require("./excelKthpInput.strategy");
const ManualKthpInputStrategy = require("./manualKthpInput.strategy");

class KthpInputStrategyFactory {
    static create(source) {
        if (source === KTHP_SOURCES.EXCEL) return new ExcelKthpInputStrategy();
        if (source === KTHP_SOURCES.MANUAL) return new ManualKthpInputStrategy();
        throw new Error(`Unsupported KTHP input source: ${source}`);
    }
}

module.exports = KthpInputStrategyFactory;
