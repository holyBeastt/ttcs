// getTableDBController.js
require("dotenv").config();
const createPoolConnection = require("../config/databasePool");

const updateTableQC = async (data) => {
  const tableName = process.env.DB_TABLE_NAME; // Tên bảng quy chuẩn
  let connection; // Khai báo biến connection

  try {
    connection = await pool.getConnection(); // Lấy kết nối từ pool

    const updatePromises = data.map(async (item) => {
      const query = `
        UPDATE ${tableName}
        SET 
          GiaoVienGiangDay = ?,  -- Cập nhật GiaoVienGiangDay
          MoiGiang = ?           -- Cập nhật MoiGiang
        WHERE LopHocPhan = ?;    -- Điều kiện tìm kiếm
      `;
      const values = [
        item["giaoVienGiangDay"], // Tên Giảng viên giảng dạy
        item["gvMoi"], // Giá trị mới của trường MoiGiang
        item["lopHocPhan"], // Điều kiện tìm kiếm theo LopHocPhan
      ];
      return connection.query(query, values); // Không cần await ở đây
    });

    await Promise.all(updatePromises); // Thực hiện tất cả truy vấn song song
    return true; // Cập nhật thành công
  } catch (error) {
    console.error("Error:", error);
    return false; // Trả về false nếu có lỗi
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// const updateTableQC = async (data) => {
//   const tableName = process.env.DB_TABLE_NAME; // Tên bảng quy chuẩn
//   const connection = await createConnection(); // Kết nối CSDL

//   try {
//     const updatePromises = data.map(async (item) => {
//       const query = `
//         UPDATE ${tableName}
//         SET
//           GiaoVienGiangDay = ?,  -- Cập nhật GiaoVienGiangDay
//           MoiGiang = ?           -- Cập nhật MoiGiang
//         WHERE LopHocPhan = ?;    -- Điều kiện tìm kiếm
//       `;
//       const values = [
//         item["giaoVienGiangDay"], // Tên Giảng viên giảng dạy
//         item["gvMoi"], // Giá trị mới của trường MoiGiang
//         item["lopHocPhan"], // Điều kiện tìm kiếm theo LopHocPhan
//       ];
//       return await connection.query(query, values);
//     });

//     await Promise.all(updatePromises); // Thực hiện tất cả truy vấn song song
//     return true; // Cập nhật thành công
//   } catch (error) {
//     console.error("Error:", error);
//     return false; // Trả về false nếu có lỗi
//   } finally {
//     await connection.end(); // Đảm bảo đóng kết nối sau khi hoàn tất
//   }
// };

module.exports = {
  updateTableQC,
};
