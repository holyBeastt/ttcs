"use strict";

const {
    detailKindForType,
    labelForType,
} = require("../../../../constants/vuotgio_v2/kthp.constant");

class KthpTypePolicy {
    normalize(dto) {
        return dto;
    }

    validate(dto) {
        const issues = [];
        const requireValue = (value, code, field, message) => {
            if (value === null || value === undefined || value === "") {
                issues.push({ severity: "error", code, field, message });
            }
        };

        requireValue(dto.standardHours, "STANDARD_HOURS_REQUIRED", "standardHours", "Thiếu số giờ quy chuẩn");

        if (dto.standardHours !== null && dto.standardHours <= 0) {
            issues.push({
                severity: "error",
                code: "STANDARD_HOURS_INVALID",
                field: "standardHours",
                message: "Số giờ quy chuẩn phải lớn hơn 0",
            });
        }

        const suppliedDate = dto.raw?.["Ngày thi"]
            ?? dto.raw?.ngayThi
            ?? dto.raw?.ngay_thi
            ?? dto.raw?.ngaythi;
        if (suppliedDate !== null && suppliedDate !== undefined
            && suppliedDate !== "" && dto.exam?.date === null) {
            issues.push({
                severity: "error",
                code: "EXAM_DATE_INVALID",
                field: "exam.date",
                message: "Ngày thi không hợp lệ",
            });
        }

        const numericFields = [
            ["course.credits", dto.course?.credits],
            ["exam.studentCount", dto.exam?.studentCount],
            ["exam.pageCount", dto.exam?.pageCount],
            ["exam.questionCount", dto.exam?.questionCount],
            ["exam.markedCount", dto.exam?.markedCount],
            ["exam.coefficient", dto.exam?.coefficient],
            ["exam.duration", dto.exam?.duration],
        ];
        for (const [field, value] of numericFields) {
            if (value !== null && value < 0) {
                issues.push({
                    severity: "error",
                    code: "NEGATIVE_VALUE",
                    field,
                    message: "Giá trị không được là số âm",
                });
            }
        }
        const integerFields = [
            ["course.credits", dto.course?.credits],
            ["exam.studentCount", dto.exam?.studentCount],
            ["exam.pageCount", dto.exam?.pageCount],
            ["exam.questionCount", dto.exam?.questionCount],
            ["exam.markedCount", dto.exam?.markedCount],
            ["exam.duration", dto.exam?.duration],
        ];
        for (const [field, value] of integerFields) {
            if (value !== null && value !== undefined && !Number.isInteger(value)) {
                issues.push({
                    severity: "error",
                    code: "INTEGER_REQUIRED",
                    field,
                    message: "Giá trị phải là số nguyên",
                });
            }
        }

        const calculated = this.calculateStandardHours(dto);
        if (calculated !== null
            && dto.standardHours !== null
            && Math.abs(calculated - dto.standardHours) > 0.001) {
            issues.push({
                severity: "warning",
                code: "STANDARD_HOURS_MISMATCH",
                field: "standardHours",
                message: `Quy chuẩn trong nguồn (${dto.standardHours}) khác giá trị hệ thống tính (${calculated})`,
                meta: { supplied: dto.standardHours, calculated },
            });
        }
        return issues;
    }

    calculateStandardHours(dto) {
        return dto.calculatedStandardHours ?? null;
    }

    toPersistenceModel(dto) {
        return {
            parent: {
                employeeId: dto.employee.id,
                employeeName: dto.employee.name,
                department: dto.employee.department,
                semester: dto.semester,
                academicYear: dto.academicYear,
                round: dto.round,
                activityType: dto.activityType,
                displayType: labelForType(dto.activityType),
                courseName: dto.course.name || null,
                courseCode: dto.course.code || null,
                className: dto.course.className || null,
                credits: dto.course.credits,
                studentCount: dto.exam.studentCount,
                educationSystemName: dto.educationSystemName || null,
                educationSystemId: dto.educationSystemId,
                examForm: dto.exam.examForm || null,
                coefficient: dto.exam.coefficient,
                standardHours: dto.standardHours,
                notes: dto.notes || null,
            },
            detailKind: detailKindForType(dto.activityType),
            detail: {},
        };
    }
}

module.exports = KthpTypePolicy;
