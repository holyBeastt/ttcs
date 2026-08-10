"use strict";

const base = require("./base.mapper");
const {
    KTHP_TYPES,
    detailKindForType,
    labelForType,
} = require("../../constants/vuotgio_v2/kthp.constant");

const nullableText = (value) => {
    const text = String(value ?? "").trim();
    return text || null;
};

const requiredText = (value, field) => {
    const text = nullableText(value);
    if (!text) {
        const error = new Error(`Thiếu trường bắt buộc: ${field}`);
        error.code = "KTHP_FIELD_REQUIRED";
        throw error;
    }
    return text;
};

const nullableNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    if (!Number.isFinite(number)) {
        const error = new Error(`Giá trị số không hợp lệ: ${value}`);
        error.code = "KTHP_NUMBER_INVALID";
        throw error;
    }
    return number;
};

const activityTypeFromBody = (body) => {
    const explicit = base.pick(body, "activityType", "activity_type", "loai_kthp");
    if (!Object.values(KTHP_TYPES).includes(explicit)) {
        const error = new Error(`Loại KTHP không được hỗ trợ: ${explicit || "(trống)"}`);
        error.code = "KTHP_TYPE_UNSUPPORTED";
        throw error;
    }
    return explicit;
};

const toPersistenceModel = (body, references = {}) => {
    const {
        employeeId,
        employeeName,
        department,
        educationSystemId,
        educationSystemName,
    } = references;
    const activityType = activityTypeFromBody(body);
    const detailSource = body.detail || body;
    const parent = {
        employeeId: nullableNumber(
            employeeId ?? base.pick(body, "employeeId", "employee_id", "id_user")
        ),
        employeeName: requiredText(
            employeeName
                ?? base.pick(body, "giang_vien", "giangvien", "hoVaTen", "employeeName"),
            "giảng viên"
        ),
        department: requiredText(
            department ?? base.pick(body, "khoa", "Khoa", "department"),
            "khoa"
        ),
        semester: nullableNumber(base.pick(body, "hoc_ky", "ki", "HocKy", "semester")),
        academicYear: requiredText(
            base.pick(body, "nam_hoc", "namhoc", "NamHoc", "academicYear"),
            "năm học"
        ),
        round: nullableNumber(base.pick(body, "dot", "Dot", "Đợt", "round")),
        activityType,
        displayType: labelForType(activityType),
        courseName: nullableText(
            base.pick(body, "ten_hoc_phan", "tenhocphan", "TenHocPhan", "tenHocPhan")
        ),
        courseCode: nullableText(base.pick(body, "ma_hoc_phan", "mahocphan", "maHocPhan")),
        className: nullableText(base.pick(body, "lop_hoc_phan", "lophocphan", "LopHocPhan")),
        credits: nullableNumber(base.pick(body, "so_tc", "sotc", "SoTC")),
        studentCount: nullableNumber(base.pick(body, "so_sv", "sosv", "SoSV")),
        educationSystemId: nullableNumber(
            educationSystemId
                ?? base.pick(body, "educationSystemId", "heDaoTaoId", "he_dao_tao_id")
        ),
        educationSystemName: nullableText(
            educationSystemName
                ?? base.pick(body, "doi_tuong", "doituong", "DoiTuong", "educationSystemName")
        ),
        examForm: nullableText(
            base.pick(body, "hinh_thuc_thi", "hinhthucthi", "hinhThucThi", "examForm")
        ),
        coefficient: nullableNumber(base.pick(body, "he_so", "heso", "heSo", "coefficient")),
        standardHours: nullableNumber(
            base.pick(body, "quy_chuan", "sotietqc", "SoTietQC", "standardHours")
        ),
        notes: nullableText(base.pick(body, "ghi_chu", "ghichu", "GhiChu", "notes")),
    };

    if (parent.employeeId === null) {
        const error = new Error("Thiếu ID giảng viên");
        error.code = "EMPLOYEE_REQUIRED";
        throw error;
    }
    if (parent.educationSystemId === null) {
        const error = new Error("Thiếu hệ đào tạo");
        error.code = "EDUCATION_SYSTEM_REQUIRED";
        throw error;
    }
    if (![1, 2, 3].includes(parent.semester)) {
        const error = new Error("Học kỳ không hợp lệ");
        error.code = "SEMESTER_INVALID";
        throw error;
    }
    if (!Number.isInteger(parent.round) || parent.round <= 0) {
        const error = new Error("Đợt không hợp lệ");
        error.code = "ROUND_INVALID";
        throw error;
    }
    if (!(parent.standardHours > 0)) {
        const error = new Error("Số giờ quy chuẩn phải lớn hơn 0");
        error.code = "STANDARD_HOURS_INVALID";
        throw error;
    }
    if ((parent.credits !== null
            && (!Number.isInteger(parent.credits) || parent.credits < 0))
        || (parent.studentCount !== null
            && (!Number.isInteger(parent.studentCount) || parent.studentCount < 0))
        || (parent.coefficient !== null && parent.coefficient < 0)) {
        const error = new Error("Thông tin số tín chỉ, sĩ số hoặc hệ số không hợp lệ");
        error.code = "KTHP_COMMON_NUMBER_INVALID";
        throw error;
    }

    let detail;
    if (activityType === KTHP_TYPES.RA_DE
        || activityType === KTHP_TYPES.NGAN_HANG_CAU_HOI) {
        detail = {
            quantity: nullableNumber(base.pick(
                detailSource,
                "quantity",
                "tong_so",
                "tongso",
                "soDe"
            )),
        };
        if (!Number.isInteger(detail.quantity) || detail.quantity <= 0) {
            const error = new Error("Số lượng ra đề/câu hỏi phải là số nguyên lớn hơn 0");
            error.code = "QUANTITY_INVALID";
            throw error;
        }
    } else if (activityType === KTHP_TYPES.COI_THI) {
        detail = {
            examDate: nullableText(base.pick(
                detailSource,
                "examDate",
                "ngay_thi",
                "ngaythi",
                "ngayThi"
            )),
            shift: nullableText(base.pick(detailSource, "shift", "ca_thi", "cathi", "caThi")),
            duration: nullableNumber(base.pick(
                detailSource,
                "duration",
                "thoi_gian",
                "thoigian",
                "thoiGian"
            )),
            room: nullableText(base.pick(
                detailSource,
                "room",
                "phong_thi",
                "phongthi",
                "phongThi"
            )),
        };
        if (!detail.examDate) {
            const error = new Error("Coi thi bắt buộc phải có ngày thi");
            error.code = "EXAM_DATE_REQUIRED";
            throw error;
        }
        if (detail.duration !== null
            && (!Number.isInteger(detail.duration) || detail.duration < 0)) {
            const error = new Error("Thời gian thi phải là số nguyên không âm");
            error.code = "EXAM_DURATION_INVALID";
            throw error;
        }
    } else {
        detail = {
            markedCount: nullableNumber(base.pick(
                detailSource,
                "markedCount",
                "so_bai_phach",
                "sobaiphach",
                "soBaiPhach",
                "quantity",
                "tong_so",
                "tongso"
            )),
            role: nullableText(base.pick(detailSource, "role", "vai_tro", "vaitro", "vaiTro")),
        };
        if (!Number.isInteger(detail.markedCount) || detail.markedCount <= 0) {
            const error = new Error("Số bài/phách phải là số nguyên lớn hơn 0");
            error.code = "MARKING_COUNT_INVALID";
            throw error;
        }
    }

    return {
        parent,
        detailKind: detailKindForType(activityType),
        detail,
    };
};

const rowToCanonical = (row) => {
    if (!row) return null;
    const activityType = row.activity_type || row.loai_kthp;
    let detail;
    if (activityType === KTHP_TYPES.RA_DE
        || activityType === KTHP_TYPES.NGAN_HANG_CAU_HOI) {
        detail = { quantity: row.so_luong };
    } else if (activityType === KTHP_TYPES.COI_THI) {
        detail = {
            examDate: row.ngay_thi,
            shift: row.ca_thi,
            duration: row.thoi_gian,
            room: row.phong_thi,
        };
    } else if (activityType === KTHP_TYPES.CHAM_THI) {
        detail = {
            markedCount: row.so_bai_phach,
            role: row.vai_tro,
        };
    } else {
        throw new Error(`Unsupported KTHP type from database: ${activityType}`);
    }

    return {
        id: row.id,
        activityType,
        displayType: labelForType(activityType),
        employee: {
            id: row.id_user,
            name: row.giang_vien,
            department: row.khoa,
        },
        academicYear: row.nam_hoc,
        semester: row.hoc_ky,
        round: row.dot,
        course: {
            code: row.ma_hoc_phan,
            name: row.ten_hoc_phan,
            className: row.lop_hoc_phan,
            credits: row.so_tc,
            studentCount: row.so_sv,
        },
        educationSystem: {
            id: row.he_dao_tao_id,
            name: row.ten_he_dao_tao || row.doi_tuong,
        },
        examForm: row.hinh_thuc_thi,
        coefficient: row.he_so,
        standardHours: row.quy_chuan,
        notes: row.ghi_chu,
        approval: {
            departmentApproved: Boolean(row.khoa_duyet),
            examOfficeApproved: Boolean(row.khao_thi_duyet),
        },
        detail,
    };
};

const canonicalToLegacy = (dto) => ({
    id: dto.id,
    id_user: dto.employee.id,
    giangvien: dto.employee.name,
    giang_vien: dto.employee.name,
    khoa: dto.employee.department,
    ki: dto.semester,
    hoc_ky: dto.semester,
    dot: dto.round,
    namhoc: dto.academicYear,
    nam_hoc: dto.academicYear,
    activityType: dto.activityType,
    activity_type: dto.activityType,
    hinhthuc: dto.displayType,
    hinh_thuc: dto.displayType,
    tenhocphan: dto.course.name,
    ten_hoc_phan: dto.course.name,
    mahocphan: dto.course.code,
    ma_hoc_phan: dto.course.code,
    lophocphan: dto.course.className,
    lop_hoc_phan: dto.course.className,
    doituong: dto.educationSystem.name,
    doi_tuong: dto.educationSystem.name,
    he_dao_tao_id: dto.educationSystem.id,
    so_tc: dto.course.credits,
    so_sv: dto.course.studentCount,
    hinhthucthi: dto.examForm,
    hinh_thuc_thi: dto.examForm,
    heso: dto.coefficient,
    he_so: dto.coefficient,
    sotietqc: dto.standardHours,
    quy_chuan: dto.standardHours,
    ghichu: dto.notes,
    ghi_chu: dto.notes,
    khoaduyet: Number(dto.approval.departmentApproved),
    khoa_duyet: Number(dto.approval.departmentApproved),
    khaothiduyet: Number(dto.approval.examOfficeApproved),
    khao_thi_duyet: Number(dto.approval.examOfficeApproved),
    tongso: dto.detail.quantity ?? dto.detail.markedCount ?? null,
    tong_so: dto.detail.quantity ?? dto.detail.markedCount ?? null,
    sobaiphach: dto.detail.markedCount ?? null,
    so_bai_phach: dto.detail.markedCount ?? null,
    ngaythi: dto.detail.examDate ?? null,
    ngay_thi: dto.detail.examDate ?? null,
    cathi: dto.detail.shift ?? null,
    ca_thi: dto.detail.shift ?? null,
    thoigian: dto.detail.duration ?? null,
    thoi_gian: dto.detail.duration ?? null,
    phongthi: dto.detail.room ?? null,
    phong_thi: dto.detail.room ?? null,
    vaitro: dto.detail.role ?? null,
    vai_tro: dto.detail.role ?? null,
    detail: dto.detail,
});

module.exports = {
    toPersistenceModel,
    rowToCanonical,
    canonicalToLegacy,
};
