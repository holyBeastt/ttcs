const pool = require("../config/Pool");

/**
 * Scope checks for bearer-token clients.
 *
 * Browser requests continue to use the existing session/role rules. Mobile
 * requests are identified by an Authorization: Bearer header and are scoped
 * to the identity represented by that token before any controller runs.
 */

const isBearerRequest = (req) =>
  /^Bearer\s+\S+$/i.test(String(req.headers?.authorization || ""));

const getAuthenticatedUserId = (req) => {
  const value = Number(req.session?.userId);
  return Number.isInteger(value) && value > 0 ? value : null;
};

const forbidden = (res, message = "Bạn không có quyền xem dữ liệu này.") =>
  res.status(403).json({
    success: false,
    code: "MOBILE_SCOPE_FORBIDDEN",
    message,
  });

const decodeRouteValue = (value) => {
  try {
    return decodeURIComponent(String(value || "")).trim();
  } catch (_error) {
    return String(value || "").trim();
  }
};

/**
 * Restrict a lecturer identifier to the user in the bearer token.
 * Session/browser requests intentionally pass through for backwards
 * compatibility with existing web reporting screens.
 */
const requireOwnLecturerParam = (paramName) => (req, res, next) => {
  if (!isBearerRequest(req)) return next();

  const userId = getAuthenticatedUserId(req);
  const requestedId = Number(decodeRouteValue(req.params?.[paramName]));
  if (!userId || !Number.isInteger(requestedId) || requestedId !== userId) {
    return forbidden(res);
  }

  req.mobileScope = { ...(req.mobileScope || {}), lecturerId: userId };
  return next();
};

/**
 * Restrict a lecturer summary query to the authenticated lecturer. This is
 * important because returning the full summary and filtering it in Flutter
 * would still disclose every lecturer's totals over the network.
 */
const requireOwnLecturerSummary = (req, res, next) => {
  if (!isBearerRequest(req)) return next();

  const userId = getAuthenticatedUserId(req);
  if (!userId) return forbidden(res);

  req.mobileScope = { ...(req.mobileScope || {}), lecturerId: userId };
  return next();
};

const privilegedRoles = new Set([
  "ADMIN",
  "admin",
  "Trợ lý",
  "Lãnh đạo phòng",
  "tro_ly_phong",
  "lanh_dao_phong",
]);

const canViewAllFaculties = (req) =>
  privilegedRoles.has(String(req.session?.role || req.session?.Quyen || "").trim());

const getRequestedFacultyValue = (req, paramName) => {
  if (paramName && req.params?.[paramName] !== undefined) {
    return decodeRouteValue(req.params[paramName]);
  }
  return decodeRouteValue(req.query?.khoaId || req.query?.khoa || "ALL") || "ALL";
};

/**
 * Scope a mobile faculty request to the requester's department. Privileged
 * roles retain institute-wide access. Faculty IDs in NCKH are numeric while
 * the JWT stores MaPhongBan, so resolve the code once and pass a canonical ID
 * to the controller.
 */
const restrictMobileFaculty = (paramName) => async (req, res, next) => {
  if (!isBearerRequest(req)) return next();
  if (!getAuthenticatedUserId(req)) return forbidden(res);
  if (canViewAllFaculties(req)) return next();
  const isFacultyUser = req.session?.isKhoa === 1 || req.session?.isKhoa === "1";
  if (!isFacultyUser) {
    return forbidden(res, "Tài khoản không có quyền xem thống kê theo khoa.");
  }

  const maPhongBan = String(req.session?.MaPhongBan || "").trim();
  if (!maPhongBan) {
    return forbidden(res, "Tài khoản chưa được gắn với khoa/phòng ban.");
  }

  const requestedValue = getRequestedFacultyValue(req, paramName);
  try {
    const [rows] = await pool.query(
      "SELECT id FROM phongban WHERE MaPhongBan = ? LIMIT 1",
      [maPhongBan]
    );
    const ownFaculty = rows[0];
    if (!ownFaculty) {
      return forbidden(res, "Không xác định được khoa/phòng ban của tài khoản.");
    }

    const ownId = String(ownFaculty.id);
    const requested = requestedValue.toUpperCase() === "ALL" ? ownId : requestedValue;
    const matchesOwnId = requested === ownId;
    const matchesOwnCode = requested.toUpperCase() === maPhongBan.toUpperCase();
    if (!matchesOwnId && !matchesOwnCode) return forbidden(res);

    req.mobileScope = {
      ...(req.mobileScope || {}),
      khoaId: ownFaculty.id,
      khoaCode: maPhongBan,
    };
    return next();
  } catch (error) {
    console.error("[MobileScope] faculty scope lookup failed:", error);
    return res.status(500).json({
      success: false,
      code: "MOBILE_SCOPE_LOOKUP_FAILED",
      message: "Không thể kiểm tra phạm vi khoa/phòng ban.",
    });
  }
};

/**
 * Scope a lecturer summary for the unit dashboard. Faculty users may see
 * lecturers in their own faculty, ordinary lecturers only themselves, and
 * privileged roles retain their existing institute-wide access.
 */
const restrictMobileLecturerSummary = async (req, res, next) => {
  if (!isBearerRequest(req)) return next();

  const userId = getAuthenticatedUserId(req);
  if (!userId) return forbidden(res);
  if (canViewAllFaculties(req)) return next();

  const isFacultyUser = req.session?.isKhoa === 1 || req.session?.isKhoa === "1";
  if (!isFacultyUser) {
    req.mobileScope = { ...(req.mobileScope || {}), lecturerId: userId };
    return next();
  }

  return restrictMobileFaculty()(req, res, next);
};

/**
 * Scope the snapshot statistics list without exposing a full institute-wide
 * list to an ordinary lecturer.  Faculty users keep the existing department
 * restriction, while a lecturer is allowed to receive only their own SDO row
 * (the controller applies the lecturerId filter after loading the snapshot).
 * Browser/session requests remain unchanged for compatibility with the web
 * statistics screen.
 */
const restrictMobileSnapshotSummary = async (req, res, next) => {
  if (!isBearerRequest(req)) return next();
  if (!getAuthenticatedUserId(req)) return forbidden(res);
  if (canViewAllFaculties(req)) return next();

  const isFacultyUser = req.session?.isKhoa === 1 || req.session?.isKhoa === "1";
  if (!isFacultyUser) {
    req.mobileScope = {
      ...(req.mobileScope || {}),
      lecturerId: getAuthenticatedUserId(req),
    };
    return next();
  }

  return restrictMobileFaculty()(req, res, next);
};

module.exports = {
  isBearerRequest,
  getAuthenticatedUserId,
  requireOwnLecturerParam,
  requireOwnLecturerSummary,
  restrictMobileLecturerSummary,
  restrictMobileFaculty,
  restrictMobileSnapshotSummary,
  canViewAllFaculties,
};
