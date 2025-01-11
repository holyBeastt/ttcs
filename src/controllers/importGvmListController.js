const express = require("express");
const createPoolConnection = require("../config/databasePool");
const gvmList = require("../services/gvmServices");
require("dotenv").config();
const path = require("path");

const multer = require("multer");
const readXlsxFile = require("read-excel-file/node");

const getImportGvmList = (req, res) => {
  res.render("importGvmList.ejs", { data: [] });
};

// Cấu hình multer để lưu file tải lên trong thư mục 'uploads'
//const upload = multer({ dest: "uploads/" });

// Đường dẫn đến thư mục cha
const parentDir = path.join(__dirname, "..");
const p = path.join(parentDir, "..");

let duLieu;
const convertExcelToJSON = (req, res) => {
  // Kiểm tra xem file đã được tải lên chưa
  if (!req.file) {
    return res
      .status(400)
      .json({ message: "No file uploaded", status: "error" });
  }

  const filePath = path.join(p, "uploads", req.file.filename);

  // Đọc file Excel
  readXlsxFile(filePath)
    .then((rows) => {
      duLieu = rows;

      // Lấy tiêu đề (headers) từ hàng đầu tiên
      const headers = rows[0];

      // Chuyển đổi các hàng còn lại thành các đối tượng
      const data = rows.slice(1).map((row) => {
        return headers.reduce((acc, header, index) => {
          acc[header] = row[index];
          return acc;
        }, {});
      });

      // Render dữ liệu ra view 'importGvmList.ejs' và truyền dữ liệu vào
      res.render("importGvmList.ejs", { data });
    })
    .catch((error) => {
      console.error("Lỗi khi đọc file:", error);
      res.status(500).send("Đã xảy ra lỗi khi đọc file!");
    });
};

// function formatDateForMySQL(dateString) {
//   // Chuyển đổi từ định dạng ISO với thời gian sang chỉ ngày
//   return dateString.split("T")[0]; // '1985-09-13'
// }

function formatDateForMySQL(date) {
  const dateMacDinh = "1900-01-01";

  if (!date) return dateMacDinh; // Kiểm tra giá trị null hoặc undefined

  // Nếu ngày là chuỗi dạng DD/MM/YYYY
  if (typeof date === "string" && date.includes("/")) {
    const parts = date.split("/");
    if (parts.length === 3) {
      // Đổi thành 'YYYY-MM-DD'
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  // Nếu ngày là chuỗi ISO hoặc đối tượng Date
  const dateObj = new Date(date);
  if (!isNaN(dateObj)) {
    // Trả về chuỗi 'YYYY-MM-DD' từ đối tượng Date
    return dateObj.toISOString().split("T")[0];
  }

  return dateMacDinh; // Trả về null nếu định dạng không hợp lệ
}

// Xử lý
const getArrValue = async (req, res) => {
  // Lấy tiêu đề
  const headers = duLieu[0]; // Lấy hàng tiêu đề

  // Lấy tất cả các hàng dữ liệu
  const rows = data.slice(1); // Lấy các hàng từ chỉ mục 1 đến cuối

  // Chuyển đổi thành mảng các đối tượng
  const result = rows.map((row) => {
    return headers.reduce((acc, header, index) => {
      acc[header] = row[index];
      return acc;
    }, {});
  });
};

const saveToDB = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection(); // Kết nối đến DB
    const data = JSON.parse(req.body.data); // Lấy dữ liệu từ request (dữ liệu đã render ra)

    const MaPhongBan = req.session.MaPhongBan;

    // Lấy danh sách bộ môn trong khoa
    const [boMonList] = await connection.query(
      `select * from bomon where MaPhongBan = ?`,
      MaPhongBan
    );

    const TinhTrangGiangDay = 1; // Tình trạng giảng dạy

    const duplicateCCCDs = [];
    const duplicateName = [];
    const khoaFalse = [];
    const boMonFalse = [];

    if (data && data.length > 0) {
      const gvms = await gvmList.getGvmLists(req, res);
      let length = parseInt(gvms.length) + 1;

      for (const row of data) {
        const MaGvm = MaPhongBan + "_GVM_" + length;
        const GioiTinh = row["Giới tính"];
        let HoTen = row["Họ và tên"];
        const CCCD = row["Số CCCD"];
        const NoiCapCCCD = row["Nơi cấp"] || " ";
        const DiaChi = row["Địa chỉ theo CCCD"];
        const Email = row["Email"] || " ";
        const MaSoThue = row["Mã số thuế"] || " ";
        const HocVi = row["Học vị"] || " ";
        const ChucVu = row["Chức vụ"] || " ";
        let HSL = row["Hệ số lương"] || " ";
        const DienThoai = row["Điện thoại"] || " ";
        const STK = row["Số tài khoản"] || " ";
        const NganHang = row["Tại ngân hàng"] || " ";
        const NoiCongTac = row["Nơi công tác"] || " ";
        const MonGiangDayChinh = row["Bộ môn"] || " ";
        const BangTotNghiepLoai = row["Bằng loại"] || " ";
        const dateSinh = row["Ngày sinh"]; // '1985-09-13T00:00:00.000Z'
        const NgaySinh = formatDateForMySQL(dateSinh); // Kết quả: '1985-09-13'
        const dateCap = row["Ngày cấp CCCD"]; // '1985-09-13T00:00:00.000Z'
        const NgayCapCCCD = formatDateForMySQL(dateCap); // Kết quả: '1985-09-13'

        // Check Khoa để nhỡ import nhầm file
        const Khoa = row["Khoa"] || " ";
        let khoaIsFalse = false;
        if (Khoa.trim() != MaPhongBan && Khoa.trim() != "") {
          khoaFalse.push(HoTen + " - " + Khoa);
          khoaIsFalse = true;
        }

        if (khoaIsFalse) continue;

        // Check Khoa và bộ môn (Môn giảng dạy chính) có đúng không
        if (MonGiangDayChinh.trim() != "") {
          const isInBoMonList = boMonList.some(
            (bm) => bm.MaBoMon.trim() === MonGiangDayChinh.trim()
          );

          if (!isInBoMonList) {
            boMonFalse.push(HoTen + " - " + MonGiangDayChinh);
            continue;
          }
        }

        // Xử lý nếu HSL có dấu ,
        // Kiểm tra nếu HSL chỉ chứa khoảng trắng hoặc rỗng, gán giá trị mặc định là "0"
        if (typeof HSL === "string" && HSL.includes(",")) {
          HSL = parseFloat(HSL.replace(",", "."));
        } else {
          HSL = parseFloat(HSL); // Trường hợp HSL là số hoặc chuỗi đã chuẩn
        }

        let isDuplicate = false;
        let duplicateCount = 0;
        let originalName = HoTen;
        // Kiểm tra trùng CCCD
        for (const gvm of gvms) {
          if (gvm.CCCD == CCCD) {
            duplicateCCCDs.push(HoTen + " - " + CCCD);
            isDuplicate = true; // Bỏ qua và tiếp tục
          }
        }

        if (isDuplicate) continue;

        if (!isDuplicate) {
          let nameExists = true;
          let modifiedName = HoTen; // Biến tạm để lưu tên cuối cùng
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
        }

        const sql = `
        INSERT INTO gvmoi
        (GioiTinh, MaGvm, HoTen, NgaySinh, BangTotNghiepLoai, NoiCongTac, MonGiangDayChinh, DiaChi, Email, MaSoThue, HocVi, ChucVu, HSL, DienThoai, STK, NganHang, MaPhongBan, TinhTrangGiangDay, CCCD, NgayCapCCCD, NoiCapCCCD)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

        const values = [
          GioiTinh,
          MaGvm,
          HoTen,
          NgaySinh,
          BangTotNghiepLoai,
          NoiCongTac,
          MonGiangDayChinh,
          DiaChi,
          Email,
          MaSoThue,
          HocVi,
          ChucVu,
          HSL,
          DienThoai,
          STK,
          NganHang,
          MaPhongBan,
          TinhTrangGiangDay,
          CCCD,
          NgayCapCCCD,
          NoiCapCCCD,
        ];

        await connection.query(sql, values);
        length++; // Tăng độ dài sau mỗi lần chèn thành công
      }

      let mess = "";

      if (duplicateCCCDs.length > 0) {
        mess = `<b>Dữ liệu không được lưu cho các giảng viên sau do trùng CCCD:</b> \n${duplicateCCCDs.join(
          "\n "
        )}`;
      }

      if (duplicateName.length > 0) {
        mess += `\n<b>Tên các giảng viên bị trùng sẽ được lưu như sau:</b> \n${duplicateName.join(
          "\n "
        )}`;
      }

      if (khoaFalse.length > 0) {
        mess += `\n<b>Dữ liệu không được lưu cho các giảng viên sau do không đúng khoa:</b> \n${khoaFalse.join(
          "\n "
        )}`;
      }

      if (boMonFalse.length > 0) {
        mess += `\n<b>Dữ liệu không được lưu cho các giảng viên sau do không đúng mã bộ môn trong khoa:</b> \n${boMonFalse.join(
          "\n "
        )}`;
      }

      // Trả về phản hồi nếu có thông báo
      if (mess !== "") {
        return res.status(400).json({ message: mess });
      }

      // Gửi phản hồi thành công
      res.json({ message: "Dữ liệu đã được lưu thành công vào database!" });
    } else {
      // Gửi phản hồi lỗi nếu không có dữ liệu
      res.status(400).json({ message: "Không có dữ liệu để lưu." });
    }
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu vào database:", error);
    if (!res.headersSent) {
      res.status(500).send("Đã xảy ra lỗi khi lưu dữ liệu vào database!");
    }
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getImportGvmList,
  convertExcelToJSON,
  getArrValue,
  saveToDB,
};
