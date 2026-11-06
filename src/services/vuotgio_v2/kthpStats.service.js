"use strict";

const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/kthpStats.repo");

const normalizeScope = (scope) => (scope === "PREVIEW" ? "PREVIEW" : "OFFICIAL");

const getFilters = async () => {
    let connection;
    try {
        connection = await createPoolConnection();
        return await repo.getFilters(connection);
    } finally {
        if (connection) connection.release();
    }
};

const getLecturerSummary = async ({ namHoc, khoa = "ALL", loaiKthp = "ALL", keyword = "", scope = "OFFICIAL", lecturerId = null }) => {
    if (!namHoc) throw new Error("Thiếu năm học");
    let connection;
    try {
        connection = await createPoolConnection();
        return await repo.listLecturerSummary(connection, {
            namHoc: String(namHoc).trim(),
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

const getLecturerRecords = async ({ lecturerId, namHoc, loaiKthp = "ALL", scope = "OFFICIAL", khoa = "ALL" }) => {
    if (!lecturerId) throw new Error("Thiếu ID giảng viên");
    if (!namHoc) throw new Error("Thiếu năm học");
    let connection;
    try {
        connection = await createPoolConnection();
        return await repo.listLecturerRecords(connection, {
            lecturerId: Number(lecturerId),
            namHoc: String(namHoc).trim(),
            loaiKthp: String(loaiKthp || "ALL").trim(),
            scope: normalizeScope(scope),
            khoa: String(khoa || "ALL").trim(),
        });
    } finally {
        if (connection) connection.release();
    }
};

const getFacultySummary = async ({ namHoc, khoaId = "ALL", loaiKthp = "ALL", scope = "OFFICIAL" }) => {
    if (!namHoc) throw new Error("Thiếu năm học");
    let connection;
    try {
        connection = await createPoolConnection();
        return await repo.listFacultySummary(connection, {
            namHoc: String(namHoc).trim(),
            khoaId: String(khoaId || "ALL").trim(),
            loaiKthp: String(loaiKthp || "ALL").trim(),
            scope: normalizeScope(scope),
        });
    } finally {
        if (connection) connection.release();
    }
};

const getFacultyRecords = async ({ khoa, namHoc, loaiKthp = "ALL", scope = "OFFICIAL" }) => {
    if (!khoa) throw new Error("Thiếu mã khoa");
    if (!namHoc) throw new Error("Thiếu năm học");
    let connection;
    try {
        connection = await createPoolConnection();
        return await repo.listFacultyRecords(connection, {
            khoa: String(khoa).trim(),
            namHoc: String(namHoc).trim(),
            loaiKthp: String(loaiKthp || "ALL").trim(),
            scope: normalizeScope(scope),
        });
    } finally {
        if (connection) connection.release();
    }
};

const getInstituteSummary = async ({ namHoc, loaiKthp = "ALL", scope = "OFFICIAL" }) => {
    if (!namHoc) throw new Error("Thiếu năm học");
    let connection;
    try {
        connection = await createPoolConnection();
        return await repo.listInstituteSummary(connection, {
            namHoc: String(namHoc).trim(),
            loaiKthp: String(loaiKthp || "ALL").trim(),
            scope: normalizeScope(scope),
        });
    } finally {
        if (connection) connection.release();
    }
};

const getInstituteRecords = async ({ namHoc, loaiKthp = "ALL", khoa = "ALL", scope = "OFFICIAL" }) => {
    if (!namHoc) throw new Error("Thiếu năm học");
    let connection;
    try {
        connection = await createPoolConnection();
        return await repo.listInstituteRecords(connection, {
            namHoc: String(namHoc).trim(),
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
