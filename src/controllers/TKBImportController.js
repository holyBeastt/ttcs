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
    r => r.viet_tat.toUpperCase() === prefix.toUpperCase()
  );

  return found ? found.gia_tri_so_sanh : "1";
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
    const heDaoTaoArr = await tkbServices.getHeDaoTaoList();

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

      // Lấy hàng tiêu đề (row 4 trong file Excel)
      const headerRow = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        range: 3,
      })[0] || [];

      const validHeaders = headerRow.map((h) => (h || "").toString().trim());

      // Đọc dữ liệu, luôn đọc TEXT
      const rawRows = XLSX.utils.sheet_to_json(sheet, {
        header: validHeaders,
        range: 4,
        defval: "",
        raw: false,          // GIỮ TEXT, KHÔNG CHO LẤY SERIAL
        cellText: true,      // LUÔN LẤY `.w` thay vì `.v`
      });

      // Buộc lấy `.w` cho mọi cell vì sheet_to_json đôi khi trộn .v
      const range = XLSX.utils.decode_range(sheet["!ref"]);

      rawRows.forEach((row, rowIndex) => {
        let realRowNumber = rowIndex + 5;  // vì bắt đầu đọc từ dòng 5
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
    // Dựa vào ảnh của bạn, đây là các cột thông tin chung bên trái
    const columnsToMerge = [
      "TT",
      "Mã HP",
      "Số TC",
      "Lớp học phần",
      "Giáo Viên",
      "Số SV",
      "ST/ tuần",
    ];
    // LƯU Ý: KHÔNG đưa 'start_date', 'end_date', 'room', 'lecturer' vào đây

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
      "QC": "qc",
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

    const majorMap = {
      "B": "CB",        // Cơ bản
      "C": "CNTT",      // Công nghệ thông tin
      "D": "ĐTVM",      // Điện tử vi mạch
      "A": "ATTT",      // An toàn thông tin
      "M": "MM",        // Mật mã
      "P": "ĐTPH",      // Địa điểm phân hiệu
    }

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

    let preTT = 0;

    for (let i = 0; i < renamedData.length; i++) {
      const row = renamedData[i];
      // Tìm hệ đào tạo của lớp học phần
      const classType = getFirstParenthesesContent(row.course_name) || "";

      row.he_dao_tao = await getHeDaoTao(classType, heDaoTaoArr);

      row.bonus_time = 1;

      if (row.he_dao_tao.includes("Cao học")) {
        row.bonus_time = 1.5;
      } else if (row.he_dao_tao.includes("Nghiên cứu sinh")) {
        row.bonus_time = 2.0;
      }

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

      row.qc = row.ll_total * row.bonus_time * row.student_bonus;

      // Gán lại tt phục vụ quy chuẩn
      if (i > 0) {
        // Chỉnh sửa tt phục vụ quy chuẩn
        if (row.tt !== preTT) {
          preTT = row.tt;
          row.tt = ++lastTTValue;
        } else {
          // Nếu tt giống với dòng trước, giữ nguyên giá trị
          row.tt = lastTTValue;
        }
      } else {
        // Dòng đầu tiên
        preTT = row.tt;
        row.tt = ++lastTTValue;
      }
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

    // Insert batch
    const insertResult = await pool.query(
      `INSERT INTO course_schedule_details (
        TT, course_code, credit_hours, student_quantity, student_bonus, bonus_time, ll_code, ll_total, qc, course_name, study_format, periods_per_week, 
        day_of_week, period_start, period_end, classroom, start_date, end_date, lecturer, major, he_dao_tao, dot, ki_hoc, nam_hoc
      ) VALUES ?`,
      [values]
    );

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
