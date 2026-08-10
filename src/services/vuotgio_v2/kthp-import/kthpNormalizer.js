"use strict";

const collapseWhitespace = (value) => String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/gu, " ")
    .trim();

const normalizeLookupText = (value) => collapseWhitespace(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/giu, "d")
    .toLocaleLowerCase("vi");

const normalizeAcademicYear = (value) => {
    const text = collapseWhitespace(value);
    const match = text.match(/^(\d{4})\s*[-–—/]\s*(\d{4})$/u);
    if (!match) return null;
    return `${match[1]} - ${match[2]}`;
};

const normalizeNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;

    let text = collapseWhitespace(value).replace(/\s/gu, "");
    if (!text) return null;
    if (/^-?\d+,\d+$/u.test(text)) text = text.replace(",", ".");
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
};

const pad = (value) => String(value).padStart(2, "0");

const validDateParts = (year, month, day) => {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
};

const dateFromParts = (year, month, day) => {
    const numeric = [year, month, day].map(Number);
    if (!validDateParts(...numeric)) return null;
    return `${numeric[0]}-${pad(numeric[1])}-${pad(numeric[2])}`;
};

const normalizeDate = (value) => {
    if (value === null || value === undefined || value === "") return null;

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return dateFromParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
    }

    if (typeof value === "number" && Number.isFinite(value)) {
        const milliseconds = Date.UTC(1899, 11, 30) + Math.floor(value) * 86400000;
        const date = new Date(milliseconds);
        return dateFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    }

    const text = collapseWhitespace(value);
    let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\D.*)?$/u);
    if (match) return dateFromParts(match[1], match[2], match[3]);

    match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/u);
    if (match) return dateFromParts(match[3], match[2], match[1]);
    return null;
};

const normalizeDto = (dto) => ({
    ...dto,
    activityName: collapseWhitespace(dto.activityName),
    employee: {
        ...dto.employee,
        id: normalizeNumber(dto.employee?.id),
        name: collapseWhitespace(dto.employee?.name),
        department: collapseWhitespace(dto.employee?.department),
    },
    academicYear: normalizeAcademicYear(dto.academicYear),
    semester: normalizeNumber(dto.semester),
    round: normalizeNumber(dto.round),
    educationSystemId: normalizeNumber(dto.educationSystemId),
    educationSystemName: collapseWhitespace(dto.educationSystemName),
    course: {
        ...dto.course,
        code: collapseWhitespace(dto.course?.code),
        name: collapseWhitespace(dto.course?.name),
        className: collapseWhitespace(dto.course?.className),
        credits: normalizeNumber(dto.course?.credits),
    },
    exam: {
        ...dto.exam,
        date: normalizeDate(dto.exam?.date),
        room: collapseWhitespace(dto.exam?.room),
        shift: collapseWhitespace(dto.exam?.shift),
        studentCount: normalizeNumber(dto.exam?.studentCount),
        pageCount: normalizeNumber(dto.exam?.pageCount),
        questionCount: normalizeNumber(dto.exam?.questionCount),
        markedCount: normalizeNumber(dto.exam?.markedCount),
        quantity: normalizeNumber(dto.exam?.quantity),
        examForm: collapseWhitespace(dto.exam?.examForm),
        coefficient: normalizeNumber(dto.exam?.coefficient),
        duration: normalizeNumber(dto.exam?.duration),
        role: collapseWhitespace(dto.exam?.role),
    },
    standardHours: normalizeNumber(dto.standardHours),
    calculatedStandardHours: normalizeNumber(dto.calculatedStandardHours),
    notes: collapseWhitespace(dto.notes),
});

module.exports = {
    collapseWhitespace,
    normalizeLookupText,
    normalizeAcademicYear,
    normalizeNumber,
    normalizeDate,
    normalizeDto,
};
