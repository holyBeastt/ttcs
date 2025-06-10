const createPoolConnection = require("../config/databasePool");

const updateQuyChuan = async (req, res) => {
  const { updates } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();

    // Bắt đầu transaction
    await connection.beginTransaction();

    // Cập nhật từng bản ghi
    for (const update of updates) {
      const { data, colName, newValue } = update;
      
      // Tạo câu query cập nhật
      const query = `
        UPDATE quychuan 
        SET ${colName} = ? 
        WHERE Khoa = ? 
        AND Dot = ? 
        AND KiHoc = ? 
        AND NamHoc = ? 
        AND LopHocPhan = ?
      `;

      // Thực thi câu query với các tham số
      await connection.query(query, [
        newValue,
        data.Khoa,
        data.Dot,
        data.KiHoc,
        data.NamHoc,
        data.LopHocPhan
      ]);
    }

    // Commit transaction nếu tất cả cập nhật thành công
    await connection.commit();

    res.json({
      success: true,
      message: "Cập nhật dữ liệu thành công!"
    });

  } catch (error) {
    // Rollback nếu có lỗi
    if (connection) {
      await connection.rollback();
    }
    
    console.error("Lỗi khi cập nhật dữ liệu:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật dữ liệu!"
    });
  } finally {
    // Đóng kết nối
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  updateQuyChuan
};
