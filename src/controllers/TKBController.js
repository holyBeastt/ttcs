const express = require("express");
const multer = require("multer");
const router = express.Router();
const createConnection = require("../config/databaseAsync");
const createPoolConnection = require("../config/databasePool");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

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
              start_date, 
              end_date, 
              ll_code, 
              ll_total, 
              student_quantity, 
              student_bonus, 
              bonus_time, 
              qc, 
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
              start_date, 
              end_date, 
              ll_code, 
              ll_total, 
              student_quantity, 
              student_bonus, 
              bonus_time, 
              qc, 
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
// const updateRowTKB = async (req, res) => {
//   const ID = req.params.id;
//   const data = req.body; // Dữ liệu của dòng cần cập nhật

//   let connection; // Khai báo biến kết nối

//   try {
//     connection = await createPoolConnection(); // Lấy kết nối từ pool

//     // Kiểm tra dữ liệu đầu vào
//     if (!data || typeof data !== "object" || !ID) {
//       return res
//         .status(400)
//         .json({ message: "Dữ liệu không hợp lệ hoặc thiếu ID." });
//     }

//     let student_bonus = 1;

//     switch (true) {
//       case data.student_quantity >= 101:
//         student_bonus = 1.5;
//         break;
//       case data.student_quantity >= 81:
//         student_bonus = 1.4;
//         break;
//       case data.student_quantity >= 66:
//         student_bonus = 1.3;
//         break;
//       case data.student_quantity >= 51:
//         student_bonus = 1.2;
//         break;
//       case data.student_quantity >= 41:
//         student_bonus = 1.1;
//         break;
//     }

//     const qc = student_bonus * data.bonus_time * data.ll_total;

//     // Chuẩn bị giá trị cho truy vấn UPDATE
//     const updateValues = [
//       data.course_name,
//       data.credit_hours,
//       data.ll_code,
//       data.ll_total,
//       data.classroom || null,
//       data.course_code || null,
//       data.major || null,
//       data.study_format || null,
//       data.lecturer || null,
//       data.periods_per_week || null,
//       data.period_start || null,
//       data.period_end || null,
//       data.day_of_week || null,
//       convertDateFormat(data.start_date) || null,
//       convertDateFormat(data.end_date) || null,
//       data.student_quantity || null,
//       data.student_bonus || null,
//       data.bonus_time || null,
//       data.bonus_teacher || null,
//       data.bonus_total || null,
//       qc || null,
//       data.class_section || null,
//       data.course_id || null,
//       data.semester || null,
//       ID, // Điều kiện WHERE sử dụng ID
//     ];

//     const updateQuery = `
//     UPDATE course_schedule_details
//     SET
//         course_name = ?,
//         credit_hours = ?,
//         ll_code = ?,
//         ll_total = ?,
//         classroom = ?,
//         course_code = ?,
//         major = ?,
//         study_format = ?,
//         lecturer = ?,
//         periods_per_week = ?,
//         period_start = ?,
//         period_end = ?,
//         day_of_week = ?,
//         start_date = ?,
//         end_date = ?,
//         student_quantity = ?,
//         student_bonus = ?,
//         bonus_time = ?,
//         bonus_teacher = ?,
//         bonus_total = ?,
//         qc = ?,
//         class_section = ?,
//         course_id = ?,
//         semester = ?
//     WHERE ID = ?;
//   `;

//     // Thực thi truy vấn
//     await connection.query(updateQuery, updateValues);

//     // Trả về phản hồi thành công
//     return res.json({ message: "Dòng dữ liệu đã được cập nhật thành công." });
//   } catch (error) {
//     console.error("Lỗi khi cập nhật dòng dữ liệu:", error);
//     return res
//       .status(500)
//       .json({ message: "Đã xảy ra lỗi khi cập nhật dữ liệu." });
//   } finally {
//     if (connection) connection.release(); // Giải phóng kết nối
//   }
// };

const updateRowTKB = async (req, res) => {
  let { id, field, value, data } = req.body;
  let connection;

  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    if (field === "student_quantity") {
      let student_bonus = 1;

      switch (true) {
        case data.student_quantity >= 101:
          student_bonus = 1.5;
          break;
        case data.student_quantity >= 81:
          student_bonus = 1.4;
          break;
        case data.student_quantity >= 66:
          student_bonus = 1.3;
          break;
        case data.student_quantity >= 51:
          student_bonus = 1.2;
          break;
        case data.student_quantity >= 41:
          student_bonus = 1.1;
          break;
      }

      const qc = student_bonus * data.bonus_time * data.ll_total;

      const updateQuery = `
        UPDATE course_schedule_details 
        SET student_quantity = ?, student_bonus = ?, qc = ? 
        WHERE id = ?`;
      const updateValues = [value, student_bonus, qc, id];

      await connection.query(updateQuery, updateValues);
    } else if (field === "bonus_time") {
      const qc = data.student_bonus * value * data.ll_total;

      const updateQuery = `
        UPDATE course_schedule_details 
        SET bonus_time = ?, qc = ? 
        WHERE id = ?`;
      const updateValues = [value, qc, id];

      await connection.query(updateQuery, updateValues);
    } else if (field === "ll_total") {
      const qc = data.student_bonus * data.bonus_time * value;

      const updateQuery = `
        UPDATE course_schedule_details 
        SET ll_total = ?, qc = ? 
        WHERE id = ?`;
      const updateValues = [value, qc, id];

      await connection.query(updateQuery, updateValues);
    } else {
      if (field === "start_date" || field === "end_date") {
        value = formatDateForDB(value);
      }

      const updateQuery = `UPDATE course_schedule_details SET ${field} = ? WHERE id = ?`;
      const updateValues = [value, id];
      console.log(updateValues);

      await connection.query(updateQuery, updateValues);
    }

    // 🛠 Lấy lại dữ liệu sau khi cập nhật
    const [updatedRow] = await connection.query(
      "SELECT * FROM course_schedule_details WHERE id = ?",
      [id]
    );

    return res.json(updatedRow[0]); // ✅ Trả về toàn bộ dòng mới cập nhật
  } catch (error) {
    console.error("Lỗi khi cập nhật dòng dữ liệu:", error);
    return res
      .status(500)
      .json({ message: "Đã xảy ra lỗi khi cập nhật dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

function formatDateForDB(dateStr) {
  if (!dateStr) return null; // Trả về null nếu không có giá trị

  const parts = dateStr.split("/"); // Tách ngày, tháng, năm

  if (parts.length === 3) {
    const day = parts[0].padStart(2, "0"); // Lấy ngày
    const month = parts[1].padStart(2, "0"); // Lấy tháng
    const year = parts[2]; // Lấy năm

    return `${year}-${month}-${day}`; // Trả về định dạng yyyy-mm-dd
  }

  return null; // Trả về null nếu sai định dạng
}

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

// const updateStudentQuantity = async (req, res) => {
//   const jsonData = req.body;

//   let connection;

//   try {
//     if (!jsonData || jsonData.length === 0) {
//       return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
//     }

//     connection = await createPoolConnection();

//     const batchSize = 50; // Tùy chỉnh batch size
//     const errors = [];

//     for (let i = 0; i < jsonData.length; i += batchSize) {
//       const batch = jsonData.slice(i, i + batchSize);

//       let updateQuery = `UPDATE course_schedule_details SET `;
//       const updateValues = [];
//       const ids = [];

//       // Cập nhật student_quantity
//       let studentQuantityCase = ` student_quantity = CASE`;
//       batch.forEach(({ id, student_quantity }) => {
//         id = Number(id);
//         student_quantity = Number(student_quantity);
//         if (isNaN(id) || isNaN(student_quantity)) {
//           errors.push(`Dữ liệu không hợp lệ cho id ${id}`);
//           return;
//         }

//         studentQuantityCase += ` WHEN id = ? THEN ?`;
//         updateValues.push(id, student_quantity);

//         if (!ids.includes(id)) ids.push(id);
//       });
//       studentQuantityCase += ` END,`;

//       // Cập nhật student_bonus
//       let studentBonusCase = ` student_bonus = CASE`;
//       batch.forEach(({ id, student_quantity }) => {
//         id = Number(id);
//         student_quantity = Number(student_quantity);
//         if (isNaN(id) || isNaN(student_quantity)) return;

//         let student_bonus = 1;
//         if (student_quantity >= 101) student_bonus = 1.5;
//         else if (student_quantity >= 81) student_bonus = 1.4;
//         else if (student_quantity >= 66) student_bonus = 1.3;
//         else if (student_quantity >= 51) student_bonus = 1.2;
//         else if (student_quantity >= 41) student_bonus = 1.1;

//         studentBonusCase += ` WHEN id = ? THEN ?`;
//         updateValues.push(id, student_bonus);
//       });
//       studentBonusCase += ` END,`;

//       // Cập nhật qc
//       let qcCase = ` qc = CASE`;
//       batch.forEach(({ id, student_quantity, ll_total, bonus_time }) => {
//         id = Number(id);
//         student_quantity = Number(student_quantity);
//         if (isNaN(id) || isNaN(student_quantity)) return;

//         let student_bonus = 1;
//         if (student_quantity >= 101) student_bonus = 1.5;
//         else if (student_quantity >= 81) student_bonus = 1.4;
//         else if (student_quantity >= 66) student_bonus = 1.3;
//         else if (student_quantity >= 51) student_bonus = 1.2;
//         else if (student_quantity >= 41) student_bonus = 1.1;

//         const qc =
//           student_bonus * (Number(bonus_time) || 0) * (Number(ll_total) || 0);

//         qcCase += ` WHEN id = ? THEN ?`;
//         updateValues.push(id, qc);
//       });
//       qcCase += ` END`;

//       // Hoàn thiện query
//       const whereClause = ` WHERE id IN (${ids.map(() => "?").join(", ")})`;
//       updateValues.push(...ids);

//       const finalQuery = `${updateQuery} ${studentQuantityCase} ${studentBonusCase} ${qcCase} ${whereClause}`;

//       console.log("📌 Query:", finalQuery);
//       console.log("📌 Values:", updateValues);

//       await connection.query(finalQuery, updateValues);
//     }

//     if (errors.length > 0) {
//       return res.status(400).json({ success: false, errors });
//     }

//     res.status(200).json({ success: true, message: "Cập nhật thành công" });
//   } catch (error) {
//     console.error("❌ Lỗi cập nhật:", error);
//     res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
//   } finally {
//     if (connection) connection.release();
//   }
// };

const updateStudentQuantity = async (req, res) => {
  const jsonData = req.body;

  let connection;

  try {
    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
    }

    connection = await createPoolConnection();

    const batchSize = 50; // Tùy chỉnh batch size
    const errors = [];

    for (let i = 0; i < jsonData.length; i += batchSize) {
      const batch = jsonData.slice(i, i + batchSize);

      let updateQuery = `UPDATE course_schedule_details SET `;
      const updateValues = [];
      const ids = [];

      // Map để lưu student_bonus của từng ID
      const studentBonusMap = new Map();

      // Cập nhật student_quantity
      let studentQuantityCase = ` student_quantity = CASE`;
      batch.forEach(({ id, student_quantity }) => {
        id = Number(id);
        student_quantity = Number(student_quantity);
        if (isNaN(id) || isNaN(student_quantity)) {
          errors.push(`Dữ liệu không hợp lệ cho id ${id}`);
          return;
        }

        studentQuantityCase += ` WHEN id = ? THEN ?`;
        updateValues.push(id, student_quantity);

        if (!ids.includes(id)) ids.push(id);
      });
      studentQuantityCase += ` END,`;

      // Cập nhật student_bonus
      let studentBonusCase = ` student_bonus = CASE`;
      batch.forEach(({ id, student_quantity }) => {
        id = Number(id);
        student_quantity = Number(student_quantity);
        if (isNaN(id) || isNaN(student_quantity)) return;

        let student_bonus = 1;
        if (student_quantity >= 101) student_bonus = 1.5;
        else if (student_quantity >= 81) student_bonus = 1.4;
        else if (student_quantity >= 66) student_bonus = 1.3;
        else if (student_quantity >= 51) student_bonus = 1.2;
        else if (student_quantity >= 41) student_bonus = 1.1;

        studentBonusCase += ` WHEN id = ? THEN ?`;
        updateValues.push(id, student_bonus);

        // Lưu vào Map
        studentBonusMap.set(id, student_bonus);
      });
      studentBonusCase += ` END,`;

      // Cập nhật qc (Lấy student_bonus từ Map)
      let qcCase = ` qc = CASE`;
      batch.forEach(({ id, student_quantity, ll_total, bonus_time }) => {
        id = Number(id);
        student_quantity = Number(student_quantity);
        if (isNaN(id) || isNaN(student_quantity)) return;

        const student_bonus = studentBonusMap.get(id) || 1;
        const qc =
          student_bonus * (Number(bonus_time) || 0) * (Number(ll_total) || 0);

        qcCase += ` WHEN id = ? THEN ?`;
        console.log(qc);
        updateValues.push(id, qc);
      });
      qcCase += ` END`;

      // Hoàn thiện query
      const whereClause = ` WHERE id IN (${ids.map(() => "?").join(", ")})`;
      updateValues.push(...ids);

      const finalQuery = `${updateQuery} ${studentQuantityCase} ${studentBonusCase} ${qcCase} ${whereClause}`;

      await connection.query(finalQuery, updateValues);
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    res.status(200).json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("❌ Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    if (connection) connection.release();
  }
};

const themTKBVaoQCDK = async (req, res) => {
  const { Khoa, Dot, Ki, Nam } = req.body;
  const semester = `${Dot}, ${Ki}, ${Nam}`;

  let connection;

  try {
    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    // Lấy dữ liệu bên bảng course_schedule_details
    let getDataTKBQuery = `
    SELECT 
      major AS Khoa,
      ll_code AS SoTietCTDT,
      ll_total AS LL,
      student_quantity AS SoSinhVien,
      student_bonus AS HeSoLopDong,
      bonus_time AS HeSoT7CN,
      course_id AS MaBoMon,
      lecturer AS GiaoVien,
      credit_hours AS SoTinChi,
      course_name AS LopHocPhan,
      course_code AS MaHocPhan,
      start_date AS NgayBatDau,
      end_date AS NgayKetThuc,
      bonus_total AS QuyChuan
    FROM course_schedule_details
    WHERE semester = ?
  `;

    const getDataTKBParams = [semester];

    if (Khoa !== "ALL") {
      getDataTKBQuery += " AND major = ?";
      getDataTKBParams.push(Khoa);
    }

    const [tkbData] = await connection.query(getDataTKBQuery, getDataTKBParams);

    // Nếu không có dữ liệu thì không cần insert
    if (tkbData.length === 0) {
      console.log("Không có dữ liệu để insert.");
      return;
    }

    // Thêm dữ liệu vào bảng tạm
    // Câu lệnh INSERT
    const insertQuery = `
      INSERT INTO tam (Khoa, dot, ki, nam, SoTietCTDT, LL, SoSinhVien, HeSoLopDong, HeSoT7CN, MaBoMon, 
      GiaoVien, SoTinChi, LopHocPhan, MaHocPhan, NgayBatDau, NgayKetThuc, quychuan) 
      VALUES ?
    `;

    // Chuyển dữ liệu về dạng mảng 2D cho MySQL
    const insertValues = tkbData.map((row) => [
      row.Khoa, // major
      Dot, // dot
      Ki, // ki
      Nam, // nam
      row.SoTietCTDT, // ll_code
      row.LL, // ll_total
      row.SoSinhVien, // student_quantity
      row.HeSoLopDong, // student_bonus
      row.HeSoT7CN, // bonus_time
      row.MaBoMon, // course_id
      row.GiaoVien, // lecturer
      row.SoTinChi, // credit_hours
      row.LopHocPhan, // course_name
      row.MaHocPhan, // course_code
      row.NgayBatDau || " ", // start_date
      row.NgayKetThuc || " ", // end_date
      row.QuyChuan, // bonus_total
    ]);

    // Thực hiện INSERT
    await connection.query(insertQuery, [insertValues]);

    // Xóa dữ liệu bảng course_schedule_details
    // let deleteQuery = `DELETE FROM course_schedule_details WHERE semester = ?`;
    // const deleteParams = [semester];

    // if (Khoa !== "ALL") {
    //   deleteQuery += " AND major = ?";
    //   deleteParams.push(Khoa);
    // }

    // await connection.query(deleteQuery, deleteParams);

    res.status(200).json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

// const addNewRowTKB = async (req, res) => {
//   const data = req.body;

//   // Ghép các thông tin kỳ học từ frontend
//   const semester = `${data.Dot}, ${data.Ki}, ${data.Nam}`;

//   let connection;

//   try {
//     // Kết nối database từ pool
//     connection = await createPoolConnection();

//     // Tạo câu truy vấn INSERT
//     const insertQuery = `
//       INSERT INTO course_schedule_details
//       (course_name, course_code, student_quantity, lecturer, major, ll_total,
//        bonus_time, ll_code, start_date, end_date, semester, qc)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `;

//     let student_bonus = 1;

//     switch (true) {
//       case data.student_quantity >= 101:
//         student_bonus = 1.5;
//         break;
//       case data.student_quantity >= 81:
//         student_bonus = 1.4;
//         break;
//       case data.student_quantity >= 66:
//         student_bonus = 1.3;
//         break;
//       case data.student_quantity >= 51:
//         student_bonus = 1.2;
//         break;
//       case data.student_quantity >= 41:
//         student_bonus = 1.1;
//         break;
//     }

//     const qc = student_bonus * data.bonus_time * data.ll_total;

//     // Giá trị cần chèn vào database
//     const insertValues = [
//       data.course_name,
//       data.course_code,
//       data.student_quantity,
//       data.lecturer,
//       data.major,
//       data.ll_total,
//       data.bonus_time,
//       data.ll_code,
//       data.start_date,
//       data.end_date,
//       semester,
//       qc,
//     ];

//     // Thực hiện chèn dữ liệu vào database
//     await connection.query(insertQuery, insertValues);

//     res.status(200).json({ success: true, message: "Thêm dữ liệu thành công" });
//   } catch (error) {
//     console.error("Lỗi thêm dữ liệu:", error);
//     res.status(500).json({ error: "Có lỗi xảy ra khi thêm dữ liệu" });
//   } finally {
//     if (connection) connection.release(); // Trả kết nối về pool
//   }
// };

const addNewRowTKB = async (req, res) => {
  const data = req.body;

  // Ghép các thông tin kỳ học từ frontend
  const semester = data.semester;

  let connection;

  try {
    // Kết nối database từ pool
    connection = await createPoolConnection();

    // Tạo câu truy vấn INSERT
    const insertQuery = `
      INSERT INTO course_schedule_details 
      (course_name, course_code, student_quantity, lecturer, major, ll_total, 
       bonus_time, ll_code, start_date, end_date, semester, qc) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Giá trị cần chèn vào database
    const insertValues = [
      data.course_name || "",
      data.course_code || "",
      data.student_quantity || "0",
      data.lecturer || "",
      data.major,
      data.ll_total || "0",
      data.bonus_time || "0",
      data.ll_code || "0",
      data.start_date || null,
      data.end_date || null,
      semester,
      0,
    ];

    // Thực hiện chèn dữ liệu vào database
    const [result] = await connection.query(insertQuery, insertValues);
    const newId = result.insertId; // Lấy ID của dòng vừa thêm

    // Trả về dữ liệu đầy đủ của dòng mới
    res.status(200).json({
      message: "Dòng đã được thêm thành công",
      data: { id: newId, ...req.body }, // Gửi lại dữ liệu đã thêm
    });
  } catch (error) {
    console.error("Lỗi thêm dữ liệu:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi thêm dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

const deleteTKB = async (req, res) => {
  const { major, semester } = req.body;

  let connection;

  try {
    // Kết nối database từ pool
    connection = await createPoolConnection();

    let sql = "DELETE FROM course_schedule_details WHERE semester = ?";
    let params = [semester];

    if (major !== "ALL") {
      sql += " AND major = ?";
      params.push(major);
    }

    // Thực hiện xóa dữ liệu
    const [result] = await connection.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Không có dữ liệu để xóa" });
    }

    res.status(200).json({ message: "Xóa thành công" });
  } catch (error) {
    console.error("Lỗi xóa dữ liệu:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi xóa dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

// Xuất file excel

const exportMultipleWorksheets = async (req, res) => {
  const { major, semester } = req.body;
  let connection;

  try {
    // Kết nối database từ pool
    connection = await createPoolConnection();

    // Nếu `major = "ALL"`, lấy danh sách tất cả các ngành
    let majors = [major];
    if (major === "ALL") {
      const [majorRows] = await connection.query(
        "SELECT DISTINCT major FROM course_schedule_details WHERE semester = ?",
        [semester]
      );
      majors = majorRows.map((row) => row.major);
    }

    // **📌 Tạo workbook**
    const wb = XLSX.utils.book_new();

    for (const m of majors) {
      // Truy vấn lấy dữ liệu theo từng major
      let query =
        "SELECT * FROM course_schedule_details WHERE semester = ? AND major = ?";
      let params = [semester, m];

      const [rows] = await connection.query(query, params);
      if (rows.length === 0) continue; // Bỏ qua nếu không có dữ liệu

      // Định nghĩa tiêu đề cột
      const headers = [
        "STT",
        "Số TC",
        "Lớp học phần",
        "Giáo viên",
        "Số tiết CTĐT",
        "Số SV",
        "Lên lớp",
        "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
        "Hệ số lớp đông",
        "Quy chuẩn",
      ];

      // **📌 Dữ liệu Excel**
      const excelData = rows.map((item, index) => [
        index + 1, // STT
        item.credit_hours,
        item.course_name,
        item.lecturer,
        item.ll_code,
        item.student_quantity,
        item.ll_total,
        item.bonus_time,
        item.student_bonus,
        item.qc,
      ]);

      // **📌 Tạo worksheet**
      const ws = XLSX.utils.aoa_to_sheet([
        [`BẢNG THỐNG KÊ KHỐI LƯỢNG GIẢNG DẠY - ${m}`], // Tiêu đề sheet
        [], // Dòng trống
        headers, // Dòng tiêu đề cột
        ...excelData, // Dữ liệu
      ]);

      // **📌 Căn giữa và làm đậm dòng tiêu đề**
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
      ];
      ws["A1"].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: "center", vertical: "center" },
      };

      // **📌 Thêm sheet vào workbook**
      XLSX.utils.book_append_sheet(wb, ws, m);
    }

    // **📌 Lưu file Excel**
    const fileName = `TKB_${semester.replace(/[, ]+/g, "_")}.xlsx`;
    const filePath = path.join(__dirname, "../../uploads", fileName);
    XLSX.writeFile(wb, filePath);

    // **📌 Gửi file về client**
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Lỗi tải file:", err);
        res.status(500).json({ error: "Lỗi khi tải file" });
      }
      fs.unlinkSync(filePath); // Xóa file sau khi tải
    });
  } catch (error) {
    console.error("Lỗi xuất file Excel:", error);
    res.status(500).json({ error: "Lỗi server khi xuất file Excel" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

const exportSingleWorksheets = async (req, res) => {
  const { major, semester } = req.body;
  let connection;

  try {
    // Kết nối database từ pool
    connection = await createPoolConnection();

    // Nếu `major = "ALL"`, lấy danh sách tất cả các ngành
    let majors = [major];
    if (major === "ALL") {
      const [majorRows] = await connection.query(
        "SELECT DISTINCT major FROM course_schedule_details WHERE semester = ?",
        [semester]
      );
      majors = majorRows.map((row) => row.major);
    }

    // **📌 Tiêu đề cột**
    const headers = [
      "STT",
      "Số TC",
      "Lớp học phần",
      "Giáo viên",
      "Số tiết CTĐT",
      "Số SV",
      "Lên lớp",
      "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
      "Hệ số lớp đông",
      "Quy chuẩn",
    ];

    // **📌 Tạo workbook và worksheet**
    const wb = XLSX.utils.book_new();
    let wsData = [["BẢNG THỐNG KÊ KHỐI LƯỢNG GIẢNG DẠY"], [], headers]; // Tiêu đề chính + dòng trống + tiêu đề cột

    let stt = 1; // Biến đếm STT tổng

    for (const m of majors) {
      // Truy vấn lấy dữ liệu theo từng major
      let query =
        "SELECT * FROM course_schedule_details WHERE semester = ? AND major = ?";
      let params = [semester, m];

      const [rows] = await connection.query(query, params);
      if (rows.length === 0) continue; // Bỏ qua nếu không có dữ liệu

      // **📌 Thêm dòng tiêu đề ngành**
      wsData.push([`Học phần thuộc khoa ${m}`]);

      // **📌 Thêm dữ liệu ngành**
      const excelData = rows.map((item) => [
        stt++, // STT liên tục
        item.credit_hours,
        item.course_name,
        item.lecturer,
        item.ll_code,
        item.student_quantity,
        item.ll_total,
        item.bonus_time,
        item.student_bonus,
        item.qc,
      ]);

      wsData = [...wsData, ...excelData]; // Thêm dữ liệu và 1 dòng trống
    }

    // **📌 Tạo worksheet**
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // **📌 Căn giữa và làm đậm dòng tiêu đề**
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }, // Merge tiêu đề chính
    ];
    ws["A1"].s = {
      font: { bold: true, sz: 14 },
      alignment: { horizontal: "center", vertical: "center" },
    };

    // **📌 Lưu file Excel**
    const fileName = `TKB_${semester.replace(/[, ]+/g, "_")}.xlsx`;
    const filePath = path.join(__dirname, "../../uploads", fileName);
    XLSX.utils.book_append_sheet(wb, ws, "TKB");
    XLSX.writeFile(wb, filePath);

    // **📌 Gửi file về client**
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Lỗi tải file:", err);
        res.status(500).json({ error: "Lỗi khi tải file" });
      }
      fs.unlinkSync(filePath); // Xóa file sau khi tải
    });
  } catch (error) {
    console.error("Lỗi xuất file Excel:", error);
    res.status(500).json({ error: "Lỗi server khi xuất file Excel" });
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
  addNewRowTKB,
  deleteTKB,
  exportMultipleWorksheets,
  exportSingleWorksheets,
};
