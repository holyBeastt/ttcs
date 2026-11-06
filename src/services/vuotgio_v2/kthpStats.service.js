"use strict";

const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/kthpStats.repo");

const normalizeScope = (scope) => (scope === "PREVIEW" ? "PREVIEW" : "OFFICIAL");

const resolveNamHocRange = ({ namHoc, namHocFrom, namHocTo }) => {
    const from = String(namHocFrom || namHoc || "").trim();
    const to = String(namHocTo || namHoc || "").trim();
    if (!from && !to) {
        throw new Error("Thiếu năm học");
    }
    return {
        namHoc: from || to,
        namHocFrom: from || to,
        namHocTo: to || from,
    };
};

const getFilters = async () => {
    let connection;
    try {
        connection = await createPoolConnection();
        return await repo.getFilters(connection);
    } finally {
        if (connection) connection.release();
    }
};

const getLecturerSummary = async ({ namHoc, namHocFrom, namHocTo, khoa = "ALL", loaiKthp = "ALL", keyword = "", scope = "OFFICIAL", lecturerId = null }) => {
    const years = resolveNamHocRange({ namHoc, namHocFrom, namHocTo });
    let connection;
    try {
        connection = await createPoolConnection();
        return await repo.listLecturerSummary(connection, {
            namHoc: years.namHoc,
            namHocFrom: years.namHocFrom,
            namHocTo: years.namHocTo,
            khoa: String(khoa || "ALL").trim(),
            loaiKthp: String(loaiKthp || "ALL").trim(),
            keyword: String(keyword || "").trim(),
            scope: normalizeScope(scope),
            lecturerId: lecturerId ? Number(lecturerId) : null,
        });
    } finally {
        if (connection) connection.release();
    }
};

const getLecturerRecords = async ({ lecturerId, namHoc, namHocFrom, namHocTo, loaiKthp = "ALL", scope = "OFFICIAL", khoa = "ALL" }) => {
    if (!lecturerId) throw new Error("Thiếu ID giảng viên");
    const years = resolveNamHocRange({ namHoc, namHocFrom, namHocTo });
    let connection;
    try {
        connection = await createPoolConnection();
        return await repo.listLecturerRecords(connection, {
            lecturerId: Number(lecturerId),
            namHoc: years.namHoc,
            namHocFrom: years.namHocFrom,
            namHocTo: years.namHocTo,
            loaiKthp: String(loaiKthp || "ALL").trim(),
            scope: normalizeScope(scope),
            khoa: String(khoa || "ALL").trim(),
        });
    } finally {
        if (connection) connection.release();
    }
};

const getFacultySummary = async ({ namHoc, namHocFrom, namHocTo, khoaId = "ALL", loaiKthp = "ALL", scope = "OFFICIAL" }) => {
    const years = resolveNamHocRange({ namHoc, namHocFrom, namHocTo });
    let connection;
    try {
        connection = await createPoolConnection();
        return await repo.listFacultySummary(connection, {
            namHoc: years.namHoc,
            namHocFrom: years.namHocFrom,
            namHocTo: years.namHocTo,
            khoaId: String(khoaId || "ALL").trim(),
            loaiKthp: String(loaiKthp || "ALL").trim(),
            scope: normalizeScope(scope),
        });
    } finally {
        if (connection) connection.release();
    }
};

const getFacultyRecords = async ({ khoa, namHoc, namHocFrom, namHocTo, loaiKthp = "ALL", scope = "OFFICIAL" }) => {
    if (!khoa) throw new Error("Thiếu mã khoa");
    const years = resolveNamHocRange({ namHoc, namHocFrom, namHocTo });
    let connection;
    try {
        connection = await createPoolConnection();
        return await repo.listFacultyRecords(connection, {
            khoa: String(khoa).trim(),
            namHoc: years.namHoc,
            namHocFrom: years.namHocFrom,
            namHocTo: years.namHocTo,
            loaiKthp: String(loaiKthp || "ALL").trim(),
            scope: normalizeScope(scope),
        });
    } finally {
        if (connection) connection.release();
    }
};

const getInstituteSummary = async ({ namHoc, namHocFrom, namHocTo, loaiKthp = "ALL", scope = "OFFICIAL" }) => {
    const years = resolveNamHocRange({ namHoc, namHocFrom, namHocTo });
    let connection;
    try {
        connection = await createPoolConnection();
        return await repo.listInstituteSummary(connection, {
            namHoc: years.namHoc,
            namHocFrom: years.namHocFrom,
            namHocTo: years.namHocTo,
            loaiKthp: String(loaiKthp || "ALL").trim(),
            scope: normalizeScope(scope),
        });
    } finally {
        if (connection) connection.release();
    }
};

const getInstituteRecords = async ({ namHoc, namHocFrom, namHocTo, loaiKthp = "ALL", khoa = "ALL", scope = "OFFICIAL" }) => {
    const years = resolveNamHocRange({ namHoc, namHocFrom, namHocTo });
    let connection;
    try {
        connection = await createPoolConnection();
        return await repo.listInstituteRecords(connection, {
            namHoc: years.namHoc,
            namHocFrom: years.namHocFrom,
            namHocTo: years.namHocTo,
            loaiKthp: String(loaiKthp || "ALL").trim(),
            khoa: String(khoa || "ALL").trim(),
            scope: normalizeScope(scope),
        });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    getFilters,
    getLecturerSummary,
    getLecturerRecords,
    getFacultySummary,
    getFacultyRecords,
    getInstituteSummary,
    getInstituteRecords,
};
