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
        const issues = super.validate(dto);
        if (!dto.exam?.date) {
            issues.push({
                severity: "error",
                code: "EXAM_DATE_REQUIRED",
                field: "exam.date",
                message: "Coi thi bắt buộc phải có ngày thi",
            });
        }
        return issues;
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
