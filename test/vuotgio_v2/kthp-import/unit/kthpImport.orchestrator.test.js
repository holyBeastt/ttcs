"use strict";

const KthpImportOrchestrator = require("../../../../src/services/vuotgio_v2/kthp-import/kthpImport.orchestrator");
const KthpPreviewStore = require("../../../../src/services/vuotgio_v2/kthp-import/kthpPreviewStore");

const manualInput = () => ({
    employeeId: 10,
    giangvien: "Nguyễn Văn A",
    khoa: "CNTT",
    namhoc: "2025-2026",
    ki: 1,
    heDaoTaoId: 7,
    doituong: "Đại học",
    tenhocphan: "Môn A",
    ngaythi: "2026-01-15",
    dot: 1,
    details: [{
        activityType: "COI_THI",
        sotietqc: 3,
        detail: { shiftCount: 1 },
    }],
});

const connection = () => ({
    execute: jest.fn()
        .mockResolvedValueOnce([[
            { id_User: 10, TenNhanVien: "Nguyễn Văn A", MaPhongBan: "CNTT" },
        ]])
        .mockResolvedValueOnce([[
            { id: 7, he_dao_tao: "Đại học" },
        ]]),
    release: jest.fn(),
});

describe("KthpImportOrchestrator", () => {
    test("preview is read-only and commit uses the server-side token payload", async () => {
        const db = connection();
        const duplicateService = {
            findDuplicates: jest.fn().mockResolvedValue([{ duplicate: false, fingerprint: "fp" }]),
            buildFingerprint: jest.fn().mockReturnValue("fp"),
        };
        const saveService = { save: jest.fn().mockResolvedValue({ saved: 1, skipped: 0 }) };
        const orchestrator = new KthpImportOrchestrator({
            connectionFactory: jest.fn().mockResolvedValue(db),
            duplicateService,
            previewStore: new KthpPreviewStore(),
            saveService,
        });

        const preview = await orchestrator.preview({
            source: "MANUAL",
            input: manualInput(),
            actor: { id: 99 },
        });

        expect(preview.summary).toEqual(expect.objectContaining({
            total: 1,
            valid: 1,
            invalid: 0,
        }));
        expect(preview.previewToken).toBeTruthy();
        expect(db.release).toHaveBeenCalledTimes(1);
        expect(saveService.save).not.toHaveBeenCalled();

        await expect(orchestrator.commit({
            previewToken: preview.previewToken,
            actor: { id: 100 },
        })).rejects.toMatchObject({ code: "PREVIEW_TOKEN_FORBIDDEN" });

        await expect(orchestrator.commit({
            previewToken: preview.previewToken,
            actor: { id: 99, userName: "Admin" },
        })).resolves.toEqual({ saved: 1, skipped: 0 });
        expect(saveService.save.mock.calls[0][0][0].employee.id).toBe(10);
    });

    test("invalid rows do not receive a commit token", async () => {
        const db = {
            execute: jest.fn()
                .mockResolvedValueOnce([[]])
                .mockResolvedValueOnce([[{ id: 7, he_dao_tao: "Đại học" }]]),
            release: jest.fn(),
        };
        const duplicateService = {
            findDuplicates: jest.fn().mockResolvedValue([]),
            buildFingerprint: jest.fn().mockReturnValue("fp"),
        };
        const orchestrator = new KthpImportOrchestrator({
            connectionFactory: jest.fn().mockResolvedValue(db),
            duplicateService,
            previewStore: new KthpPreviewStore(),
            saveService: { save: jest.fn() },
        });
        const preview = await orchestrator.preview({
            source: "MANUAL",
            input: { ...manualInput(), employeeId: null, giangvien: "Không tồn tại" },
            actor: { id: 99 },
        });
        expect(preview.previewToken).toBeNull();
        expect(preview.errors).toContainEqual(expect.objectContaining({ code: "EMPLOYEE_NOT_FOUND" }));
    });
});
