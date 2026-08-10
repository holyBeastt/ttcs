"use strict";

const departmentAliases = require("../../../config/vuotgio_v2/kthpDepartment.alias");
const { normalizeLookupText } = require("./kthpNormalizer");

const normalizedDepartmentAliases = new Map(
    Object.entries(departmentAliases).map(([source, canonical]) => [
        normalizeLookupText(source),
        normalizeLookupText(canonical),
    ])
);

const normalizeDepartmentCode = (value) => {
    const normalized = normalizeLookupText(value);
    return normalizedDepartmentAliases.get(normalized) || normalized;
};

class KthpEmployeeResolver {
    async resolveBatch(dtos, connection, context = {}) {
        const runQuery = connection.execute
            ? connection.execute.bind(connection)
            : connection.query.bind(connection);
        const [employees] = await runQuery(
            "SELECT id_User, TenNhanVien, MaPhongBan FROM nhanvien"
        );
        const byId = new Map(employees.map((employee) => [String(employee.id_User), employee]));
        const byName = new Map();
        for (const employee of employees) {
            const key = normalizeLookupText(employee.TenNhanVien);
            const list = byName.get(key) || [];
            list.push(employee);
            byName.set(key, list);
        }

        return dtos.map((dto) => {
            const issues = [];
            let matches = [];
            if (dto.employee.id !== null && dto.employee.id !== undefined) {
                const employee = byId.get(String(dto.employee.id));
                if (employee) matches = [employee];
                else {
                    issues.push({
                        severity: "error",
                        code: "EMPLOYEE_NOT_FOUND",
                        field: "employee.id",
                        message: "ID nhân viên không tồn tại trong hệ thống",
                    });
                }
            } else {
                matches = byName.get(normalizeLookupText(dto.employee.name)) || [];
                if (matches.length === 0) {
                    issues.push({
                        severity: "error",
                        code: "EMPLOYEE_NOT_FOUND",
                        field: "employee.name",
                        message: "Không tìm thấy nhân viên trong hệ thống",
                    });
                } else if (matches.length > 1) {
                    issues.push({
                        severity: "error",
                        code: "EMPLOYEE_AMBIGUOUS",
                        field: "employee.name",
                        message: "Có nhiều nhân viên trùng tên; cần chọn đúng ID nhân viên",
                    });
                }
            }

            if (matches.length === 1) {
                const employee = matches[0];
                if (dto.employee.name
                    && normalizeLookupText(dto.employee.name)
                        !== normalizeLookupText(employee.TenNhanVien)) {
                    issues.push({
                        severity: "error",
                        code: "EMPLOYEE_MISMATCH",
                        field: "employee.name",
                        message: "ID và tên nhân viên không khớp",
                    });
                }
                if (dto.employee.department
                    && normalizeDepartmentCode(dto.employee.department)
                        !== normalizeDepartmentCode(employee.MaPhongBan)) {
                    issues.push({
                        severity: "error",
                        code: "EMPLOYEE_DEPARTMENT_MISMATCH",
                        field: "employee.department",
                        message: "Khoa/đơn vị trong nguồn không khớp hồ sơ nhân viên",
                    });
                }
                if (!employee.MaPhongBan) {
                    issues.push({
                        severity: "error",
                        code: "EMPLOYEE_DEPARTMENT_MISSING",
                        field: "employee.department",
                        message: "Nhân viên chưa được gán khoa/đơn vị",
                    });
                }
                if (context.allowedDepartment
                    && employee.MaPhongBan !== context.allowedDepartment) {
                    issues.push({
                        severity: "error",
                        code: "EMPLOYEE_OUTSIDE_SCOPE",
                        field: "employee.id",
                        message: "Nhân viên không thuộc khoa được phép thao tác",
                    });
                }
                dto.employee = {
                    id: employee.id_User,
                    name: employee.TenNhanVien,
                    department: employee.MaPhongBan || "",
                };
            }
            return issues;
        });
    }
}

module.exports = KthpEmployeeResolver;
module.exports.normalizeDepartmentCode = normalizeDepartmentCode;
