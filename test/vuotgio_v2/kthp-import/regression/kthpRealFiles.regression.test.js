"use strict";

const fs = require("fs");
const path = require("path");
const ExcelKthpInputStrategy = require("../../../../src/services/vuotgio_v2/kthp-import/strategies/excelKthpInput.strategy");

const fixtureDirectory = path.resolve(__dirname, "../../../../docs_private/kthp");
const fixtureFiles = fs.existsSync(fixtureDirectory)
    ? fs.readdirSync(fixtureDirectory).filter((file) => /\.xlsx?$/iu.test(file))
    : [];

const describeRealFixtures = fixtureFiles.length > 0 ? describe : describe.skip;

describeRealFixtures("KTHP real Excel files (read-only)", () => {
    test.each(fixtureFiles)("%s parses without writing to DB", async (fileName) => {
        const rows = await new ExcelKthpInputStrategy().parse(
            fs.readFileSync(path.join(fixtureDirectory, fileName)),
            {
                fileName,
                academicYear: "2025 - 2026",
                semester: 1,
                educationSystemId: 1,
            }
        );
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.every((row) =>
            row.sourceRef.fileName === fileName
            && row.sourceRef.sheetName
            && Number.isInteger(row.sourceRef.rowNumber))).toBe(true);
    });
});
