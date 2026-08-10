"use strict";

const RaDeImportPolicy = require("./raDeImport.policy");

class NganHangCauHoiImportPolicy extends RaDeImportPolicy {
    normalize(dto) {
        return {
            ...dto,
            activityName: dto.activityName || "Ngân hàng câu hỏi",
            exam: {
                ...dto.exam,
                quantity: dto.exam.quantity ?? dto.exam.questionCount,
            },
        };
    }
}

module.exports = NganHangCauHoiImportPolicy;
