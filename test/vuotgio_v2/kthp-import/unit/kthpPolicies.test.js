"use strict";

const KthpTypePolicyFactory = require("../../../../src/services/vuotgio_v2/kthp-import/policies/kthpTypePolicy.factory");
const { createKthpImportDto, KTHP_TYPES } = require("../../../../src/services/vuotgio_v2/kthp-import/dto/kthpImport.dto");

const dtoFor = (activityType) => createKthpImportDto({
    source: "MANUAL",
    activityType,
    activityName: activityType === "RA_DE"
        ? "Ra đề"
        : activityType === "COI_THI" ? "Coi thi" : "Chấm thi",
    employee: { id: 9, name: "GV A", department: "CNTT" },
    academicYear: "2025 - 2026",
    semester: 1,
    round: 1,
    educationSystemId: 7,
    educationSystemName: "Đại học",
    course: { code: "HP01", name: "Môn A", className: "L01", credits: 3 },
    exam: {
        date: "2026-01-01",
        room: "A101",
        shift: "Ca 1",
        studentCount: 30,
        questionCount: 2,
        firstMarkerCount: 10,
        secondMarkerCount: 20,
        quantity: 30,
        examForm: "Tự luận",
        coefficient: 1.5,
        duration: 90,
        role: "Chấm 2",
    },
    standardHours: 4.5,
    notes: "Ghi chú",
});

describe("KTHP type policies", () => {
    test.each(Object.values(KTHP_TYPES))("factory maps %s", (type) => {
        expect(KthpTypePolicyFactory.create(type)).toBeDefined();
    });

    test("persistence model separates common parent and type-specific child", () => {
        const dto = dtoFor(KTHP_TYPES.CHAM_THI);
        const model = KthpTypePolicyFactory.create(dto.activityType).toPersistenceModel(dto);
        expect(model).toEqual({
            parent: expect.objectContaining({
                activityType: "CHAM_THI",
                courseCode: "HP01",
                examForm: "Tự luận",
                coefficient: 1.5,
            }),
            detailKind: "CHAM_THI",
            detail: {
                role: "Chấm 2",
                firstMarkerCount: 10,
                secondMarkerCount: 20,
                totalMarked: 30,
            },
        });
    });

    test("reported and calculated standard hours mismatch creates a warning", () => {
        const dto = { ...dtoFor(KTHP_TYPES.RA_DE), calculatedStandardHours: 6 };
        const issues = KthpTypePolicyFactory.create(dto.activityType).validate(dto);
        expect(issues).toContainEqual(expect.objectContaining({
            severity: "warning",
            code: "STANDARD_HOURS_MISMATCH",
        }));
    });

    test("negative detailed values are rejected", () => {
        const dto = dtoFor(KTHP_TYPES.COI_THI);
        dto.exam.duration = -1;
        expect(KthpTypePolicyFactory.create(dto.activityType).validate(dto))
            .toContainEqual(expect.objectContaining({ code: "NEGATIVE_VALUE", field: "exam.duration" }));
    });

    test("exam date is required only for proctoring", () => {
        const raDe = dtoFor(KTHP_TYPES.RA_DE);
        const chamThi = dtoFor(KTHP_TYPES.CHAM_THI);
        const coiThi = dtoFor(KTHP_TYPES.COI_THI);
        raDe.exam.date = null;
        chamThi.exam.date = null;
        coiThi.exam.date = null;

        expect(KthpTypePolicyFactory.create(raDe.activityType).validate(raDe))
            .not.toContainEqual(expect.objectContaining({ code: "EXAM_DATE_REQUIRED" }));
        expect(KthpTypePolicyFactory.create(chamThi.activityType).validate(chamThi))
            .not.toContainEqual(expect.objectContaining({ code: "EXAM_DATE_REQUIRED" }));
        expect(KthpTypePolicyFactory.create(coiThi.activityType).validate(coiThi))
            .toContainEqual(expect.objectContaining({ code: "EXAM_DATE_REQUIRED" }));
    });

    test("an invalid supplied date is rejected during preview", () => {
        const raDe = dtoFor(KTHP_TYPES.RA_DE);
        raDe.exam.date = null;
        raDe.raw = { "Ngày thi": "31/02/2026" };
        expect(KthpTypePolicyFactory.create(raDe.activityType).validate(raDe))
            .toContainEqual(expect.objectContaining({ code: "EXAM_DATE_INVALID" }));
    });
});
