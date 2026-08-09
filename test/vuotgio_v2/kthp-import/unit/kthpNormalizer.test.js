"use strict";

const {
    normalizeAcademicYear,
    normalizeDate,
    normalizeNumber,
    normalizeLookupText,
} = require("../../../../src/services/vuotgio_v2/kthp-import/kthpNormalizer");

describe("KthpNormalizer", () => {
    test.each([
        ["2025-2026", "2025 - 2026"],
        ["2025 / 2026", "2025 - 2026"],
        ["2025 – 2026", "2025 - 2026"],
    ])("normalizes academic year %s", (input, expected) => {
        expect(normalizeAcademicYear(input)).toBe(expected);
    });

    test.each([
        [45292, "2024-01-01"],
        ["15/08/2024", "2024-08-15"],
        ["2024-09-30", "2024-09-30"],
        ["31/02/2024", null],
    ])("normalizes date %p", (input, expected) => {
        expect(normalizeDate(input)).toBe(expected);
    });

    test("normalizes numbers without converting blank cells to zero", () => {
        expect(normalizeNumber("1,5")).toBe(1.5);
        expect(normalizeNumber(0)).toBe(0);
        expect(normalizeNumber("")).toBeNull();
        expect(normalizeNumber("-2")).toBe(-2);
    });

    test("creates an accent-insensitive employee lookup key", () => {
        expect(normalizeLookupText("  Nguyễn   Văn Đạt ")).toBe("nguyen van dat");
    });
});
