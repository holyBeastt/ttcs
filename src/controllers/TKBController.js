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
      qc || null,
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

// const updateStudentQuantity = async (req, res) => {
//   const jsonData = req.body;

//   let connection;

//   try {
//     // Kiểm tra dữ liệu đầu vào
//     if (!jsonData || jsonData.length === 0) {
//       return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
//     }

//     // Lấy kết nối từ createPoolConnection
//     connection = await createPoolConnection();

//     // Giới hạn số lượng bản ghi mỗi batch (tránh quá tải)
//     const batchSize = 50;
//     const batches = [];
//     for (let i = 0; i < jsonData.length; i += batchSize) {
//       batches.push(jsonData.slice(i, i + batchSize));
//     }

//     // Xử lý từng batch
//     for (const batch of batches) {
//       let updateQuery = `
//         UPDATE course_schedule_details
//         SET student_quantity = CASE
//       `;
//       const updateValues = [];
//       const ids = [];

//       batch.forEach(({ id, student_quantity }) => {
//         // Kiểm tra và chuẩn hóa dữ liệu
//         if (typeof student_quantity !== "number" || isNaN(student_quantity)) {
//           return res
//             .status(400)
//             .json({ message: `Số lượng sinh viên không hợp lệ cho id ${id}` });
//         }

//         // Thêm logic cập nhật cho student_quantity
//         updateQuery += ` WHEN id = ? THEN ? `;
//         updateValues.push(id, student_quantity);

//         // Lưu các id để đưa vào WHERE
//         if (!ids.includes(id)) ids.push(id);
//       });

//       // Hoàn thiện truy vấn
//       updateQuery += ` END WHERE id IN (${ids.map(() => "?").join(", ")})`;
//       updateValues.push(...ids);

//       // Thực hiện truy vấn cập nhật
//       await connection.query(updateQuery, updateValues);
//     }

//     res.status(200).json({ success: true, message: "Cập nhật thành công" });
//   } catch (error) {
//     console.error("Lỗi cập nhật:", error);
//     res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
//   } finally {
//     if (connection) connection.release(); // Trả kết nối về pool
//   }
// };

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
      let updateValues = [];
      const ids = [];

      batch.forEach(({ id, student_quantity }) => {
        // Kiểm tra và chuẩn hóa dữ liệu
        if (typeof student_quantity !== "number" || isNaN(student_quantity)) {
          return res
            .status(400)
            .json({ message: `Số lượng sinh viên không hợp lệ cho id ${id}` });
        }

        // Tính toán student_bonus và qc (ở đây chỉ là ví dụ logic)
        let student_bonus = 1;
        if (student_quantity >= 101) {
          student_bonus = 1.5;
        } else if (student_quantity >= 81) {
          student_bonus = 1.4;
        } else if (student_quantity >= 66) {
          student_bonus = 1.3;
        } else if (student_quantity >= 51) {
          student_bonus = 1.2;
        } else if (student_quantity >= 41) {
          student_bonus = 1.1;
        }

        // Giả sử qc là một cột boolean, có thể tính toán như sau:
        const qc = student_bonus * data.bonus_time * data.ll_total;

        // Thêm logic cập nhật cho student_quantity, student_bonus và qc
        updateQuery += ` WHEN id = ? THEN ? `;
        updateValues.push(id, student_quantity);

        updateQuery += ` WHEN id = ? THEN ? `;
        updateValues.push(id, student_bonus);

        updateQuery += ` WHEN id = ? THEN ? `;
        updateValues.push(id, qc);

        // Lưu các id để đưa vào WHERE
        if (!ids.includes(id)) ids.push(id);
      });

      // Hoàn thiện truy vấn
      updateQuery += ` END, student_bonus = CASE `;
      updateQuery += ` END, qc = CASE `;
      updateQuery += ` WHERE id IN (${ids.map(() => "?").join(", ")})`;
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
    let deleteQuery = `DELETE FROM course_schedule_details WHERE semester = ?`;
    const deleteParams = [semester];

    if (Khoa !== "ALL") {
      deleteQuery += " AND major = ?";
      deleteParams.push(Khoa);
    }

    await connection.query(deleteQuery, deleteParams);

    res.status(200).json({ success: true, message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

const addNewRowTKB = async (req, res) => {
  const data = req.body;

  // Ghép các thông tin kỳ học từ frontend
  const semester = `${data.Dot}, ${data.Ki}, ${data.Nam}`;

  let connection;

  try {
    // Kết nối database từ pool
    connection = await createPoolConnection();

    // Tạo câu truy vấn INSERT
    const insertQuery = `
      INSERT INTO course_schedule_details 
      (course_name, course_code, student_quantity, lecturer, major, ll_total, 
       bonus_time, ll_code, start_date, end_date, semester, qc) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

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

    // Giá trị cần chèn vào database
    const insertValues = [
      data.course_name,
      data.course_code,
      data.student_quantity,
      data.lecturer,
      data.major,
      data.ll_total,
      data.bonus_time,
      data.ll_code,
      data.start_date,
      data.end_date,
      semester,
      qc,
    ];

    // Thực hiện chèn dữ liệu vào database
    await connection.query(insertQuery, insertValues);

    res.status(200).json({ success: true, message: "Thêm dữ liệu thành công" });
  } catch (error) {
    console.error("Lỗi thêm dữ liệu:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi thêm dữ liệu" });
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
};
