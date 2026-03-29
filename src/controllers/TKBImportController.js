const XLSX = require("xlsx");
const pool = require("../config/Pool");

const tkbServices = require("../services/tkbServices");

function getFirstParenthesesContent(str) {
  const match = str.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

function extractPrefix(str) {
  const match = str.match(/^[A-Za-z]+/);
  return match ? match[0] : "";
}

function getHeDaoTao(classType, heDaoTaoArr) {
  const prefix = extractPrefix(classType);

  const found = heDaoTaoArr.find(
    r => r.viet_tat.toUpperCase().trim() === prefix.toUpperCase().trim()
  );

  if (!found) {
    return {
      he_dao_tao: "1",
      bonus_time: 1
    };
  }

  return {
    he_dao_tao: found.gia_tri_so_sanh,
    bonus_time: found.he_so
  };
}

/**
 * Tự động tìm dòng header trong Excel sheet
 * @param {Object} sheet - XLSX sheet object
 * @returns {number} Index của dòng header (0-indexed)
 */
function findHeaderRow(sheet) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const requiredColumns = ['TT', 'Số TC', 'Lớp học phần', 'Giáo Viên'];

  // Chỉ tìm trong 10 dòng đầu tiên
  for (let row = 0; row <= Math.min(range.e.r, 10); row++) {
    const rowData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: row
    })[0] || [];

    const rowText = rowData.map(cell => (cell || '').toString().trim());

    // Kiểm tra có chứa ít nhất 3/4 cột bắt buộc
    const matchCount = requiredColumns.filter(col =>
      rowText.some(cell => cell.includes(col))
    ).length;

    if (matchCount >= 3) {
      console.log(`✅ Tìm thấy header tại dòng ${row + 1} (Sheet: ${sheet['!ref']})`);
      return row;
    }
  }

  console.warn('⚠️ Không tìm thấy header, sử dụng mặc định dòng 4');
  return 3; // Mặc định dòng 4 (0-indexed = 3)
}

const importExcelTKB = async (req, res) => {
  const semester = JSON.parse(req.body.semester);
  let lastTTValue = JSON.parse(req.body.lastTTValue);
  const location = (req.body.location || "hvktmm").trim().toLowerCase(); // Mặc định là hvktmm, normalize

  const { dot, ki, nam } = semester;

  if (!req.file) {
    return res.status(400).json({ message: "Vui lòng chọn file Excel." });
  }

  try {
    // Lấy các dữ liệu cần thiết trước khi xử lý file để chỉ query 1 lần
    // Lấy bảng hệ số lớp đông
    const bonusRules = await tkbServices.getBonusRules();

    // Lấy bảng hệ đào tạo
    const kiTuBatDauArr = await tkbServices.getHeDaoTaoList();

    // Lấy danh sách hệ đào tạo và cấp độ

    // Lấy bảng kí tự bắt đầu của khoa
    const majorMap = await tkbServices.getMajorPrefixMap();

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: false,
      raw: false,
      cellText: true,
    });

    //const workbook = XLSX.read(req.file.buffer, { type: "buffer" }, { cellDates: true });

    let allData = [];

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];

      // 🔥 Tự động phát hiện dòng header
      const headerRowIndex = findHeaderRow(sheet);
      const dataStartIndex = headerRowIndex + 1;

      // Lấy hàng tiêu đề động
      const headerRow = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        range: headerRowIndex,
      })[0] || [];

      const validHeaders = headerRow.map((h) => (h || "").toString().trim());

      // Đọc dữ liệu từ dòng sau header, luôn đọc TEXT
      const rawRows = XLSX.utils.sheet_to_json(sheet, {
        header: validHeaders,
        range: dataStartIndex,
        defval: "",
        raw: false,          // GIỮ TEXT, KHÔNG CHO LẤY SERIAL
        cellText: true,      // LUÔN LẤY `.w` thay vì `.v`
      });

      // Buộc lấy `.w` cho mọi cell vì sheet_to_json đôi khi trộn .v
      const range = XLSX.utils.decode_range(sheet["!ref"]);

      rawRows.forEach((row, rowIndex) => {
        // Tính số dòng thực tế dựa trên vị trí header động
        let realRowNumber = dataStartIndex + rowIndex + 1;  // +1 vì 1-indexed trong Excel
        for (let col = 0; col < validHeaders.length; col++) {
          const colLetter = XLSX.utils.encode_col(col);
          const cellAddress = `${colLetter}${realRowNumber}`;
          const cell = sheet[cellAddress];

          if (cell && cell.w !== undefined) {
            row[validHeaders[col]] = cell.w; // luôn gán TEXT
          }
        }

        row.sheet_name = sheetName;
      });

      allData = allData.concat(rawRows);
    });

    if (allData.length === 0) {
      return res.status(400).json({ message: "File Excel không có dữ liệu." });
    }

    // 1. Định nghĩa danh sách các cột ĐƯỢC PHÉP kế thừa dữ liệu từ dòng trên
    const columnsToMerge = [
      "TT",
      "Mã HP",
      "Số TC",
      "Lớp học phần",
      "Giáo Viên",
      "Số SV",
      "ST/ tuần",
      // "Ngày BĐ",
      // "Ngày KT"
    ];

    // 2. Chỉ loop và fill dữ liệu cho các cột trong danh sách trên
    for (let i = 1; i < allData.length; i++) {
      for (const key of Object.keys(allData[i])) {
        // Chỉ copy nếu cột nằm trong danh sách cho phép (Allow List)
        if (columnsToMerge.includes(key) && (allData[i][key] === "" || allData[i][key] === undefined)) {
          allData[i][key] = allData[i - 1][key];
        }
      }
    }

    // Map tên cột từ tiếng Việt sang key tiếng Anh
    const renameMap = {
      "TT": "tt",
      "Mã HP": "course_code",
      "Số TC": "credit_hours",
      "LL": "ll_total",
      "Số SV": "student_quantity",
      "HS lớp đông": "student_bonus",
      "Ngoài giờ HC": "bonus_time",
      "LL thực": "ll_code_actual",
      "Lớp học phần": "course_name",
      "Hình thức học": "study_format",
      "ST/ tuần": "periods_per_week",
      "Thứ": "day_of_week",
      "Tiết học": "period_range",
      "Phòng học": "classroom",
      "Ngày BĐ": "start_date",
      "Ngày KT": "end_date",
      "Giáo Viên": "lecturer",
    };

    // Đặt lại theo tên các trường dữ liệu trong database
    const renamedData = allData.map((row, index) => {
      const newRow = {};
      for (const [oldKey, newKey] of Object.entries(renameMap)) {
        newRow[newKey] = row[oldKey] ?? "";
      }
      newRow.sheet_name = row.sheet_name;

      // 1. Áp dụng masterConvert ngay lập tức cho ngày tháng
      // Kết quả: "YYYY-MM-DD" hoặc null
      newRow.start_date = masterConvert(newRow.start_date);
      newRow.end_date = masterConvert(newRow.end_date);

      // Phân loại Khoa theo địa điểm
      if (location === "phhv") {
        // Nếu là Phân hiệu học viện, tất cả row có major = "ĐTPH"
        newRow.major = "ĐTPH";
      } else {
        // Nếu là Học viện Kỹ thuật mật mã (hvktmm), map theo course_code
        const courseCode = (newRow.course_code || "").trim().toUpperCase();
        const firstChar = courseCode.charAt(0);

        newRow.major = majorMap[firstChar] || "unknown";
      }

      // Debug log cho row đầu tiên
      if (index === 0) {
        console.log(`📍 Row 0 - Location: "${location}", Course Code: "${newRow.course_code}", Major: "${newRow.major}"`);
      }

      return newRow;
    });

    // Tính tổng tiết cho mỗi lớp học phần
    const tongTietMap = {};
    for (const row of renamedData) {

      // Kiểm tra period_range phải là string
      if (
        typeof row.period_range !== "string" ||
        !row.period_range.includes("->")
      ) {
        continue;
      }

      const [startTiet, endTiet] = row.period_range.split("->").map(Number);
      if (isNaN(startTiet) || isNaN(endTiet)) continue;

      if (
        typeof row.start_date !== "string" ||
        typeof row.end_date !== "string"
      ) {
        continue;
      }

      const startDate = parseDateDDMMYY(row.start_date);
      const endDate = parseDateDDMMYY(row.end_date);
      if (!startDate || !endDate) continue;

      const tietBuoi = endTiet - startTiet + 1;
      const soTuan = Math.ceil(
        (endDate - startDate) / (7 * 24 * 60 * 60 * 1000)
      );
      const tongTiet = soTuan * tietBuoi;

      tongTietMap[row.course_name] =
        (tongTietMap[row.course_name] || 0) + tongTiet;
    }

    // ✅ Lưu tt đầu tiên TRƯỚC vòng loop để tính range chính xác
    const firstTTValue = lastTTValue + 1;

    let preTT = 0;
    let preCourseName = "";  // Thêm: Lưu course_name dòng trước
    // let preClassroom = "";   // Thêm: Lưu classroom dòng trước
    let ll_tmp = 0;

    for (let i = 0; i < renamedData.length; i++) {
      const row = renamedData[i];
      // Tìm hệ đào tạo của lớp học phần
      const classType = getFirstParenthesesContent(row.course_name) || "";

      const { he_dao_tao, bonus_time } = getHeDaoTao(classType, kiTuBatDauArr);

      row.he_dao_tao = he_dao_tao;
      row.bonus_time = bonus_time;

      // Thêm period_start, period_end, ll_total vào từng dòng
      let tmp = 0;
      // Ép về string nếu là số hoặc kiểu khác
      const range = (typeof row.period_range === "string")
        ? row.period_range
        : (row.period_range != null ? String(row.period_range) : null);

      if (range && range.includes("->")) {
        const [start, end] = range.split("->").map(Number);

        row.period_start = isNaN(start) ? null : start;
        row.period_end = isNaN(end) ? null : end;

        if (!isNaN(start) && start >= 13) {
          tmp++;
        }
      } else {
        row.period_start = null;
        row.period_end = null;
      }


      // Lấy giá trị thô
      const rawDay = row.day_of_week;

      // Ép sang chuỗi để xử lý text (trim, uppercase)
      const dayOfWeek = String(rawDay || "").trim().toUpperCase();
      if (dayOfWeek == "CN" || dayOfWeek == "7") {
        tmp++;
      }

      if (tmp > 0) {
        row.bonus_time = row.bonus_time * 1.5;
      }

      // Số tiết lên lớp theo Ngày bắt đầu, ngày kết thúc và tiết học
      //row.ll_total = tongTietMap[row.course_name] || 0;

      // Tính hệ số lớp đông dựa trên số lượng sinh viên
      row.student_bonus = tkbServices.calculateStudentBonus(
        parseInt(row.student_quantity) || 0,
        bonusRules
      );

      // Gán lại tt phục vụ tkb và phòng học
      if (i > 0) {
        // ✅ Kiểm tra 3 điều kiện để xác định "nhóm mới"
        const isTTChanged = row.tt !== preTT;
        const isCourseNameChanged = row.course_name !== preCourseName;
        // const isClassroomChanged = row.classroom !== preClassroom;

        if (isTTChanged || isCourseNameChanged) {
          // ⚡ NHÓM MỚI: Bất kỳ điều kiện nào thay đổi
          preTT = row.tt;
          preCourseName = row.course_name;
          // preClassroom = row.classroom;

          row.tt = ++lastTTValue;
          ll_tmp = row.ll_total || 0;
        } else {
          // ⚡ CÙNG NHÓM: Tất cả điều kiện giống nhau
          row.tt = lastTTValue;
        }
      } else {
        // ⚡ Dòng đầu tiên
        preTT = row.tt;
        preCourseName = row.course_name;
        // preClassroom = row.classroom;

        row.tt = ++lastTTValue;
        ll_tmp = row.ll_total || 0;
      }

      row.ll_total = ll_tmp;
      row.qc = row.ll_total * row.bonus_time * row.student_bonus;
    }

    // Chuẩn bị values để insert
    const values = renamedData.map((row) => [
      row.tt,
      row.course_code,
      row.credit_hours,
      row.student_quantity || 0,
      row.student_bonus || 0,
      row.bonus_time || 1, // Nếu không có giá trị thì mặc định là 1
      row.ll_code || 0,
      row.ll_total || 0,
      row.qc || 0,
      row.course_name,
      row.study_format,
      row.periods_per_week,
      row.day_of_week,
      row.period_start,
      row.period_end,
      row.classroom,
      row.start_date,
      row.end_date,
      row.lecturer,
      row.major,
      row.he_dao_tao,
      dot,
      ki,
      nam,
    ]);

    const ttMin = firstTTValue;
    const ttMax = lastTTValue;

    // Bắt đầu transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert vào room_timetable
      await connection.query(
        `INSERT INTO room_timetable (
      TT, course_code, credit_hours, student_quantity, student_bonus, bonus_time,
      ll_code, ll_total, qc, course_name, study_format, periods_per_week,
      day_of_week, period_start, period_end, classroom, start_date, end_date,
      lecturer, major, he_dao_tao, dot, ki_hoc, nam_hoc
    ) VALUES ?`,
        [values]
      );

      // Insert vào course_schedule_details
      await connection.query(
        `INSERT INTO course_schedule_details (
        tt, id, course_name, credit_hours, ll_code, ll_total, classroom,
        course_code, major, study_format, lecturer, periods_per_week,
        period_start, period_end, day_of_week, start_date, end_date,
        student_quantity, student_bonus, bonus_time, bonus_teacher,
        bonus_total, qc, class_section, course_id, semester,
        description, da_luu, dot, ki_hoc, nam_hoc, note,
        he_dao_tao, class_id_ascending, class_type
    )
    SELECT
        tt, MIN(id), MAX(course_name), MAX(credit_hours), MAX(ll_code), MAX(ll_total),
        MAX(classroom), MAX(course_code), MAX(major), MAX(study_format), MAX(lecturer),
        MAX(periods_per_week), MAX(period_start), MAX(period_end), MAX(day_of_week),
        MIN(start_date), MAX(end_date), MAX(student_quantity), MAX(student_bonus),
        MAX(bonus_time), MAX(bonus_teacher), MAX(bonus_total), MAX(qc),
        MAX(class_section), MAX(course_id), MAX(semester), MAX(description),
        MAX(da_luu), dot, ki_hoc, nam_hoc, MAX(note), MAX(he_dao_tao),
        MAX(class_id_ascending), MAX(class_type)
    FROM room_timetable
    WHERE tt BETWEEN ? AND ?
    GROUP BY tt, dot, ki_hoc, nam_hoc`,
        [ttMin, ttMax]
      );

      await connection.commit();

    } catch (err) {
      await connection.rollback();

      // ✅ Bắt lỗi duplicate unique (course_name, dot, ki_hoc, nam_hoc)
      // MySQL error code 1062 = Duplicate entry
      if (err.code === "ER_DUP_ENTRY" || err.errno === 1062) {
        // Parse tên lớp bị trùng từ message lỗi của MySQL
        // VD: "Duplicate entry 'Toán cao cấp (ĐH)-1-1-2024' for key 'unique_course'"
        const dupMatch = err.message.match(/Duplicate entry '(.+)' for key/);
        const dupValue = dupMatch ? dupMatch[1] : "không xác định";

        return res.status(409).json({
          success: false,
          message: `Dữ liệu bị trùng lặp trong thời khóa biểu. Lớp học phần "${dupValue}" đã tồn tại trong kỳ ${ki}, đợt ${dot}, năm học ${nam}. Vui lòng kiểm tra lại file Excel.`,
          errorCode: "DUPLICATE_ENTRY",
        });
      }

      throw err; // Ném lại các lỗi khác để catch bên ngoài xử lý
    } finally {
      connection.release();
    }

    // Ghi log việc import thời khóa biểu thành công
    try {
      const logQuery = `
        INSERT INTO lichsunhaplieu 
        (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;

      const userId = req.session?.userId || req.session?.userInfo?.ID || 0;
      const tenNhanVien = req.session?.TenNhanVien || req.session?.username || 'Unknown User';
      const khoa = req.session?.MaPhongBan || 'Unknown Department';
      const loaiThongTin = 'Import thời khóa biểu';
      const changeMessage = `${tenNhanVien} đã thêm mới lịch học từ file thời khóa biểu vào cơ sở dữ liệu. Kỳ ${ki}, đợt ${dot}, năm học ${nam}.`;

      await pool.query(logQuery, [
        userId,
        tenNhanVien,
        khoa,
        loaiThongTin,
        changeMessage
      ]);
    } catch (logError) {
      console.error("Lỗi khi ghi log:", logError);
      // Không throw error để không ảnh hưởng đến việc import chính
    }

    // ✅ Thêm xử lý cập nhật trạng thái thẻ năm học (tương tự ban hành)
    try {
      // Đặt tất cả trạng thái về 0
      await pool.query(`UPDATE namhoc SET trangthai = ?`, [0]);
      await pool.query(`UPDATE ki SET trangthai = ?`, [0]);
      await pool.query(`UPDATE dot SET trangthai = ?`, [0]);

      // Chỉ kích hoạt năm/kỳ/đợt được chọn
      await pool.query(`UPDATE namhoc SET trangthai = ? WHERE NamHoc = ?`, [1, nam]);
      await pool.query(`UPDATE ki SET trangthai = ? WHERE value = ?`, [1, ki]);
      await pool.query(`UPDATE dot SET trangthai = ? WHERE value = ?`, [1, dot]);

      console.log(`Đã cập nhật trạng thái: Năm ${nam}, Kỳ ${ki}, Đợt ${dot}`);
    } catch (statusError) {
      console.error("⚠️ Lỗi cập nhật trạng thái thẻ năm học:", statusError);
      // Không throw error để không làm gián đoạn quy trình chính
    }

    res.status(200).json({
      success: true,
      message: "Đọc file và lưu thành công",
      data: {} // Nếu có dữ liệu kèm theo
    });
  } catch (err) {
    console.error("Lỗi khi xử lý file Excel:", err);
    res.status(500).json({ message: "Lỗi khi xử lý file Excel." });
  }
};

function parseDateDDMMYY(str) {

  if (!str) return null;

  const [day, month, year] = str.split("/").map(Number);

  const fullYear = year < 100 ? 2000 + year : year;

  return new Date(fullYear, month - 1, day);

}

function convertDateToMySQL(str) {
  if (!str) return null;

  // 1. Cắt chuỗi bằng regex để chấp nhận cả /, -, .
  const parts = String(str).trim().split(/[\/\-\.]/);

  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    // Xử lý năm tắt (vd: 25 -> 2025)
    if (year < 100) year += 2000;

    // 🔥 2. LOGIC CỨU DỮ LIỆU: Check ngược ngày/tháng
    // Nếu tháng > 12 mà ngày <= 12 -> Chắc chắn là bị ngược -> Đổi chỗ
    if (month > 12 && day <= 12) {
      console.warn(`⚠️ Đảo format ngày: ${str} -> ${month}/${day}/${year}`);
      [day, month] = [month, day]; // Swap
    }

    // 3. Kiểm tra ngày hợp lệ chặt chẽ (Chặn ngày 30/02 hoặc tháng 13)
    // Lưu ý: month trong new Date bắt đầu từ 0
    const dateObj = new Date(year, month - 1, day);

    // So sánh ngược lại xem JS có tự động nhảy ngày không
    if (
      dateObj.getFullYear() === year &&
      dateObj.getMonth() === month - 1 &&
      dateObj.getDate() === day
    ) {
      // 4. Format chuẩn MySQL YYYY-MM-DD
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
  }

  console.error(`❌ Ngày sai định dạng, set NULL: ${str}`);
  return null; // Trả về null để MySQL lưu là NULL thay vì ngày sai
}

/**
 * Hàm 1: Chuyển đổi Serial Number của Excel (VD: 45667) sang Date
 */
function excelSerialToDate(serial) {
  // Excel tính mốc từ 30/12/1899. 
  // 25569 là số ngày từ 1900 đến 1970 (Unix epoch)
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  // Lưu ý: Excel có bug tính dư 1 ngày nhuận năm 1900, 
  // nhưng với ngày tháng năm 2025 thì công thức này an toàn.
  return date_info;
}

/**
 * Hàm 2: Format Date Object chuẩn sang chuỗi MySQL YYYY-MM-DD
 */
function formatDateToMySQL(dateObj) {
  if (!dateObj || isNaN(dateObj.getTime())) return null;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 🔥 Hàm 3 (QUAN TRỌNG): Hàm tổng hợp xử lý mọi loại dữ liệu đầu vào
 */
function masterConvert(input) {
  if (input === null || input === undefined) return null;

  // TRƯỜNG HỢP A: Nếu Excel trả về Số (như ô O7 trong hình 1)
  if (typeof input === 'number') {
    console.log(`📍 Chuyển Serial Excel: ${input} sang Date`);
    const jsDate = excelSerialToDate(input);
    return formatDateToMySQL(jsDate);
  }

  // TRƯỜNG HỢP B: Nếu thư viện đọc file đã tự convert sang Date Object
  if (input instanceof Date) {
    console.log(`📍 Định dạng Date Object: ${input}`);
    return formatDateToMySQL(input);
  }

  // TRƯỜNG HỢP C: Nếu là Text (như ô O73 trong hình 2) -> Dùng lại hàm cũ của bạn
  if (typeof input === 'string') {
    // Gọi lại hàm convertDateToMySQL bạn đã viết ở câu trước
    // (Lưu ý: Đảm bảo hàm đó trả về string YYYY-MM-DD)
    return convertDateToMySQL(input);
  }

  return null;
}

module.exports = {
  importExcelTKB,
};
