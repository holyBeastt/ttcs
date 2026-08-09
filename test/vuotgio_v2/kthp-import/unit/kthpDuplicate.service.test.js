"use strict";

jest.mock("../../../../src/repositories/vuotgio_v2/kthp.repo", () => ({
    findDuplicateCandidates: jest.fn(),
}));

const repo = require("../../../../src/repositories/vuotgio_v2/kthp.repo");
const KthpDuplicateService = require("../../../../src/services/vuotgio_v2/kthp-import/kthpDuplicate.service");
const { createKthpImportDto, KTHP_TYPES } = require("../../../../src/services/vuotgio_v2/kthp-import/dto/kthpImport.dto");

const dto = () => createKthpImportDto({
    activityType: KTHP_TYPES.COI_THI,
    activityName: "Coi thi",
    employee: { id: 5 },
    academicYear: "2025 - 2026",
    semester: 1,
    round: 1,
    educationSystemId: 7,
    course: { code: "HP01", name: "Môn A", className: "L01" },
    exam: { date: "2026-01-01", shift: "Ca 1", room: "A1" },
});

describe("KthpDuplicateService", () => {
    test("detects duplicate in the same batch", async () => {
        repo.findDuplicateCandidates.mockResolvedValue([]);
        const result = await new KthpDuplicateService().findDuplicates({}, [dto(), dto()]);
        expect(result[0].duplicate).toBe(false);
        expect(result[1]).toEqual(expect.objectContaining({ duplicate: true, kind: "BATCH" }));
    });

    test("detects duplicate already in database", async () => {
        repo.findDuplicateCandidates.mockResolvedValue([{
            id_user: 5,
            nam_hoc: "2025 - 2026",
            hoc_ky: 1,
            dot: 1,
            he_dao_tao_id: 7,
            activity_type: "COI_THI",
            hinh_thuc: "Coi thi",
            ma_hoc_phan: "HP01",
            ten_hoc_phan: "Môn A",
            lop_hoc_phan: "L01",
            ngay_thi: "2026-01-01",
            ca_thi: "Ca 1",
            phong_thi: "A1",
        }]);
        const result = await new KthpDuplicateService().findDuplicates({}, [dto()]);
        expect(result[0]).toEqual(expect.objectContaining({ duplicate: true, kind: "DATABASE" }));
    });
});
