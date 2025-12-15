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
    const query = "SELECT id, he_dao_tao FROM he_dao_tao";
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


// Xuất các hàm để sử dụng trong router
module.exports = {
  getGvmLists,
  getHeDaoTaoLists,
  getHeMoiGiangLists,
  getHeDoAnLists
};
