const createPoolConnection = require("../../config/databasePool");
const LogService = require("../logService");

const nckhChungRepo = require("../../repositories/nckh_v3/nckhChung.repo");
const { validateApprovalValue } = require("../../validators/nckh_v3/approval.validator");

const updateKhoaApproval = async (id, value, userContext) => {
  const khoaDuyet = validateApprovalValue(value, "khoaDuyet");

  let connection;
  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    const current = await nckhChungRepo.findById(connection, Number(id));
    if (!current) throw new Error("Khong tim thay cong trinh");

    if (khoaDuyet === 0) {
      await nckhChungRepo.setKhoaApproval(connection, Number(id), 0, 0);
    } else {
      await nckhChungRepo.setKhoaApproval(connection, Number(id), 1);
    }

    await connection.commit();

    try {
      await LogService.logChange(
        userContext.userId,
        userContext.userName,
        "NCKH V3",
        `${khoaDuyet === 1 ? "Duyet" : "Bo duyet"} khoa de tai ID ${id}`
      );
    } catch (err) {
      console.error("[NCKH V3] Log failed:", err.message);
    }

    return { id: Number(id), khoaDuyet };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

const updateVienApproval = async (id, value, userContext) => {
  const vienNcDuyet = validateApprovalValue(value, "vienNcDuyet");

  let connection;
  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    const current = await nckhChungRepo.findById(connection, Number(id));
    if (!current) throw new Error("Khong tim thay cong trinh");

    if (vienNcDuyet === 1 && Number(current.khoa_duyet) !== 1) {
      throw new Error("Khong the duyet vien khi khoa chua duyet");
    }

    if (vienNcDuyet === 0) {
      // Rule da chot: vien ve 0 thi khoa ve 0
      await nckhChungRepo.setVienApproval(connection, Number(id), 0, 0);
    } else {
      await nckhChungRepo.setVienApproval(connection, Number(id), 1);
    }

    await connection.commit();

    try {
      await LogService.logChange(
        userContext.userId,
        userContext.userName,
        "NCKH V3",
        `${vienNcDuyet === 1 ? "Duyet" : "Bo duyet"} vien de tai ID ${id}`
      );
    } catch (err) {
      console.error("[NCKH V3] Log failed:", err.message);
    }

    return { id: Number(id), vienNcDuyet };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  updateKhoaApproval,
  updateVienApproval,
};
