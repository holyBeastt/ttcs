"use strict";

const KthpTypePolicy = require("./kthpType.policy");

class ChamThiImportPolicy extends KthpTypePolicy {
    normalize(dto) {
        return {
            ...dto,
            activityName: dto.activityName || "Chấm thi",
        };
    }

    validate(dto) {
        const issues = super.validate(dto);
        if (!dto.course?.name) {
            issues.push({
                severity: "error",
                code: "COURSE_NAME_REQUIRED",
                field: "course.name",
                message: "Thiếu tên học phần",
            });
        }
        if (!dto.exam?.role) {
            issues.push({
                severity: "error",
                code: "ROLE_REQUIRED",
                field: "exam.role",
                message: "Thiếu vai trò chấm thi",
            });
        }
        if (!Number.isInteger(dto.exam?.markedCount) || dto.exam.markedCount <= 0) {
            issues.push({
                severity: "error",
                code: "MARKED_COUNT_REQUIRED",
                field: "exam.markedCount",
                message: "Số bài/phách phải là số nguyên lớn hơn 0",
            });
        }
        return issues;
    }

    toPersistenceModel(dto) {
        const model = super.toPersistenceModel(dto);
        return {
            ...model,
            detail: {
                markedCount: dto.exam.markedCount,
                role: dto.exam.role || null,
            },
        };
    }
}

module.exports = ChamThiImportPolicy;
