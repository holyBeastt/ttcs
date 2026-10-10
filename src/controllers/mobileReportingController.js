const pool = require("../config/Pool");
const statsService = require("../services/nckh_v3/stats.service");
const tongHopService = require("../services/vuotgio_v2/tongHop.service");
const snapshotDataService = require("../services/vuotgio_v2/snapshotData.service");
const mobileReportingService = require("../services/mobileReporting.service");
const { STATS_SCOPE } = require("../config/nckh_v3/statsScope");

const privilegedRoles = new Set([
  "ADMIN",
  "admin",
  "Trợ lý",
  "Lãnh đạo phòng",
  "tro_ly_phong",
  "lanh_dao_phong",
]);

const getActor = (req) => {
  const userId = Number(req.user?.userId);
  if (!Number.isInteger(userId) || userId <= 0) return null;
  return {
    userId,
    role: String(req.user?.role || "").trim(),
    maPhongBan: String(req.user?.MaPhongBan || "").trim(),
    isKhoa: req.user?.isKhoa === 1 || req.user?.isKhoa === "1",
  };
};

const isPrivileged = (actor) => privilegedRoles.has(actor.role);

const forbidden = (res, message = "Bạn không có quyền xem dữ liệu này.") =>
  res.status(403).json({ success: false, code: "MOBILE_SCOPE_FORBIDDEN", message });

const invalidActor = (res) =>
  res.status(401).json({ success: false, message: "Phiên đăng nhập không hợp lệ." });

const parseIsDuKien = (value) =>
  value === true || value === "true" || value === "1" || value === 1;

const getStatsScope = (isDuKien) =>
  isDuKien ? STATS_SCOPE.PREVIEW : STATS_SCOPE.OFFICIAL;

const resolveActorFaculty = async (actor) => {
  if (!actor.maPhongBan) return null;
  const [rows] = await pool.query(
    "SELECT id, MaPhongBan FROM phongban WHERE MaPhongBan = ? LIMIT 1",
    [actor.maPhongBan],
  );
  return rows[0] || null;
};

const isOwnFacultyRequest = (value, faculty) => {
  const requested = String(value || "ALL").trim();
  return !requested || requested.toUpperCase() === "ALL"
    || requested === String(faculty.id)
    || requested.toUpperCase() === String(faculty.MaPhongBan).toUpperCase();
};

const getRestrictedFaculty = async (actor, requestedValue, res) => {
  if (isPrivileged(actor)) return null;
  if (!actor.isKhoa) {
    forbidden(res, "Tài khoản không có quyền xem thống kê theo khoa.");
    return undefined;
  }

  const faculty = await resolveActorFaculty(actor);
  if (!faculty) {
    forbidden(res, "Tài khoản chưa được gắn với khoa/phòng ban.");
    return undefined;
  }
  if (!isOwnFacultyRequest(requestedValue, faculty)) {
    forbidden(res);
    return undefined;
  }
  return faculty;
};

const getLecturerSummaryFaculty = async (actor, requestedValue, res) => {
  if (isPrivileged(actor)) return null;
  if (!actor.isKhoa) {
    const requested = String(requestedValue || "ALL").trim().toUpperCase();
    if (requested && requested !== "ALL") {
      forbidden(res);
      return undefined;
    }
    return null;
  }
  return getRestrictedFaculty(actor, requestedValue, res);
};

const mayReadLecturer = async (actor, lecturerId) => {
  if (isPrivileged(actor) || lecturerId === actor.userId) return true;
  if (!actor.isKhoa) return false;

  const faculty = await resolveActorFaculty(actor);
  if (!faculty) return false;
  const [rows] = await pool.query(
    "SELECT 1 FROM nhanvien WHERE id_User = ? AND phongban_id = ? LIMIT 1",
    [lecturerId, faculty.id],
  );
  return rows.length > 0;
};

const nckhFilters = async (req, res) => {
  const actor = getActor(req);
  if (!actor) return invalidActor(res);

  try {
    const data = await statsService.getFilters();
    if (isPrivileged(actor)) return res.json({ success: true, data });
    if (!actor.isKhoa) return res.json({ success: true, data: { ...data, khoaList: [] } });

    const faculty = await getRestrictedFaculty(actor, "ALL", res);
    if (!faculty) return undefined;
    return res.json({
      success: true,
      data: {
        ...data,
        khoaList: (data.khoaList || []).filter((item) => String(item.id) === String(faculty.id)),
      },
    });
  } catch (error) {
    console.error("[MobileReports] NCKH filters failed:", error);
    return res.status(500).json({ success: false, message: "Không thể lấy bộ lọc." });
  }
};

const nckhLecturerSummary = async (req, res) => {
  const actor = getActor(req);
  if (!actor) return invalidActor(res);

  const { namHoc, khoaId = "ALL", keyword = "", isDuKien } = req.query;
  try {
    const faculty = await getLecturerSummaryFaculty(actor, khoaId, res);
    if (faculty === undefined) return undefined;
    const data = await statsService.getLecturerSummary(
      namHoc,
      faculty ? faculty.id : khoaId,
      keyword,
      getStatsScope(parseIsDuKien(isDuKien)),
      isPrivileged(actor) || faculty ? null : actor.userId,
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.error("[MobileReports] NCKH lecturer summary failed:", error);
    return res.status(400).json({ success: false, message: error.message || "Không thể lấy thống kê giảng viên." });
  }
};

const nckhLecturerRecords = async (req, res) => {
  const actor = getActor(req);
  if (!actor) return invalidActor(res);

  const lecturerId = Number(req.params.lecturerId);
  if (!Number.isInteger(lecturerId) || lecturerId <= 0) {
    return res.status(400).json({ success: false, message: "lecturerId không hợp lệ." });
  }

  try {
    if (!(await mayReadLecturer(actor, lecturerId))) return forbidden(res);
    const data = await statsService.getLecturerRecords(
      lecturerId,
      req.query.namHoc,
      getStatsScope(parseIsDuKien(req.query.isDuKien)),
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.error("[MobileReports] NCKH lecturer records failed:", error);
    return res.status(400).json({ success: false, message: error.message || "Không thể lấy công trình." });
  }
};

const nckhFacultySummary = async (req, res) => {
  const actor = getActor(req);
  if (!actor) return invalidActor(res);

  const { namHoc, khoaId = "ALL", isDuKien } = req.query;
  try {
    const faculty = await getRestrictedFaculty(actor, khoaId, res);
    if (faculty === undefined) return undefined;
    if (!isPrivileged(actor) && !faculty) return forbidden(res);
    const data = await statsService.getFacultySummary(
      namHoc,
      faculty ? faculty.id : khoaId,
      getStatsScope(parseIsDuKien(isDuKien)),
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.error("[MobileReports] NCKH faculty summary failed:", error);
    return res.status(400).json({ success: false, message: error.message || "Không thể lấy thống kê khoa." });
  }
};

const nckhFacultyRecords = async (req, res) => {
  const actor = getActor(req);
  if (!actor) return invalidActor(res);

  const { namHoc, isDuKien } = req.query;
  try {
    const faculty = await getRestrictedFaculty(actor, req.params.khoaId, res);
    if (faculty === undefined) return undefined;
    if (!isPrivileged(actor) && !faculty) return forbidden(res);
    const data = await statsService.getFacultyRecords(
      namHoc,
      faculty ? faculty.id : req.params.khoaId,
      getStatsScope(parseIsDuKien(isDuKien)),
    );
    return res.json({ success: true, data });
  } catch (error) {
    console.error("[MobileReports] NCKH faculty records failed:", error);
    return res.status(400).json({ success: false, message: error.message || "Không thể lấy công trình theo khoa." });
  }
};

const workloadMe = async (req, res) => {
  const actor = getActor(req);
  if (!actor) return invalidActor(res);

  try {
    const isDuKien = parseIsDuKien(req.query.isDuKien);
    const data = await tongHopService.getAtomicSDO(
      req.query.namHoc,
      actor.userId,
      null,
      isDuKien,
      mobileReportingService.getMobileWorkloadOptions(isDuKien),
    );
    if (!data) return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu giảng viên." });
    return res.json({ success: true, data });
  } catch (error) {
    console.error("[MobileReports] personal workload failed:", error);
    return res.status(400).json({ success: false, message: error.message || "Không thể lấy vượt giờ cá nhân." });
  }
};

const workloadMeSnapshot = async (req, res) => {
  const actor = getActor(req);
  if (!actor) return invalidActor(res);

  try {
    const data = await snapshotDataService.getSnapshotSDOByUser(req.query.namHoc, actor.userId);
    if (!data) return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu đã chốt." });
    return res.json({ success: true, data });
  } catch (error) {
    console.error("[MobileReports] personal snapshot failed:", error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Không thể lấy dữ liệu đã chốt." });
  }
};

const workloadFaculty = async (req, res) => {
  const actor = getActor(req);
  if (!actor) return invalidActor(res);

  try {
    const faculty = await getRestrictedFaculty(actor, req.query.khoa, res);
    if (faculty === undefined) return undefined;
    if (!isPrivileged(actor) && !faculty) return forbidden(res);
    const isDuKien = parseIsDuKien(req.query.isDuKien);
    const { aggregate } = await mobileReportingService.getFacultyWorkload(
      req.query.namHoc,
      faculty ? faculty.MaPhongBan : (req.query.khoa || "ALL"),
      isDuKien,
    );
    return res.json({ success: true, ...aggregate });
  } catch (error) {
    console.error("[MobileReports] faculty workload failed:", error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Không thể lấy thống kê khoa." });
  }
};

const workloadFacultyPreview = async (req, res) => {
  const actor = getActor(req);
  if (!actor) return invalidActor(res);

  try {
    const faculty = await getRestrictedFaculty(actor, req.query.khoa, res);
    if (faculty === undefined) return undefined;
    if (!isPrivileged(actor) && !faculty) return forbidden(res);
    const isDuKien = parseIsDuKien(req.query.isDuKien);
    const khoa = faculty ? faculty.MaPhongBan : req.query.khoa;
    const { sdoList } = await mobileReportingService.getFacultyWorkload(req.query.namHoc, khoa, isDuKien);
    if (!sdoList.length) return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu cho khoa này." });

    const templatePreviewService = require("../services/vuotgio_v2/templatePreview.service");
    const preview = await templatePreviewService.buildDepartmentPreviewPdf({
      summaries: sdoList,
      khoa,
      namHoc: req.query.namHoc,
    });
    return res.json({
      success: true,
      data: {
        pdfBase64: preview.pdfBase64,
        warnings: preview.warnings || [],
        meta: preview.meta,
      },
    });
  } catch (error) {
    console.error("[MobileReports] faculty preview failed:", error);
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Không thể tạo bản xem trước." });
  }
};

module.exports = {
  nckhFilters,
  nckhLecturerSummary,
  nckhLecturerRecords,
  nckhFacultySummary,
  nckhFacultyRecords,
  workloadMe,
  workloadMeSnapshot,
  workloadFaculty,
  workloadFacultyPreview,
};
