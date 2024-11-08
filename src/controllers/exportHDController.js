const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const fs = require("fs");
const path = require("path");
//const createConnection = require("../config/databaseAsync");
const createPoolConnection = require("../config/databasePool");
const archiver = require("archiver");

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

// Hàm chuyển đổi số thành chữ
const numberToWords = (num) => {
  if (num === 0) return "không đồng";

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

      if (hundreds) {
        chunkWords.push(ones[hundreds]);
        chunkWords.push("trăm");
      }

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

      if (unitIndex > 0) {
        chunkWords.push(thousands[unitIndex]);
      }

      words = chunkWords.join(" ") + " " + words;
    }
    num = Math.floor(num / 1000);
    unitIndex++;
  }

  // Chuyển chữ cái đầu tiên thành chữ hoa
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

// Hàm định dạng ngày tháng
const formatDate = (date) => {
  try {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();

    return `ngày ${day} tháng ${month} năm ${year}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

// Controller xuất một hợp đồng
const exportSingleContract = async (req, res) => {
  let connection;
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).send("ID giảng viên không được để trống");
    }

    connection = await createPoolConnection();
    const [teachers] = await connection.execute(
      "SELECT * FROM hopdonggvmoi WHERE ID = ?",
      [id]
    );

    if (!teachers || teachers.length === 0) {
      return res.status(404).send("Không tìm thấy thông tin giảng viên");
    }

    const teacher = teachers[0];
    const soTiet = teacher.SoTiet || 0;
    const tienText = soTiet * 100000;
    const tienThueText = Math.round(tienText * 0.1);
    const tienThucNhanText = tienText - tienThueText;

    const data = {
      Ngày_bắt_đầu: formatDate(teacher.NgayBatDau),
      Ngày_kết_thúc: formatDate(teacher.NgayKetThuc),
      Danh_xưng: teacher.DanhXung,
      Họ_và_tên: teacher.HoTen,
      CCCD: teacher.CCCD,
      Ngày_cấp: formatDate(teacher.NgayCap),
      Nơi_cấp: teacher.NoiCapCCCD,
      Chức_vụ: teacher.ChucVu,
      Cấp_bậc: teacher.HocVi,
      Hệ_số_lương: Number(teacher.HSL).toFixed(2),
      Địa_chỉ_theo_CCCD: teacher.DiaChi,
      Điện_thoại: teacher.DienThoai,
      Mã_số_thuế: teacher.MaSoThue,
      Số_tài_khoản: teacher.STK,
      Email: teacher.Email,
      Tại_ngân_hàng: teacher.NganHang,
      Số_tiết: teacher.SoTiet,
      Ngày_kí_hợp_đồng: formatDate(teacher.NgayKi),
      Tiền_text: tienText.toLocaleString("vi-VN"),
      Bằng_chữ_số_tiền: numberToWords(tienText),
      Tiền_thuế_Text: tienThueText.toLocaleString("vi-VN"),
      Tiền_thực_nhận_Text: tienThucNhanText.toLocaleString("vi-VN"),
      Bằng_chữ_của_thực_nhận: numberToWords(tienThucNhanText),
      Kỳ: teacher.KiHoc, // Thêm trường KiHoc
      Năm_học: teacher.NamHoc, // Thêm trường NamHoc
    };

    const templatePath = path.resolve(__dirname, "../templates/HopDong.docx");
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);

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

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=HopDong_${teacher.HoTen}.docx`
    );
    res.send(buf);
  } catch (error) {
    console.error("Error in exportSingleContract:", error);
    res.status(500).send(`Lỗi khi tạo file hợp đồng: ${error.message}`);
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// Controller xuất nhiều hợp đồng
const exportMultipleContracts = async (req, res) => {
  let connection;
  try {
    const { dot, ki, namHoc, khoa, teacherName } = req.query;

    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt, kỳ hoặc năm học");
    }

    connection = await createPoolConnection();

    let query = ` SELECT
                MaHopDong,
                id_Gvm,
                DienThoai,
                Email,
                MaSoThue,
                DanhXung,
                HoTen,
                NgaySinh,
                HocVi,
                ChucVu,
                HSL,
                CCCD,
                NoiCapCCCD,
                DiaChi,
                STK,
                NganHang,
                MIN(NgayBatDau) AS NgayBatDau,
                MAX(NgayKetThuc) AS NgayKetThuc,
                SUM(SoTiet) AS SoTiet,
                SoTien,
                TruThue,
                NgayCap,
                ThucNhan,
                NgayNghiemThu,
                Dot,
                KiHoc,
                NamHoc,
                MaPhongBan,
                MaBoMon
            FROM
                hopdonggvmoi
            WHERE
                Dot = ? AND KiHoc = ? AND NamHoc = ?
            GROUP BY
                HoTen`;

    let params = [dot, ki, namHoc];

    // Xử lý các trường hợp khác nhau
    if (khoa && khoa !== "ALL") {
      query = ` SELECT
                MaHopDong,
                id_Gvm,
                DienThoai,
                Email,
                MaSoThue,
                DanhXung,
                HoTen,
                NgaySinh,
                HocVi,
                ChucVu,
                HSL,
                CCCD,
                NoiCapCCCD,
                DiaChi,
                STK,
                NganHang,
                MIN(NgayBatDau) AS NgayBatDau,
                MAX(NgayKetThuc) AS NgayKetThuc,
                SUM(SoTiet) AS SoTiet,
                SoTien,
                TruThue,
                NgayCap,
                ThucNhan,
                NgayNghiemThu,
                Dot,
                KiHoc,
                NamHoc,
                MaPhongBan,
                MaBoMon
            FROM
                hopdonggvmoi
            WHERE
                Dot = ? AND KiHoc = ? AND NamHoc = ? AND MaPhongBan like ?
            GROUP BY
                HoTen`;
      //query += " AND MaPhongBan = ?";
      //params.push(khoa);
      params = [dot, ki, namHoc, `%${khoa}%`];
      //params.push(`%${khoa}%`);
    }

    if (teacherName) {
      query = ` SELECT
                MaHopDong,
                id_Gvm,
                DienThoai,
                Email,
                MaSoThue,
                DanhXung,
                HoTen,
                NgaySinh,
                HocVi,
                ChucVu,
                HSL,
                CCCD,
                NoiCapCCCD,
                DiaChi,
                STK,
                NganHang,
                MIN(NgayBatDau) AS NgayBatDau,
                MAX(NgayKetThuc) AS NgayKetThuc,
                SUM(SoTiet) AS SoTiet,
                SoTien,
                TruThue,
                NgayCap,
                ThucNhan,
                NgayNghiemThu,
                Dot,
                KiHoc,
                NamHoc,
                MaPhongBan,
                MaBoMon
            FROM
                hopdonggvmoi
            WHERE
                Dot = ? AND KiHoc = ? AND NamHoc = ? AND HoTen LIKE ?
            GROUP BY
                HoTen`;
      //query += " AND HoTen LIKE ?";
      params = [dot, ki, namHoc, `%${teacherName}%`];
      //params.push(`%${teacherName}%`);
    }

    const [teachers] = await connection.execute(query, params);

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/exportHD';</script>"
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

    // Tạo hợp đồng cho từng giảng viên
    for (const teacher of teachers) {
      const soTiet = teacher.SoTiet || 0;
      const tienText = soTiet * 100000;
      const tienThueText = Math.round(tienText * 0.1);
      const tienThucNhanText = tienText - tienThueText;

      const data = {
        Ngày_bắt_đầu: formatDate(teacher.NgayBatDau),
        Ngày_kết_thúc: formatDate(teacher.NgayKetThuc),
        Danh_xưng: teacher.DanhXung,
        Họ_và_tên: teacher.HoTen,
        CCCD: teacher.CCCD,
        Ngày_cấp: formatDate(teacher.NgayCap),
        Nơi_cấp: teacher.NoiCapCCCD,
        Chức_vụ: teacher.ChucVu,
        Cấp_bậc: teacher.HocVi,
        Hệ_số_lương: Number(teacher.HSL).toFixed(2),
        Địa_chỉ_theo_CCCD: teacher.DiaChi,
        Điện_thoại: teacher.DienThoai,
        Mã_số_thuế: teacher.MaSoThue,
        Số_tài_khoản: teacher.STK,
        Email: teacher.Email,
        Tại_ngân_hàng: teacher.NganHang,
        Số_tiết: teacher.SoTiet,
        Ngày_kí_hợp_đồng: formatDate(teacher.NgayKi),
        Tiền_text: tienText.toLocaleString("vi-VN"),
        Bằng_chữ_số_tiền: numberToWords(tienText),
        Tiền_thuế_Text: tienThueText.toLocaleString("vi-VN"),
        Tiền_thực_nhận_Text: tienThucNhanText.toLocaleString("vi-VN"),
        Bằng_chữ_của_thực_nhận: numberToWords(tienThucNhanText),
        Kỳ: teacher.KiHoc, // Thêm trường KiHoc
        Năm_học: teacher.NamHoc, // Thêm trường NamHoc
      };

      const templatePath = path.resolve(__dirname, "../templates/HopDong.docx");
      const content = fs.readFileSync(templatePath, "binary");
      const zip = new PizZip(content);

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

      const fileName = `HopDong_${teacher.HoTen}.docx`;
      fs.writeFileSync(path.join(tempDir, fileName), buf);
    }

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    const zipFileName = `HopDong_Dot${dot}_Ki${ki}_${namHoc}_${
      khoa || "all"
    }.zip`;
    const zipPath = path.join(tempDir, zipFileName);
    const output = fs.createWriteStream(zipPath);

    archive.pipe(output);
    archive.directory(tempDir, false);

    await new Promise((resolve, reject) => {
      output.on("close", resolve);
      archive.on("error", reject);
      archive.finalize();
    });

    res.download(zipPath, zipFileName, (err) => {
      if (err) {
        console.error("Error sending zip file:", err);
        return;
      }

      setTimeout(() => {
        try {
          if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            for (const file of files) {
              const filePath = path.join(tempDir, file);
              fs.unlinkSync(filePath);
            }
            fs.rmdirSync(tempDir);
          }
        } catch (error) {
          console.error("Error cleaning up temporary directory:", error);
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

const getExportHDSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("exportHD", {
      gvmoiList: gvmoiList,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

module.exports = {
  exportSingleContract,
  exportMultipleContracts,
  getExportHDSite,
};
