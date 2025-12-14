const createPoolConnection = require("../config/databasePool");
const pool = require("../config/Pool");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const tkbServices = require("../services/tkbServices");

const getImportTKBSite = async (req, res) => {
  res.render("tkb.themTKB.ejs");
};

const getTKBChinhThucSite = async (req, res) => {
  res.render("tkb.thoiKhoaBieuChinhThuc.ejs");
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
      MAX(ll_total) AS ll_total,
      MAX(student_quantity) AS student_quantity,
      MAX(student_bonus) AS student_bonus,
      MAX(bonus_time) AS bonus_time,
      MAX(qc) AS qc,
      MAX(dot) AS dot,
      MAX(ki_hoc) AS ki_hoc,
      MAX(nam_hoc) AS nam_hoc,
      MAX(note) AS note,
      MAX(he_dao_tao) AS he_dao_tao
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

const getHeDaoTaoTexts = async (oldHeDaoTaoId, newHeDaoTaoId) => {
  try {
    const [[oldRow]] = await pool.query(
      'SELECT he_dao_tao FROM he_dao_tao WHERE id = ?',
      [oldHeDaoTaoId]
    );

    const [[newRow]] = await pool.query(
      'SELECT he_dao_tao FROM he_dao_tao WHERE id = ?',
      [newHeDaoTaoId]
    );

    return {
      oldHeDaoTao: oldRow?.he_dao_tao || "",
      newHeDaoTao: newRow?.he_dao_tao || ""
    };
  } catch (error) {
    console.error("Lỗi getHeDaoTaoTexts:", error);
    return { oldHeDaoTao: "", newHeDaoTao: "" };
  }
};


const getBonusTimeForHeDaoTao = async (
  oldHeDaoTaoId,
  newHeDaoTaoId,
  bonus_time
) => {

  const { oldHeDaoTao, newHeDaoTao } =
    await getHeDaoTaoTexts(oldHeDaoTaoId, newHeDaoTaoId);

  let tmp = 1;

  // 🔹 Xác định hệ số ngoài giờ cũ
  if (oldHeDaoTao.includes("ĐH") && bonus_time == 1.5) {
    tmp = 1.5;
  }

  if (oldHeDaoTao.includes("CH") && bonus_time == 2.25) {
    tmp = 1.5;
  }

  if (oldHeDaoTao.includes("NCS") && bonus_time == 3) {
    tmp = 1.5;
  }

  // 🔹 Tính lại theo hệ đào tạo mới
  if (newHeDaoTao.includes("ĐH")) return 1 * tmp;
  if (newHeDaoTao.includes("CH")) return 1.5 * tmp;
  if (newHeDaoTao.includes("NCS")) return 2.0 * tmp;

  return bonus_time; // fallback
};


const updateRowTKB = async (req, res) => {
  let { tt, dot, ki_hoc, nam_hoc, field, value, oldValue, data } = req.body;

  console.log("🚀 ~ file: TKBController.js:216 ~ updateRowTKB ~ data:", req.body);

  let connection;

  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    if (field === "student_quantity") {
      let student_bonus = 0;

      // 🛠 Kiểm tra giá trị nhập vào có phải số không
      if (isNaN(value) || value < 0) {
        return res
          .status(400)
          .json({ message: "Số lượng sinh viên không hợp lệ." });
      }

      const bonusRules = await tkbServices.getBonusRules();

      student_bonus = tkbServices.calculateStudentBonus(value, bonusRules);

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
        return res.status(400).json({ message: "Hệ số ngoài giờ không hợp lệ" });
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
    } else if (field === "he_dao_tao") {

      data.bonus_time = await getBonusTimeForHeDaoTao(oldValue, value, data.bonus_time);

      const qc = data.student_bonus * data.bonus_time * data.ll_total;

      const updateQuery = `
        UPDATE course_schedule_details 
        SET he_dao_tao = ?, bonus_time = ?, qc = ? 
        WHERE tt = ? and dot = ? and ki_hoc = ? and nam_hoc = ?`;
      const updateValues = [value, data.bonus_time, qc, tt, dot, ki_hoc, nam_hoc];

      await connection.query(updateQuery, updateValues);
    }
    else if (field === "note") {

      if (typeof value !== "string") {
        return res.status(400).json({ message: "Ghi chú không hợp lệ" });
      }

      const updateQuery = `
        UPDATE course_schedule_details 
        SET note = ?
        WHERE tt = ? AND dot = ? AND ki_hoc = ? AND nam_hoc = ?`;

      const updateValues = [value, tt, dot, ki_hoc, nam_hoc];

      await connection.query(updateQuery, updateValues);
    }
    else {
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
        MAX(nam_hoc) AS nam_hoc,
        MAX(note) AS note,
        MAX(he_dao_tao) AS he_dao_tao
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
  const { tt, dot, ki_hoc, nam_hoc } = req.query; // Lấy ID từ URL

  let connection;

  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    // Kiểm tra xem tt có hợp lệ không
    if (!tt) {
      return res.status(400).json({ message: "ID không hợp lệ." });
    }

    // Chuẩn bị truy vấn DELETE
    const deleteQuery = `DELETE FROM course_schedule_details WHERE tt = ? and dot = ? and ki_hoc = ? and nam_hoc = ?`;

    // Thực thi truy vấn
    await connection.query(deleteQuery, [tt, dot, ki_hoc, nam_hoc]);

    // Trả về phản hồi thành công
    return res.json({ message: "Dòng dữ liệu đã được xóa thành công." });
  } catch (error) {
    console.error("Lỗi khi xóa dòng dữ liệu:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xóa dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const themTKBVaoQCDK = async (req, res) => {
  const { major, dot, ki_hoc, nam_hoc } = req.body;

  let connection,
    maPhongBanFalse = [];

  try {
    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    // Lấy dữ liệu bên bảng course_schedule_details
    let getDataTKBQuery = `
    SELECT
      min(id) AS ID,
      tt,
      max(major) AS Khoa,
      max(ll_code) AS SoTietCTDT,
      max(ll_total) AS LL,
      max(student_quantity) AS SoSinhVien,
      max(student_bonus) AS HeSoLopDong,
      max(bonus_time) AS HeSoT7CN,
      max(course_id) AS MaBoMon,
      max(lecturer) AS GiaoVien,
      max(credit_hours) AS SoTinChi,
      max(course_name) AS LopHocPhan,
      max(course_code) AS MaHocPhan,
      min(start_date) AS NgayBatDau,
      max(end_date) AS NgayKetThuc,
      max(qc) AS QuyChuan,
      max(he_dao_tao) AS HeDaoTao
    FROM course_schedule_details
    WHERE dot = ? and ki_hoc = ? and nam_hoc = ? and da_luu = 0
  `;

    const getDataTKBParams = [dot, ki_hoc, nam_hoc];

    if (major !== "ALL") {
      getDataTKBQuery += " and major = ?";
      getDataTKBParams.push(major);
    }

    getDataTKBQuery += " group by tt";


    const [tkbData] = await connection.query(getDataTKBQuery, getDataTKBParams);

    // Nếu không có dữ liệu thì không cần insert
    if (tkbData.length === 0) {
      return res
        .status(200)
        .json({ success: true, message: "Không có dữ liệu hợp lệ để chèn" });
    }

    let insertValues = [];

    if (major === "ALL") {
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
            dot,
            ki_hoc,
            nam_hoc,
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
            row.HeDaoTao || null,
          ]);
        } else {
          maPhongBanFalse.push(row.ID);
        }
      });
    } else {
      // Chuyển dữ liệu về dạng mảng 2D cho MySQL
      insertValues = tkbData.map((row) => [
        row.Khoa, // major
        dot, // dot
        ki_hoc, // ki
        nam_hoc, // nam
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
        row.HeDaoTao || null, // he_dao_tao
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
      GiaoVien, SoTinChi, LopHocPhan, MaHocPhan, NgayBatDau, NgayKetThuc, QuyChuan, he_dao_tao) 
      VALUES ?
    `;

    // Thực hiện INSERT
    await connection.query(insertQuery, [insertValues]);

    // Cập nhật trường da_luu = 1 cho những dòng đã được lưu
    let updateQuery = `UPDATE course_schedule_details 
      SET da_luu = 1 
      WHERE dot = ? and ki_hoc = ? and nam_hoc = ?
    `;
    const updateValues = [dot, ki_hoc, nam_hoc];

    // Nếu lưu all
    if (major === "ALL") {

      // Nếu có khoa không trùng với csdl
      if (maPhongBanFalse.length != 0) {
        const idsToExclude = maPhongBanFalse.join(", ");
        updateQuery += ` AND id NOT IN (${idsToExclude})`;

        await connection.query(updateQuery, updateValues);

        return res.status(200).json({
          status: "warning",
          message: "Thêm dữ liệu thành công nhưng Những dòng không trùng khoa với CSDL sẽ không được chuyển",
        });

      }
    } else {
      updateQuery += " AND major = ?";
      updateValues.push(major);
    }

    await connection.query(updateQuery, updateValues);

    // // ✅ Thêm xử lý cập nhật trạng thái thẻ năm học (tương tự ban hành)
    // try {
    //   // Đặt tất cả trạng thái về 0
    //   await connection.query(`UPDATE namhoc SET trangthai = ?`, [0]);
    //   await connection.query(`UPDATE ki SET trangthai = ?`, [0]);
    //   await connection.query(`UPDATE dot SET trangthai = ?`, [0]);

    //   // Chỉ kích hoạt năm/kỳ/đợt được chọn
    //   await connection.query(`UPDATE namhoc SET trangthai = ? WHERE NamHoc = ?`, [1, nam_hoc]);
    //   await connection.query(`UPDATE ki SET trangthai = ? WHERE value = ?`, [1, ki_hoc]);
    //   await connection.query(`UPDATE dot SET trangthai = ? WHERE value = ?`, [1, dot]);

    //   console.log(`✅ Đã cập nhật trạng thái: Năm ${nam_hoc}, Kỳ ${ki_hoc}, Đợt ${dot}`);
    // } catch (statusError) {
    //   console.error("⚠️ Lỗi cập nhật trạng thái thẻ năm học:", statusError);
    //   // Không throw error để không làm gián đoạn quy trình chính
    // }

    return res.status(201).json({
      status: "success",
      message: "Thêm dữ liệu vào quy chuẩn dự kiến thành công"
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu:", error);
    res.status(500).json({
      status: "error",
      message: "Có lỗi xảy ra khi cập nhật dữ liệu"
    });
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


  try {
    // Lấy tt lớn nhất trong bảng course_schedule_details theo dot, ki_hoc, nam_hoc
    const [maxTTResult] = await pool.query(`
      select max(tt) as maxTT from course_schedule_details where dot = ? and ki_hoc = ? and nam_hoc = ?`,
      [dot, ki_hoc, nam_hoc]);

    // Tạo câu truy vấn INSERT
    const insertQuery = `
      INSERT INTO course_schedule_details 
      (tt, course_name, course_code, student_quantity, student_bonus, lecturer, major, ll_total, 
       bonus_time, ll_code, start_date, end_date, he_dao_tao, dot, ki_hoc, nam_hoc, qc) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Giá trị cần chèn vào database
    const insertValues = [
      maxTTResult[0].maxTT + 1 || -1, // Tăng tt từ giá trị lớn nhất
      data.course_name || "",
      data.course_code || "",
      data.student_quantity || 0,
      data.student_bonus || 0,
      data.lecturer || "",
      data.major,
      data.ll_total || 0,
      data.bonus_time || 1,
      data.ll_code || 0,
      data.start_date || null,
      data.end_date || null,
      data.he_dao_tao || "Đại học (Đóng học phí)",
      dot,
      ki_hoc,
      nam_hoc,
      0,
    ];

    // Thực hiện chèn dữ liệu vào database
    const [result] = await pool.query(insertQuery, insertValues);
    const newId = result.insertId; // Lấy ID của dòng vừa thêm
    const newTT = insertValues[0]; // Lấy tt của dòng vừa thêm

    // Trả về dữ liệu đầy đủ của dòng mới
    res.status(200).json({
      message: "Dòng đã được thêm thành công",
      data: { id: newId, tt: newTT, ...req.body }, // Gửi lại dữ liệu đã thêm
    });
  } catch (error) {
    console.error("Lỗi thêm dữ liệu:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi thêm dữ liệu" });
  }
};

const deleteTKB = async (req, res) => {
  const { major, dot, ki_hoc, nam_hoc } = req.query;

  let connection;

  try {
    // Kết nối database từ pool
    connection = await createPoolConnection();

    let sql =
      "DELETE FROM course_schedule_details WHERE dot = ? and ki_hoc = ? and nam_hoc = ?";
    let params = [dot, ki_hoc, nam_hoc];

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
  const { major, dot, ki_hoc, nam_hoc } = req.query;
  let connection;

  try {
    // Kết nối database từ pool
    connection = await createPoolConnection();

    // Nếu `major = "ALL"`, lấy danh sách tất cả các ngành
    let majors = [major];
    if (major === "ALL") {
      const [majorRows] = await connection.query(
        "SELECT DISTINCT major FROM course_schedule_details WHERE dot = ? and ki_hoc = ? and nam_hoc = ?",
        [dot, ki_hoc, nam_hoc]
      );
      majors = majorRows.map((row) => row.major);
    }

    // **📌 Tạo workbook**
    const wb = XLSX.utils.book_new();

    for (const m of majors) {
      // Truy vấn lấy dữ liệu theo từng major
      let query =
        `SELECT 
        max(id) as id,
        tt,
        max(credit_hours) as credit_hours,
        max(course_name) as course_name,
        max(lecturer) as lecturer,
        max(student_quantity) as student_quantity,
        max(ll_total) as ll_total,
        max(bonus_time) as bonus_time,
        max(student_bonus) as student_bonus,
        min(start_date) as start_date,
        max(end_date) as end_date,
        max(he_dao_tao) as he_dao_tao,
        max(qc) as qc 
        FROM course_schedule_details WHERE dot = ? and ki_hoc = ? and nam_hoc = ? AND major = ?
        group by tt`;
      let params = [dot, ki_hoc, nam_hoc, m];

      const [rows] = await connection.query(query, params);
      if (rows.length === 0) continue; // Bỏ qua nếu không có dữ liệu

      // Định nghĩa tiêu đề cột
      const headers = [
        "STT",
        "Số TC",
        "Lớp học phần",
        "Giáo viên",
        //"Số tiết CTĐT",
        "Lên lớp",
        "Số SV",
        "Hệ số lớp đông",
        "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
        "Ngày BĐ",
        "Ngày KT",
        "Hệ đào tạo",
        "QC",
      ];

      // **📌 Dữ liệu Excel**
      const excelData = rows.map((item, index) => [
        index + 1, // STT
        item.credit_hours,
        item.course_name,
        item.lecturer,
        item.ll_total,
        item.student_quantity,
        item.student_bonus,
        item.bonus_time,
        formatDate(item.start_date),
        formatDate(item.end_date),
        item.he_dao_tao,
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
    const fileName = `TKB_${dot}_${ki_hoc}_${nam_hoc}.xlsx`;
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
  const { major, dot, ki_hoc, nam_hoc } = req.query;
  let connection;

  try {
    // Kết nối database từ pool
    connection = await createPoolConnection();

    // Nếu `major = "ALL"`, lấy danh sách tất cả các ngành
    let majors = [major];
    if (major === "ALL") {
      const [majorRows] = await connection.query(
        "SELECT DISTINCT major FROM course_schedule_details WHERE dot = ? and ki_hoc = ? and nam_hoc = ?",
        [dot, ki_hoc, nam_hoc]
      );
      majors = majorRows.map((row) => row.major);
    }

    // **📌 Tiêu đề cột**
    const headers = [
      "STT",
      "Số TC",
      "Lớp học phần",
      "Giáo viên",
      //"Số tiết CTĐT",
      "Lên lớp",
      "Số SV",
      "Hệ số lớp đông",
      "Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ",
      "Ngày BĐ",
      "Ngày KT",
      "Hệ đào tạo",
      "QC",
    ];

    // **📌 Tạo workbook và worksheet**
    const wb = XLSX.utils.book_new();
    let wsData = [["BẢNG THỐNG KÊ KHỐI LƯỢNG GIẢNG DẠY"], [], headers]; // Tiêu đề chính + dòng trống + tiêu đề cột

    let stt = 1; // Biến đếm STT tổng

    for (const m of majors) {
      // Truy vấn lấy dữ liệu theo từng major
      let query =
        `SELECT 
        max(id) as id,
        tt,
        max(credit_hours) as credit_hours,
        max(student_quantity) as student_quantity,
        max(course_name) as course_name,
        max(lecturer) as lecturer,
        max(ll_total) as ll_total,
        max(bonus_time) as bonus_time,
        max(student_bonus) as student_bonus,
        min(start_date) as start_date,
        max(end_date) as end_date,
        max(he_dao_tao) as he_dao_tao,
        max(qc) as qc 
        FROM course_schedule_details WHERE dot = ? and ki_hoc = ? and nam_hoc = ? AND major = ?
        group by tt`;
      let params = [dot, ki_hoc, nam_hoc, m];

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
        item.ll_total,
        item.student_quantity,
        item.student_bonus,
        item.bonus_time,
        formatDate(item.start_date),
        formatDate(item.end_date),
        item.he_dao_tao,
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
    const fileName = `TKB_${dot}_${ki_hoc}_${nam_hoc}.xlsx`;
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

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d)) return date; // nếu không phải ngày hợp lệ thì trả raw

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}


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
  const { major, dot, ki_hoc, nam_hoc } = req.query;

  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Câu truy vấn kiểm tra sự tồn tại của giá trị Khoa trong bảng
    const queryCheck = `SELECT EXISTS(SELECT 1 FROM tam WHERE Khoa = ? AND Dot = ? AND Ki = ? AND Nam = ?) AS exist;`;

    // Thực hiện truy vấn
    const [results] = await connection.query(queryCheck, [major, dot, ki_hoc, nam_hoc]);

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
        WHERE dot = ? and ki_hoc = ? and nam_hoc = ? AND da_luu != 1
      `;

    const getDataTKBParams = [dot, ki_hoc, nam_hoc];

    if (major !== "ALL") {
      getDataTKBQuery += " AND major = ?";
      getDataTKBParams.push(major);
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
  themTKBVaoQCDK,
  addNewRowTKB,
  deleteTKB,
  exportMultipleWorksheets,
  exportSingleWorksheets,
  checkDataTKBExist,
  getKhoaList,
  checkDataQCDK,
};
