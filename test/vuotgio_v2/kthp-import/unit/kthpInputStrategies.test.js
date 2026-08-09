"use strict";

const XLSX = require("xlsx");
const ExcelKthpInputStrategy = require("../../../../src/services/vuotgio_v2/kthp-import/strategies/excelKthpInput.strategy");
const ManualKthpInputStrategy = require("../../../../src/services/vuotgio_v2/kthp-import/strategies/manualKthpInput.strategy");
const KthpInputStrategyFactory = require("../../../../src/services/vuotgio_v2/kthp-import/strategies/kthpInputStrategy.factory");
const KthpTypePolicyFactory = require("../../../../src/services/vuotgio_v2/kthp-import/policies/kthpTypePolicy.factory");
const { KTHP_SOURCES } = require("../../../../src/services/vuotgio_v2/kthp-import/dto/kthpImport.dto");
const { normalizeDto } = require("../../../../src/services/vuotgio_v2/kthp-import/kthpNormalizer");

const workbookBuffer = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
        ["STT", "Họ và tên", "Mã học phần", "Tên học phần", "Số đề", "Số tiết QC"],
        [1, "Nguyễn Văn A", "HP01", "Cơ sở dữ liệu", 2, 3],
    ]), "Ra đề");
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

const singleSheetBuffer = (name, rows) => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), name);
    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

describe("KTHP input strategies", () => {
    test("factory selects source strategy and rejects unknown sources", () => {
        expect(KthpInputStrategyFactory.create("EXCEL")).toBeInstanceOf(ExcelKthpInputStrategy);
        expect(KthpInputStrategyFactory.create("MANUAL")).toBeInstanceOf(ManualKthpInputStrategy);
        expect(() => KthpInputStrategyFactory.create("OTHER")).toThrow("Unsupported");
    });

    test("Excel and manual produce the same business DTO contract", async () => {
        const context = {
            academicYear: "2025-2026",
            semester: 1,
            round: 1,
            educationSystemId: 7,
            educationSystemName: "Đại học",
        };
        const excel = normalizeDto((await new ExcelKthpInputStrategy().parse(workbookBuffer(), context))[0]);
        const manual = normalizeDto((await new ManualKthpInputStrategy().parse({
            employeeId: 10,
            giangvien: "Nguyễn Văn A",
            khoa: "CNTT",
            namhoc: "2025 - 2026",
            ki: 1,
            dot: 1,
            heDaoTaoId: 7,
            doituong: "Đại học",
            mahocphan: "HP01",
            tenhocphan: "Cơ sở dữ liệu",
            tongso: 2,
            details: [{ activityType: "RA_DE", sotietqc: 3 }],
        }))[0]);

        excel.employee.id = 10;
        excel.employee.department = "CNTT";
        const omitSource = (dto) => {
            const { source, sourceRef, raw, ...business } = dto;
            return business;
        };
        expect(omitSource(excel)).toEqual(omitSource(manual));
        expect(KthpTypePolicyFactory.create(excel.activityType).toPersistenceModel(excel))
            .toEqual(
                KthpTypePolicyFactory.create(manual.activityType).toPersistenceModel(manual)
            );
        expect(excel.source).toBe(KTHP_SOURCES.EXCEL);
        expect(manual.source).toBe(KTHP_SOURCES.MANUAL);
    });

    test("maps Ngân hàng câu hỏi explicitly to its own activity type", async () => {
        const input = singleSheetBuffer("Ngân hàng câu hỏi", [
            ["Họ và tên", "Tên học phần", "Số câu hỏi", "Số tiết QC"],
            ["Nguyễn Văn A", "Cơ sở dữ liệu", 20, 4],
        ]);
        const [dto] = await new ExcelKthpInputStrategy().parse(input, {});

        expect(dto.activityType).toBe("NGAN_HANG_CAU_HOI");
        expect(dto.exam.quantity).toBe(20);
    });

    test("does not invent one shift when a Coi thi row omits Số ca", async () => {
        const input = singleSheetBuffer("Coi thi", [
            ["Họ và tên", "Tên học phần", "Ngày thi", "Số tiết QC"],
            ["Nguyễn Văn A", "Cơ sở dữ liệu", "01/01/2026", 2],
        ]);
        const [dto] = await new ExcelKthpInputStrategy().parse(input, {});

        expect(dto.activityType).toBe("COI_THI");
        expect(dto.exam.quantity).toBeNull();
    });

    test("rejects grouped legacy objects instead of selecting a compatibility parser", async () => {
        await expect(new ExcelKthpInputStrategy().parse({
            raDe: [{ hoVaTen: "Nguyễn Văn A" }],
        })).rejects.toThrow("buffer");
    });

    test("rejects a workbook with no supported KTHP sheet", async () => {
        const input = singleSheetBuffer("Sheet1", [
            ["Họ và tên", "Tên học phần"],
            ["Nguyễn Văn A", "Cơ sở dữ liệu"],
        ]);
        await expect(new ExcelKthpInputStrategy().parse(input, {}))
            .rejects.toMatchObject({ code: "KTHP_SHEET_UNSUPPORTED" });
    });
});
