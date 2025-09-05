const express = require("express");
const multer = require("multer");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const appRoot = require("app-root-path");

const createPoolConnection = require("../config/databasePool");
const pool = require("../config/Pool");

const getUpdateGvm = async (req, res) => {
  const id_Gvm = parseInt(req.params.id);
  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Lấy dữ liệu
    const query = "SELECT * FROM `gvmoi` WHERE id_Gvm = ?";
    const [results] = await connection.query(query, [id_Gvm]);

    let user = results && results.length > 0 ? results[0] : {};

    formatDateFields(user, ["NgayCapCCCD", "NgaySinh"]);

    // Lấy dữ liệu phòng ban
    const query1 = "SELECT MaPhongBan FROM phongban where isKhoa = 1";
    const [phongBanList] = await connection.query(query1);

    // Render trang updateGvm.ejs với dữ liệu người dùng
    res.render("updateGvm.ejs", { value: user, phongBanList: phongBanList });
  } catch (err) {
    console.error(err);
    // Xử lý lỗi, có thể trả về phản hồi lỗi cho client
    res.status(500).send("Lỗi khi lấy dữ liệu");
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

function formatDateFields(obj, fields) {
  for (const field of fields) {
    if (obj[field]) {
      const date = new Date(obj[field]);
      if (!isNaN(date)) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        obj[field] = `${y}-${m}-${d}`;
      }
    }
  }
}

const getViewGvm = async (req, res) => {
  const id_Gvm = parseInt(req.params.id) + 1;
  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Lấy dữ liệu
    const query = "SELECT * FROM `gvmoi` WHERE id_Gvm = ?";
    const [results] = await connection.query(query, [id_Gvm]);

    const query1 = `SELECT * FROM phongban`;
    const [phongban] = await connection.query(query1);

    let user = results && results.length > 0 ? results[0] : {};

    formatDateFields(user, ["NgayCapCCCD", "NgaySinh"]);

    // Render trang viewGvm.ejs với dữ liệu người dùng
    res.render("viewGvm.ejs", { value: user, phongban: phongban });
  } catch (err) {
    console.error(err);
    // Xử lý lỗi, có thể trả về phản hồi lỗi cho client
    res.status(500).send("Lỗi khi lấy dữ liệu");
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const upload = multer().single("truocCCCD");

const postUpdateGvm = async (req, res) => {
  // Lấy các thông tin từ form
  let IdGvm = req.body.IdGvm;
  let HoTen = req.body.HoTen?.trim();
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
  let BangTotNghiepLoai = req.body.BangTotNghiepLoai;
  let MonGiangDayChinh = req.body.monGiangDayChinh;
  let QrCode = req.body.QrCode;

  let oldHoTen = req.body.oldHoTen;
  let oldMaPhongBan = req.body.oldMaPhongBan;
  let oldMonGiangDayChinh = req.body.oldMonGiangDayChinh;
  let oldTruocCCCD = req.body.oldTruocCCCD;
  let oldSauCCCD = req.body.oldSauCCCD;
  let oldFileLyLich = req.body.oldFileLyLich;
  let oldbangTotNghiep = req.body.oldbangTotNghiep;
  let oldFileBoSung = req.body.oldFileBoSung;
  let oldQrCode = req.body.oldQrCode;

  let isQuanDoi = req.body.thuocQuanDoi;

  // Kiểm tra HSL
  // Nếu là chuỗi, thay dấu phẩy bằng dấu chấm
  if (typeof HeSoLuong === "string") {
    HeSoLuong = HeSoLuong.replace(",", ".");
  }

  if (isNaN(HeSoLuong)) {
    return res.redirect(`/updateGvm/${IdGvm}?message=HeSoLuongNotValue`);
  }

  // Kiểm tra trùng CCCD
  const [cccdRows] = await pool.query(
    `SELECT id_Gvm FROM gvmoi WHERE CCCD = ? AND id_Gvm != ?`,
    [CCCD, IdGvm]
  );
  if (cccdRows.length > 0) {
    return res.redirect(`/updateGvm/${IdGvm}?message=duplicateCCCD`);
  }

  // Kiểm tra trùng Họ Tên
  const [hoTenRows] = await pool.query(
    `SELECT id_Gvm FROM gvmoi WHERE HoTen = ? AND id_Gvm != ?`,
    [HoTen, IdGvm]
  );
  if (hoTenRows.length > 0) {
    return res.redirect(`/updateGvm/${IdGvm}?message=duplicateHoTen`);
  }

  const MaPhongBan = Array.isArray(req.body.maPhongBan)
    ? req.body.maPhongBan.join(",") // Nếu là mảng
    : req.body.maPhongBan || ""; // Nếu là chuỗi hoặc không có giá trị
  const parts = IdGvm.split("_"); // Chia chuỗi theo dấu gạch dưới
  const lastPart = parts[parts.length - 1]; // Lấy phần cuối cùng của mảng

  const MaGvm = MaPhongBan + "_GVM_" + lastPart;

  let tinhTrangGiangDay = req.body.tinhTrangGiangDay;
  // let tinhTrangGiangDay =
  //   parseInt(req.body.tinhTrangGiangDay, 10) === 1 ? 1 : 0;
  if (tinhTrangGiangDay.includes("true")) {
    tinhTrangGiangDay = 1;
  } else {
    tinhTrangGiangDay = 0;
  }

  //let tinhTrangGiangDay = req.body.tinhTrangGiangDay ? 1 : 0;

  // Get the original data from the database for logging changes
  let originalGvmData = null;
  try {
    const [origResults] = await pool.query(
      "SELECT * FROM gvmoi WHERE id_Gvm = ?",
      [IdGvm]
    );
    if (origResults && origResults.length > 0) {
      originalGvmData = origResults[0];
    }
  } catch (err) {
    // Error fetching original data
  }

  upload(req, res, async function (err) {
    if (err) {
      // Xóa các file đã upload (nếu có)
      if (req.files) {
        Object.values(req.files).forEach((fileArray) => {
          fileArray.forEach((file) => {
            fs.unlinkSync(file.path); // Xóa file khỏi hệ thống
          });
        });
      }
      return res.redirect("/api/gvm/waiting-list/render?message=uploadError");
    }

    let truocCCCD = req.files["truocCCCD"]
      ? req.files["truocCCCD"][0].filename
      : oldTruocCCCD; // Giữ nguyên đường dẫn cũ nếu không chọn file mới
    let sauCCCD = req.files["sauCCCD"]
      ? req.files["sauCCCD"][0].filename
      : oldSauCCCD; // Giữ nguyên đường dẫn cũ nếu không chọn file mới
    let bangTotNghiep = req.files["bangTotNghiep"]
      ? req.files["bangTotNghiep"][0].filename
      : oldbangTotNghiep;
    let FileLyLich = req.files["FileLyLich"]
      ? req.files["FileLyLich"][0].filename
      : oldFileLyLich;
    let fileBoSung = req.files["fileBoSung"]
      ? req.files["fileBoSung"][0].filename
      : oldFileBoSung;
    let QrCode = req.files["QrCode"]
      ? req.files["QrCode"][0].filename
      : oldQrCode;

    if (
      oldHoTen !== HoTen ||
      oldMaPhongBan !== MaPhongBan ||
      oldMonGiangDayChinh !== MonGiangDayChinh
    ) {
      // Chỉ chạy khi Họ tên hoặc khoa hoặc bộ môn thay đổi
      const fields = {
        truocCCCD: oldTruocCCCD,
        sauCCCD: oldSauCCCD,
        bangTotNghiep: oldbangTotNghiep,
        FileLyLich: oldFileLyLich,
        fileBoSung: oldFileBoSung,
        QrCode: oldQrCode,
      };

      for (const field in fields) {
        if (!req.files[field] && fields[field]) {
          const oldPath = path.join(
            appRoot.path,
            "Giang_Vien_Moi",
            oldMaPhongBan,
            oldMonGiangDayChinh,
            oldHoTen,
            fields[field]
          );
          const newPath = path.join(
            appRoot.path,
            "Giang_Vien_Moi",
            MaPhongBan,
            MonGiangDayChinh,
            HoTen,
            fields[field]
          );
          fs.mkdirSync(path.dirname(newPath), { recursive: true });

          if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);

            console.log(
              `Đã di chuyển file '${field}' từ:\n  ${oldPath}\n  => ${newPath}`
            );
          } else {
            console.log(`Không tìm thấy file '${field}' tại: ${oldPath}`);
          }
        }
      }

      const oldFolderPath = path.join(
        appRoot.path,
        "Giang_Vien_Moi",
        oldMaPhongBan,
        oldMonGiangDayChinh,
        oldHoTen
      );

      if (
        fs.existsSync(oldFolderPath) &&
        fs.readdirSync(oldFolderPath).length === 0
      ) {
        fs.rmdirSync(oldFolderPath);
        console.log("Đã xóa thư mục cũ:", oldFolderPath);
      }
    }

    // Truy vấn để update dữ liệu vào cơ sở dữ liệu
    const query = `UPDATE gvmoi SET 
      MaGvm = ?,
      HoTen = ?,
      GioiTinh = ?,
      NgaySinh = ?,
      CCCD = ?,
      NgayCapCCCD = ?,
      NoiCapCCCD = ?,
      NoiCongTac = ?,
      DiaChi = ?,
      DienThoai = ?,
      Email = ?,
      MaSoThue = ?,
      HocVi = ?,
      ChucVu = ?,
      HSL = ?,
      STK = ?,
      NganHang = ?,
      BangTotNghiepLoai = ?,
      MatTruocCCCD = ?,
      MatSauCCCD = ?,
      BangTotNghiep = ?,
      FileLyLich = ?,
      MaPhongBan = ?,
      TinhTrangGiangDay = ?, 
      MonGiangDayChinh = ?,
      isQuanDoi = ?,
      fileBoSung = ?,
      QrCode = ?
    WHERE id_Gvm = ?`;

    try {
      await pool.query(query, [
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
        BangTotNghiepLoai,
        truocCCCD,
        sauCCCD,
        bangTotNghiep,
        FileLyLich,
        MaPhongBan,
        tinhTrangGiangDay,
        MonGiangDayChinh,
        isQuanDoi,
        fileBoSung,
        QrCode,
        IdGvm,
      ]);
      
      // Log changes if original data is available
      if (originalGvmData) {
        try {
          // Prepare new data object for comparison
          const newData = {
            HoTen,
            GioiTinh,
            NgaySinh,
            CCCD,
            NgayCapCCCD,
            NoiCapCCCD,
            NoiCongTac,
            DiaChi,
            DienThoai,
            Email: email,
            MaSoThue,
            HocVi,
            ChucVu,
            HSL: HeSoLuong,
            STK,
            NganHang,
            BangTotNghiepLoai,
            MatTruocCCCD: truocCCCD,
            MatSauCCCD: sauCCCD,
            BangTotNghiep: bangTotNghiep,
            FileLyLich,
            MaPhongBan,
            TinhTrangGiangDay: tinhTrangGiangDay,
            MonGiangDayChinh,
            isQuanDoi,
            fileBoSung,
            QrCode
          };
          
          // Generate change message
          const changeMessage = generateGvmChangeMessage(originalGvmData, newData);
          
          // Log changes if there are any
          if (changeMessage) {
            // Lấy thông tin user và khoa từ session
            const userId = req.session?.userId || req.session?.userInfo?.ID || 0;
            const tenNhanVien = req.session?.TenNhanVien || req.session?.username || 'Unknown User';
            const khoa = req.session?.MaPhongBan || 'Unknown Department';
            
            const logQuery = `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
                             VALUES (?, ?, ?, ?, ?, NOW())`;
            
            await pool.query(logQuery, [
              userId,
              tenNhanVien,
              khoa,
              'Cập nhật thông tin giảng viên mời',
              changeMessage
            ]);
          }
        } catch (logError) {
          // Continue with the response even if logging fails
        }
      }
      
      res.redirect("/api/gvm/waiting-list/render?message=insertSuccess");
    } catch (err) {
      res.redirect("/api/gvm/waiting-list/render?message=insertFalse");
    }
  });
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getUpdateGvm,
  postUpdateGvm,
  getViewGvm,
};

/**
 * Generate a message describing changes between old and new guest lecturer data
 * @param {Object} oldData - Previous state of the guest lecturer
 * @param {Object} newData - New state of the guest lecturer
 * @returns {string} - Description of changes or empty string if no changes
 */
const generateGvmChangeMessage = (oldData, newData) => {
  if (!oldData || !newData) {
    console.log('Thiếu dữ liệu để so sánh', { oldDataExists: !!oldData, newDataExists: !!newData });
    return '';
  }

  console.log('Đang so sánh dữ liệu cũ và mới...');
  let changeMessage = '';
  
  // Hàm hỗ trợ so sánh an toàn (xử lý undefined/null)
  const isDifferent = (val1, val2) => {
    // Nếu cả hai đều là null hoặc undefined, chúng bằng nhau
    if ((val1 === null || val1 === undefined) && (val2 === null || val2 === undefined)) {
      return false;
    }
    // Nếu chỉ một trong hai là null/undefined, chúng khác nhau
    if ((val1 === null || val1 === undefined) || (val2 === null || val2 === undefined)) {
      return true;
    }
    // Chuyển đổi thành chuỗi để so sánh để tránh vấn đề về kiểu dữ liệu
    return String(val1) !== String(val2);
  };
  
  // Kiểm tra thay đổi tên
  if (isDifferent(oldData.HoTen, newData.HoTen)) {
    console.log('Tên đã thay đổi', { cũ: oldData.HoTen, mới: newData.HoTen });
    changeMessage += `Tên giảng viên mời được đổi từ "${oldData.HoTen || ''}" thành "${newData.HoTen || ''}". `;
  }
  
  // Kiểm tra thay đổi tình trạng giảng dạy
  if (isDifferent(oldData.TinhTrangGiangDay, newData.TinhTrangGiangDay)) {
    const oldStatus = parseInt(oldData.TinhTrangGiangDay || '0');
    const newStatus = parseInt(newData.TinhTrangGiangDay || '0');
    
    console.log('Tình trạng giảng dạy đã thay đổi', { cũ: oldStatus, mới: newStatus });
    
    if (oldStatus === 0 && newStatus === 1) {
      changeMessage += `Thay đổi tình trạng giảng dạy "${newData.HoTen}": Đang giảng dạy. `;
    } else if (oldStatus === 1 && newStatus === 0) {
      changeMessage += `Thay đổi tình trạng giảng dạy "${newData.HoTen}": Đã ngừng giảng dạy. `;
    }
  }
  // Kiểm tra thay đổi ảnh CCCD
  if (isDifferent(oldData.MatTruocCCCD, newData.MatTruocCCCD) || isDifferent(oldData.MatSauCCCD, newData.MatSauCCCD)) {
    console.log('Ảnh CCCD đã thay đổi');
    changeMessage += `Cập nhật ảnh CCCD của giảng viên "${newData.HoTen} - ${newData.CCCD || ''}". `;
  }

  // Kiểm tra thay đổi số CCCD
  if (isDifferent(oldData.CCCD, newData.CCCD)) {
    console.log('Số CCCD đã thay đổi', { cũ: oldData.CCCD, mới: newData.CCCD });
    changeMessage += `Thay đổi số CCCD của giảng viên "${newData.HoTen}": từ "${oldData.CCCD || ''}" thành "${newData.CCCD || ''}". `;
  }
  
  // Kiểm tra thay đổi số tài khoản
  if (isDifferent(oldData.STK, newData.STK)) {
    console.log('STK đã thay đổi', { cũ: oldData.STK, mới: newData.STK });
    changeMessage += `Thay đổi STK của giảng viên mời "${newData.HoTen} - ${newData.CCCD || ''}": từ "${oldData.STK || ''}" thành "${newData.STK || ''}". `;
  }
  
  // Kiểm tra thay đổi số điện thoại
  if (isDifferent(oldData.DienThoai, newData.DienThoai)) {
    console.log('SĐT đã thay đổi', { cũ: oldData.DienThoai, mới: newData.DienThoai });
    changeMessage += `Thay đổi SĐT của giảng viên mời "${newData.HoTen} - ${newData.CCCD || ''}": từ "${oldData.DienThoai || ''}" thành "${newData.DienThoai || ''}". `;
  }
  // Kiểm tra thay đổi email
  if (isDifferent(oldData.Email, newData.Email)) {
    console.log('Email đã thay đổi', { cũ: oldData.Email, mới: newData.Email });
    changeMessage += `Thay đổi Email của giảng viên mời "${newData.HoTen} - ${newData.CCCD || ''}": từ "${oldData.Email || ''}" thành "${newData.Email || ''}". `;
  }
  
  // Kiểm tra các trường bổ sung
  
  // Kiểm tra thay đổi địa chỉ
  if (isDifferent(oldData.DiaChi, newData.DiaChi)) {
    console.log('Địa chỉ đã thay đổi', { cũ: oldData.DiaChi, mới: newData.DiaChi });
    changeMessage += `Thay đổi địa chỉ của giảng viên mời "${newData.HoTen}": từ "${oldData.DiaChi || ''}" thành "${newData.DiaChi || ''}". `;
  }
  
  // Kiểm tra thay đổi nơi công tác
  if (isDifferent(oldData.NoiCongTac, newData.NoiCongTac)) {
    console.log('Nơi công tác đã thay đổi', { cũ: oldData.NoiCongTac, mới: newData.NoiCongTac });
    changeMessage += `Thay đổi nơi công tác của giảng viên mời "${newData.HoTen}": từ "${oldData.NoiCongTac || ''}" thành "${newData.NoiCongTac || ''}". `;
  }
  
  // Kiểm tra thay đổi mã số thuế
  if (isDifferent(oldData.MaSoThue, newData.MaSoThue)) {
    console.log('Mã số thuế đã thay đổi', { cũ: oldData.MaSoThue, mới: newData.MaSoThue });
    changeMessage += `Thay đổi mã số thuế của giảng viên mời "${newData.HoTen}": từ "${oldData.MaSoThue || ''}" thành "${newData.MaSoThue || ''}". `;
  }
  // Kiểm tra thay đổi học vị
  if (isDifferent(oldData.HocVi, newData.HocVi)) {
    console.log('Học vị đã thay đổi', { cũ: oldData.HocVi, mới: newData.HocVi });
    changeMessage += `Thay đổi học vị của giảng viên mời "${newData.HoTen}": từ "${oldData.HocVi || ''}" thành "${newData.HocVi || ''}". `;
  }
  
  // Kiểm tra thay đổi chức vụ
  if (isDifferent(oldData.ChucVu, newData.ChucVu)) {
    console.log('Chức vụ đã thay đổi', { cũ: oldData.ChucVu, mới: newData.ChucVu });
    changeMessage += `Thay đổi chức vụ của giảng viên mời "${newData.HoTen}": từ "${oldData.ChucVu || ''}" thành "${newData.ChucVu || ''}". `;
  }
  
  // Kiểm tra thay đổi hệ số lương
  if (isDifferent(oldData.HSL, newData.HSL)) {
    console.log('Hệ số lương đã thay đổi', { cũ: oldData.HSL, mới: newData.HSL });
    changeMessage += `Thay đổi hệ số lương của giảng viên mời "${newData.HoTen}": từ "${oldData.HSL || ''}" thành "${newData.HSL || ''}". `;
  }
  
  // Kiểm tra thay đổi ngân hàng
  if (isDifferent(oldData.NganHang, newData.NganHang)) {
    console.log('Ngân hàng đã thay đổi', { cũ: oldData.NganHang, mới: newData.NganHang });
    changeMessage += `Thay đổi ngân hàng của giảng viên mời "${newData.HoTen}": từ "${oldData.NganHang || ''}" thành "${newData.NganHang || ''}". `;
  }
  
  // Kiểm tra thay đổi phòng ban
  if (isDifferent(oldData.MaPhongBan, newData.MaPhongBan)) {
    console.log('Phòng ban đã thay đổi', { cũ: oldData.MaPhongBan, mới: newData.MaPhongBan });
    changeMessage += `Thay đổi phòng ban của giảng viên mời "${newData.HoTen}": từ "${oldData.MaPhongBan || ''}" thành "${newData.MaPhongBan || ''}". `;
  }
  
  // Kiểm tra thay đổi môn giảng dạy chính
  if (isDifferent(oldData.MonGiangDayChinh, newData.MonGiangDayChinh)) {
    console.log('Môn giảng dạy chính đã thay đổi', { cũ: oldData.MonGiangDayChinh, mới: newData.MonGiangDayChinh });
    changeMessage += `Thay đổi môn giảng dạy chính của giảng viên mời "${newData.HoTen}": từ "${oldData.MonGiangDayChinh || ''}" thành "${newData.MonGiangDayChinh || ''}". `;
  }
  
  console.log(changeMessage ? 'Đã phát hiện thay đổi' : 'Không có thay đổi');
  return changeMessage;
};
