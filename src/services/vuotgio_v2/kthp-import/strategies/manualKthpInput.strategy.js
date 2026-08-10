"use strict";

const KthpInputStrategy = require("./kthpInput.strategy");
const {
    KTHP_SOURCES,
    KTHP_TYPES,
    createKthpImportDto,
} = require("../dto/kthpImport.dto");
const { labelForType } = require("../../../../constants/vuotgio_v2/kthp.constant");

class ManualKthpInputStrategy extends KthpInputStrategy {
    async parse(input, context = {}) {
        const body = input?.body || input || {};
        const common = body.common || body;
        const details = Array.isArray(body.items)
            ? body.items
            : Array.isArray(body.details)
                ? body.details
            : [body];

        return details.map((detail, index) => {
            const detailData = detail.detail || detail;
            const activityType = detail.activityType;
            if (!Object.values(KTHP_TYPES).includes(activityType)) {
                const error = new Error(`Loại KTHP không được hỗ trợ: ${activityType}`);
                error.code = "KTHP_TYPE_UNSUPPORTED";
                throw error;
            }
            const activityName = labelForType(activityType);
            const total = detailData.quantity ?? detailData.shiftCount
                ?? detailData.totalMarked ?? detailData.tong_so
                ?? detailData.tongso ?? common.tong_so ?? common.tongso;
            const markedCount = detailData.markedCount ?? detailData.so_bai_phach
                ?? detailData.soBaiPhach ?? total;
            const course = common.course || {};
            const employee = common.employee || {};
            const educationSystem = common.educationSystem || {};

            return createKthpImportDto({
                source: KTHP_SOURCES.MANUAL,
                sourceRef: { rowNumber: index + 1 },
                activityType,
                activityName,
                employee: {
                    id: employee.id ?? common.employeeId ?? common.employee_id ?? common.id_user,
                    name: employee.name ?? common.giang_vien ?? common.giangvien ?? common.hoVaTen,
                    department: employee.department ?? common.khoa ?? common.Khoa,
                },
                academicYear: common.academicYear ?? common.nam_hoc ?? common.namhoc ?? common.NamHoc
                    ?? context.academicYear,
                semester: common.semester ?? common.hoc_ky ?? common.ki
                    ?? common.HocKy ?? context.semester,
                round: common.round ?? common.dot ?? common.Dot ?? context.round,
                educationSystemId: detail.educationSystemId ?? detail.he_dao_tao_id
                    ?? educationSystem.id ?? common.educationSystemId
                    ?? common.heDaoTaoId ?? common.he_dao_tao_id,
                educationSystemName: detail.doi_tuong ?? detail.doituong
                    ?? educationSystem.name ?? common.doi_tuong ?? common.doituong,
                course: {
                    code: course.code ?? common.ma_hoc_phan ?? common.mahocphan ?? common.maHocPhan,
                    name: course.name ?? common.ten_hoc_phan ?? common.tenhocphan ?? common.tenHocPhan,
                    className: course.className ?? common.lop_hoc_phan ?? common.lophocphan,
                    credits: course.credits ?? common.so_tc ?? common.sotc,
                },
                exam: {
                    date: detailData.examDate ?? detailData.ngay_thi
                        ?? detailData.ngaythi ?? common.ngay_thi ?? common.ngaythi,
                    room: detailData.room ?? detailData.phong_thi
                        ?? detailData.phongthi ?? common.phong_thi ?? common.phongthi,
                    shift: detailData.shift ?? detailData.ca_thi
                        ?? detailData.cathi ?? common.ca_thi ?? common.cathi,
                    studentCount: course.studentCount ?? common.so_sv ?? common.sosv,
                    questionCount: activityType === KTHP_TYPES.RA_DE
                        || activityType === KTHP_TYPES.NGAN_HANG_CAU_HOI
                        ? total
                        : null,
                    markedCount: activityType === KTHP_TYPES.CHAM_THI ? markedCount : null,
                    quantity: activityType === KTHP_TYPES.RA_DE
                        || activityType === KTHP_TYPES.NGAN_HANG_CAU_HOI ? total : null,
                    examForm: common.examForm ?? common.hinh_thuc_thi ?? common.hinhthucthi,
                    coefficient: common.coefficient ?? common.he_so ?? common.heso,
                    duration: detailData.duration ?? detailData.thoi_gian
                        ?? detailData.thoigian ?? common.thoi_gian ?? common.thoigian,
                    role: detailData.role ?? detailData.vai_tro
                        ?? detailData.vaitro ?? common.vai_tro ?? common.vaitro,
                },
                standardHours: detail.standardHours ?? detail.quy_chuan ?? detail.sotietqc
                    ?? common.quy_chuan ?? common.sotietqc,
                calculatedStandardHours: detail.calculatedStandardHours,
                notes: common.notes ?? common.ghi_chu ?? common.ghichu,
                raw: { ...common, detail },
            });
        });
    }
}

module.exports = ManualKthpInputStrategy;
