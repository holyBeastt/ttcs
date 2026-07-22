const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const createPoolConnection = require("../config/databasePool");
const archiver = require("archiver");
require("dotenv").config(); // Load biến môi trường
const exportPhuLucDAController = require("../controllers/exportPhuLucDAController");
const gvmServices = require("../services/gvmServices");

// Import các thư viện cần thiết để tạo file Word
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  VerticalAlign,
  WidthType,
  BorderStyle,
  PageOrientation,
} = require("docx");

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Đệ quy xóa thư mục con
        deleteFolderRecursive(curPath);
      } else {
        // Xóa file
        fs.unlinkSync(curPath);
      }
    });
    // Xóa thư mục rỗng
    fs.rmdirSync(folderPath);
  }
}
const convertToRoman = (num) => {
  const romanNumerals = [
    { value: 1000, numeral: "M" },
    { value: 900, numeral: "CM" },
    { value: 500, numeral: "D" },
    { value: 400, numeral: "CD" },
    { value: 100, numeral: "C" },
    { value: 90, numeral: "XC" },
    { value: 50, numeral: "L" },
    { value: 40, numeral: "XL" },
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 1, numeral: "I" },
  ];

  let result = "";
  for (const { value, numeral } of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
};

// Hàm chuyển đổi số thành chữ
const numberToWords = (num) => {
  if (num === 0) return "Không đồng"; // Xử lý riêng trường hợp 0

  const ones = [
    "",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];
  const teens = [
    "mười",
    "mười một",
    "mười hai",
    "mười ba",
    "mười bốn",
    "mười lăm",
    "mười sáu",
    "mười bảy",
    "mười tám",
    "mười chín",
  ];
  const tens = [
    "",
    "",
    "hai mươi",
    "ba mươi",
    "bốn mươi",
    "năm mươi",
    "sáu mươi",
    "bảy mươi",
    "tám mươi",
    "chín mươi",
  ];
  const thousands = ["", "nghìn", "triệu", "tỷ"];

  let words = "";
  let unitIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk) {
      let chunkWords = [];
      const hundreds = Math.floor(chunk / 100);
      const remainder = chunk % 100;

      // Xử lý hàng trăm
      if (hundreds) {
        chunkWords.push(ones[hundreds]);
        chunkWords.push("trăm");
      }

      // Xử lý phần dư (tens và ones)
      if (remainder < 10) {
        if (remainder > 0) {
          if (hundreds) chunkWords.push("lẻ");
          chunkWords.push(ones[remainder]);
        }
      } else if (remainder < 20) {
        chunkWords.push(teens[remainder - 10]);
      } else {
        const tenPlace = Math.floor(remainder / 10);
        const onePlace = remainder % 10;

        chunkWords.push(tens[tenPlace]);
        if (onePlace === 1 && tenPlace > 1) {
          chunkWords.push("mốt");
        } else if (onePlace === 5 && tenPlace > 0) {
          chunkWords.push("lăm");
        } else if (onePlace) {
          chunkWords.push(ones[onePlace]);
        }
      }

      // Thêm đơn vị nghìn, triệu, tỷ
      if (unitIndex > 0) {
        chunkWords.push(thousands[unitIndex]);
      }

      words = chunkWords.join(" ") + " " + words;
    }
    num = Math.floor(num / 1000);
    unitIndex++;
  }

  // Hàm viết hoa chữ cái đầu tiên
  const capitalizeFirstLetter = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  return capitalizeFirstLetter(words.trim() + " đồng");
};

// Hàm chuyển đổi số thập phân thành chữ
const numberWithDecimalToWords = (num) => {
  const [integerPart, decimalPart] = num.toString().split(".");
  const integerWords = numberToWords(parseInt(integerPart, 10));
  let decimalWords = "";

  if (decimalPart) {
    decimalWords =
      "phẩy " +
      decimalPart
        .split("")
        .map((digit) => ones[parseInt(digit)])
        .join(" ");
  }

  return `${integerWords}${decimalWords ? " " + decimalWords : ""}`.trim();
};

// Hàm định dạng ngày/tháng/năm
const formatDate1 = (date) => {
  try {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`; // Định dạng ngày/tháng/năm
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

// Hàm định dạng ngày tháng năm
const formatDate = (date) => {
  try {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();

    return `ngày ${day} tháng ${month} năm ${year}`; // Định dạng ngày tháng năm
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};
// Tính toán khoảng thời gian thực hiện
const formatDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Định dạng ngày bắt đầu
  const startDay = start.getDate().toString().padStart(2, "0");
  const startMonth = (start.getMonth() + 1).toString().padStart(2, "0");
  const startYear = start.getFullYear();

  // Định dạng ngày kết thúc
  const endDay = end.getDate().toString().padStart(2, "0");
  const endMonth = (end.getMonth() + 1).toString().padStart(2, "0");
  const endYear = end.getFullYear();

  return `Từ ngày ${startDay}/${startMonth}/${startYear} đến ngày ${endDay}/${endMonth}/${endYear}`;
};

/**
 * Hàm chuyển đổi date cho Excel
 * Excel lưu trữ date dưới dạng serial number (số ngày kể từ 1/1/1900)
 * Nhưng ExcelJS có thể nhận Date object hoặc string ISO
 * @param {*} dateValue - Giá trị date từ database (có thể là Date, string YYYY-MM-DD, null, undefined)
 * @returns {string|null} - String định dạng DD/MM/YYYY hoặc null
 */
const formatDateForExcel = (dateValue) => {
  try {
    // Nếu null, undefined hoặc chuỗi rỗng
    if (!dateValue || dateValue === '') {
      return null;
    }

    // Nếu đã là Date object hợp lệ
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) return null;
      const day = String(dateValue.getDate()).padStart(2, '0');
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const year = dateValue.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Nếu là string
    if (typeof dateValue === 'string') {
      // Loại bỏ khoảng trắng
      const trimmed = dateValue.trim();
      if (trimmed === '' || trimmed === '0000-00-00') {
        return null;
      }

      // Xử lý định dạng YYYY-MM-DD từ database
      if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parts = trimmed.split('-');
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];

        // Kiểm tra giá trị hợp lệ
        if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
          return null;
        }

        // Trả về string định dạng DD/MM/YYYY
        return `${day}/${month}/${year}`;
      }

      // Fallback cho các định dạng khác
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) return null;

      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Nếu là number (timestamp)
    if (typeof dateValue === 'number') {
      const parsed = new Date(dateValue);
      if (isNaN(parsed.getTime())) return null;
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Các trường hợp khác
    return null;
  } catch (error) {
    console.error('Error in formatDateForExcel:', error);
    return null;
  }
};

// Controller xuất nhiều hợp đồng
const exportMultipleContracts = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;
    let { dot, ki, namHoc, khoa, he_dao_tao, teacherName } = req.query;

    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt hoặc năm học");
    }

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    connection = await createPoolConnection();

    const teachers = await getExportData(
      connection,
      dot,
      ki,
      namHoc,
      khoa,
      he_dao_tao,
      teacherName
    );

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/hopDongDA';</script>"
      );
    }

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Dữ liệu để tạo file thống kê chuyển khoản
    const summaryData = [];
    const summaryData2 = [];

    // Lấy dữ liệu phòng ban
    const [phongBanList] = await connection.query("SELECT * FROM phongban");

    // const heDaoTaoData = await gvmServices.getHeDaoTaoData();

    // Lấy thông tin hệ đào tạo từ ID
    const [[heDaoTaoInfo]] = await connection.query(
      "SELECT he_dao_tao, loai_hinh FROM he_dao_tao WHERE id = ?",
      [he_dao_tao]
    );
    const tenHeDaoTao = heDaoTaoInfo?.he_dao_tao || "";
    const loaiHinh = heDaoTaoInfo?.loai_hinh || "";

    // Tạo hợp đồng cho từng giảng viên
    for (const teacher of teachers) {
      const tienText = teacher.ThanhTien || 0;
      const tienThueText = teacher.TruThue || 0;
      const tienThucNhanText = teacher.ThucNhan || 0;

      let hoTen = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();

      // Ghi dữ liệu cho thống kê chuyển khoản
      summaryData.push({
        HoTen: hoTen,
        DienThoai: teacher.DienThoai,
        MaSoThue: teacher.MaSoThue,
        STK: teacher.STK,
        NganHang: teacher.NganHang,
        ThucNhan: tienThucNhanText,
        TongTien: tienText,
        TruThue: tienThueText,
        SoHopDong: teacher.SoHopDong,
      });

      summaryData2.push({
        HoTen: hoTen,
        DienThoai: teacher.DienThoai,
        MaSoThue: teacher.MaSoThue,
        STK: teacher.STK,
        NganHang: teacher.NganHang,
        ThucNhan: tienText,
        SoHopDong: teacher.SoHopDong,
      });

      // ✅ REFACTORED: Sử dụng generateDoAnContract thay vì duplicate code
      try {
        const filePath = await generateDoAnContract(teacher, tempDir, phongBanList);
        if (!filePath) {
          console.error(`Failed to generate contract for ${hoTen}`);
        }
      } catch (error) {
        console.error(`Error generating contract for ${hoTen}:`, error);
      }
    }

    // Tạo file thống kê chuyển khoản
    const noiDung = `Đợt ${dot} - Kỳ ${ki} năm học ${namHoc} - ${tenHeDaoTao}`;
    const summaryDoc = createTransferDetailDocument(
      summaryData,
      noiDung,
      "sau thuế"
    );
    const summaryBuf = await Packer.toBuffer(summaryDoc);
    const summaryName = `ĐATN_${tenHeDaoTao}_Thongke_chuyenkhoan_sauthue.docx`;
    fs.writeFileSync(path.join(tempDir, summaryName), summaryBuf);

    console.log("Tạo file thống kê chuyển khoản sau thuế thành công");

    // Tạo file thống kê chuyển khoản trước thuế
    const summaryDoc2 = createTransferDetailDocument(
      summaryData2,
      noiDung,
      "trước thuế"
    );
    const summaryBuf2 = await Packer.toBuffer(summaryDoc2);
    const summaryName2 = `ĐATN_${tenHeDaoTao}_Thongke_chuyenkhoan_truocthue.docx`;
    fs.writeFileSync(path.join(tempDir, summaryName2), summaryBuf2);

    console.log("Tạo file thống kê chuyển khoản trước thuế thành công");

    // Tạo file Excel báo cáo thuế
    const taxReportData = summaryData.map((item, index) => {
      // Sử dụng TongTien nếu có, nếu không thì tính ngược từ ThucNhan
      const tienTruocThue = item.TongTien || 0;
      // Nếu số tiền <= 2 triệu thì không có thuế
      const thuePhaiTra = item.TruThue || 0;

      return {
        stt: index + 1,
        contractNumber: item.SoHopDong,
        executor: item.HoTen,
        expenseDescription: `Hợp đồng giao khoán công việc`,
        idNumber: teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.CCCD || '',
        issueDate: formatDateForExcel(teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.NgayCapCCCD),
        issuePlace: teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.NoiCapCCCD || '',
        idAddress: teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.DiaChi || '',
        phoneNumber: teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.DienThoai || '',
        taxCode: item.MaSoThue,
        amount: Number(tienTruocThue), // Tổng tiền trước thuế
        taxDeducted: Number(thuePhaiTra), // Thuế 10%
        netAmount: Number(item.ThucNhan) // Tiền sau thuế
      };
    });

    const taxReportWorkbook = createTaxReportWorkbook(taxReportData);
    const taxReportName = `ĐATN_Daihoc_BangKeTongHopThue.xlsx`;
    await taxReportWorkbook.xlsx.writeFile(path.join(tempDir, taxReportName));

    console.log("Tạo file bảng kê tổng hợp thuế thành công");

    // === Phần fix: lưu ZIP ra ngoài tempDir ===
    const zipOutputDir = path.join(__dirname, "..", "public", "tempZips");
    fs.mkdirSync(zipOutputDir, { recursive: true });

    const zipName = `HopDong_${tenHeDaoTao}_Dot${dot}_${namHoc}_${khoa || "all"
      }.zip`;
    const zipPath = path.join(zipOutputDir, zipName);

    const archive = archiver("zip", { zlib: { level: 9 } });
    const output = fs.createWriteStream(zipPath);
    archive.pipe(output);
    archive.directory(tempDir, false);

    await new Promise((resolve, reject) => {
      archive.on("error", reject);
      output.on("close", resolve);
      archive.finalize();
    });

    // Gửi file và XÓA sau khi tải
    res.download(zipPath, zipName, (err) => {
      if (err) {
        console.error("Error sending zip file:", err);
        return;
      }
      // Dọn dẹp tempDir và file ZIP
      setTimeout(() => {
        // Xóa các file trong tempDir
        if (fs.existsSync(tempDir)) {
          fs.readdirSync(tempDir).forEach((f) => {
            fs.unlinkSync(path.join(tempDir, f));
          });
          fs.rmdirSync(tempDir);
        }
        // Xóa file ZIP
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
        }
      }, 1000);
    });
  } catch (error) {
    console.error("Error in exportMultipleContracts:", error);
    res.status(500).send(`Lỗi khi tạo file hợp đồng: ${error.message}`);
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const gethopDongDASite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `SELECT HoTen, MaPhongBan FROM gvmoi`;

    const [gvmoiList] = await connection.query(query);

    res.render("hopDongDA.ejs", {
      gvmoiList: gvmoiList,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const getExportAdditionalDoAnGvmSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("doan.taiTongHopHopDong.ejs", {
      gvmoiList: gvmoiList, // Đảm bảo rằng biến này được truyền vào view
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const doanServices = require("../services/doanServices");

const exportAdditionalDoAnGvm = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;

    let { dot, ki, namHoc, khoa, he_dao_tao, teacherName } = req.query;

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    connection = await createPoolConnection();

    if (!dot || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt hoặc năm học");
    }

    // Lấy dữ liệu phòng ban
    const [phongBanList] = await connection.query("SELECT * FROM phongban");

    // Lấy dữ liệu tiền lương
    const tienLuongList = await getTienLuongList(connection);

    if (!tienLuongList || tienLuongList.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy tiền lương phù hợp với giảng viên'); window.location.href='/api/do-an/hd-gvm/additional-file-site';</script>"
      );
    }

    const teachers = await getExportData(
      connection,
      dot,
      ki,
      namHoc,
      khoa,
      he_dao_tao,
      teacherName,
    );

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/api/do-an/hd-gvm/additional-file-site';</script>"
      );
    }

    const phuLucData = await doanServices.getPhuLucDAData(dot, ki, namHoc, khoa, he_dao_tao, teacherName);

    if (phuLucData.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/api/do-an/hd-gvm/additional-file-site';</script>"
      );
    }

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const contractFiles = [];

    // Tạo hợp đồng cho từng giảng viên
    for (const teacher of teachers) {
      let hoTenTrim = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();
      const teacherZipName = `${hoTenTrim}_${teacher.CCCD}.zip`;
      const teacherZipPath = path.join(tempDir, teacherZipName);
      const teacherArchive = archiver("zip", { zlib: { level: 9 } });
      const output = fs.createWriteStream(teacherZipPath);
      teacherArchive.pipe(output);

      // Lưu các file cần xóa sau khi nén
      const filesToDelete = [];
      const dirsToDelete = [];

      // Tạo file hợp đồng
      const filePathContract = await generateDoAnContract(
        teacher,
        tempDir,
        phongBanList
      );

      // Lấy file tài liệu bổ sung
      const filePathAdditional = await generateAdditionalFile(teacher, tempDir);
      // Lấy file phụ lục
      const phuLucTeacher = phuLucData.filter(
        (item) => item.GiangVien.trim() == teacher.HoTen.trim()
      );

      const filePathAppendix =
        await exportPhuLucDAController.getExportPhuLucDAPath(
          req,
          res,
          connection,
          dot,
          ki,
          namHoc,
          khoa,
          he_dao_tao,
          teacherName,
          phuLucTeacher
        );

      if (
        !fs.existsSync(filePathContract) ||
        fs.statSync(filePathContract).size === 0
      ) {
        console.error(`File bị lỗi hoặc trống: ${filePathContract}`);
        continue; // Bỏ qua file bị lỗi
      }
      if (
        filePathAdditional &&
        (!fs.existsSync(filePathAdditional) ||
          fs.statSync(filePathAdditional).size === 0)
      ) {
        console.error(`File bị lỗi hoặc trống: ${filePathAdditional}`);
        continue; // Bỏ qua file bị lỗi
      }
      if (
        filePathAppendix &&
        (!fs.existsSync(filePathAppendix) ||
          fs.statSync(filePathAppendix).size === 0)
      ) {
        console.error(`File bị lỗi hoặc trống: ${filePathAppendix}`);
        continue; // Bỏ qua file bị lỗi
      }

      if (filePathContract) {
        teacherArchive.file(filePathContract, {
          name: path.basename(filePathContract),
        });
      }
      if (filePathAdditional) {
        teacherArchive.file(filePathAdditional, {
          name: path.basename(filePathAdditional),
        });
      }
      if (filePathAppendix) {
        teacherArchive.file(filePathAppendix, {
          name: path.basename(filePathAppendix),
        });

        filesToDelete.push(filePathAppendix);
        const appendixDir = path.dirname(filePathAppendix);
        dirsToDelete.push(appendixDir);
      }

      await teacherArchive.finalize();
      contractFiles.push(teacherZipPath);

      // Sau khi zip xong mới xóa file
      for (const filePath of filesToDelete) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("Đã xóa file:", filePath);
        }
      }

      for (const dirPath of dirsToDelete) {
        try {
          if (fs.existsSync(dirPath) && fs.readdirSync(dirPath).length === 0) {
            fs.rmdirSync(dirPath);
            console.log("Đã xóa thư mục:", dirPath);
          }
        } catch (err) {
          console.log("Không thể xóa thư mục (có thể không rỗng):", dirPath);
        }
      }
    }

    // Tạo file ZIP tổng hợp chứa tất cả file ZIP của giảng viên
    let zipFileName = `TongHopHopDong_DoAn_Dot${dot}_Ki${ki}_${namHoc}_DoAn`;
    if (teacherName) {
      zipFileName += `_${teacherName}.zip`;
    } else {
      zipFileName += `_${khoa || "all"}.zip`;
    }
    const zipPath = path.join(tempDir, zipFileName);
    const archive = archiver("zip", { zlib: { level: 9 } });
    const output = fs.createWriteStream(zipPath);
    archive.pipe(output);

    // Thêm tất cả các file ZIP của giảng viên vào file ZIP tổng hợp
    contractFiles.forEach((file) => {
      archive.file(file, { name: path.basename(file) });
    });

    //await archive.finalize();

    await new Promise((resolve, reject) => {
      output.on("close", resolve);
      archive.on("error", reject);
      archive.finalize();
    });

    // Kiểm tra file ZIP trước khi gửi
    if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size === 0) {
      console.error("Lỗi: File ZIP bị trống hoặc hỏng");
      return res.status(500).send("Lỗi: Không thể tạo file ZIP.");
    }

    // Gửi file ZIP cuối cùng về cho client
    res.download(zipPath, zipFileName, (err) => {
      if (!err) {
        setTimeout(() => {
          try {
            if (fs.existsSync(tempDir)) {
              fs.readdirSync(tempDir).forEach((file) =>
                fs.unlinkSync(path.join(tempDir, file))
              );
              fs.rmdirSync(tempDir);
            }
          } catch (error) {
            console.error("Error cleaning up temporary directory:", error);
          }
        }, 1000);
      }
    });
  } catch (error) {
    console.error("Error in exportMultipleContracts:", error);
    res.status(500).send(`Lỗi khi tạo file hợp đồng: ${error.message}`);
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const generateAdditionalFile = async (teacher, tempDir) => {
  const teacherFolderPath = path.resolve(
    __dirname,
    "..",
    "..",
    "Giang_Vien_Moi",
    teacher.MaPhongBan,
    teacher.MaBoMon,
    teacher.HoTen
  );

  if (!fs.existsSync(teacherFolderPath)) return null; // Không có thư mục

  const files = fs.readdirSync(teacherFolderPath);
  const allowedExtensions = process.env.ALLOWED_FILE_EXTENSIONS.split(",").map(
    (ext) => ext.toLowerCase()
  );

  // const documentFile = files.find((f) =>
  //   allowedExtensions.some((ext) => f.toLowerCase().endsWith("." + ext))
  // );

  const documentFile = files.find((f) => {
    const baseName = path.parse(f).name; // Lấy tên file không có phần mở rộng
    const ext = path.extname(f).toLowerCase().slice(1); // Lấy phần mở rộng không có dấu chấm
    return (
      baseName === `${teacher.MaPhongBan}_${teacher.HoTen}` &&
      allowedExtensions.includes(ext)
    );
  });

  if (!documentFile) return null; // Không tìm thấy file hợp lệ

  const oldFilePath = path.join(teacherFolderPath, documentFile);
  // const newFileName = `BoSung_${teacher.HoTen}${path.extname(documentFile)}`;
  // const newFilePath = path.join(teacherFolderPath, newFileName);

  // // Đổi tên file
  // fs.renameSync(oldFilePath, newFilePath);

  return oldFilePath;
};

/**
 * Tự động soi Template Word và định dạng Số hợp đồng thông minh:
 * - Nếu template đã gõ sẵn đuôi (/HĐ-ĐT), trả về số thuần (DA003)
 * - Nếu template chưa có đuôi, trả về đầy đủ (DA003/HĐ-ĐT)
 */
const resolveContractNumberForTemplate = (zip, rawSoHopDong, suffix = "/HĐ-ĐT") => {
  if (!rawSoHopDong || !rawSoHopDong.trim()) return "";
  const fullSoHopDong = rawSoHopDong.trim();
  const cleanNumber = fullSoHopDong.includes("/") ? fullSoHopDong.split("/")[0] : fullSoHopDong;

  try {
    const xmlText = zip.file("word/document.xml")?.asText() || "";
    const textOnly = xmlText.replace(/<[^>]+>/g, "");
    const cleanSuffix = suffix.replace(/^\//, "");

    if (textOnly.includes(suffix) || (cleanSuffix && textOnly.includes(cleanSuffix))) {
      return cleanNumber;
    }
  } catch (e) {
    console.warn("Error reading template XML:", e);
  }

  return fullSoHopDong.includes("/") ? fullSoHopDong : `${fullSoHopDong} ${suffix}`;
};

const generateDoAnContract = async (teacher, tempDir, phongBanList) => {
  try {
    const soTiet = teacher.SoTiet || 0;

    const mucTien = teacher.TienMoiGiang || 0;
    const gioiTinh = teacher.GioiTinh; // Đảm bảo rằng bạn đang lấy giá trị đúng

    let danhXung;

    // Giả sử bạn có biến gioiTinh chứa giá trị giới tính
    if (gioiTinh === "Nam") {
      danhXung = "Ông";
    } else if (gioiTinh === "Nữ") {
      danhXung = "Bà";
    } else {
      danhXung = ""; // Hoặc có thể gán một giá trị mặc định khác
    }
    const maPhongBan = teacher.MaPhongBan; // Đảm bảo rằng bạn đang lấy giá trị đúng

    let tenNganh;

    const phongBan = phongBanList.find(
      (item) =>
        item.MaPhongBan.trim().toUpperCase() == maPhongBan.trim().toUpperCase()
    );

    if (phongBan) {
      tenNganh = phongBan.TenPhongBan; // Lấy từ object tìm được
    } else {
      tenNganh = "Không xác định";
    }

    const ThanhTien = teacher.ThanhTien || 0; // Tính tổng tiền
    // Nếu số tiền <= 2 triệu đồng thì không tính thuế
    const tienThueText = teacher.TruThue || 0;
    const tienThucNhanText = teacher.ThucNhan || 0;
    const thoiGianThucHien = formatDateRange(
      teacher.NgayBatDau,
      teacher.NgayKetThuc
    );

    let hoTen = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();

    const data = {
      Số_hợp_đồng: teacher.SoHopDong || "",
      Số_thanh_lý: teacher.SoThanhLyHopDong || "",
      Ngày_bắt_đầu: formatDate(teacher.NgayBatDau),
      Ngày_kết_thúc: formatDate(teacher.NgayKetThuc),
      Danh_xưng: danhXung,
      Họ_và_tên: hoTen,
      CCCD: teacher.CCCD,
      Ngày_cấp: formatDate1(teacher.NgayCapCCCD),
      Nơi_cấp: teacher.NoiCapCCCD,
      Chức_vụ: teacher.ChucVu,
      Cấp_bậc: teacher.HocVi,
      Hệ_số_lương: Number(teacher.HSL).toFixed(2).replace(".", ","),
      Địa_chỉ_theo_CCCD: teacher.DiaChi,
      Điện_thoại: teacher.DienThoai,
      Mã_số_thuế: teacher.MaSoThue,
      Số_tài_khoản: teacher.STK,
      Email: teacher.Email,
      Tại_ngân_hàng: teacher.NganHang,
      Số_tiết: teacher.SoTiet.toString().replace(".", ","),
      Ngày_kí_hợp_đồng: formatDate(teacher.NgayKi),
      // ✅ Sử dụng giá trị từ database
      Tiền_text: Number(ThanhTien).toLocaleString("vi-VN"),
      Bằng_chữ_số_tiền: numberToWords(ThanhTien),
      Tiền_thuế_Text: Number(tienThueText).toLocaleString("vi-VN"),
      Tiền_thực_nhận_Text: Number(tienThucNhanText).toLocaleString("vi-VN"),
      Bằng_chữ_của_thực_nhận: numberToWords(tienThucNhanText),
      Đợt: teacher.Dot,
      Năm_học: teacher.NamHoc,
      Thời_gian_thực_hiện: thoiGianThucHien,
      Mức_tiền: Number(mucTien).toLocaleString("vi-VN"),
      // ✅ Các field với suffix "1" cũng dùng giá trị từ DB
      Tiền_text1: Number(ThanhTien).toLocaleString("vi-VN"),
      Bằng_chữ_số_tiền1: numberToWords(ThanhTien),
      Tiền_thuế_Text1: Number(tienThueText).toLocaleString("vi-VN"),
      Tiền_thực_nhận_Text1: Number(tienThucNhanText).toLocaleString("vi-VN"),
      Bằng_chữ_của_thực_nhận1: numberToWords(tienThucNhanText),
      Nơi_công_tác: teacher.NoiCongTac,
      Khóa: teacher.KhoaSinhVien || teacher.KhoaDaoTao || "",
      Ngành: teacher.Nganh || tenNganh || "",
      Cơ_sở_đào_tạo: teacher.CoSoDaoTao || "Học viện Kỹ thuật mật mã",
    };
    // Chọn template dựa trên loại hợp đồng
    let templateFileName = "HopDongDA.docx";

    const templatePath = path.resolve(
      __dirname,
      "../templates",
      templateFileName
    );

    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);

    // Smart auto-detection contract number format based on template XML
    data.Số_hợp_đồng = resolveContractNumberForTemplate(zip, teacher.SoHopDong, "/HĐ-ĐT");
    data.Số_thanh_lý = resolveContractNumberForTemplate(zip, teacher.SoThanhLyHopDong, "/HĐNT-ĐT");

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: "«",
        end: "»",
      },
    });

    doc.render(data);

    const buf = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    let hoTenTrim = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();

    const fileName = `HopDong_${hoTenTrim}_${teacher.CCCD}.docx`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, buf);

    return filePath; // Trả về đường dẫn file để dùng sau này

    // const fileName = `HopDong_${teacher.HoTen}.docx`;
    // fs.writeFileSync(path.join(tempDir, fileName), buf);
  } catch (error) {
    console.log(error);
  }
};

const getExportData = async (
  connection,
  dot,
  ki,
  namHoc,
  khoa,
  he_dao_tao,
  teacherName
) => {
  try {
    let query = `
      SELECT 
        ed.CCCD,
        gv.DienThoai,
        ed.Email,
        ed.MaSoThue,
        ed.GiangVien AS HoTen,
        ed.NgaySinh,
        ed.NgayCapCCCD,
        ed.GioiTinh,
        ed.STK,
        ed.HocVi,
        ed.ChucVu,
        ed.HSL,
        ed.NoiCapCCCD,
        ed.DiaChi,
        ed.NganHang,
        ed.NoiCongTac,
        ed.Dot,
        ed.ki,
        GROUP_CONCAT(DISTINCT ed.khoa_sinh_vien SEPARATOR ', ') AS KhoaSinhVien,
        GROUP_CONCAT(DISTINCT ed.nganh SEPARATOR ', ') AS Nganh,
        MIN(ed.NgayBatDau) AS NgayBatDau,
        MAX(ed.NgayKetThuc) AS NgayKetThuc,
        SUM(ed.SoTiet) AS SoTiet,
        MAX(ed.TienMoiGiang) AS TienMoiGiang,
        SUM(ed.ThanhTien) AS ThanhTien,
        SUM(ed.TruThue) AS TruThue,
        SUM(ed.ThucNhan) AS ThucNhan,
        ed.NamHoc,
        gv.MaPhongBan,
        gv.MonGiangDayChinh AS MaBoMon,
        ed.SoHopDong,
        ed.SoThanhLyHopDong,
        ed.CoSoDaoTao
      FROM gvmoi gv
      JOIN exportdoantotnghiep ed ON gv.CCCD = ed.CCCD
      WHERE 
        ed.Dot = ?
        AND ed.ki = ?
        AND ed.NamHoc = ?
        AND ed.he_dao_tao = ?
        AND gv.isQuanDoi != 1
    `;

    const params = [dot, ki, namHoc, he_dao_tao];

    // 👉 nối theo khoa
    if (khoa && khoa !== "ALL") {
      query += ` AND gv.MaPhongBan LIKE ?`;
      params.push(`%${khoa}%`);
    }

    // 👉 nối theo tên giảng viên
    if (teacherName) {
      query += ` AND gv.HoTen LIKE ?`;
      params.push(`%${teacherName}%`);
    }

    // GROUP BY cố định
    query += `
      GROUP BY 
        ed.CCCD,
        gv.DienThoai,
        ed.Email,
        ed.MaSoThue,
        ed.GiangVien,
        ed.NgaySinh,
        ed.NgayCapCCCD,
        ed.GioiTinh,
        ed.STK,
        ed.HocVi,
        ed.ChucVu,
        ed.HSL,
        ed.NoiCapCCCD,
        ed.DiaChi,
        ed.NganHang,
        ed.NoiCongTac,
        ed.Dot,
        ed.ki,
        ed.NamHoc,
        gv.MaPhongBan,
        gv.MonGiangDayChinh,
        ed.SoHopDong,
        ed.SoThanhLyHopDong,
        ed.CoSoDaoTao
    `;

    const [rows] = await connection.execute(query, params);
    return rows;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getTienLuongList = async (connection) => {
  const query = `SELECT he_dao_tao, HocVi, SoTien FROM tienluong`;
  const [tienLuongList] = await connection.execute(query);
  return tienLuongList;
};

const getBosungDownloadSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi where id_Gvm != 1`;
    const [gvmoiList] = await connection.query(query);

    res.render("doan.phuLucMinhChungGvm.ejs", {
      gvmoiList: gvmoiList, // Đảm bảo rằng biến này được truyền vào view
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const exportBoSungDownloadData = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;

    let { dot, ki, namHoc, khoa, he_dao_tao, teacherName } = req.query;

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    connection = await createPoolConnection();

    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt hoặc năm học");
    }

    // Lấy dữ liệu phòng ban
    const [phongBanList] = await connection.query("SELECT * FROM phongban");

    // Lấy dữ liệu tiền lương
    const tienLuongList = await getTienLuongList(connection);

    if (!tienLuongList || tienLuongList.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy tiền lương phù hợp với giảng viên'); window.location.href='/api/do-an/hd-gvm/bosung-download-file';</script>"
      );
    }

    const teachers = await getExportData(
      connection,
      dot,
      ki,
      namHoc,
      khoa,
      he_dao_tao,
      teacherName,
    );

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/api/do-an/hd-gvm/bosung-download-file';</script>"
      );
    }

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileList = [];

    // Tạo hợp đồng cho từng giảng viên
    for (const teacher of teachers) {
      // Lấy file tài liệu bổ sung
      const filePathAdditional = await generateAdditionalFile(teacher, tempDir);

      if (filePathAdditional) {
        fileList.push(filePathAdditional);
      }
    }

    if (fileList.length === 0) {
      return res
        .status(400)
        .send(
          `<script>alert('Không có tài liệu bổ sung nào.'); window.location.href='/api/do-an/hd-gvm/bosung-download-file';</script>`
        );
    }

    const zipPath = path.resolve(__dirname, "TaiLieuBoSung.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      let fileName = `file_bo_sung_dot${dot}_${ki}_${namHoc}`;

      if (teacherName) {
        fileName += "_" + teacherName + ".zip";
      } else if (khoa != "ALL") {
        fileName += "_" + khoa + ".zip";
      } else {
        fileName += "_ALL" + ".zip";
      }
      // Gửi file zip về client
      res.download(zipPath, `${fileName}`, (err) => {
        if (err) {
          console.error("Lỗi gửi file:", err.message);
          res.status(500).send("Không thể tải file zip.");
        }

        // Xoá file zip sau khi tải nếu muốn
        fs.unlinkSync(zipPath);
      });
    });

    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(output);

    fileList.forEach((filePath) => {
      archive.file(filePath, { name: path.basename(filePath) });
    });

    await archive.finalize();
  } catch (error) {
    console.error("Error in exportMultipleContracts:", error);
    res.status(500).send(`Lỗi khi tạo file hợp đồng: ${error.message}`);
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// Hàm tạo file thống kê chuyển khoản
function createTransferDetailDocument(
  data = [],
  noiDung = "",
  truocthue_or_sauthue
) {
  // Hàm phụ trợ: tạo ô header
  function createHeaderCell(text, isBold, width = null) {
    // Xử lý xuống dòng bằng cách tách text theo \n
    const textLines = (text || "").split("\n");
    const textRuns = [];

    textLines.forEach((line, index) => {
      if (index > 0) {
        // Thêm line break trước mỗi dòng (trừ dòng đầu tiên)
        textRuns.push(new TextRun({ break: 1 }));
      }
      textRuns.push(
        new TextRun({
          text: line,
          bold: isBold,
          font: "Times New Roman",
          size: 22,
          color: "000000",
        })
      );
    });

    const cellConfig = {
      children: [
        new Paragraph({
          children: textRuns,
          alignment: AlignmentType.CENTER,
        }),
      ],
      verticalAlign: VerticalAlign.CENTER,
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
    };

    // Nếu có width được chỉ định, thêm width vào cell
    if (width) {
      cellConfig.width = { size: width, type: WidthType.DXA };
    }

    return new TableCell(cellConfig);
  } // Hàm phụ trợ: tạo ô bình thường
  function createCell(text, isBold = false, width = null) {
    // Xử lý xuống dòng bằng cách tách text theo \n
    const textLines = (text || "").split("\n");
    const textRuns = [];

    textLines.forEach((line, index) => {
      if (index > 0) {
        // Thêm line break trước mỗi dòng (trừ dòng đầu tiên)
        textRuns.push(new TextRun({ break: 1 }));
      }
      textRuns.push(
        new TextRun({
          text: line,
          bold: isBold,
          font: "Times New Roman",
          size: 22,
          color: "000000",
        })
      );
    });

    const cellConfig = {
      children: [
        new Paragraph({
          children: textRuns,
          alignment: AlignmentType.CENTER,
        }),
      ],
      verticalAlign: VerticalAlign.CENTER,
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
    };

    // Nếu có width được chỉ định, thêm width vào cell
    if (width) {
      cellConfig.width = { size: width, type: WidthType.DXA };
    }

    return new TableCell(cellConfig);
  }

  // Hàm tính tổng tiền
  // function calculateTotal(data) {
  //   return data.reduce((sum, row) => sum + (row.ThucNhan || 0), 0);
  // }

  function calculateTotal(data) {
    return data.reduce((sum, row) => {
      const value = Number(row.ThucNhan || 0);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
  }

  // Hàm định dạng số tiền theo VNĐ
  function formatVND(amount) {
    return Number(amount).toLocaleString("vi-VN");
  }

  // Hàm tạo bảng chi tiết
  function createDetailTable(data) {
    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell("STT", true),
        createHeaderCell("Số HĐ", true, 1950), // Đặt width cố định 1950 twips cho cột Số HĐ (tăng 50px)
        createHeaderCell("Đơn vị thụ hưởng\n(hoặc cá nhân)", true),
        createHeaderCell("SĐT", true),
        createHeaderCell("Mã số thuế", true),
        createHeaderCell("Số tài khoản", true),
        createHeaderCell("Tại ngân hàng", true, 4800), // Đặt width cố định 4800 twips cho cột Tại ngân hàng
        createHeaderCell("Số tiền (VNĐ)", true),
      ],
    });
    const dataRows = data.length
      ? data.map(
        (row, idx) =>
          new TableRow({
            children: [
              createCell((idx + 1).toString()),
              createCell(
                row.SoHopDong
                  ? (row.SoHopDong.includes("/") ? row.SoHopDong : `${row.SoHopDong} /HĐ-ĐT`)
                  : "",
                false,
                1950
              ), // Ô Số HĐ với width cố định (tăng 50px)
              createCell(row.HoTen || ""),
              createCell(row.DienThoai || ""),
              createCell(row.MaSoThue || ""),
              createCell(row.STK || ""),
              createCell(row.NganHang || "", false, 4800), // Ô Tại ngân hàng với width cố định
              createCell(row.ThucNhan ? formatVND(row.ThucNhan) : ""),
            ],
          })
      )
      : Array.from({ length: 4 }).map(
        () =>
          new TableRow({
            children: [
              createCell(""), // STT
              createCell("", false, 1950), // Số HĐ với width cố định (tăng 50px)
              createCell(""), // Đơn vị thụ hưởng
              createCell(""), // SĐT
              createCell(""), // Mã số thuế
              createCell(""), // Số tài khoản
              createCell("", false, 4800), // Tại ngân hàng với width cố định
              createCell(""), // Số tiền
            ],
          })
      );

    const totalAmount = calculateTotal(data);
    const formattedTotalAmount = formatVND(totalAmount);

    const totalRow = new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Tổng cộng",
                  bold: true,
                  font: "Times New Roman",
                  size: 22,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
          columnSpan: 7,
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: formattedTotalAmount || "", // Thay thế null/undefined bằng chuỗi rỗng
                  font: "Times New Roman",
                  size: 22,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        }),
      ],
    });

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
      },
      rows: [headerRow, ...dataRows, totalRow],
    });
  }

  return new Document({
    styles: {
      default: {
        document: {
          font: "Times New Roman",
          size: 22,
          color: "000000",
        },
        paragraph: {
          color: "000000",
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            orientation: PageOrientation.LANDSCAPE, // Đặt orientation là landscape
            margin: {
              top: 567, // 1 cm = 567 twips
              right: 567, // 1 cm
              bottom: 567, // 1 cm
              left: 567, // 1 cm
            },
            size: {
              width: 15840, // A4 landscape width (11 inches = 15840 twips)
              height: 12240, // A4 landscape height (8.5 inches = 12240 twips)
            },
          },
        },
        children: [
          // Header
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "BAN CƠ YẾU CHÍNH PHỦ",
                            bold: true,
                            font: "Times New Roman",
                            size: 24,
                            color: "000000",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "HỌC VIỆN KỸ THUẬT MẬT MÃ",
                            bold: true,
                            font: "Times New Roman",
                            size: 24,
                            color: "000000",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0 },
                      bottom: { style: BorderStyle.NONE, size: 0 },
                      left: { style: BorderStyle.NONE, size: 0 },
                      right: { style: BorderStyle.NONE, size: 0 },
                    },
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 200 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "BẢNG KÊ CHI TIẾT THÔNG TIN CHUYỂN KHOẢN",
                font: "Times New Roman",
                size: 26,
                color: "000000",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Nội dung: `,
                font: "Times New Roman",
                size: 22,
                color: "000000",
              }),
              new TextRun({
                text: `${noiDung || ""}`, // Thay thế null/undefined bằng chuỗi rỗng
                font: "Times New Roman",
                size: 22,
                color: "000000",
              }),
            ],
            spacing: { after: 200 },
          }),
          createDetailTable(data),
          new Paragraph({
            italics: true,
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: `Ghi chú: Số tiền chuyển khoản là số tiền ${truocthue_or_sauthue}`,
                font: "Times New Roman",
                size: 22,
                color: "000000",
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });
}

/**
 * Tạo và trả về Workbook cho bảng kê trừ thuế
 * @param {Array<Object>} records Mảng đối tượng chứa dữ liệu dòng (stt, contractNumber, executor, expenseDescription, idNumber, issueDate, issuePlace, idAddress, taxCode, amount, taxDeducted, netAmount)
 * @returns {ExcelJS.Workbook}
 */
function createTaxReportWorkbook(records) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Bảng kê tổng hợp thuế');

  // Banner & tiêu đề
  worksheet.addRow(['BAN CƠ YẾU CHÍNH PHỦ']);
  worksheet.addRow(['HỌC VIỆN KỸ THUẬT MẬT MÃ']);
  worksheet.addRow([]);
  worksheet.addRow(['BẢNG KÊ TỔNG HỢP THUẾ']);
  worksheet.addRow(['Hợp đồng hướng dẫn đồ án tốt nghiệp']);
  worksheet.addRow([]);

  [1, 2, 4, 5].forEach(rowNum => {
    worksheet.mergeCells(`A${rowNum}:M${rowNum}`);
    worksheet.getRow(rowNum).font = { bold: true, size: rowNum === 4 ? 13 : 11 };
    worksheet.getRow(rowNum).alignment = { horizontal: 'center' };
  });

  // Cột header
  worksheet.addRow(['STT', 'Số HĐ', 'Người thực hiện', 'Nội dung chi tiêu', 'Số CCCD', 'Ngày cấp', 'Nơi cấp', 'Địa chỉ CCCD', 'SĐT', 'Mã số thuế', 'Số tiền', 'Trừ thuế', 'Còn lại']);

  // Cài đặt độ rộng cột vừa đủ với nội dung
  worksheet.columns = [
    { key: 'stt', width: 5 },                    // STT - chỉ cần vừa số
    { key: 'contractNumber', width: 6 },        // Số hợp đồng - vừa với format "123/HĐ-ĐT"
    { key: 'executor', width: 22 },              // Người thực hiện - tên đầy đủ
    { key: 'expenseDescription', width: 28 },    // Nội dung chi tiêu - mô tả dài
    { key: 'idNumber', width: 14 },              // Số CCCD - 12 chữ số + buffer
    { key: 'issueDate', width: 12 },             // Ngày cấp - DD/MM/YYYY
    { key: 'issuePlace', width: 25 },            // Nơi cấp - tên cơ quan
    { key: 'idAddress', width: 40 },             // Địa chỉ CCCD - địa chỉ đầy đủ
    { key: 'phoneNumber', width: 14 },           // SĐT - số điện thoại
    { key: 'taxCode', width: 14 },               // Mã số thuế - 10-13 chữ số
    { key: 'amount', width: 16 },                // Số tiền - định dạng #,##0
    { key: 'taxDeducted', width: 16 },           // Trừ thuế - định dạng #,##0
    { key: 'netAmount', width: 16 }              // Còn lại - định dạng #,##0
  ];

  worksheet.getRow(7).font = { bold: true, size: 11 };
  worksheet.autoFilter = 'A7:M7';
  worksheet.views = [{ state: 'frozen', ySplit: 7 }];

  // Chèn dữ liệu bắt đầu từ hàng 8
  // Đảm bảo dữ liệu được chèn đúng thứ tự cột bằng cách chuyển đổi object thành array
  const dataRows = records.map(record => [
    record.stt,
    record.contractNumber,
    record.executor,
    record.expenseDescription,
    record.idNumber,
    record.issueDate,
    record.issuePlace,
    record.idAddress,
    record.phoneNumber,
    record.taxCode,
    record.amount,
    record.taxDeducted,
    record.netAmount
  ]);

  dataRows.forEach(row => {
    worksheet.addRow(row);
  });

  // Áp dụng định dạng số có dấu phẩy cho các cột tiền tệ
  const dataStartRow = 8;
  const dataEndRow = worksheet.lastRow.number; // Dòng cuối của dữ liệu (không bao gồm tổng cộng)

  // Định dạng cột F (Ngày cấp CCCD) - định dạng ngày DD/MM/YYYY
  for (let row = dataStartRow; row <= dataEndRow; row++) {
    const cell = worksheet.getCell(`F${row}`);
    if (cell.value && cell.value instanceof Date) {
      cell.numFmt = 'dd/mm/yyyy';
    }
  }

  // Định dạng cột K (Số tiền), L (Trừ thuế), M (Còn lại)
  for (let row = dataStartRow; row <= dataEndRow; row++) {
    ['K', 'L', 'M'].forEach(col => {
      const cell = worksheet.getCell(`${col}${row}`);
      if (cell.value && typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
      }
    });
  }

  // Footer: Tổng cộng - sử dụng dataEndRow đã được tính chính xác ở trên
  worksheet.addRow([
    'Tổng cộng:', '', '', '', '', '', '', '', '', '',
    { formula: `SUM(K${dataStartRow}:K${dataEndRow})` },
    { formula: `SUM(L${dataStartRow}:L${dataEndRow})` },
    { formula: `SUM(M${dataStartRow}:M${dataEndRow})` }
  ]);
  const totalRow = worksheet.lastRow.number;
  worksheet.mergeCells(`A${totalRow}:J${totalRow}`);
  worksheet.getRow(totalRow).font = { bold: true };
  worksheet.getRow(totalRow).alignment = { horizontal: 'right' };

  // Áp dụng định dạng số có dấu phẩy cho dòng tổng cộng
  ['K', 'L', 'M'].forEach(col => {
    worksheet.getCell(`${col}${totalRow}`).numFmt = '#,##0';
  });

  // Tính tổng số tiền để chuyển thành chữ
  let totalAmount = 0;
  if (records && records.length > 0) {
    totalAmount = records.reduce((sum, record) => {
      const amount = typeof record.amount === 'number' ? record.amount : 0;
      return sum + amount;
    }, 0);
  }

  // Bằng chữ
  const textRowVal = `Bằng chữ: ${numberToWords(totalAmount)} đồng chẵn.`;
  worksheet.addRow([textRowVal]);
  const textRow = worksheet.lastRow.number;
  worksheet.mergeCells(`A${textRow}:M${textRow}`);
  worksheet.getRow(textRow).font = { italic: true, size: 10 };

  // Ngày tháng năm
  worksheet.addRow([]);
  worksheet.addRow(['', '', '', '', '', '', '', '', `Ngày ... tháng ... năm 2025`, '', '', '', '']);
  const dateRow = worksheet.lastRow.number;
  worksheet.mergeCells(`J${dateRow}:M${dateRow}`);
  worksheet.getRow(dateRow).font = { size: 10 };
  worksheet.getRow(dateRow).alignment = { horizontal: 'center' };

  // Ký tên
  worksheet.addRow([]);
  worksheet.addRow(['', '', '', 'Người lập bảng', '', '', '', 'Trưởng phòng Đào tạo', '', '', '', '']);
  const signRow = worksheet.lastRow.number;
  worksheet.getRow(signRow).font = { bold: true, size: 10 };
  worksheet.getRow(signRow).alignment = { horizontal: 'center' };

  return workbook;
}

module.exports = {
  exportMultipleContracts,
  gethopDongDASite,
  getExportAdditionalDoAnGvmSite,
  exportAdditionalDoAnGvm,
  getBosungDownloadSite,
  exportBoSungDownloadData,
};
