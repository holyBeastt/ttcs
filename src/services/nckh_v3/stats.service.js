const createPoolConnection = require("../../config/databasePool");
const phongBanRepo = require("../../repositories/nckh_v3/phongBan.repo");
const statsRepo = require("../../repositories/nckh_v3/stats.repo");
const mapper = require("../../mappers/nckh_v3/stats.mapper");
const { getTypeByValue } = require("../../config/nckh_v3/types");

const ensureNamHoc = (namHoc) => {
  const value = String(namHoc || "").trim();
  if (!value) {
    throw new Error("Thiếu năm học");
  }
  return value;
};

const normalizeKhoaId = (khoaId) => {
  const value = String(khoaId || "ALL").trim() || "ALL";
  return value;
};

const getFilters = async () => {
  let connection;
  try {
    connection = await createPoolConnection();
    const khoaList = await phongBanRepo.listKhoa(connection);
    return { khoaList };
  } finally {
    if (connection) connection.release();
  }
};

const getLecturerSummary = async (namHoc, khoaId, keyword) => {
  const safeNamHoc = ensureNamHoc(namHoc);
  const safeKhoaId = normalizeKhoaId(khoaId);
  const safeKeyword = String(keyword || "").trim();

  let connection;
  try {
    connection = await createPoolConnection();
    const rows = await statsRepo.listLecturerSummary(connection, {
      namHoc: safeNamHoc,
      khoaId: safeKhoaId,
      keyword: safeKeyword,
    });
    return rows.map(mapper.mapLecturerSummaryRow);
  } finally {
    if (connection) connection.release();
  }
};

const getLecturerRecords = async (lecturerId, namHoc) => {
  const safeNamHoc = ensureNamHoc(namHoc);
  const safeLecturerId = Number(lecturerId);

  if (!Number.isFinite(safeLecturerId) || safeLecturerId <= 0) {
    throw new Error("lecturerId không hợp lệ");
  }

  let connection;
  try {
    connection = await createPoolConnection();
    const rows = await statsRepo.listLecturerRecords(connection, {
      lecturerId: safeLecturerId,
      namHoc: safeNamHoc,
    });
    return rows.map(mapper.mapLecturerRecordRow);
  } finally {
    if (connection) connection.release();
  }
};

const getFacultySummary = async (namHoc) => {
  const safeNamHoc = ensureNamHoc(namHoc);

  let connection;
  try {
    connection = await createPoolConnection();
    const rows = await statsRepo.listFacultySummary(connection, { namHoc: safeNamHoc });
    return rows.map(mapper.mapFacultySummaryRow);
  } finally {
    if (connection) connection.release();
  }
};

const getFacultyRecords = async (namHoc, khoaId) => {
  const safeNamHoc = ensureNamHoc(namHoc);
  const safeKhoaId = String(khoaId || "").trim();

  if (!safeKhoaId) {
    throw new Error("Thiếu khoaId");
  }

  let connection;
  try {
    connection = await createPoolConnection();
    const rows = await statsRepo.listFacultyRecords(connection, {
      namHoc: safeNamHoc,
      khoaId: safeKhoaId,
    });
    return rows.map(mapper.mapCommonRecordRow);
  } finally {
    if (connection) connection.release();
  }
};

const getInstituteSummary = async (namHoc) => {
  const safeNamHoc = ensureNamHoc(namHoc);

  let connection;
  try {
    connection = await createPoolConnection();

    const [overviewRow, lecturerRow, typeRows, facultyRows] = await Promise.all([
      statsRepo.getInstituteOverview(connection, { namHoc: safeNamHoc }),
      statsRepo.countInstituteLecturers(connection, { namHoc: safeNamHoc }),
      statsRepo.listInstituteByType(connection, { namHoc: safeNamHoc }),
      statsRepo.listFacultySummary(connection, { namHoc: safeNamHoc }),
    ]);

    return {
      overview: mapper.mapInstituteOverview(overviewRow, lecturerRow),
      byType: typeRows.map(mapper.mapInstituteTypeRow),
      byFaculty: facultyRows.map(mapper.mapFacultySummaryRow),
    };
  } finally {
    if (connection) connection.release();
  }
};

const getInstituteRecords = async (namHoc, khoaId, typeSlug) => {
  const safeNamHoc = ensureNamHoc(namHoc);
  const safeKhoaId = normalizeKhoaId(khoaId);

  let loaiNckh = "ALL";
  const safeTypeSlug = String(typeSlug || "ALL").trim();
  if (safeTypeSlug && safeTypeSlug !== "ALL") {
    const meta = getTypeByValue(safeTypeSlug);
    if (!meta) {
      throw new Error("type không hợp lệ");
    }
    loaiNckh = meta.loaiNckh;
  }

  let connection;
  try {
    connection = await createPoolConnection();
    const rows = await statsRepo.listInstituteRecords(connection, {
      namHoc: safeNamHoc,
      khoaId: safeKhoaId,
      loaiNckh,
    });
    return rows.map(mapper.mapCommonRecordRow);
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