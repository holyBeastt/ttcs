const createPoolConnection = require("../../config/databasePool");
const phongBanRepo = require("../../repositories/nckh_v3/phongBan.repo");
const statsRepo = require("../../repositories/nckh_v3/stats.repo");
const mapper = require("../../mappers/nckh_v3/stats.mapper");
const { getTypeByValue } = require("../../config/nckh_v3/types");
const { STATS_SCOPE, normalizeStatsScope } = require("../../config/nckh_v3/statsScope");

const ensureNamHoc = (namHoc) => {
  const value = String(namHoc || "").trim();
  if (!value) {
    throw new Error("Thiếu năm học");
  }
  return value;
};

const parseAcademicYearStart = (value) => {
  const match = String(value || "").match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
};

const resolveNamHocFilter = (namHoc, yearRange = null) => {
  const requestedFrom = String(yearRange?.namHocFrom || "").trim();
  const requestedTo = String(yearRange?.namHocTo || "").trim();

  if (!requestedFrom && !requestedTo) {
    const safeNamHoc = ensureNamHoc(namHoc);
    return { namHoc: safeNamHoc, fromYear: null, toYear: null };
  }

  if (!requestedFrom || !requestedTo) {
    throw new Error("Phải chọn đủ năm học bắt đầu và năm học kết thúc");
  }

  const fromYear = parseAcademicYearStart(requestedFrom);
  const toYear = parseAcademicYearStart(requestedTo);
  if (!fromYear || !toYear) {
    throw new Error("Khoảng năm học không hợp lệ");
  }
  if (fromYear > toYear) {
    throw new Error("Năm học bắt đầu không được lớn hơn năm học kết thúc");
  }

  return {
    namHoc: requestedFrom,
    fromYear,
    toYear,
  };
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

    let namHocList = [];
    try {
      const [namRows] = await connection.query(`
        SELECT DISTINCT val as NamHoc FROM (
          SELECT NamHoc AS val FROM namhoc WHERE NamHoc IS NOT NULL AND NamHoc <> ''
          UNION
          SELECT nam_hoc AS val FROM nckh_chung WHERE nam_hoc IS NOT NULL AND nam_hoc <> ''
        ) t
        ORDER BY val DESC
      `);
      namHocList = (namRows || []).map((r) => r.NamHoc).filter(Boolean);
    } catch (e) {
      console.error("[NCKH V3] stats getFilters namHoc error:", e);
    }

    let activeNamHoc = null;
    try {
      const [activeRows] = await connection.query(
        "SELECT NamHoc FROM namhoc WHERE trangthai = 1 LIMIT 1"
      );
      if (activeRows && activeRows.length > 0) {
        activeNamHoc = activeRows[0].NamHoc;
      }
    } catch (e) {
      console.error("[NCKH V3] stats getFilters activeNamHoc error:", e);
    }

    return { khoaList, namHocList, activeNamHoc };
  } finally {
    if (connection) connection.release();
  }
};

const getLecturerSummary = async (
  namHoc,
  khoaId,
  keyword,
  scope = STATS_SCOPE.OFFICIAL,
  lecturerId = null,
  yearRange = null
) => {
  const namHocFilter = resolveNamHocFilter(namHoc, yearRange);
  const safeKhoaId = normalizeKhoaId(khoaId);
  const safeKeyword = String(keyword || "").trim();

  let connection;
  try {
    connection = await createPoolConnection();
    const rows = await statsRepo.listLecturerSummary(connection, {
      namHoc: namHocFilter.namHoc,
      fromYear: namHocFilter.fromYear,
      toYear: namHocFilter.toYear,
      khoaId: safeKhoaId,
      keyword: safeKeyword,
      lecturerId,
      scope: normalizeStatsScope(scope),
    });
    return rows.map(mapper.mapLecturerSummaryRow);
  } finally {
    if (connection) connection.release();
  }
};

const getLecturerRecords = async (lecturerId, namHoc, scope = STATS_SCOPE.OFFICIAL, yearRange = null) => {
  const namHocFilter = resolveNamHocFilter(namHoc, yearRange);
  const safeLecturerId = Number(lecturerId);

  if (!Number.isFinite(safeLecturerId) || safeLecturerId <= 0) {
    throw new Error("lecturerId không hợp lệ");
  }

  let connection;
  try {
    connection = await createPoolConnection();
    const rows = await statsRepo.listLecturerRecords(connection, {
      lecturerId: safeLecturerId,
      namHoc: namHocFilter.namHoc,
      fromYear: namHocFilter.fromYear,
      toYear: namHocFilter.toYear,
      scope: normalizeStatsScope(scope),
    });
    return rows.map(mapper.mapLecturerRecordRow);
  } finally {
    if (connection) connection.release();
  }
};

const getFacultySummary = async (namHoc, khoaId, scope = STATS_SCOPE.OFFICIAL, yearRange = null) => {
  const namHocFilter = resolveNamHocFilter(namHoc, yearRange);
  const safeKhoaId = normalizeKhoaId(khoaId);

  let connection;
  try {
    connection = await createPoolConnection();
    const rows = await statsRepo.listFacultySummary(connection, {
      namHoc: namHocFilter.namHoc,
      fromYear: namHocFilter.fromYear,
      toYear: namHocFilter.toYear,
      khoaId: safeKhoaId,
      scope: normalizeStatsScope(scope),
    });
    return rows.map(mapper.mapFacultySummaryRow);
  } finally {
    if (connection) connection.release();
  }
};

const getFacultyRecords = async (namHoc, khoaId, scope = STATS_SCOPE.OFFICIAL, yearRange = null) => {
  const namHocFilter = resolveNamHocFilter(namHoc, yearRange);
  const safeKhoaId = String(khoaId || "").trim();

  if (!safeKhoaId) {
    throw new Error("Thiếu khoaId");
  }

  let connection;
  try {
    connection = await createPoolConnection();
    const rows = await statsRepo.listFacultyRecords(connection, {
      namHoc: namHocFilter.namHoc,
      fromYear: namHocFilter.fromYear,
      toYear: namHocFilter.toYear,
      khoaId: safeKhoaId,
      scope: normalizeStatsScope(scope),
    });
    return rows.map(mapper.mapCommonRecordRow);
  } finally {
    if (connection) connection.release();
  }
};

const getInstituteSummary = async (namHoc, scope = STATS_SCOPE.OFFICIAL, yearRange = null) => {
  const namHocFilter = resolveNamHocFilter(namHoc, yearRange);

  let connection;
  try {
    connection = await createPoolConnection();

    const [overviewRow, lecturerRow, typeRows, facultyRows] = await Promise.all([
      statsRepo.getInstituteOverview(connection, {
        namHoc: namHocFilter.namHoc,
        fromYear: namHocFilter.fromYear,
        toYear: namHocFilter.toYear,
        scope: normalizeStatsScope(scope),
      }),
      statsRepo.countInstituteLecturers(connection, {
        namHoc: namHocFilter.namHoc,
        fromYear: namHocFilter.fromYear,
        toYear: namHocFilter.toYear,
        scope: normalizeStatsScope(scope),
      }),
      statsRepo.listInstituteByType(connection, {
        namHoc: namHocFilter.namHoc,
        fromYear: namHocFilter.fromYear,
        toYear: namHocFilter.toYear,
        scope: normalizeStatsScope(scope),
      }),
      statsRepo.listFacultySummary(connection, {
        namHoc: namHocFilter.namHoc,
        fromYear: namHocFilter.fromYear,
        toYear: namHocFilter.toYear,
        scope: normalizeStatsScope(scope),
      }),
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

const getInstituteRecords = async (namHoc, khoaId, typeSlug, scope = STATS_SCOPE.OFFICIAL, yearRange = null) => {
  const namHocFilter = resolveNamHocFilter(namHoc, yearRange);
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
      namHoc: namHocFilter.namHoc,
      fromYear: namHocFilter.fromYear,
      toYear: namHocFilter.toYear,
      khoaId: safeKhoaId,
      loaiNckh,
      scope: normalizeStatsScope(scope),
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
  resolveNamHocFilter,
};
