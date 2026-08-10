"use strict";

class KthpImportValidator {
    sourceHeaderFor(dto, field) {
        const headers = {
            "employee.id": "Mã CBGV",
            "employee.name": "Họ đệm / Tên",
            "employee.department": "Đơn vị",
            "course.code": "Mã môn thi",
            "course.name": "Tên môn thi",
            "standardHours": "Số giờ chuẩn",
            "exam.date": "Ngày thi",
            "exam.shift": "Ca thi",
            "exam.duration": "Thời gian",
            "exam.room": "Phòng thi",
            "exam.role": "Vai trò",
            "exam.markedCount": "Số bài/phách",
            "exam.quantity": dto.activityType === "NGAN_HANG_CAU_HOI" ? "Số câu hỏi" : "Số đề",
        };
        return headers[field] || null;
    }

    validateCommon(dto) {
        const issues = [];
        const required = [
            ["employee.id", dto.employee?.id, "EMPLOYEE_REQUIRED", "Chưa xác định được nhân viên"],
            ["employee.department", dto.employee?.department, "EMPLOYEE_DEPARTMENT_REQUIRED", "Nhân viên chưa có khoa/đơn vị"],
            ["academicYear", dto.academicYear, "ACADEMIC_YEAR_INVALID", "Năm học phải có dạng YYYY - YYYY"],
            ["semester", dto.semester, "SEMESTER_REQUIRED", "Thiếu học kỳ"],
            ["round", dto.round, "ROUND_REQUIRED", "Thiếu đợt"],
            ["educationSystemId", dto.educationSystemId, "EDUCATION_SYSTEM_REQUIRED", "Chưa xác định hệ đào tạo"],
        ];
        for (const [field, value, code, message] of required) {
            if (value === null || value === undefined || value === "") {
                issues.push({ severity: "error", code, field, message });
            }
        }
        if (dto.semester !== null && ![1, 2, 3].includes(Number(dto.semester))) {
            issues.push({
                severity: "error",
                code: "SEMESTER_INVALID",
                field: "semester",
                message: "Học kỳ không hợp lệ",
            });
        }
        if (dto.round !== null
            && (!Number.isInteger(dto.round) || dto.round <= 0)) {
            issues.push({
                severity: "error",
                code: "ROUND_INVALID",
                field: "round",
                message: "Đợt phải là số nguyên lớn hơn 0",
            });
        }
        return issues;
    }

    validate(dto, policy, existingIssues = []) {
        return [...existingIssues, ...this.validateCommon(dto), ...policy.validate(dto)]
            .map((issue) => ({
                ...issue,
                sourceHeader: issue.sourceHeader || this.sourceHeaderFor(dto, issue.field),
                sourceRef: dto.sourceRef,
            }));
    }
}

module.exports = KthpImportValidator;
