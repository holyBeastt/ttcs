"use strict";

jest.mock("../../../src/config/databasePool", () => jest.fn());
jest.mock("../../../src/services/logService", () => ({
    logChange: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../../src/repositories/vuotgio_v2/kthp.repo", () => ({
    ...jest.requireActual("../../../src/repositories/vuotgio_v2/kthp.repo"),
    getByIdForUpdate: jest.fn(),
    update: jest.fn(),
    updateBatchApproval: jest.fn(),
}));

const createPoolConnection = require("../../../src/config/databasePool");
const repo = require("../../../src/repositories/vuotgio_v2/kthp.repo");
const actualRepo = jest.requireActual("../../../src/repositories/vuotgio_v2/kthp.repo");
const service = require("../../../src/services/vuotgio_v2/kthp.service");

const requestBody = () => ({
    activityType: "COI_THI",
    employeeId: 91,
    academicYear: "2025 - 2026",
    semester: 2,
    round: 3,
    tenhocphan: "Cơ sở dữ liệu",
    mahocphan: "INT1234",
    lophocphan: "CSDL-01",
    sotc: 3,
    sosv: 60,
    educationSystemId: 7,
    examForm: "Tự luận",
    coefficient: 1.5,
    standardHours: 4.5,
    notes: "Thi tập trung",
    detail: {
        examDate: "2026-01-15",
        shift: "Ca 2",
        duration: 90,
        room: "A101",
        shiftCount: 2,
    },
});

const expectedModel = () => ({
    parent: {
        employeeId: 91,
        employeeName: "Nguyễn Văn A",
        department: "CNTT",
        semester: 2,
        academicYear: "2025 - 2026",
        round: 3,
        activityType: "COI_THI",
        displayType: "Coi thi",
        courseName: "Cơ sở dữ liệu",
        courseCode: "INT1234",
        className: "CSDL-01",
        credits: 3,
        studentCount: 60,
        educationSystemId: 7,
        educationSystemName: "Đại học",
        examForm: "Tự luận",
        coefficient: 1.5,
        standardHours: 4.5,
        notes: "Thi tập trung",
    },
    detailKind: "COI_THI",
    detail: {
        examDate: "2026-01-15",
        shift: "Ca 2",
        duration: 90,
        room: "A101",
        shiftCount: 2,
    },
});

const createResponse = () => {
    const res = { status: jest.fn(), json: jest.fn() };
    res.status.mockReturnValue(res);
    return res;
};

const createServiceConnection = () => ({
    execute: jest.fn()
        .mockResolvedValueOnce([[
            { id_User: 91, TenNhanVien: "Nguyễn Văn A", MaPhongBan: "CNTT" },
        ]])
        .mockResolvedValueOnce([[
            { id: 7, he_dao_tao: "Đại học" },
        ]]),
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn(),
});

describe("KTHP service canonical contract", () => {
    beforeEach(() => jest.clearAllMocks());

    test("edit resolves master data and writes one parent/detail model", async () => {
        const connection = createServiceConnection();
        const req = {
            params: { ID: "77" },
            body: requestBody(),
            session: {
                userId: 10,
                TenNhanVien: "Admin",
                MaPhongBan: "BGĐ",
                isKhoa: 0,
            },
            khoaFilter: { isAdmin: true },
        };
        const res = createResponse();
        createPoolConnection.mockResolvedValue(connection);
        repo.getByIdForUpdate.mockResolvedValue({
            id: 77,
            khoa: "CNTT",
            loai_kthp: "COI_THI",
            khoa_duyet: 1,
            khao_thi_duyet: 1,
        });
        repo.update.mockResolvedValue({ affectedRows: 1 });

        await service.edit(req, res);

        expect(repo.update).toHaveBeenCalledWith(connection, "77", expectedModel());
        expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
        expect(connection.commit).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(connection.release).toHaveBeenCalledTimes(1);
    });

    test("rejects changing the parent activity type", async () => {
        const connection = createServiceConnection();
        const req = {
            params: { ID: "77" },
            body: requestBody(),
            session: { MaPhongBan: "BGĐ", isKhoa: 0 },
            khoaFilter: { isAdmin: true },
        };
        const res = createResponse();
        createPoolConnection.mockResolvedValue(connection);
        repo.getByIdForUpdate.mockResolvedValue({
            id: 77,
            khoa: "CNTT",
            loai_kthp: "RA_DE",
            khoa_duyet: 0,
            khao_thi_duyet: 0,
        });

        await service.edit(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(repo.update).not.toHaveBeenCalled();
        expect(connection.beginTransaction).toHaveBeenCalledTimes(1);
        expect(connection.rollback).toHaveBeenCalledTimes(1);
    });

    test("checks approval transitions server-side before updating", async () => {
        const connection = {
            beginTransaction: jest.fn().mockResolvedValue(undefined),
            commit: jest.fn().mockResolvedValue(undefined),
            rollback: jest.fn().mockResolvedValue(undefined),
            release: jest.fn(),
        };
        createPoolConnection.mockResolvedValue(connection);
        repo.getByIdForUpdate.mockResolvedValue({
            id: 77,
            khoa: "CNTT",
            khoa_duyet: 0,
            khao_thi_duyet: 0,
        });
        repo.updateBatchApproval.mockResolvedValue(1);
        const req = {
            body: {
                updates: [{ id: 77, khoaDuyet: 1, khaoThiDuyet: 0 }],
            },
            session: {
                role: "GV_CNBM",
                MaPhongBan: "CNTT",
                isKhoa: 1,
            },
        };
        const res = createResponse();

        await service.batchApprove(req, res);

        expect(repo.updateBatchApproval).toHaveBeenCalledWith(connection, [{
            id: 77,
            khoa_duyet: 1,
            khao_thi_duyet: 0,
        }]);
        expect(connection.commit).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    test("rolls back a forbidden approval transition", async () => {
        const connection = {
            beginTransaction: jest.fn().mockResolvedValue(undefined),
            commit: jest.fn().mockResolvedValue(undefined),
            rollback: jest.fn().mockResolvedValue(undefined),
            release: jest.fn(),
        };
        createPoolConnection.mockResolvedValue(connection);
        repo.getByIdForUpdate.mockResolvedValue({
            id: 77,
            khoa: "CNTT",
            khoa_duyet: 0,
            khao_thi_duyet: 0,
        });
        const req = {
            body: {
                updates: [{ id: 77, khoaDuyet: 1, khaoThiDuyet: 1 }],
            },
            session: {
                role: "GV_CNBM",
                MaPhongBan: "CNTT",
                isKhoa: 1,
            },
        };
        const res = createResponse();

        await service.batchApprove(req, res);

        expect(repo.updateBatchApproval).not.toHaveBeenCalled();
        expect(connection.rollback).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(403);
    });
});

describe("KTHP repository parent/detail writes", () => {
    test("create inserts one parent and exactly one matching child", async () => {
        const connection = {
            execute: jest.fn()
                .mockResolvedValueOnce([{ insertId: 501 }])
                .mockResolvedValueOnce([{ affectedRows: 1 }]),
        };

        await expect(actualRepo.create(connection, expectedModel())).resolves.toBe(501);

        expect(connection.execute).toHaveBeenCalledTimes(2);
        expect(connection.execute.mock.calls[0][0]).toContain("INSERT INTO vg_kthp");
        expect(connection.execute.mock.calls[1][0]).toContain("INSERT INTO vg_kthp_coi_thi");
        expect(connection.execute.mock.calls[1][1]).toEqual([
            501,
            "2026-01-15",
            "Ca 2",
            90,
            "A101",
            2,
        ]);
    });

    test("update resets approvals and updates only the matching child", async () => {
        const connection = {
            execute: jest.fn()
                .mockResolvedValueOnce([{ affectedRows: 1 }])
                .mockResolvedValueOnce([{ affectedRows: 1 }]),
        };

        await expect(actualRepo.update(connection, 77, expectedModel()))
            .resolves.toEqual({ affectedRows: 1 });

        expect(connection.execute).toHaveBeenCalledTimes(2);
        expect(connection.execute.mock.calls[0][0]).toContain("khoa_duyet = 0");
        expect(connection.execute.mock.calls[0][0]).toContain("khao_thi_duyet = 0");
        expect(connection.execute.mock.calls[1][0]).toContain("UPDATE vg_kthp_coi_thi");
    });
});
