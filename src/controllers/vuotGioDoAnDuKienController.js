const express = require("express");
const pool = require("../config/Pool");
const createPoolConnection = require("../config/databasePool");
require("dotenv").config();

const getDoAnDuKienData = async (req, res) => {
  let connection;
  const { Khoa, Dot, Nam } = req.body; // Trích xuất các thuộc tính từ body

  try {
    connection = await createPoolConnection();

    let query, values;
    if (Khoa == "ALL") {
      query = `select TT, SinhVien, MaSV, TenDeTai, GiangVienDefault, GiangVien1, GiangVien2 from doantotnghiep where Dot = ? AND NamHoc = ? AND DaBanHanh = 0`;
      values = [Dot, Nam];
    } else {
      query = `select TT, SinhVien, MaSV, TenDeTai, GiangVienDefault, GiangVien1, GiangVien2 from doantotnghiep where MaPhongBan = ? AND Dot = ? AND NamHoc = ? AND DaBanHanh = 0`;
      values = [Khoa, Dot, Nam];
    }

    const [result] = await connection.query(query, values);

    res.json(result);
  } catch (error) {
    console.error(error); // In ra lỗi nếu có
    res.status(500).send("Có lỗi xảy ra khi truy vấn dữ liệu");
  } finally {
    if (connection) connection.release();
  }
};

const getVuotGioDoAnDuKienSite = (req, res) => {
  res.render("vuotGioDoAnDuKien.ejs");
};

const xoaDoAnDuKien = async (req, res) => {
  let connection;
  const { Khoa, Dot, Nam } = req.body;
  console.log("gà");
  let query, values;
  if (Khoa == "ALL") {
    query = `DELETE FROM doantotnghiep WHERE Dot = ? AND NamHoc = ? AND DaBanHanh = 0`;
    values = [Dot, Nam];
  } else {
    query = `DELETE FROM doantotnghiep WHERE MaPhongBan = ? AND Dot = ? AND NamHoc = ? AND DaBanHanh = 0`;
    values = [Khoa, Dot, Nam];
  }

  try {
    connection = await createPoolConnection();
    const [result] = await connection.query(query, values);

    // Kiểm tra số bản ghi bị xóa
    if (result.affectedRows > 0) {
      res.status(200).json({
        message: "Xóa dữ liệu thành công",
        deletedRows: result.affectedRows,
      });
    } else {
      console.error("Không có dữ liệu nào thỏa mãn để xóa");
      res.status(404).json({
        message: "Không có dữ liệu nào thỏa mãn để xóa",
      });
    }
  } catch (error) {
    console.error("Lỗi khi xóa dữ liệu:", error);
    res.status(500).json({
      message: "Có lỗi xảy ra khi xóa dữ liệu",
      error: error.message,
    });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// Ban hành đồ án
const banHanhDoAn = async (req, res) => {
  let connection;
  const { Khoa, Dot, Nam } = req.body;
  let query, values;
  if (Khoa == "ALL") {
    query =
      "update doantotnghiep set DaBanHanh = 1 where Dot = ? AND NamHoc = ? AND DaBanHanh = 0";
    values = [Dot, Nam];
  } else {
    query =
      "update doantotnghiep set DaBanHanh = 1 where MaPhongBan = ? AND Dot = ? AND NamHoc = ? AND DaBanHanh = 0";
    values = [Khoa, Dot, Nam];
  }

  try {
    connection = await createPoolConnection();
    const [result] = await connection.query(query, values);

    // Kiểm tra số bản ghi bị xóa
    if (result.affectedRows > 0) {
      res.status(200).json({
        success: true,
        message: "Ban hành dữ liệu thành công",
        deletedRows: result.affectedRows,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Không có dữ liệu để banh hành",
      });
    }
  } catch (error) {
    console.error("Lỗi khi xóa dữ liệu:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi xóa dữ liệu",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getVuotGioDoAnDuKienSite,
  getDoAnDuKienData,
  xoaDoAnDuKien,
  banHanhDoAn,
};
