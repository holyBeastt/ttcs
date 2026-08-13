"use strict";

const KthpTypePolicy = require("./kthpType.policy");

class CoiThiImportPolicy extends KthpTypePolicy {
    normalize(dto) {
        return {
            ...dto,
            activityName: dto.activityName || "Coi thi",
        };
    }

    validate(dto) {
        // Ngày thi là metadata tùy chọn; manual aggregate input không nhập ngày.
        return super.validate(dto);
    }

    toPersistenceModel(dto) {
        const model = super.toPersistenceModel(dto);
        return {
            ...model,
            detail: {
                examDate: dto.exam.date,
                shift: dto.exam.shift || null,
                duration: dto.exam.duration,
                room: dto.exam.room || null,
            },
        };
    }
}

module.exports = CoiThiImportPolicy;
