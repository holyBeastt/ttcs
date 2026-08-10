"use strict";

const { normalizeLookupText } = require("./kthpNormalizer");

class KthpEducationSystemResolver {
    async resolveBatch(dtos, connection) {
        const runQuery = connection.execute
            ? connection.execute.bind(connection)
            : connection.query.bind(connection);
        const [systems] = await runQuery(
            "SELECT id, he_dao_tao FROM he_dao_tao"
        );
        const byId = new Map(systems.map((system) => [String(system.id), system]));
        const byName = new Map();
        for (const system of systems) {
            const key = normalizeLookupText(system.he_dao_tao);
            const list = byName.get(key) || [];
            list.push(system);
            byName.set(key, list);
        }

        return dtos.map((dto) => {
            const issues = [];
            let matches = [];
            if (dto.educationSystemId !== null && dto.educationSystemId !== undefined) {
                const system = byId.get(String(dto.educationSystemId));
                if (system) matches = [system];
                else {
                    issues.push({
                        severity: "error",
                        code: "EDUCATION_SYSTEM_NOT_FOUND",
                        field: "educationSystemId",
                        message: "ID hệ đào tạo không tồn tại",
                    });
                }
            } else if (dto.educationSystemName) {
                matches = byName.get(normalizeLookupText(dto.educationSystemName)) || [];
                if (matches.length === 0) {
                    issues.push({
                        severity: "error",
                        code: "EDUCATION_SYSTEM_NOT_FOUND",
                        field: "educationSystemName",
                        message: "Không tìm thấy hệ đào tạo",
                    });
                } else if (matches.length > 1) {
                    issues.push({
                        severity: "error",
                        code: "EDUCATION_SYSTEM_AMBIGUOUS",
                        field: "educationSystemName",
                        message: "Tên hệ đào tạo không xác định duy nhất",
                    });
                }
            } else {
                issues.push({
                    severity: "error",
                    code: "EDUCATION_SYSTEM_REQUIRED",
                    field: "educationSystemId",
                    message: "Bắt buộc chọn hệ đào tạo trước khi preview",
                });
            }

            if (matches.length === 1) {
                const system = matches[0];
                if (dto.educationSystemName
                    && normalizeLookupText(dto.educationSystemName)
                        !== normalizeLookupText(system.he_dao_tao)) {
                    issues.push({
                        severity: "error",
                        code: "EDUCATION_SYSTEM_MISMATCH",
                        field: "educationSystemName",
                        message: "ID và tên hệ đào tạo không khớp",
                    });
                }
                dto.educationSystemId = system.id;
                dto.educationSystemName = system.he_dao_tao;
            }
            return issues;
        });
    }
}

module.exports = KthpEducationSystemResolver;
