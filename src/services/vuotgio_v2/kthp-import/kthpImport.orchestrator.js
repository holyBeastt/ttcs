"use strict";

const createPoolConnection = require("../../../config/databasePool");
const KthpInputStrategyFactory = require("./strategies/kthpInputStrategy.factory");
const KthpTypePolicyFactory = require("./policies/kthpTypePolicy.factory");
const KthpEmployeeResolver = require("./kthpEmployeeResolver");
const KthpEducationSystemResolver = require("./kthpEducationSystemResolver");
const KthpDuplicateService = require("./kthpDuplicate.service");
const KthpImportValidator = require("./kthpImportValidator");
const KthpImportSaveService = require("./kthpImportSave.service");
const KthpPreviewStore = require("./kthpPreviewStore");
const { normalizeDto } = require("./kthpNormalizer");

const defaultPreviewStore = new KthpPreviewStore();

class KthpImportOrchestrator {
    constructor({
        connectionFactory = createPoolConnection,
        employeeResolver = new KthpEmployeeResolver(),
        educationResolver = new KthpEducationSystemResolver(),
        duplicateService = new KthpDuplicateService(),
        validator = new KthpImportValidator(),
        previewStore = defaultPreviewStore,
        saveService,
    } = {}) {
        this.connectionFactory = connectionFactory;
        this.employeeResolver = employeeResolver;
        this.educationResolver = educationResolver;
        this.duplicateService = duplicateService;
        this.validator = validator;
        this.previewStore = previewStore;
        this.saveService = saveService || new KthpImportSaveService({
            connectionFactory,
            duplicateService,
        });
    }

    async preview({ source, input, context = {}, actor }) {
        if (!actor?.id) {
            const error = new Error("Vui lòng đăng nhập để preview dữ liệu");
            error.code = "UNAUTHENTICATED";
            throw error;
        }

        const strategy = KthpInputStrategyFactory.create(source);
        const parsed = await strategy.parse(input, context);
        const dtos = parsed.map(normalizeDto);
        let connection;
        try {
            connection = await this.connectionFactory();
            const employeeIssues = await this.employeeResolver.resolveBatch(dtos, connection, context);
            const educationIssues = await this.educationResolver.resolveBatch(dtos, connection, context);

            const normalizedDtos = dtos.map((dto) => {
                const policy = KthpTypePolicyFactory.create(dto.activityType);
                return normalizeDto(policy.normalize(dto, context));
            });

            const rowIssues = normalizedDtos.map((dto, index) => {
                const policy = KthpTypePolicyFactory.create(dto.activityType);
                return this.validator.validate(dto, policy, [
                    ...employeeIssues[index],
                    ...educationIssues[index],
                ]);
            });

            const eligibleIndexes = normalizedDtos
                .map((_, index) => index)
                .filter((index) => !rowIssues[index].some((issue) => issue.severity === "error"));
            const eligibleDtos = eligibleIndexes.map((index) => normalizedDtos[index]);
            const duplicateChecks = await this.duplicateService.findDuplicates(connection, eligibleDtos);
            const duplicateByIndex = new Map(
                eligibleIndexes.map((originalIndex, index) => [originalIndex, duplicateChecks[index]])
            );

            const rows = normalizedDtos.map((dto, index) => {
                const errors = rowIssues[index].filter((issue) => issue.severity === "error");
                const warnings = rowIssues[index].filter((issue) => issue.severity === "warning");
                const duplicate = duplicateByIndex.get(index);
                if (duplicate?.duplicate) {
                    warnings.push({
                        severity: "warning",
                        code: duplicate.kind === "BATCH" ? "DUPLICATE_IN_BATCH" : "DUPLICATE_IN_DATABASE",
                        field: null,
                        message: duplicate.kind === "BATCH"
                            ? "Bản ghi trùng trong cùng batch"
                            : "Bản ghi đã tồn tại trong cơ sở dữ liệu",
                        sourceRef: dto.sourceRef,
                    });
                }
                return {
                    dto,
                    status: errors.length > 0
                        ? "invalid"
                        : duplicate?.duplicate ? "duplicate" : warnings.length > 0 ? "warning" : "valid",
                    errors,
                    warnings,
                    fingerprint: duplicate?.fingerprint
                        || this.duplicateService.buildFingerprint(dto),
                };
            });

            const savableDtos = rows
                .filter((row) => row.status === "valid" || row.status === "warning")
                .map((row) => row.dto);
            const errors = rows.flatMap((row) => row.errors);
            const warnings = rows.flatMap((row) => row.warnings);
            const duplicateCount = rows.filter((row) => row.status === "duplicate").length;
            const summary = {
                total: rows.length,
                valid: savableDtos.length,
                warning: rows.filter((row) => row.warnings.length > 0).length,
                invalid: rows.filter((row) => row.status === "invalid").length,
                duplicate: duplicateCount,
            };

            const previewToken = errors.length === 0 && savableDtos.length > 0
                ? this.previewStore.create({ dtos: savableDtos, context }, actor.id)
                : null;
            return { summary, rows, errors, warnings, previewToken };
        } finally {
            if (connection) connection.release();
        }
    }

    async commit({ previewToken, actor }) {
        if (!actor?.id) {
            const error = new Error("Vui lòng đăng nhập để lưu dữ liệu");
            error.code = "UNAUTHENTICATED";
            throw error;
        }
        const preview = this.previewStore.acquire(previewToken, actor.id);
        try {
            const result = await this.saveService.save(preview.dtos, { actor, context: preview.context });
            this.previewStore.complete(previewToken);
            return result;
        } catch (error) {
            this.previewStore.release(previewToken);
            throw error;
        }
    }

    getPreviewContext(previewToken, actor) {
        if (!actor?.id) {
            const error = new Error("Vui lòng đăng nhập để tiếp tục");
            error.code = "UNAUTHENTICATED";
            throw error;
        }
        return this.previewStore.peek(previewToken, actor.id).context || {};
    }
}

module.exports = KthpImportOrchestrator;
module.exports.defaultPreviewStore = defaultPreviewStore;
