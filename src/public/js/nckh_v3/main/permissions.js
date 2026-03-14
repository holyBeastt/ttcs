window.NCKH_V3 = window.NCKH_V3 || {};

(function () {
  function getPermissionState() {
    const role = localStorage.getItem("userRole") || "";
    const maPhongBan = localStorage.getItem("MaPhongBan") || "";

    const APP_DEPARTMENTS = window.APP_DEPARTMENTS || {};
    const APP_ROLES = window.APP_ROLES || {};

    const daoTaoCode = APP_DEPARTMENTS.daoTao || "DT";
    const ncHtptCode = APP_DEPARTMENTS.ncHtpt || "NCKHHTQT";

    const troLyPhongRole = APP_ROLES.troLy_phong || "tro_ly_phong";
    const lanhDaoPhongRole = APP_ROLES.lanhDao_phong || "lanh_dao_phong";
    const lanhDaoKhoaRole = APP_ROLES.lanhDao_khoa || "lanh_dao_khoa";
    const gvCnbmKhoaRole = APP_ROLES.gv_cnbm_khoa || "gv_cnbm_khoa";

    const canApprove =
      (role === troLyPhongRole || role === lanhDaoPhongRole) &&
      (maPhongBan === daoTaoCode || maPhongBan === ncHtptCode);

    const canApproveKhoa =
      role === lanhDaoKhoaRole &&
      maPhongBan !== daoTaoCode &&
      maPhongBan !== ncHtptCode;

    const canEdit = canApprove || canApproveKhoa || role === gvCnbmKhoaRole;
    const canDelete = canEdit;
    const canInput = canEdit;

    return {
      role,
      maPhongBan,
      canApprove,
      canApproveKhoa,
      canEdit,
      canDelete,
      canInput,
    };
  }

  window.NCKH_V3.permissions = {
    getPermissionState,
  };
})();
