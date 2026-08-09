"use strict";

const KthpEmployeeResolver = require("../../../../src/services/vuotgio_v2/kthp-import/kthpEmployeeResolver");
const KthpEducationSystemResolver = require("../../../../src/services/vuotgio_v2/kthp-import/kthpEducationSystemResolver");
const { createKthpImportDto } = require("../../../../src/services/vuotgio_v2/kthp-import/dto/kthpImport.dto");

describe("KTHP resolvers", () => {
    test("employee resolver distinguishes found, missing and ambiguous names", async () => {
        const connection = {
            execute: jest.fn().mockResolvedValue([[
                { id_User: 1, TenNhanVien: "Nguyễn Văn A", MaPhongBan: "CNTT" },
                { id_User: 2, TenNhanVien: "Trần Văn B", MaPhongBan: "KT" },
                { id_User: 3, TenNhanVien: "Trần Văn B", MaPhongBan: "CT" },
            ]]),
        };
        const dtos = [
            createKthpImportDto({ employee: { name: "nguyen van a" } }),
            createKthpImportDto({ employee: { name: "Không Có" } }),
            createKthpImportDto({ employee: { name: "Trần Văn B" } }),
        ];
        const issues = await new KthpEmployeeResolver().resolveBatch(dtos, connection);
        expect(dtos[0].employee).toEqual({ id: 1, name: "Nguyễn Văn A", department: "CNTT" });
        expect(issues[1][0].code).toBe("EMPLOYEE_NOT_FOUND");
        expect(issues[2][0].code).toBe("EMPLOYEE_AMBIGUOUS");
    });

    test("education resolver requires a real ID/name and checks mismatches", async () => {
        const connection = {
            execute: jest.fn().mockResolvedValue([[
                { id: 7, he_dao_tao: "Đại học" },
            ]]),
        };
        const valid = createKthpImportDto({ educationSystemId: 7 });
        const missing = createKthpImportDto();
        const issues = await new KthpEducationSystemResolver()
            .resolveBatch([valid, missing], connection);
        expect(valid.educationSystemName).toBe("Đại học");
        expect(issues[1][0].code).toBe("EDUCATION_SYSTEM_REQUIRED");
    });

    test("employee resolver rejects an ID/name mismatch", async () => {
        const connection = {
            execute: jest.fn().mockResolvedValue([[
                { id_User: 1, TenNhanVien: "Nguyễn Văn A", MaPhongBan: "CNTT" },
            ]]),
        };
        const dto = createKthpImportDto({
            employee: { id: 1, name: "Người Khác", department: "CNTT" },
        });
        const [issues] = await new KthpEmployeeResolver()
            .resolveBatch([dto], connection);

        expect(issues).toContainEqual(expect.objectContaining({
            code: "EMPLOYEE_MISMATCH",
        }));
    });

    test.each([
        ["KAT", "ATTT"],
        ["KCB", "CB"],
        ["KCN", "CNTT"],
        ["KDV", "ĐTVM"],
        ["KMM", "MM"],
        ["VNC", "NC&HTPT"],
    ])("employee resolver accepts KTHP source department %s as %s", async (
        sourceDepartment,
        profileDepartment
    ) => {
        const connection = {
            execute: jest.fn().mockResolvedValue([[
                {
                    id_User: 1,
                    TenNhanVien: "Nguyễn Văn A",
                    MaPhongBan: profileDepartment,
                },
            ]]),
        };
        const dto = createKthpImportDto({
            employee: {
                name: "Nguyễn Văn A",
                department: sourceDepartment,
            },
        });

        const [issues] = await new KthpEmployeeResolver()
            .resolveBatch([dto], connection, { allowedDepartment: profileDepartment });

        expect(issues).toEqual([]);
        expect(dto.employee.department).toBe(profileDepartment);
    });

    test("employee resolver still rejects an unknown department mismatch", async () => {
        const connection = {
            execute: jest.fn().mockResolvedValue([[
                { id_User: 1, TenNhanVien: "Nguyễn Văn A", MaPhongBan: "CNTT" },
            ]]),
        };
        const dto = createKthpImportDto({
            employee: {
                name: "Nguyễn Văn A",
                department: "DON_VI_KHONG_XAC_DINH",
            },
        });

        const [issues] = await new KthpEmployeeResolver()
            .resolveBatch([dto], connection);

        expect(issues).toContainEqual(expect.objectContaining({
            code: "EMPLOYEE_DEPARTMENT_MISMATCH",
        }));
    });

    test("department aliases do not bypass the allowed department scope", async () => {
        const connection = {
            execute: jest.fn().mockResolvedValue([[
                { id_User: 1, TenNhanVien: "Nguyễn Văn A", MaPhongBan: "ATTT" },
            ]]),
        };
        const dto = createKthpImportDto({
            employee: {
                name: "Nguyễn Văn A",
                department: "KAT",
            },
        });

        const [issues] = await new KthpEmployeeResolver()
            .resolveBatch([dto], connection, { allowedDepartment: "CNTT" });

        expect(issues).toContainEqual(expect.objectContaining({
            code: "EMPLOYEE_OUTSIDE_SCOPE",
        }));
    });
});
