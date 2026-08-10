"use strict";

const repo = require("../../../repositories/vuotgio_v2/kthp.repo");
const {
    normalizeAcademicYear,
    normalizeLookupText,
    normalizeDate,
} = require("./kthpNormalizer");
const { KTHP_TYPES } = require("./dto/kthpImport.dto");

const stable = (value) => normalizeLookupText(value ?? "");

const duplicateScope = (dto) => ({
    employeeId: dto.employee?.id ?? null,
    academicYear: normalizeAcademicYear(dto.academicYear) || stable(dto.academicYear),
    semester: dto.semester ?? null,
    round: dto.round ?? null,
    educationSystemId: dto.educationSystemId ?? null,
});

const scopeKey = (scope) => [
    scope.employeeId,
    scope.academicYear,
    scope.semester,
    scope.round,
    scope.educationSystemId,
].map((value) => String(value ?? "")).join("|");

const buildFingerprint = (dto) => {
    const scope = duplicateScope(dto);
    const common = [
        dto.activityType,
        dto.employee?.id,
        scope.academicYear,
        scope.semester,
        scope.round,
        scope.educationSystemId,
        stable(dto.activityName),
        stable(dto.course?.code),
        stable(dto.course?.name),
        stable(dto.course?.className),
    ];
    if (dto.activityType === KTHP_TYPES.COI_THI) {
        common.push(
            normalizeDate(dto.exam?.date),
            stable(dto.exam?.shift),
            stable(dto.exam?.room)
        );
    } else if (dto.activityType === KTHP_TYPES.CHAM_THI) {
        common.push(
            stable(dto.exam?.role),
            dto.exam?.markedCount
        );
    } else {
        common.push(stable(dto.exam?.examForm), dto.exam?.quantity);
    }
    return common.map((value) => String(value ?? "")).join("|");
};

const rowToDto = (row) => ({
    activityType: row.activity_type || row.loai_kthp,
    activityName: row.hinh_thuc,
    employee: { id: row.id_user },
    academicYear: row.nam_hoc,
    semester: row.hoc_ky,
    round: row.dot,
    educationSystemId: row.he_dao_tao_id,
    course: {
        code: row.ma_hoc_phan,
        name: row.ten_hoc_phan,
        className: row.lop_hoc_phan,
    },
    exam: {
        date: row.ngay_thi,
        shift: row.ca_thi,
        room: row.phong_thi,
        role: row.vai_tro,
        examForm: row.hinh_thuc_thi,
        markedCount: row.so_bai_phach,
        quantity: row.so_luong,
    },
});

class KthpDuplicateService {
    buildFingerprint(dto) {
        return buildFingerprint(dto);
    }

    async findDuplicates(connection, dtos) {
        const scopes = [...new Map(
            dtos
                .map(duplicateScope)
                .filter((scope) => Object.values(scope).every((value) =>
                    value !== null && value !== undefined && value !== ""))
                .map((scope) => [scopeKey(scope), scope])
        ).values()];
        const existingRows = scopes.length > 0
            ? await repo.findDuplicateCandidates(connection, scopes)
            : [];
        const dbFingerprints = new Set(existingRows.map((row) => buildFingerprint(rowToDto(row))));
        const batchFingerprints = new Map();

        return dtos.map((dto, index) => {
            const fingerprint = buildFingerprint(dto);
            if (batchFingerprints.has(fingerprint)) {
                return {
                    duplicate: true,
                    kind: "BATCH",
                    fingerprint,
                    duplicateOf: batchFingerprints.get(fingerprint),
                };
            }
            batchFingerprints.set(fingerprint, index);
            if (dbFingerprints.has(fingerprint)) {
                return { duplicate: true, kind: "DATABASE", fingerprint };
            }
            return { duplicate: false, fingerprint };
        });
    }
}

module.exports = KthpDuplicateService;
module.exports.buildFingerprint = buildFingerprint;
module.exports.rowToDto = rowToDto;
module.exports.duplicateScope = duplicateScope;
