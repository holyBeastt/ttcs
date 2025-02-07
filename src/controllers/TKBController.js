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
      query = `SELECT 
              id, 
              course_id, 
              course_name, 
              major, 
              lecturer, 
              DATE_FORMAT(start_date, '%d-%m-%Y') AS start_date, 
              DATE_FORMAT(end_date, '%d-%m-%Y') AS end_date, 
              ll_code, 
              ll_total, 
              student_quantity, 
              student_bonus, 
              bonus_time, 
              bonus_total, 
              semester 
          FROM course_schedule_details 
          WHERE major = ? AND semester = ?;
`;
      queryParams.push(Khoa, semester);
    } else {
      query = `SELECT 
              id, 
              course_id, 
              course_name, 
              major, 
              lecturer, 
              DATE_FORMAT(start_date, '%d-%m-%Y') AS start_date, 
              DATE_FORMAT(end_date, '%d-%m-%Y') AS end_date, 
              ll_code, 
              ll_total, 
              student_quantity, 
              student_bonus, 
              bonus_time, 
              bonus_total, 
              semester 
          FROM course_schedule_details 
          WHERE semester = ?;
`;
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
      convertDateFormat(data.start_date) || null,
      convertDateFormat(data.end_date) || null,
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

function convertDateFormat(dateStr) {
  const parts = dateStr.split("-");
  return `${parts[2]}-${parts[1]}-${parts[0]}`; // Chuyển từ DD-MM-YYYY sang YYYY-MM-DD
}

// hàm xóa 1 dòng
const deleteRow = async (req, res) => {
  const { id } = req.params; // Lấy ID từ URL

  console.log(`Xóa ${id} trong bảng TKB:`);

  let connection;

  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    // Kiểm tra xem ID có hợp lệ không
    if (!id) {
      return res.status(400).json({ message: "ID không hợp lệ." });
    }

    // Chuẩn bị truy vấn DELETE
    const deleteQuery = `DELETE FROM course_schedule_details WHERE id = ?`;

    // Thực thi truy vấn
    await connection.query(deleteQuery, [id]);

    // Trả về phản hồi thành công
    return res.json({ message: "Dòng dữ liệu đã được xóa thành công." });
  } catch (error) {
    console.error("Lỗi khi xóa dòng dữ liệu:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xóa dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const updateStudentQuantity = async (req, res) => {
  const jsonData = req.body;

  let connection;

  try {
    // Kiểm tra dữ liệu đầu vào
    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
    }

    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    // Giới hạn số lượng bản ghi mỗi batch (tránh quá tải)
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < jsonData.length; i += batchSize) {
      batches.push(jsonData.slice(i, i + batchSize));
    }

    // Xử lý từng batch
    for (const batch of batches) {
      let updateQuery = `
        UPDATE course_schedule_details
        SET student_quantity = CASE
      `;
      const updateValues = [];
      const ids = [];

      batch.forEach(({ id, student_quantity }) => {
        // Kiểm tra và chuẩn hóa dữ liệu
        if (typeof student_quantity !== "number" || isNaN(student_quantity)) {
          return res
            .status(400)
            .json({ message: `Số lượng sinh viên không hợp lệ cho id ${id}` });
        }

        // Thêm logic cập nhật cho student_quantity
        updateQuery += ` WHEN id = ? THEN ? `;
        updateValues.push(id, student_quantity);

        // Lưu các id để đưa vào WHERE
        if (!ids.includes(id)) ids.push(id);
      });

      // Hoàn thiện truy vấn
      updateQuery += ` END WHERE id IN (${ids.map(() => "?").join(", ")})`;
      updateValues.push(...ids);

      // Thực hiện truy vấn cập nhật
      await connection.query(updateQuery, updateValues);
    }

    res.status(200).json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

const themTKBVaoQCDK = async (req, res) => {
  const jsonData = req.body;

  let connection;

  try {
    // Kiểm tra dữ liệu đầu vào
    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
    }

    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    // Giới hạn số lượng bản ghi mỗi batch (tránh quá tải)
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < jsonData.length; i += batchSize) {
      batches.push(jsonData.slice(i, i + batchSize));
    }

    // Xử lý từng batch
    for (const batch of batches) {
      let updateQuery = `
        UPDATE course_schedule_details
        SET student_quantity = CASE
      `;
      const updateValues = [];
      const ids = [];

      batch.forEach(({ id, student_quantity }) => {
        // Kiểm tra và chuẩn hóa dữ liệu
        if (typeof student_quantity !== "number" || isNaN(student_quantity)) {
          return res
            .status(400)
            .json({ message: `Số lượng sinh viên không hợp lệ cho id ${id}` });
        }

        // Thêm logic cập nhật cho student_quantity
        updateQuery += ` WHEN id = ? THEN ? `;
        updateValues.push(id, student_quantity);

        // Lưu các id để đưa vào WHERE
        if (!ids.includes(id)) ids.push(id);
      });

      // Hoàn thiện truy vấn
      updateQuery += ` END WHERE id IN (${ids.map(() => "?").join(", ")})`;
      updateValues.push(...ids);

      // Thực hiện truy vấn cập nhật
      await connection.query(updateQuery, updateValues);
    }

    res.status(200).json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getImportTKBSite,
  getTKBChinhThucSite,
  getDataTKBChinhThuc,
  updateRowTKB,
  deleteRow,
  updateStudentQuantity,
  themTKBVaoQCDK,
};
