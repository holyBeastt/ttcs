"use strict";

jest.mock("../../../../src/repositories/vuotgio_v2/kthp.repo", () => ({
    create: jest.fn(),
}));
jest.mock("../../../../src/services/logService", () => ({
    logChange: jest.fn().mockResolvedValue(undefined),
}));

const repo = require("../../../../src/repositories/vuotgio_v2/kthp.repo");
const KthpImportSaveService = require("../../../../src/services/vuotgio_v2/kthp-import/kthpImportSave.service");
const { createKthpImportDto, KTHP_TYPES } = require("../../../../src/services/vuotgio_v2/kthp-import/dto/kthpImport.dto");

const validDto = () => createKthpImportDto({
    source: "MANUAL",
    activityType: KTHP_TYPES.RA_DE,
    activityName: "Ra đề",
    employee: { id: 10, name: "GV A", department: "CNTT" },
    academicYear: "2025 - 2026",
    semester: 1,
    round: 1,
    educationSystemId: 7,
    educationSystemName: "Đại học",
    course: { code: "HP1", name: "Môn A" },
    exam: { quantity: 2 },
    standardHours: 3,
});

const connection = () => ({
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn(),
});

describe("KthpImportSaveService", () => {
    beforeEach(() => jest.clearAllMocks());

    test("saves a batch in one transaction and includes resolved employee ID", async () => {
        const db = connection();
        repo.create.mockResolvedValue(501);
        const service = new KthpImportSaveService({
            connectionFactory: jest.fn().mockResolvedValue(db),
            duplicateService: {
                findDuplicates: jest.fn().mockResolvedValue([{ duplicate: false }]),
            },
        });
        await expect(service.save([validDto()], { actor: { id: 99 } }))
            .resolves.toEqual({ saved: 1, skipped: 0, ids: [501] });
        expect(repo.create).toHaveBeenCalledWith(
            db,
            expect.objectContaining({
                parent: expect.objectContaining({ employeeId: 10 }),
                detailKind: "RA_DE",
                detail: { quantity: 2 },
            })
        );
        expect(db.beginTransaction).toHaveBeenCalledTimes(1);
        expect(db.commit).toHaveBeenCalledTimes(1);
        expect(db.rollback).not.toHaveBeenCalled();
    });

    test("rolls back the whole batch on repository failure", async () => {
        const db = connection();
        repo.create.mockRejectedValue(new Error("DB failed"));
        const service = new KthpImportSaveService({
            connectionFactory: jest.fn().mockResolvedValue(db),
            duplicateService: {
                findDuplicates: jest.fn().mockResolvedValue([{ duplicate: false }]),
            },
        });
        await expect(service.save([validDto()], { actor: { id: 99 } }))
            .rejects.toThrow("DB failed");
        expect(db.rollback).toHaveBeenCalledTimes(1);
        expect(db.commit).not.toHaveBeenCalled();
    });
});
