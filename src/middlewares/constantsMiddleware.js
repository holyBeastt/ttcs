/**
 * Constants Middleware
 * This middleware sets up application-wide constants for roles and departments
 * that can be used across all EJS templates
 */

// Load environment variables
require('dotenv').config();

const constantsMiddleware = (req, res, next) => {
  // Set up APP_ROLES constants for all templates
  res.locals.APP_ROLES = {
    lanhDao_phong: process.env.ROLE_PHONGBAN_LANHDAO,
    troLy_phong: process.env.ROLE_PHONGBAN_TROLY,
    thuong_phong: process.env.ROLE_PHONGBAN_THUONG,
    lanhDao_khoa: process.env.ROLE_KHOA_LANHDAO,
    gv_cnbm_khoa: process.env.ROLE_KHOA_GV_CNBM, // Add alias for backward compatibility
    gv_cnbm: process.env.ROLE_KHOA_GV_CNBM,
    gv_khoa: process.env.ROLE_KHOA_GV, // Add alias for backward compatibility  
    gv: process.env.ROLE_KHOA_GV,
    thuong: process.env.THUONG
  };

  // Set up APP_DEPARTMENTS constants for all templates
  res.locals.APP_DEPARTMENTS = {
    daoTao: process.env.DAO_TAO,
    vanPhong: process.env.VAN_PHONG,
    banGiamDoc: process.env.BAN_GIAM_DOC,
    khaoThi: process.env.KHAO_THI,
    ncHtpt: process.env.VIEN_NCKH_HTPT,
    vienNckhHtpt: process.env.VIEN_NCKH_HTPT, // Add alias for backward compatibility
    cntt: process.env.CONG_NGHE_THONG_TIN,
    attt: process.env.AN_TOAN_THONG_TIN,
    dtvm: process.env.DIEN_TU_VI_MACH,
    coBan: process.env.CO_BAN,
    matMa: process.env.MAT_MA,
    dtph: process.env.PHAN_HIEU_HOC_VIEN
  };

  // Keep the old format for backward compatibility during transition
  res.locals.roles = res.locals.APP_ROLES;
  res.locals.departments = res.locals.APP_DEPARTMENTS;

  next();
};

module.exports = constantsMiddleware;
