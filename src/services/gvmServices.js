const createPoolConnection = require("../config/databasePool");
const pool = require("../config/Pool");

const getGvmLists = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const query = "SELECT * FROM `gvmoi`";
    const [results] = await connection.query(query);

    // Gửi danh sách giảng viên dưới dạng mảng
    return results; // Chỉ gửi kết quả mảng
  } catch (error) {
    console.error("Error fetching GVM lists: ", error);
    return res.status(500).send("Internal server error"); // Trả về chuỗi thông báo lỗi
  } finally {
    if (connection) connection.release(); // Đóng kết nối sau khi truy vấn
  }
};

const getHeDaoTaoLists = async (req, res) => {
  try {
    const query = "SELECT * FROM he_dao_tao";
    const [results] = await pool.query(query);

    return res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error fetching He Dao Tao lists:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getHeDaoTaoData = async (req, res) => {
  try {
    const query = "SELECT * FROM he_dao_tao";
    const [results] = await pool.query(query);

    return results;
  } catch (error) {
    console.error("Error fetching He Dao Tao lists:", error);
    throw error; // ❗ Ném lỗi cho controller xử lý
  }
};

const getHeMoiGiangLists = async (req, res) => {
  try {
    const query = "SELECT id, he_dao_tao FROM he_dao_tao where loai_hinh = 'mời giảng'";
    const [results] = await pool.query(query);
    return res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error fetching He Moi Giang lists:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getHeMoiGiangData = async () => {
  try {
    const query = "SELECT id, he_dao_tao FROM he_dao_tao where loai_hinh = 'mời giảng'";
    const [results] = await pool.query(query);

    return results;
  } catch (error) {
    console.error("Error fetching He Moi Giang lists:", error);
    throw error; // ❗ Ném lỗi cho controller xử lý
  }
};

const getHeDoAnLists = async (req, res) => {
  try {
    const query = "SELECT id, he_dao_tao FROM he_dao_tao where loai_hinh = 'đồ án'";
    const [results] = await pool.query(query);
    return res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error fetching He Do An lists:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

// Lấy hạng chức danh nghề nghiệp
const getChucDanhNgheNghiep = async (req, res) => {
  try {
    const query = "SELECT id, chuc_danh FROM chuc_danh_nghe_nghiep where is_hide = 0";
    const [results] = await pool.query(query);
    return res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error fetching Chuc Danh Nghe Nghiep:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getChucDanhNgheNghiepForAdmin = async (req, res) => {
  try {
    const query = "SELECT id, chuc_danh FROM chuc_danh_nghe_nghiep";
    const [results] = await pool.query(query);
    return res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error("Error fetching Chuc Danh Nghe Nghiep:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const { CTE_DO_AN, CTE_DAI_HOC, CTE_SAU_DAI_HOC, CTE_TABLE_ALL } = require('../queries/hopdongQueries');

const buildDynamicQuery = ({ namHoc, dot, ki, he_dao_tao, khoa }) => {
  let params = [namHoc, namHoc, namHoc]; // 3 tham số cho 3 CTE đầu (DoAn, DaiHoc, SauDaiHoc)

  // Xây dựng CTE lọc giảng viên liên quan
  let gvLienQuanCondition = `WHERE tableALL.MaKhoaMonHoc LIKE ?`;
  params.push(khoa);

  if (ki !== "AllKi") {
    gvLienQuanCondition += " AND dot = ? AND KiHoc = ?";
    params.push(dot, ki);
  }

  const CTE_GV_LIEN_QUAN = `
    gv_lien_quan AS (
      SELECT DISTINCT GiangVien FROM tableALL ${gvLienQuanCondition}
    )
  `;

  // Câu SELECT chính
  let mainSelect = `
    SELECT 
        MIN(ta.Dot) AS Dot,
        MIN(ta.KiHoc) AS KiHoc,
        ta.NamHoc,
        ta.id_Gvm,
        ta.GiangVien,
        MIN(ta.he_dao_tao) as he_dao_tao,
        MIN(ta.NgayBatDau) AS NgayBatDau,
        MAX(ta.NgayKetThuc) AS NgayKetThuc,
        SUM(ta.SoTiet) AS TongTiet,
        ta.GioiTinh,
        ta.NgaySinh,
        ta.CCCD,
        ta.NoiCapCCCD,
        ta.Email,
        ta.MaSoThue,
        ta.HocVi,
        ta.ChucVu,
        ta.HSL,
        ta.DienThoai,
        ta.STK,
        ta.NganHang,
        ta.MaPhongBan,
        MIN(ta.MaKhoaMonHoc) AS MaKhoaMonHoc,
        ta.NgayCapCCCD,
        ta.DiaChi,
        ta.BangTotNghiep, 
        ta.NoiCongTac,
        ta.BangTotNghiepLoai,
        ta.MonGiangDayChinh,
        ta.isQuanDoi,
        ta.isNghiHuu,
        MIN(ta.DaoTaoDuyet) as DaoTaoDuyet,
        MIN(ta.TaiChinhDuyet) as TaiChinhDuyet,
        MAX(TienMoiGiang) AS TienMoiGiang,
        SUM(ThanhTien) AS ThanhTien,
        SUM(Thue) AS Thue,
        SUM(ThucNhan) AS ThucNhan,
        tsgv.TongSoTiet
    FROM tableALL ta
    LEFT JOIN TongSoTietGV tsgv ON ta.GiangVien = tsgv.GiangVien
  `;

  // Logic JOIN bảng lọc Khoa
  if (khoa !== "ALL") {
    mainSelect += " JOIN gv_lien_quan ON gv_lien_quan.GiangVien = ta.GiangVien ";
  }

  // Logic WHERE cuối cùng
  let whereClauses = ["ta.NamHoc = ?"];
  params.push(namHoc);

  if (ki !== "AllKi") {
    whereClauses.push("ta.Dot = ?", "ta.KiHoc = ?");
    params.push(dot, ki);
  }

  if (he_dao_tao !== "0") {
    whereClauses.push("ta.he_dao_tao = ?");
    params.push(he_dao_tao);
  }

  // Ghép toàn bộ chuỗi Query
  const finalQuery = `
    WITH 
      ${CTE_DO_AN},
      ${CTE_DAI_HOC},
      ${CTE_SAU_DAI_HOC},
      ${CTE_TABLE_ALL},
      ${CTE_GV_LIEN_QUAN}
    ${mainSelect}
    WHERE ${whereClauses.join(' AND ')}
    GROUP BY 
        ta.NamHoc, ta.id_Gvm, ta.GiangVien, ta.GioiTinh, ta.NgaySinh, ta.CCCD,
        ta.NoiCapCCCD, ta.Email, ta.MaSoThue, ta.HocVi, ta.ChucVu, ta.HSL,
        ta.DienThoai, ta.STK, ta.NganHang, ta.MaPhongBan, ta.NgayCapCCCD,
        ta.DiaChi, ta.BangTotNghiep, ta.NoiCongTac, ta.BangTotNghiepLoai,
        ta.isQuanDoi, ta.isNghiHuu, ta.MonGiangDayChinh, tsgv.TongSoTiet
    ORDER BY tsgv.TongSoTiet DESC;
  `;

  return { finalQuery, params };
}

// Xuất các hàm để sử dụng trong router
module.exports = {
  getGvmLists,
  getHeDaoTaoLists,
  getHeMoiGiangLists,
  getHeDoAnLists,
  getChucDanhNgheNghiep,
  buildDynamicQuery,
  getHeMoiGiangData,
  getChucDanhNgheNghiepForAdmin,
  getHeDaoTaoData
};
