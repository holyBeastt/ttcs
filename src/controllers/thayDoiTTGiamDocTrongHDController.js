const express = require("express");
const createPoolConnection = require("../config/databasePool");

const getViewThayDoiTTGiamDoc = async (req, res) => {
  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Lấy dữ liệu
    const query = "SELECT * FROM `ttgiamdoctronghopdong`";
    const [results] = await connection.query(query);

    let user = results && results.length > 0 ? results[0] : {};
    console.log("result = ", user);
    // Render trang viewGvm.ejs với dữ liệu người dùng
    res.render("thayDoiTTGiamDocTrongHD.ejs", {
      value: user,
    });
  } catch (err) {
    console.error(err);
    // Xử lý lỗi, có thể trả về phản hồi lỗi cho client
    res.status(500).send("Lỗi khi lấy dữ liệu");
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const postUpdateTTGiamDoc = async (req, res) => {
  const { HoTen, ChucVu, DiaChi, DienThoai, STK, NganHang } = req.body;
  console.log("Dữ liệu nhận được từ form:", req.body); // Kiểm tra dữ liệu

  const connection = await createPoolConnection();

  // Truy vấn để update dữ liệu vào cơ sở dữ liệu
  const query = `UPDATE ttgiamdoctronghopdong SET 
      HoTen = ?,
      DiaChi = ?,
      DienThoai = ?,
      ChucVu = ?,
      STK = ?,
      NganHang = ?`;

  try {
    await connection.query(query, [
      HoTen,
      DiaChi,
      DienThoai,
      ChucVu,
      STK,
      NganHang,
    ]);

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (err) {
    console.error("Error executing query: ", err);
    res.status(200).json({ message: "Cập nhật thất bại" });
  } finally {
    connection.release(); // Giải phóng kết nối
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  postUpdateTTGiamDoc,
  getViewThayDoiTTGiamDoc,
};
