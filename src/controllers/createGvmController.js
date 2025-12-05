const createPoolConnection = require("../config/databasePool");
const path = require("path");
const fs = require("fs");
const appRoot = require("app-root-path");

const fsp = fs.promises;

const buildFileName = (fieldName, khoa, hoTen, originalName) => {
  let computedField = fieldName;

  if (fieldName === "fileBoSung") {
    computedField = `${khoa}_${hoTen}`;
  }

  if (fieldName === "FileLyLich") {
    computedField = `${khoa}_Lý lịch_${hoTen}`;
  }

  return `${computedField}${path.extname(originalName)}`;
};

const prepareFilePlan = (files, { khoa, boMon, hoTen }) => {
  if (!files || !boMon || !hoTen || !khoa) {
    return {};
  }

  const plan = {};

  Object.entries(files).forEach(([fieldName, fileList]) => {
    if (!Array.isArray(fileList) || !fileList[0]) {
      return;
    }

    const file = fileList[0];
    const filename = buildFileName(fieldName, khoa, hoTen, file.originalname);

    plan[fieldName] = {
      filename,
      buffer: file.buffer,
    };
  });

  return plan;
};

const persistFilePlan = async (plan, folderPath) => {
  if (!plan || Object.keys(plan).length === 0) {
    return;
  }

  await fsp.mkdir(folderPath, { recursive: true });

  await Promise.all(
    Object.values(plan).map(({ filename, buffer }) => {
      const filePath = path.join(folderPath, filename);
      return fsp.writeFile(filePath, buffer);
    })
  );
};

const getGvmLists = async (connection) => {
  try {
    const query = "SELECT * FROM `gvmoi`";
    const [results] = await connection.query(query);

    // Gửi danh sách giảng viên dưới dạng mảng
    return results; // Chỉ gửi kết quả mảng
  } catch (error) {
    return;
  }
};

let createGvm = async (req, res) => {
  let connection;

  try {
    connection = await createPoolConnection();

    const gvms = await getGvmLists(connection); // Truyền kết nối vào

    const lengthList = parseInt(gvms.length) + 1; // Đảm bảo biến này được khai báo bằng const

    const khoa = req.session.MaPhongBan;

    // Lấy dữ liệu từ site ejs
    let MaGvm = khoa + "_GVM_" + lengthList;
    let HoTen = req.body.HoTen;
    let GioiTinh = req.body.GioiTinh;
    let NgaySinh = req.body.NgaySinh;
    let CCCD = req.body.CCCD;
    let NgayCapCCCD = req.body.NgayCapCCCD;
    let NoiCapCCCD = req.body.NoiCapCCCD;
    let NoiCongTac = req.body.NoiCongTac;
    let DiaChi = req.body.DiaChi;
    let DienThoai = req.body.DienThoai;
    let email = req.body.email;
    let MaSoThue = req.body.MaSoThue;
    let HocVi = req.body.HocVi;
    let ChucVu = req.body.ChucVu;
    let HeSoLuong = req.body.HeSoLuong;
    let STK = req.body.STK;
    let NganHang = req.body.NganHang;
    let tinhTrangGiangDay = req.body.tinhTrangGiangDay ? 1 : 0;
    let BangTotNghiepLoai = req.body.BangTotNghiepLoai;
    let MonGiangDayChinh = req.body.monGiangDayChinh;
    const MaPhongBan = khoa;
    let QrCode = req.body.QrCode;
    let isQuanDoi = req.body.thuocQuanDoi;

    // Kiểm tra HSL
    // Nếu là chuỗi, thay dấu phẩy bằng dấu chấm
    if (typeof HeSoLuong === "string") {
      HeSoLuong = HeSoLuong.replace(",", ".");
    }

    if (isNaN(HeSoLuong)) {
      connection.release(); // Giải phóng kết nối trước khi trả về
      return res.redirect("/gvmList?message=HeSoLuongNotValue");
    }

    // Kiểm tra trùng lặp CCCD
    const checkDuplicateQuery =
      "SELECT COUNT(*) as count FROM gvmoi WHERE CCCD = ?";
    const [duplicateRows] = await connection.query(checkDuplicateQuery, [CCCD]);
    if (duplicateRows[0].count > 0) {
      connection.release(); // Giải phóng kết nối trước khi trả về
      return res.redirect("/gvmList?message=duplicateCCCD");
    }

    // Kiểm tra trùng lặp tên
    let nameExists = true;
    let modifiedName = HoTen; // Biến tạm để lưu tên cuối cùng
    let duplicateName = [];
    let duplicateCount = 0;
    let originalName = HoTen;

    while (nameExists) {
      nameExists = gvms.some((gvm) => gvm.HoTen === modifiedName);
      if (nameExists) {
        duplicateCount++;
        modifiedName = `${originalName} (${String.fromCharCode(
          64 + duplicateCount
        )})`; // A, B, C...
      }
    }
    // Khi xử lý xong, thêm tên cuối cùng vào danh sách trùng
    if (modifiedName !== HoTen) {
      duplicateName.push(`${HoTen} -> ${modifiedName}`); // Ghi lại thay đổi
    }
    HoTen = modifiedName; // Cập nhật tên cuối cùng

    const filePlan = prepareFilePlan(req.files, {
      khoa,
      boMon: MonGiangDayChinh,
      hoTen: HoTen,
    });

    let truocCCCD = filePlan["truocCCCD"] ? filePlan["truocCCCD"].filename : null;
    let sauCCCD = filePlan["sauCCCD"] ? filePlan["sauCCCD"].filename : null;
    let bangTotNghiep = filePlan["bangTotNghiep"]
      ? filePlan["bangTotNghiep"].filename
      : null;
    let FileLyLich = filePlan["FileLyLich"]
      ? filePlan["FileLyLich"].filename
      : null;
    let fileBoSung = filePlan["fileBoSung"]
      ? filePlan["fileBoSung"].filename
      : null;
    QrCode = filePlan["QrCode"] ? filePlan["QrCode"].filename : QrCode;

    const query = `INSERT INTO gvmoi (MaGvm, HoTen, GioiTinh, NgaySinh, CCCD, NgayCapCCCD, NoiCapCCCD, NoiCongTac, DiaChi, DienThoai, Email, MaSoThue, HocVi, ChucVu, HSL, STK, NganHang, MatTruocCCCD, MatSauCCCD, BangTotNghiep, FileLyLich, MaPhongBan, TinhTrangGiangDay, BangTotNghiepLoai, MonGiangDayChinh, isQuanDoi, fileBoSung, QrCode)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    try {
      await connection.query(query, [
        MaGvm,
        HoTen,
        GioiTinh,
        NgaySinh,
        CCCD,
        NgayCapCCCD,
        NoiCapCCCD,
        NoiCongTac,
        DiaChi,
        DienThoai,
        email,
        MaSoThue,
        HocVi,
        ChucVu,
        HeSoLuong,
        STK,
        NganHang,
        truocCCCD,
        sauCCCD,
        bangTotNghiep,
        FileLyLich,
        MaPhongBan,
        tinhTrangGiangDay,
        BangTotNghiepLoai,
        MonGiangDayChinh,
        isQuanDoi,
        fileBoSung,
        QrCode,
      ]);

      // Log the creation of a new guest lecturer
      try {
        // Lấy thông tin user và khoa từ session
        const userId = req.session.userId || req.session.userInfo?.ID || 0;
        const tenNhanVien =
          req.session.TenNhanVien || req.session.username || "Unknown User";
        const khoaSession = req.session.MaPhongBan || "Unknown Department";

        const logQuery = `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
                           VALUES (?, ?, ?, ?, ?, NOW())`;

        await connection.query(logQuery, [
          userId,
          tenNhanVien,
          khoaSession,
          "Tạo mới giảng viên mời",
          `Thêm giảng viên mời mới: ${HoTen} (Mã: ${MaGvm}, CCCD: ${CCCD})`,
        ]);
      } catch (logError) {
        // Continue with the response even if logging fails
      }

      const folderPath = path.join(
        appRoot.path || appRoot,
        "Giang_Vien_Moi",
        khoa,
        MonGiangDayChinh,
        HoTen
      );

      try {
        await persistFilePlan(filePlan, folderPath);
      } catch (fileError) {
        await connection.query("DELETE FROM gvmoi WHERE MaGvm = ?", [MaGvm]);
        return res.redirect("/gvmList?message=fileSaveFailed");
      }

      if (duplicateName.length > 0) {
        const message = "Tên giảng viên bị trùng sẽ được lưu như sau";
        const encodedMessage = encodeURIComponent(message);

        // Mã hóa duplicateName và nối với thông điệp
        const encodedDuplicateNames = encodeURIComponent(
          duplicateName.join(", ")
        );

        // Nối thông điệp và danh sách tên đã mã hóa
        return res.redirect(
          `/gvmList?message=${encodedMessage}&duplicateName=${encodedDuplicateNames}`
        );
      }

      res.redirect("/gvmList?message=insertSuccess");
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.redirect("/gvmList?message=duplicateEntry");
      }
      return res.redirect("/gvmList?message=insertFalse");
    }
  } catch (error) {
    res.status(500).send("Lỗi khi xử lý tải lên");
  } finally {
    if (connection) connection.release();
  }
};

const getBoMonList = async (req, res) => {
  let maPhongBan = req.params.maPhongBan;
  let isKhoa = req.params.isKhoa === "true"; // Chuyển đổi isKhoa thành boolean

  let connection;
  try {
    connection = await createPoolConnection();
    let results;
    if (isKhoa) {
      const query = `SELECT * FROM bomon WHERE MaPhongBan = ?`;
      [results] = await connection.query(query, [maPhongBan]);
    } else {
      const query = `SELECT * FROM bomon`;
      [results] = await connection.query(query);
    }

    res.json({
      success: true,
      maBoMon: results,
    });
  } catch (error) {
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  createGvm,
  getBoMonList,
};
