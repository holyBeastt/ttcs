"use strict";

const { KTHP_TYPES } = require("../../../../constants/vuotgio_v2/kthp.constant");

const KTHP_SOURCES = Object.freeze({
    EXCEL: "EXCEL",
    MANUAL: "MANUAL",
});

const createKthpImportDto = (overrides = {}) => ({
    source: overrides.source || null,
    sourceRef: {
        fileName: null,
        sheetName: null,
        rowNumber: null,
        ...(overrides.sourceRef || {}),
    },
    activityType: overrides.activityType || null,
    activityName: overrides.activityName || "",
    employee: {
        id: null,
        name: "",
        department: "",
        ...(overrides.employee || {}),
    },
    academicYear: overrides.academicYear || "",
    semester: overrides.semester ?? null,
    round: overrides.round ?? null,
    educationSystemId: overrides.educationSystemId ?? null,
    educationSystemName: overrides.educationSystemName || "",
    course: {
        code: "",
        name: "",
        className: "",
        credits: null,
        ...(overrides.course || {}),
    },
    exam: {
        date: null,
        room: "",
        shift: "",
        studentCount: null,
        pageCount: null,
        questionCount: null,
        markedCount: null,
        quantity: null,
        examForm: "",
        coefficient: null,
        duration: null,
        role: "",
        ...(overrides.exam || {}),
    },
    standardHours: overrides.standardHours ?? null,
    calculatedStandardHours: overrides.calculatedStandardHours ?? null,
    notes: overrides.notes || "",
    raw: overrides.raw || {},
});

module.exports = {
    KTHP_SOURCES,
    KTHP_TYPES,
    createKthpImportDto,
};
