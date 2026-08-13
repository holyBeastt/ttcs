"use strict";

const KthpTypePolicy = require("./kthpType.policy");

class RaDeImportPolicy extends KthpTypePolicy {
    validate(dto) {
        const issues = super.validate(dto);
        // Manual aggregate input stores only quy_chuan; detail fields may be empty/zero.
        const isManualAggregate = dto.source === "MANUAL";
        if (!isManualAggregate && !dto.course?.name) {
            issues.push({
                severity: "error",
                code: "COURSE_NAME_REQUIRED",
                field: "course.name",
                message: "Thiếu tên học phần",
            });
        }
        if (!isManualAggregate
            && (!Number.isInteger(dto.exam?.quantity) || dto.exam.quantity <= 0)) {
            issues.push({
                severity: "error",
                code: "QUANTITY_REQUIRED",
                field: "exam.quantity",
                message: "Số đề phải là số nguyên lớn hơn 0",
            });
        }
        return issues;
    }

    normalize(dto) {
        return {
            ...dto,
            activityName: dto.activityName || "Ra đề",
            exam: {
                ...dto.exam,
                quantity: dto.exam.quantity ?? dto.exam.questionCount,
            },
        };
    }

    toPersistenceModel(dto) {
        const model = super.toPersistenceModel(dto);
        return {
            ...model,
            detail: {
                quantity: dto.exam.quantity ?? dto.exam.questionCount,
            },
        };
    }
}

module.exports = RaDeImportPolicy;
