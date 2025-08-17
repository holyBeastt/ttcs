const express = require("express");
const multer = require("multer");
const router = express.Router();
const createPoolConnection = require("../config/databasePool");
const pool = require("../config/Pool");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const getImportTKBSite = async (req, res) => {
  res.render("importTKB.ejs");
};

const getTKBChinhThucSite = async (req, res) => {
  res.render("TKBChinhThuc.ejs");
};

const getDataTKBChinhThuc = async (req, res) => {
  const { Khoa, Dot, Ki, Nam } = req.body;
  let connection;

  const baseSelect = `
    SELECT 
      tt,
      MIN(id) AS id,
      MAX(course_id) AS course_id,
      MAX(course_name) AS course_name,
      MAX(major) AS major,
      MAX(lecturer) AS lecturer,
      MIN(start_date) AS start_date,
      MAX(end_date) AS end_date,
      MAX(ll_code) AS ll_code,
      MAX(ll_total) AS ll_total,
      MAX(student_quantity) AS student_quantity,
      MAX(student_bonus) AS student_bonus,
      MAX(bonus_time) AS bonus_time,
      MAX(qc) AS qc,
      MAX(dot) AS dot,
      MAX(ki_hoc) AS ki_hoc,
      MAX(nam_hoc) AS nam_hoc
    FROM course_schedule_details
  `;

  try {
    connection = await createPoolConnection();
    let query = "";
    let queryParams = [];

    if (Khoa === "ALL") {
      query = `${baseSelect} 
        WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ?
        GROUP BY tt`;
      queryParams = [Dot, Ki, Nam];

    } else if (Khoa === "Khac") {
      const [khoaArray] = await connection.query(
        `SELECT MaPhongBan FROM phongban WHERE isKhoa = 1`
      );
      const khoaList = khoaArray.map(row => row.MaPhongBan);

      query = `${baseSelect} 
        WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ?
          AND major NOT IN (${khoaList.map(() => "?").join(", ")})
        GROUP BY tt`;
      queryParams = [Dot, Ki, Nam, ...khoaList];

    } else {
      query = `${baseSelect} 
        WHERE major = ? AND dot = ? AND ki_hoc = ? AND nam_hoc = ?
        GROUP BY tt`;
      queryParams = [Khoa, Dot, Ki, Nam];
    }

    const [results] = await connection.execute(query, queryParams);
    res.json(results);

  } catch (error) {
    console.error("Lỗi trong hàm getDataTKBChinhThuc:", error);
    res.status(500).json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release();
  }
};

const updateRowTKB = async (req, res) => {
  let { tt, dot, ki_hoc, nam_hoc, field, value, data } = req.body;
  let connection;

  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    if (field === "student_quantity") {
      let student_bonus = 1;

      // 🛠 Kiểm tra giá trị nhập vào có phải số không
      if (isNaN(value) || value < 0) {
        return res
          .status(400)
          .json({ message: "Số lượng sinh viên không hợp lệ." });
      }

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
        WHERE tt = ? and dot = ? and ki_hoc = ? and nam_hoc = ?`;
      const updateValues = [value, student_bonus, qc, tt, dot, ki_hoc, nam_hoc];

      await connection.query(updateQuery, updateValues);
    } else if (field === "bonus_time") {
      value = parseFloat(value.replace(",", "."));

      if (isNaN(value) || value < 0) {
        return res.status(400).json({ message: "Hệ số T7/CN không hợp lệ" });
      }

      const qc = data.student_bonus * value * data.ll_total;

      const updateQuery = `
        UPDATE course_schedule_details 
        SET bonus_time = ?, qc = ? 
        WHERE tt = ? and dot = ? and ki_hoc = ? and nam_hoc = ?`;
      const updateValues = [value, qc, tt, dot, ki_hoc, nam_hoc];

      await connection.query(updateQuery, updateValues);
    } else if (field === "ll_total") {
      value = parseFloat(value.replace(",", "."));

      if (isNaN(value) || value < 0) {
        return res
          .status(400)
          .json({ message: "Số tiết lên lớp không hợp lệ" });
      }

      const qc = data.student_bonus * data.bonus_time * value;

      const updateQuery = `
        UPDATE course_schedule_details 
        SET ll_total = ?, qc = ? 
        WHERE tt = ? and dot = ? and ki_hoc = ? and nam_hoc = ?`;
      const updateValues = [value, qc, tt, dot, ki_hoc, nam_hoc];

      await connection.query(updateQuery, updateValues);
    } else if (field === "qc") {
      value = parseFloat(value.replace(",", "."));

      if (isNaN(value) || value < 0) {
        return res
          .status(400)
          .json({ message: "Số tiết quy chuẩn không hợp lệ" });
      }

      const updateQuery = `
        UPDATE course_schedule_details SET qc = ? 
        WHERE tt = ? and dot = ? and ki_hoc = ? and nam_hoc = ?`;
      const updateValues = [value, tt, dot, ki_hoc, nam_hoc];

      await connection.query(updateQuery, updateValues);
    } else {
      if (field === "start_date" || field === "end_date") {
        value = formatDateForDB(value);
      }

      const updateQuery = `UPDATE course_schedule_details SET ${field} = ? WHERE tt = ? and dot = ? and ki_hoc = ? and nam_hoc = ?`;
      const updateValues = [value, tt, dot, ki_hoc, nam_hoc];

      await connection.query(updateQuery, updateValues);
    }

    // 🛠 Lấy lại dữ liệu sau khi cập nhật
    const [updatedRow] = await connection.query(
      `SELECT
        tt,
        MIN(id) AS id,
        MAX(course_id) AS course_id,
        MAX(course_name) AS course_name,
        MAX(major) AS major,
        MAX(lecturer) AS lecturer,
        MIN(start_date) AS start_date,
        MAX(end_date) AS end_date,
        MAX(ll_code) AS ll_code,
        MAX(ll_total) AS ll_total,
        MAX(student_quantity) AS student_quantity,
        MAX(student_bonus) AS student_bonus,
        MAX(bonus_time) AS bonus_time,
        MAX(qc) AS qc,
        MAX(dot) AS dot,
        MAX(ki_hoc) AS ki_hoc,
        MAX(nam_hoc) AS nam_hoc
      FROM course_schedule_details 
        WHERE tt = ? and dot = ? and ki_hoc = ? and nam_hoc = ?
        group by tt`,
      [tt, dot, ki_hoc, nam_hoc]
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

// hàm xóa 1 dòng
const deleteRow = async (req, res) => {
  const { id } = req.params; // Lấy ID từ URL

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

  let connection,
    maPhongBanFalse = [];

  try {
    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    // Lấy dữ liệu bên bảng course_schedule_details
    let getDataTKBQuery = `
    SELECT
      id AS ID,
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
      qc AS QuyChuan
    FROM course_schedule_details
    WHERE semester = ? AND da_luu != 1
  `;

    const getDataTKBParams = [semester];

    if (Khoa !== "ALL") {
      getDataTKBQuery += " AND major = ?";
      getDataTKBParams.push(Khoa);
    }

    const [tkbData] = await connection.query(getDataTKBQuery, getDataTKBParams);

    // Nếu không có dữ liệu thì không cần insert
    if (tkbData.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "Không có dữ liệu hợp lệ để chèn" });
    }

    let insertValues = [];

    if (Khoa === "ALL") {
      // Nếu Khoa === "ALL", chỉ lấy MaBoMon thuộc các phòng ban hợp lệ
      const [MaPhongBanList] = await connection.query(
        `SELECT MaPhongBan FROM phongban WHERE isKhoa = 1`
      );

      const validMaPhongBanSet = new Set(
        MaPhongBanList.map((row) => row.MaPhongBan)
      );

      // Lọc dữ liệu hợp lệ & lưu các mã phòng ban không hợp lệ
      tkbData.forEach((row) => {
        if (validMaPhongBanSet.has(row.Khoa)) {
          insertValues.push([
            row.Khoa,
            Dot,
            Ki,
            Nam,
            row.SoTietCTDT,
            row.LL,
            row.SoSinhVien,
            row.HeSoLopDong,
            row.HeSoT7CN,
            row.MaBoMon,
            row.GiaoVien,
            row.SoTinChi,
            row.LopHocPhan,
            row.MaHocPhan,
            row.NgayBatDau || null,
            row.NgayKetThuc || null,
            row.QuyChuan,
          ]);
        } else {
          maPhongBanFalse.push(row.ID);
        }
      });
    } else {
      // Chuyển dữ liệu về dạng mảng 2D cho MySQL
      insertValues = tkbData.map((row) => [
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
        row.NgayBatDau || null, // start_date
        row.NgayKetThuc || null, // end_date
        row.QuyChuan, // bonus_total
      ]);
    }

    // Nếu không có dữ liệu hợp lệ sau khi lọc, dừng lại
    if (insertValues.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "Không có dữ liệu hợp lệ để chèn" });
    }

    // Câu lệnh INSERT
    const insertQuery = `
      INSERT INTO tam (Khoa, dot, ki, nam, SoTietCTDT, LL, SoSinhVien, HeSoLopDong, HeSoT7CN, MaBoMon, 
      GiaoVien, SoTinChi, LopHocPhan, MaHocPhan, NgayBatDau, NgayKetThuc, QuyChuan) 
      VALUES ?
    `;

    // Thực hiện INSERT
    await connection.query(insertQuery, [insertValues]);

    // Nếu có khoa không trùng với csdl
    if (maPhongBanFalse.length != 0) {
      if (Khoa === "ALL") {
        const idsToExclude = maPhongBanFalse.join(", ");

        const updateQuery = `
        UPDATE course_schedule_details 
        SET da_luu = 1 
        WHERE semester = ? AND id NOT IN (${idsToExclude});
      `;

        await connection.query(updateQuery, [semester]);
      }

      return res.status(200).json({
        success: true,
        message: "Những dòng không trùng khoa với CSDL sẽ không được chuyển",
      });
    }

    const updateQuery = `
      UPDATE course_schedule_details 
      SET da_luu = 1 
      WHERE semester = ? AND major = ?;
    `;

    await connection.query(updateQuery, [semester, Khoa]);

    res.status(200).json({ success: true, message: "Thêm file thành công" });
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
  const dot = data.dot;
  const ki_hoc = data.ki_hoc;
  const nam_hoc = data.nam_hoc;

  let connection;

  try {
    // Kết nối database từ pool
    connection = await createPoolConnection();

    // Tạo câu truy vấn INSERT
    const insertQuery = `
      INSERT INTO course_schedule_details 
      (course_name, course_code, student_quantity, lecturer, major, ll_total, 
       bonus_time, ll_code, start_date, end_date, dot, ki_hoc, nam_hoc, qc) 
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
      dot,
      ki_hoc,
      nam_hoc,
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
  const { major, dot, ki, nam } = req.body;

  let connection;

  try {
    // Kết nối database từ pool
    connection = await createPoolConnection();

    let sql =
      "DELETE FROM course_schedule_details WHERE dot = ? and ki_hoc = ? and nam_hoc = ?";
    let params = [dot, ki, nam];

    if (major !== "ALL") {
      sql += " AND major = ?";
      params.push(major);
    }

    // Thực hiện xóa dữ liệu
    const [result] = await connection.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(200).json({ message: "Không có dữ liệu để xóa" });
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
        "TT",
        "Số TC",
        "Lớp học phần",
        "Giáo Viên",
        "Số tiết theo CTĐT",
        "Số SV",
        "Số tiết lên lớp được tính QC",
        "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
        "Hệ số lớp đông",
        "QC",
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

// const insertDataAgain = async (req, res) => {
//   const { semester } = req.body;

//   let connection;

//   try {
//     // Kết nối database từ pool
//     connection = await createPoolConnection();

//     // Lấy dữ liệu đã nhóm lại
//     let sqlSelect = `SELECT 
//     course_name, credit_hours, ll_code, ll_total, 
//     course_code, major, study_format, 
//     MAX(lecturer) AS lecturer, 
//     MIN(start_date) AS start_date, 
//     MAX(end_date) AS end_date,
//     MAX(bonus_time) AS bonus_time,
//     MAX(qc) AS qc,
//     student_quantity, student_bonus, 
//     bonus_teacher, bonus_total, class_section, course_id
// FROM course_schedule_details
// WHERE semester = ?
// GROUP BY 
//     course_name, credit_hours, ll_code, ll_total, 
//     course_code, major, study_format, 
//     student_quantity, student_bonus,
//     bonus_teacher, bonus_total, class_section, course_id`;

//     let params = [semester, semester];

//     // Lấy dữ liệu đã nhóm
//     const [result] = await connection.query(sqlSelect, params);

//     // Xóa dữ liệu cũ
//     await connection.query(
//       `DELETE FROM course_schedule_details WHERE semester = ?`,
//       [semester]
//     );

//     // Chèn lại dữ liệu
//     let sqlInsert = `INSERT INTO course_schedule_details (
//             course_name, credit_hours, ll_code, ll_total, 
//             course_code, major, study_format, lecturer, 
//             start_date, end_date, student_quantity, student_bonus, 
//             bonus_time, bonus_teacher, bonus_total, qc, 
//             class_section, course_id, semester
//         ) 
//         VALUES ?`;

//     const values = result.map((row) => [
//       row.course_name,
//       row.credit_hours,
//       row.ll_code,
//       row.ll_total,
//       row.course_code,
//       row.major,
//       row.study_format,
//       row.lecturer,
//       row.start_date,
//       row.end_date,
//       row.student_quantity,
//       row.student_bonus,
//       row.bonus_time,
//       row.bonus_teacher,
//       row.bonus_total,
//       row.qc,
//       row.class_section,
//       row.course_id,
//       semester,
//     ]);

//     if (values.length > 0) {
//       await connection.query(sqlInsert, [values]);
//     }

//     res
//       .status(200)
//       .json({ message: "Dữ liệu đã được nhóm và chèn lại thành công" });
//   } catch (error) {
//     console.error("Lỗi khi xử lý dữ liệu:", error);
//     res
//       .status(500)
//       .json({ error: "Có lỗi xảy ra trong quá trình xử lý dữ liệu" });
//   } finally {
//     if (connection) connection.release(); // Trả kết nối về pool
//   }
// };

const checkDataTKBExist = async (req, res) => {
  const { dot, ki, nam } = req.body;

  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Câu truy vấn kiểm tra sự tồn tại của giá trị Khoa trong bảng
    const queryCheck = `SELECT MAX(tt) AS last_tt FROM course_schedule_details WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ?;`;

    // Thực hiện truy vấn
    const [results] = await connection.query(queryCheck, [dot, ki, nam]);

    // Kết quả trả về từ cơ sở dữ liệu
    const lastTTValue = results[0].last_tt; // Lấy giá trị lớn nhất của tt

    const exist = lastTTValue != null; // True nếu tồn tại, False nếu không tồn tại

    if (exist) {
      return res.status(200).json({
        message: "Dữ liệu đã tồn tại trong cơ sở dữ liệu",
        exists: true,
        lastTTValue: lastTTValue,
      });
    } else {
      return res.status(200).json({
        message: "Dữ liệu không tồn tại trong cơ sở dữ liệu",
        exists: false,
        lastTTValue: 0, // Trả về -1 nếu không tồn tại
      });
    }
  } catch (err) {
    console.error("Lỗi khi kiểm tra file import:", err);
    return res.status(500).json({ error: "Lỗi kiểm tra cơ sở dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

const getKhoaList = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const query = "SELECT MaPhongBan FROM phongban where isKhoa = 1";
    const [result] = await connection.query(query);
    res.json({
      success: true,
      MaPhongBan: result,
    });
  } catch (error) {
    console.error("Lỗi: ", error);
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const checkDataQCDK = async (req, res) => {
  const { Khoa, Dot, Ki, Nam } = req.body;

  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Câu truy vấn kiểm tra sự tồn tại của giá trị Khoa trong bảng
    const queryCheck = `SELECT EXISTS(SELECT 1 FROM tam WHERE Khoa = ? AND Dot = ? AND Ki = ? AND Nam = ?) AS exist;`;

    // Thực hiện truy vấn
    const [results] = await connection.query(queryCheck, [Khoa, Dot, Ki, Nam]);

    // Kết quả trả về từ cơ sở dữ liệu
    const exist = results[0].exist === 1; // True nếu tồn tại, False nếu không tồn tại

    // Lấy dữ liệu bên bảng course_schedule_details
    let getDataTKBQuery = `
        SELECT
          id AS ID,
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
          qc AS QuyChuan
        FROM course_schedule_details
        WHERE semester = ? AND da_luu != 1
      `;

    const semester = `${Dot}, ${Ki}, ${Nam}`;

    const getDataTKBParams = [semester];

    if (Khoa !== "ALL") {
      getDataTKBQuery += " AND major = ?";
      getDataTKBParams.push(Khoa);
    }

    const [tkbData] = await connection.query(getDataTKBQuery, getDataTKBParams);

    // Nếu không có dữ liệu thì không cần insert
    if (tkbData.length === 0) {
      return res.status(200).json({
        message: "Không có dữ liệu hợp lệ để chèn",
        exist: true,
        valid: false,
      });
    }

    if (exist) {
      return res.status(200).json({
        message: "Dữ liệu đã tồn tại trong cơ sở dữ liệu",
        exists: true,
        valid: true,
      });
    } else {
      return res.status(200).json({
        message: "Dữ liệu không tồn tại trong cơ sở dữ liệu",
        exists: false,
        valid: true,
      });
    }
  } catch (err) {
    console.error("Lỗi khi kiểm tra file import:", err);
    return res.status(500).json({ error: "Lỗi kiểm tra cơ sở dữ liệu" });
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
  checkDataTKBExist,
  getKhoaList,
  checkDataQCDK,
};
