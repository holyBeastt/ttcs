const pool = require("../config/Pool");

const getSoTietDoAn = async (he_dao_tao) => {
  try {
    const query = "SELECT * FROM sotietdoan where he_dao_tao = ?";
    const [results] = await pool.execute(query, [he_dao_tao]);

    return results;
  } catch (error) {
    console.error("Error fetching GVM lists: ", error);
    return res.status(500).send("Internal server error"); // Trả về chuỗi thông báo lỗi
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getSoTietDoAn,
};
