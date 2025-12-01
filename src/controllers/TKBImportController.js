const XLSX = require("xlsx");
const pool = require("../config/Pool");

function getFirstParenthesesContent(str) {
  const match = str.match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

function extractPrefix(str) {
  const match = str.match(/^[A-Za-z]+/);
  return match ? match[0] : "";
}

async function getHeDaoTao(classType) {
  // tách phần chữ cái trước dãy số
  const prefix = extractPrefix(classType);

  // Lấy tất cả cấu hình
  const [rows] = await pool.query(`
      SELECT viet_tat, gia_tri_so_sanh 
      FROM kitubatdau
  `);

  // Tìm đúng viet_tat
  const found = rows.find(r => r.viet_tat.toUpperCase() === prefix.toUpperCase());

  // Nếu không tìm thấy → mặc định
  return found ? found.gia_tri_so_sanh : "Đại học (Đóng học phí)";
}


const importExcelTKB = async (req, res) => {
  const semester = JSON.parse(req.body.semester);
  let lastTTValue = JSON.parse(req.body.lastTTValue);
  const location = (req.body.location || "hvktmm").trim().toLowerCase(); // Mặc định là hvktmm, normalize

  console.log("📍 Location received:", location); // Debug log

  const { dot, ki, nam } = semester;

  if (!req.file) {
    return res.status(400).json({ message: "Vui lòng chọn file Excel." });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

    let allData = [];

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];

      // Lấy hàng tiêu đề (row 4 trong file Excel)
      const headerRow =
        XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          range: 3, // chỉ đọc hàng thứ 4
        })[0] || [];

      // Lọc header rỗng
      const validHeaders = headerRow.map((h) => (h || "").toString().trim());

      // Đọc dữ liệu từ hàng thứ 5 trở đi
      const data = XLSX.utils.sheet_to_json(sheet, {
        header: validHeaders,
        range: 4,
        defval: "",
        raw: false,
        cellDates: true,
      });

      // Gắn tên sheet vào từng dòng
      data.forEach((row) => {
        row.sheet_name = sheetName;
      });

      allData = allData.concat(data);
    });

    if (allData.length === 0) {
      return res.status(400).json({ message: "File Excel không có dữ liệu." });
    }

    // Xử lý merge: ô trống lấy giá trị từ dòng trên
    for (let i = 1; i < allData.length; i++) {
      for (const key of Object.keys(allData[i])) {
        if (allData[i][key] === "") {
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
      "D": "DTVM",      // Điện tử vi mạch
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
      if (row.period_range && row.period_range.includes("->")) {
        const [startTiet, endTiet] = row.period_range.split("->").map(Number);
        const tietBuoi = endTiet - startTiet + 1;
        const startDate = parseDateDDMMYY(row.start_date);
        const endDate = parseDateDDMMYY(row.end_date);
        const soTuan = Math.ceil(
          (endDate - startDate) / (7 * 24 * 60 * 60 * 1000)
        );
        const tongTiet = soTuan * tietBuoi;
        tongTietMap[row.course_name] =
          (tongTietMap[row.course_name] || 0) + tongTiet;
      }
    }

    let preTT = 0;

    for (let i = 0; i < renamedData.length; i++) {
      const row = renamedData[i];
      // Tìm hệ đào tạo của lớp học phần
      const classType = getFirstParenthesesContent(row.course_name) || "";

      row.he_dao_tao = await getHeDaoTao(classType);

      row.bonus_time = 1;

      if (row.he_dao_tao.includes("Cao học")) {
        row.bonus_time = 1.5;
      } else if (row.he_dao_tao.includes("Nghiên cứu sinh")) {
        row.bonus_time = 2.0;
      }

      // Thêm period_start, period_end, ll_total vào từng dòng
      let tmp = 0;
      if (row.period_range.includes("->")) {
        const [start, end] = row.period_range.split("->");
        row.period_start = start || null;
        row.period_end = end || null;

        if (start >= 13) {
          tmp++;
        }
      } else {
        row.period_start = null;
        row.period_end = null;
      }

      const dayOfWeek = row.day_of_week.trim().toUpperCase();
      if (dayOfWeek == "CN" || dayOfWeek == "7") {
        tmp++;
      }

      if (tmp > 0) {
        row.bonus_time = row.bonus_time * 1.5;
      }

      // Số tiết lên lớp theo Ngày bắt đầu, ngày kết thúc và tiết học
      //row.ll_total = tongTietMap[row.course_name] || 0;

      // Quy chuẩn = số tiết lên lớp * hệ số ngoài giờ * hệ số lớp đông
      row.student_bonus = 0;
      switch (true) {
        case row.student_quantity >= 101:
          row.student_bonus = 1.5;
          break;
        case row.student_quantity >= 81:
          row.student_bonus = 1.4;
          break;
        case row.student_quantity >= 66:
          row.student_bonus = 1.3;
          break;
        case row.student_quantity >= 51:
          row.student_bonus = 1.2;
          break;
        case row.student_quantity >= 41:
          row.student_bonus = 1.1;
          break;
        default:
          row.student_bonus = 1.0;
          break;
      }

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
      formatDateForMySQL(parseDateDDMMYY(row.start_date)),
      formatDateForMySQL(parseDateDDMMYY(row.end_date)),
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
        TT, course_id, credit_hours, student_quantity, student_bonus, bonus_time, ll_code, ll_total, qc, course_name, study_format, periods_per_week, 
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

function formatDateForMySQL(date) {
  if (!(date instanceof Date) || isNaN(date)) return null;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

module.exports = {
  importExcelTKB,
};
