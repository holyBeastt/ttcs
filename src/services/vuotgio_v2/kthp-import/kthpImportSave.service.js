"use strict";

const createPoolConnection = require("../../../config/databasePool");
const repo = require("../../../repositories/vuotgio_v2/kthp.repo");
const LogService = require("../../logService");
const KthpTypePolicyFactory = require("./policies/kthpTypePolicy.factory");
const KthpDuplicateService = require("./kthpDuplicate.service");

class KthpImportSaveService {
    constructor({
        connectionFactory = createPoolConnection,
        duplicateService = new KthpDuplicateService(),
    } = {}) {
        this.connectionFactory = connectionFactory;
        this.duplicateService = duplicateService;
    }

    async save(dtos, { actor } = {}) {
        let connection;
        try {
            connection = await this.connectionFactory();
            await connection.beginTransaction();

            const duplicateResults = await this.duplicateService.findDuplicates(connection, dtos);
            const rowsToSave = [];
            let skipped = 0;
            for (let index = 0; index < dtos.length; index += 1) {
                if (duplicateResults[index].duplicate) {
                    skipped += 1;
                    continue;
                }
                const dto = dtos[index];
                const policy = KthpTypePolicyFactory.create(dto.activityType);
                const model = policy.toPersistenceModel(dto);
                rowsToSave.push(model);
            }

            const ids = [];
            for (const model of rowsToSave) {
                ids.push(await repo.create(connection, model));
            }
            await connection.commit();

            try {
                await LogService.logChange(
                    actor?.id,
                    actor?.userName || "Unknown",
                    "Import KTHP",
                    `Lưu ${rowsToSave.length} bản ghi, bỏ qua ${skipped} bản ghi trùng`
                );
            } catch (logError) {
                console.error("[KTHP import] Không ghi được audit log:", logError);
            }

            return { saved: rowsToSave.length, skipped, ids };
        } catch (error) {
            if (connection) {
                try {
                    await connection.rollback();
                } catch (rollbackError) {
                    console.error("[KTHP import] Rollback failed:", rollbackError);
                }
            }
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = KthpImportSaveService;
