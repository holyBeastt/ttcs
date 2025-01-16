const express = require("express");
const multer = require("multer");
const router = express.Router();
const createConnection = require("../config/databaseAsync");
const createPoolConnection = require("../config/databasePool");

const getImportTKBSite = async (req, res) => {
  res.render("importTKB.ejs");
};

const getTKBChinhThucSite = async (req, res) => {
  res.render("TKBChinhThuc.ejs");
};

// render bảng
const getDataTKBChinhThuc = async (req, res) => {
  const { Khoa, Dot, Ki, Nam } = req.body;

  const semester = `${Dot}, ${Ki}, ${Nam}`;

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    let query;
    const queryParams = [];

    // Xây dựng truy vấn dựa vào giá trị của Khoa
    if (Khoa !== "ALL") {
      query = `SELECT id, course_name, course_id, major, lecturer, start_date, end_date, student_quantity, student_bonus, bonus_time, bonus_teacher, bonus_total, semester FROM course_schedule_details WHERE major = ? AND semester = ?`;
      queryParams.push(Khoa, semester);
    } else {
      query = `SELECT * FROM course_schedule_details WHERE semester = ?`;
      queryParams.push(semester);
    }

    // Thực hiện truy vấn
    const [results] = await connection.execute(query, queryParams);

    // Trả về kết quả dưới dạng JSON
    res.json(results); // results chứa dữ liệu trả về
  } catch (error) {
    console.error("Lỗi trong hàm getTableTam:", error);
    res
      .status(500)
      .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release(); // Trả lại kết nối cho pool
  }
};

// hàm sửa 1 dòng
const updateRowTKB = async (req, res) => {
  const ID = req.params.id;
  const data = req.body; // Dữ liệu của dòng cần cập nhật

  let connection; // Khai báo biến kết nối

  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    // Kiểm tra dữ liệu đầu vào
    if (!data || typeof data !== "object" || !ID) {
      return res
        .status(400)
        .json({ message: "Dữ liệu không hợp lệ hoặc thiếu ID." });
    }

    // Chuẩn bị giá trị cho truy vấn UPDATE
    const updateValues = [
      data.course_name,
      data.credit_hours,
      data.ll_code,
      data.ll_total,
      data.classroom || null,
      data.course_code || null,
      data.major || null,
      data.study_format || null,
      data.lecturer || null,
      data.periods_per_week || null,
      data.period_start || null,
      data.period_end || null,
      data.day_of_week || null,
      data.start_date || null,
      data.end_date || null,
      data.student_quantity || null,
      data.student_bonus || null,
      data.bonus_time || null,
      data.bonus_teacher || null,
      data.bonus_total || null,
      data.qc || null,
      data.class_section || null,
      data.course_id || null,
      data.semester || null,
      ID, // Điều kiện WHERE sử dụng ID
    ];

    const updateQuery = `
    UPDATE course_schedule_details
    SET 
        course_name = ?, 
        credit_hours = ?, 
        ll_code = ?, 
        ll_total = ?, 
        classroom = ?, 
        course_code = ?, 
        major = ?, 
        study_format = ?, 
        lecturer = ?, 
        periods_per_week = ?, 
        period_start = ?, 
        period_end = ?, 
        day_of_week = ?, 
        start_date = ?, 
        end_date = ?, 
        student_quantity = ?, 
        student_bonus = ?, 
        bonus_time = ?, 
        bonus_teacher = ?, 
        bonus_total = ?, 
        qc = ?, 
        class_section = ?, 
        course_id = ?, 
        semester = ?
    WHERE ID = ?;
  `;

    // Thực thi truy vấn
    await connection.query(updateQuery, updateValues);

    // Trả về phản hồi thành công
    return res.json({ message: "Dòng dữ liệu đã được cập nhật thành công." });
  } catch (error) {
    console.error("Lỗi khi cập nhật dòng dữ liệu:", error);
    return res
      .status(500)
      .json({ message: "Đã xảy ra lỗi khi cập nhật dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getImportTKBSite,
  getTKBChinhThucSite,
  getDataTKBChinhThuc,
  updateRowTKB,
};
