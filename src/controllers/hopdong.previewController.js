const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const fs = require("fs");
const path = require("path");
const createPoolConnection = require("../config/databasePool");
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);

// Configure LibreOffice path for Windows
const LIBREOFFICE_PATH = "D:\\Libre\\program\\soffice.exe";

// Alternative LibreOffice paths to try
const ALTERNATIVE_PATHS = [
  "D:\\Libre\\program\\soffice.exe",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
];

/**
 * Lazy load and configure libreoffice-convert library
 */
function getLibreOfficeConverter() {
  try {
    const libre = require("libreoffice-convert");

    // Set environment variable for this session
    process.env.LIBREOFFICE_PATH = LIBREOFFICE_PATH;

    // Try to configure the library with custom path
    if (libre.config) {
      libre.config({
        soffice: LIBREOFFICE_PATH,
      });
    }

    return libre;
  } catch (error) {
    console.error(
      "Could not load or configure libreoffice-convert:",
      error.message
    );
    return null;
  }
}

/**
 * Check if LibreOffice is available at the specified path
 */
function checkLibreOfficeAvailability() {
  if (fs.existsSync(LIBREOFFICE_PATH)) {
    return true;
  } else {
    console.warn(`LibreOffice not found at: ${LIBREOFFICE_PATH}`);

    // Try alternative paths
    for (const altPath of ALTERNATIVE_PATHS) {
      if (fs.existsSync(altPath)) {
        return true;
      }
    }

    console.error("LibreOffice not found at any known paths");
    return false;
  }
}

/**
 * Get the first available LibreOffice path
 */
function getAvailableLibreOfficePath() {
  // Check main path first
  if (fs.existsSync(LIBREOFFICE_PATH)) {
    return LIBREOFFICE_PATH;
  }

  // Try alternative paths
  for (const altPath of ALTERNATIVE_PATHS) {
    if (fs.existsSync(altPath)) {
      return altPath;
    }
  }

  return null;
}

/**
 * Alternative PDF conversion using direct LibreOffice command
 */
async function convertToPdfDirect(docxBuffer) {
  const tempDir = path.join(__dirname, "../../public/temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempDocxPath = path.join(tempDir, `temp_${Date.now()}.docx`);

  try {
    // Write DOCX buffer to temp file
    fs.writeFileSync(tempDocxPath, docxBuffer);
    // Try different LibreOffice paths
    const usedPath = getAvailableLibreOfficePath();

    if (!usedPath) {
      throw new Error("LibreOffice executable not found at any known paths");
    }

    // Convert using LibreOffice command line
    const command = `"${usedPath}" --headless --convert-to pdf "${tempDocxPath}" --outdir "${tempDir}"`;

    await execAsync(command, { timeout: 30000 }); // 30 second timeout

    // Read the generated PDF
    const pdfFilePath = tempDocxPath.replace(".docx", ".pdf");
    if (!fs.existsSync(pdfFilePath)) {
      throw new Error("PDF file was not generated");
    }

    const pdfBuffer = fs.readFileSync(pdfFilePath);

    // Clean up temp files
    if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
    if (fs.existsSync(pdfFilePath)) fs.unlinkSync(pdfFilePath);

    return pdfBuffer;
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(tempDocxPath)) fs.unlinkSync(tempDocxPath);
    throw error;
  }
}

/**
 * Hàm xử lý API để hiển thị trang preview với dữ liệu từ client
 */
const showPreviewPageAPI = async (req, res) => {
  try {
    const { teacherData, dot, ki, namHoc } = req.body;

    if (!teacherData || !dot || !ki || !namHoc) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc để hiển thị preview",
      });
    }
    const parsedTeacherData = JSON.parse(teacherData);
    const teacherId = parsedTeacherData.GiangVien;

    // Get contract types from teacher data
    let contractTypes = [];
    if (
      parsedTeacherData.hasEnhancedData &&
      parsedTeacherData.trainingPrograms &&
      parsedTeacherData.trainingPrograms.length > 0
    ) {
      contractTypes = parsedTeacherData.trainingPrograms.map((program) => ({
        id: program.id,
        tenHe: program.tenHe,
        TongTiet: parseFloat(program.SoTiet) || 0,
      }));
    } else {
      // Single contract type - fallback (should not happen with new structure)
      contractTypes = [
        {
          id: parsedTeacherData.id_he_dao_tao || null,
          tenHe: parsedTeacherData.ten_he_dao_tao || parsedTeacherData.loaiHopDong || "Mời giảng",
          TongTiet: parseFloat(parsedTeacherData.TongTiet) || 0,
        },
      ];
    }

    // Render the preview page and return HTML
    res.render("hopdong.previewContract.ejs", {
      teacherName: parsedTeacherData.GiangVien || teacherId,
      teacherData: parsedTeacherData,
      contractTypes: contractTypes,
      teacherId: teacherId,
      dot: dot,
      ki: ki,
      namHoc: namHoc,
      loaiHopDong: parsedTeacherData.loaiHopDong || "Mời giảng",
    });
  } catch (error) {
    console.error("Error in showPreviewPageAPI:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi hiển thị trang preview: " + error.message,
    });
  }
};

/**
 * Hàm hiển thị trang preview hợp đồng (giữ nguyên cho compatibility)
 */
const showPreviewPage = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { dot, ki, namHoc } = req.query;

    if (!teacherId || !dot || !ki || !namHoc) {
      return res.status(400).render("error", {
        message: "Thiếu thông tin bắt buộc để hiển thị preview",
      });
    }

    // Fallback to database query for direct URL access
    let connection;
    try {
      connection = await createPoolConnection();

      const teacherQuery = `
                SELECT DISTINCT
                    hd.HoTen as id_Gvm,
                    hd.HoTen,
                    hd.HocVi,
                    hd.ChucVu,
                    hd.he_dao_tao
                FROM hopdonggvmoi hd
                WHERE hd.HoTen = ? AND hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ?`;

      const [teachers] = await connection.execute(teacherQuery, [
        teacherId,
        dot,
        ki,
        namHoc,
      ]);

      if (!teachers || teachers.length === 0) {
        return res.status(404).render("error", {
          message: "Không tìm thấy thông tin hợp đồng cho giảng viên này",
        });
      }

      const teacherData = teachers[0];

      // Get contract types from database
      const contractTypesQuery = `
                SELECT DISTINCT he_dao_tao, SUM(SoTiet) as TongTiet
                FROM hopdonggvmoi
                WHERE HoTen = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ?
                GROUP BY he_dao_tao`;

      const [contractTypes] = await connection.execute(contractTypesQuery, [
        teacherId,
        dot,
        ki,
        namHoc,
      ]);

      res.render("hopdong.previewContract.ejs", {
        teacherName: teacherData.HoTen || teacherId,
        teacherData: teacherData,
        contractTypes: contractTypes,
        teacherId: teacherId,
        dot: dot,
        ki: ki,
        namHoc: namHoc,
        loaiHopDong: "Mời giảng",
      });
    } finally {
      if (connection) connection.release();
    }
  } catch (error) {
    console.error("Error in showPreviewPage:", error);
    res.status(500).render("error", {
      message: "Lỗi khi hiển thị trang preview: " + error.message,
    });
  }
};

/**
 * Hàm tạo preview hợp đồng cho giảng viên theo hệ đào tạo
 */
const previewContract = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    const { teacherId, heHopDong, dot, ki, namHoc, teacherData } = req.body;
    
    // LOG: Request data
    console.log('[Preview API] Request received:', {
      teacherId,
      heHopDong,
      heHopDongType: typeof heHopDong,
      dot,
      ki,
      namHoc,
      hasTeacherData: !!teacherData,
      teacherDataLength: teacherData ? teacherData.length : 0
    });

    if (!teacherId || !heHopDong || !dot || !ki || !namHoc) {
      console.error('[Preview API] Missing required fields:', {
        teacherId: !!teacherId,
        heHopDong: !!heHopDong,
        dot: !!dot,
        ki: !!ki,
        namHoc: !!namHoc
      });
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc",
      });
    }

    // heHopDong now can be either ID (number/string) or name (for backward compatibility)
    let heHopDongId = heHopDong;
    let heHopDongName = heHopDong;
    
    console.log('[Preview API] Processing heHopDong:', {
      raw: heHopDong,
      type: typeof heHopDong,
      isNaN: isNaN(heHopDong)
    });
    
    // Check if heHopDong is a number (ID) or string (name)
    if (!isNaN(heHopDong)) {
      // It's an ID, query to get name
      console.log('[Preview API] Querying he_dao_tao by ID:', heHopDong);
      const [heDaoTaoRows] = await connection.query(
        'SELECT id, he_dao_tao FROM he_dao_tao WHERE id = ?',
        [heHopDong]
      );
      
      console.log('[Preview API] Query result:', {
        found: heDaoTaoRows.length > 0,
        data: heDaoTaoRows[0]
      });
      
      if (heDaoTaoRows.length > 0) {
        heHopDongId = heDaoTaoRows[0].id;
        heHopDongName = heDaoTaoRows[0].he_dao_tao;
      } else {
        console.error('[Preview API] He dao tao not found for ID:', heHopDong);
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy hệ đào tạo",
        });
      }
    } else {
      // It's a name (backward compatibility), query to get ID
      console.log('[Preview API] Querying he_dao_tao by name:', heHopDong);
      const [heDaoTaoRows] = await connection.query(
        'SELECT id, he_dao_tao FROM he_dao_tao WHERE he_dao_tao = ?',
        [heHopDong]
      );
      
      console.log('[Preview API] Query result:', {
        found: heDaoTaoRows.length > 0,
        data: heDaoTaoRows[0]
      });
      
      if (heDaoTaoRows.length > 0) {
        heHopDongId = heDaoTaoRows[0].id;
        heHopDongName = heDaoTaoRows[0].he_dao_tao;
      }
    }

    let teacher;

    // Use provided teacherData if available, otherwise query database
    if (teacherData) {
      console.log('[Preview API] Using provided teacherData');
      try {
        teacher = JSON.parse(teacherData);
        console.log('[Preview API] Teacher parsed:', {
          name: teacher.GiangVien || teacher.HoTen,
          hasEnhancedData: teacher.hasEnhancedData,
          programsCount: teacher.trainingPrograms ? teacher.trainingPrograms.length : 0
        });
      } catch (parseError) {
        console.error('[Preview API] Failed to parse teacherData:', parseError);
        return res.status(400).json({
          success: false,
          message: "Dữ liệu giảng viên không hợp lệ",
        });
      }
    } else {
      // Fallback to database query
      console.log('[Preview API] Querying teacher from database:', {
        teacherId,
        heHopDongId,
        dot,
        ki,
        namHoc
      });
      const teacherQuery = `
                SELECT 
                    hd.HoTen as id_Gvm,
                    hd.DienThoai,
                    hd.Email,
                    hd.MaSoThue,
                    hd.DanhXung,
                    hd.HoTen,
                    hd.NgaySinh,
                    hd.HocVi,
                    hd.ChucVu,
                    hd.HSL,
                    hd.CCCD,
                    hd.NoiCapCCCD,
                    hd.DiaChi,
                    hd.STK,
                    hd.NganHang,
                    MIN(hd.NgayBatDau) AS NgayBatDau,
                    MAX(hd.NgayKetThuc) AS NgayKetThuc,
                    SUM(hd.SoTiet) AS SoTiet,
                    hd.SoTien,
                    hd.TruThue,
                    hd.NgayCap,
                    hd.ThucNhan,
                    hd.NgayNghiemThu,
                    hd.Dot,
                    hd.KiHoc,
                    hd.NamHoc,
                    hd.MaPhongBan,
                    hd.MaBoMon,
                    hd.NoiCongTac,
                    hd.he_dao_tao
                FROM hopdonggvmoi hd
                JOIN gvmoi gv ON hd.id_Gvm = gv.id_Gvm
                WHERE hd.HoTen = ? AND hd.he_dao_tao = ? AND hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ?
                GROUP BY 
                    hd.HoTen, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung, hd.NgaySinh, hd.HocVi, hd.ChucVu,
                    hd.HSL, hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang, hd.SoTien, hd.TruThue, hd.NgayCap, hd.ThucNhan, 
                    hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc, hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac, hd.he_dao_tao`;

      const [teachers] = await connection.execute(teacherQuery, [
        teacherId,
        heHopDongId,  // Use ID instead of name
        dot,
        ki,
        namHoc,
      ]);

      console.log('[Preview API] Teacher query result:', {
        found: teachers && teachers.length > 0,
        count: teachers ? teachers.length : 0
      });

      if (!teachers || teachers.length === 0) {
        console.error('[Preview API] Teacher not found in database');
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông tin hợp đồng cho giảng viên này",
        });
      }

      teacher = teachers[0];
    } // Calculate financial data based on heHopDong
    let soTiet, tienText, tienThueText, tienThucNhanText, tienMoiGiang;

    if (teacher.hasEnhancedData && teacher.trainingPrograms) {
      // Find specific training program data by ID
      const programData = teacher.trainingPrograms.find(
        (p) => p.id === heHopDongId || p.id === parseInt(heHopDongId)
      );
      if (programData) {
        soTiet = programData.SoTiet;
        tienText = programData.ThanhTien;
        tienThueText = programData.Thue;
        tienThucNhanText = programData.ThucNhan;
        tienMoiGiang = programData.TienMoiGiang;
      } else {
        // Use total data if specific program not found
        soTiet = teacher.TongTiet || 0;
        tienText = teacher.ThanhTien || 0;
        tienThueText = teacher.Thue || 0;
        tienThucNhanText = teacher.ThucNhan || 0;
        tienMoiGiang = teacher.TienMoiGiang || 0;
      }
    } else {
      // Use teacher's total data
      soTiet = teacher.TongTiet || teacher.SoTiet || 0;
      tienText = teacher.ThanhTien || 0;
      tienThueText = teacher.Thue || 0;
      tienThucNhanText = teacher.ThucNhan || 0;
      tienMoiGiang = teacher.TienMoiGiang || 0;

      // If no financial data in teacher object, calculate from tienluong table
      if (!tienText && connection) {
        const tienLuongQuery = `SELECT he_dao_tao, HocVi, SoTien FROM tienluong`;
        const [tienLuongList] = await connection.execute(tienLuongQuery);

        const tienLuong = tienLuongList.find(
          (tl) => tl.he_dao_tao === heHopDongId && tl.HocVi === teacher.HocVi
        );

        if (tienLuong) {
          tienMoiGiang = tienLuong.SoTien;
          tienText = soTiet * tienLuong.SoTien;
          // Nếu số tiền <= 2 triệu đồng thì không tính thuế
          tienThueText = tienText <= 2000000 ? 0 : tienText * 0.1;
          tienThucNhanText = tienText - tienThueText;
        }
      }
    }

    // Prepare data for template
    const data = {
      Số_hợp_đồng: "       ",
      Số_thanh_lý: "       ",
      Ngày_bắt_đầu: formatDateVietnamese(teacher.NgayBatDau),
      Ngày_kết_thúc: formatDateVietnamese(teacher.NgayKetThuc),
      Danh_xưng: teacher.GioiTinh === "Nam" ? "Ông" : "Bà",
      Họ_và_tên: teacher.GiangVien || teacher.HoTen,
      CCCD: teacher.CCCD || "",
      Ngày_cấp: formatDate1(teacher.NgayCapCCCD),
      Nơi_cấp: teacher.NoiCapCCCD || "",
      Chức_vụ: teacher.ChucVu || "",
      Cấp_bậc: teacher.HocVi || "",
      Hệ_số_lương: teacher.HSL
        ? Number(teacher.HSL).toFixed(2).replace(".", ",")
        : "1,00",
      Địa_chỉ_theo_CCCD: teacher.DiaChi || "",
      Điện_thoại: teacher.DienThoai || "",
      Mã_số_thuế: teacher.MaSoThue || "",
      Số_tài_khoản: teacher.STK || "",
      Email: teacher.Email || "",
      Tại_ngân_hàng: teacher.NganHang || "",
      Số_tiết: soTiet.toString().replace(".", ","),
      Ngày_kí_hợp_đồng: formatDate(new Date()),
      Tiền_text: tienText.toLocaleString("vi-VN"),
      Bằng_chữ_số_tiền: numberToWords(tienText),
      Tiền_thuế_Text: tienThueText.toLocaleString("vi-VN"),
      Tiền_thực_nhận_Text: tienThucNhanText.toLocaleString("vi-VN"),
      Bằng_chữ_của_thực_nhận: numberToWords(tienThucNhanText),
      Đợt: dot,
      Kỳ: convertToRoman(parseInt(ki)),
      Năm_học: namHoc,
      Thời_gian_thực_hiện: formatDateRange(
        teacher.NgayBatDau,
        teacher.NgayKetThuc
      ),
      Ngày_nghiệm_thu: formatDate(teacher.NgayNghiemThu),
      Mức_tiền: tienMoiGiang.toLocaleString("vi-VN"),
      Nơi_công_tác: teacher.NoiCongTac || "",
      Cơ_sở_đào_tạo: teacher.CoSoDaoTao || "Học viện Kỹ thuật mật mã",
      Khóa: teacher.KhoaSinhVien,
      Ngành: teacher.Nganh,
    };

    // Choose template based on contract type name pattern matching
    let templateFileName;
    
    console.log('[Preview API] Selecting template for:', {
      heHopDongId,
      heHopDongName
    });
    
    // Pattern matching based on contract name
    const nameLower = heHopDongName.toLowerCase();
    
    if (nameLower.includes("đồ án")) {
      // Đồ án
      if (nameLower.includes("cao học")) {
        templateFileName = "HopDongDACaoHoc.docx";
      } else {
        templateFileName = "HopDongDA.docx";
      }
    } else if (nameLower.includes("mật mã")) {
      // Các hệ có chứa "mật mã"
      templateFileName = "HopDongMM.docx";
    } else if (nameLower.includes("cao học")) {
      // Cao học
      templateFileName = "HopDongCH.docx";
    } else if (nameLower.includes("nghiên cứu sinh")) {
      // Nghiên cứu sinh
      templateFileName = "HopDongNCS.docx";
    } else if (nameLower.includes("đóng học phí") || nameLower.includes("đại học")) {
      // Đại học hoặc đóng học phí
      templateFileName = "HopDongHP.docx";
    } else {
      // Default fallback
      console.warn('[Preview API] No pattern matched, using default template HP');
      templateFileName = "HopDongHP.docx";
    }
    
    console.log('[Preview API] Pattern matched template:', {
      pattern: nameLower,
      selectedTemplate: templateFileName
    });

    const templatePath = path.resolve(
      __dirname,
      "../templates",
      templateFileName
    );

    console.log('[Preview API] Template selected:', {
      fileName: templateFileName,
      path: templatePath,
      exists: fs.existsSync(templatePath)
    });

    if (!fs.existsSync(templatePath)) {
      console.error('[Preview API] Template not found:', templatePath);
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy template: ${templateFileName}`,
      });
    }

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

    try {
      doc.render(data);
    } catch (renderError) {
      console.error("Error rendering document:", renderError);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi tạo document từ template.",
      });
    }
    const buf = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    }); // Convert DOCX to PDF using libreoffice-convert with fallback
    try {
      let pdfBuffer;

      try {
        // Lazy load libreoffice-convert library
        const libre = getLibreOfficeConverter();

        if (!libre) {
          throw new Error("libreoffice-convert library not available");
        }

        // Suppress console output during library conversion
        const originalConsole = suppressConsole();

        try {
          // First try using libreoffice-convert library
          pdfBuffer = await new Promise((resolve, reject) => {
            libre.convert(buf, ".pdf", undefined, (err, done) => {
              if (err) {
                reject(err);
              } else {
                resolve(done);
              }
            });
          });

          // Restore console
          restoreConsole(originalConsole);
        } catch (libraryError) {
          // Restore console before handling error
          restoreConsole(originalConsole);
          throw libraryError;
        }
      } catch (libraryError) {
        // Fallback to direct LibreOffice command
        pdfBuffer = await convertToPdfDirect(buf);
      }

      // Create safe filename for Vietnamese characters
      const baseFileName = `Preview_${teacher.HoTen}_${heHopDong}.pdf`;
      const safeFileName = baseFileName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
        .replace(/[^\w\s.-]/g, "") // Remove special characters
        .replace(/\s+/g, "_"); // Replace spaces with underscores

      res.setHeader("Content-Type", "application/pdf");
      // Use both filename and filename* for better compatibility
      const encodedFileName = encodeURIComponent(baseFileName);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`
      );
      res.send(pdfBuffer);
    } catch (conversionError) {
      console.error("Error converting to PDF:", conversionError);
      return res.status(500).json({
        success: false,
        message:
          "Lỗi khi chuyển đổi hợp đồng sang PDF: " + conversionError.message,
      });
    }
  } catch (error) {
    console.error("Error in previewContract:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo preview hợp đồng: " + error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

/**
 * Hàm hiển thị trang preview hợp đồng hợp nhất (sử dụng file duy nhất)
 */
const showUnifiedPreviewPage = async (req, res) => {
  try {
    // Support both URL params and POST body
    let teacherId, dot, ki, namHoc, teacherData;

    if (req.method === "GET") {
      // Direct URL access
      teacherId = req.params.teacherId;
      ({ dot, ki, namHoc } = req.query);
    } else {
      // POST from duyet page
      ({ teacherData, dot, ki, namHoc } = req.body);
      if (teacherData) {
        const parsedData = JSON.parse(teacherData);
        teacherId = parsedData.GiangVien || parsedData.HoTen;
      }
    }

    if (!teacherId || !dot || !ki || !namHoc) {
      return res.status(400).render("error", {
        message: "Thiếu thông tin bắt buộc để hiển thị preview",
      });
    }

    let teacher = null;
    let contractTypes = [];

    // Use provided teacherData if available, otherwise query database
    if (teacherData) {
      teacher = JSON.parse(teacherData);

      // Get contract types from enhanced data
      if (
        teacher.hasEnhancedData &&
        teacher.trainingPrograms &&
        teacher.trainingPrograms.length > 0
      ) {
        contractTypes = teacher.trainingPrograms.map((program) => ({
          he_dao_tao: program.he_dao_tao,
          TongTiet: program.SoTiet,
        }));
      } else {
        contractTypes = [
          {
            he_dao_tao: teacher.loaiHopDong || "Mời giảng",
            TongTiet: teacher.TongTiet || 0,
          },
        ];
      }
    } else {
      // Fallback to database query for direct URL access
      let connection;
      try {
        connection = await createPoolConnection();

        const teacherQuery = `
                    SELECT DISTINCT
                        hd.HoTen as GiangVien,
                        hd.HoTen,
                        hd.HocVi,
                        hd.ChucVu,
                        hd.he_dao_tao
                    FROM hopdonggvmoi hd
                    WHERE hd.HoTen = ? AND hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ?`;

        const [teachers] = await connection.execute(teacherQuery, [
          teacherId,
          dot,
          ki,
          namHoc,
        ]);

        if (!teachers || teachers.length === 0) {
          return res.status(404).render("error", {
            message: "Không tìm thấy thông tin hợp đồng cho giảng viên này",
          });
        }

        teacher = teachers[0];

        // Get contract types from database
        const contractTypesQuery = `
                    SELECT DISTINCT he_dao_tao, SUM(SoTiet) as TongTiet
                    FROM hopdonggvmoi
                    WHERE HoTen = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ?
                    GROUP BY he_dao_tao`;

        const [dbContractTypes] = await connection.execute(contractTypesQuery, [
          teacherId,
          dot,
          ki,
          namHoc,
        ]);
        contractTypes = dbContractTypes;
      } finally {
        if (connection) connection.release();
      }
    }

    // Render unified preview page
    res.render("hopdong.preview.ejs", {
      teacher: teacher,
      teacherName: teacher ? teacher.GiangVien || teacher.HoTen : teacherId,
      teacherData: teacher || {},
      contractTypes: contractTypes,
      params: {
        teacherId: teacherId,
        dot: dot,
        ki: ki,
        namHoc: namHoc,
      },
      // Fallback variables for compatibility
      teacherId: teacherId,
      dot: dot,
      ki: ki,
      namHoc: namHoc,
      loaiHopDong: teacher ? teacher.loaiHopDong || "Mời giảng" : "Mời giảng",
    });
  } catch (error) {
    console.error("Error in showUnifiedPreviewPage:", error);
    res.status(500).render("error", {
      message: "Lỗi khi hiển thị trang preview: " + error.message,
    });
  }
};

/**
 * Temporarily suppress console output during LibreOffice conversion
 */
function suppressConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  // Override console methods with empty functions
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};

  return originalConsole;
}

/**
 * Restore console output
 */
function restoreConsole(originalConsole) {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
}

// Các hàm utility được sao chép từ exportHDController
function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateVietnamese(date) {
  if (!date) return "";
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `ngày ${day} tháng ${month} năm ${year}`;
}

function formatDate1(date) {
  if (!date) return "";
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDateRange(startDate, endDate) {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function convertToRoman(num) {
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
  for (let i = 0; i < romanNumerals.length; i++) {
    while (num >= romanNumerals[i].value) {
      result += romanNumerals[i].numeral;
      num -= romanNumerals[i].value;
    }
  }
  return result;
}

function numberToWords(num) {
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
  const scales = ["", "nghìn", "triệu", "tỷ"];

  function convertGroup(n) {
    let result = "";

    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    const tensDigit = Math.floor(remainder / 10);
    const onesDigit = remainder % 10;

    if (hundreds > 0) {
      result += ones[hundreds] + " trăm";
      if (remainder > 0) result += " ";
    }

    if (tensDigit > 1) {
      result += tens[tensDigit];
      if (onesDigit > 0) {
        result += " " + ones[onesDigit];
      }
    } else if (tensDigit === 1) {
      result += "mười";
      if (onesDigit > 0) {
        result += " " + ones[onesDigit];
      }
    } else if (onesDigit > 0) {
      if (hundreds > 0) result += "lẻ ";
      result += ones[onesDigit];
    }

    return result.trim();
  }

  let result = "";
  let scaleIndex = 0;

  while (num > 0) {
    const group = num % 1000;
    if (group > 0) {
      const groupWords = convertGroup(group);
      if (scaleIndex > 0) {
        result = groupWords + " " + scales[scaleIndex] + " " + result;
      } else {
        result = groupWords;
      }
    }
    num = Math.floor(num / 1000);
    scaleIndex++;
  }

  // return result.trim() + " đồng";
  const final = result.trim() + " đồng";
  return final.charAt(0).toUpperCase() + final.slice(1);
}

module.exports = {
  previewContract,
  showPreviewPage,
  showPreviewPageAPI,
  showUnifiedPreviewPage,
};
