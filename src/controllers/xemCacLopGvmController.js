//const { require } = require("app-root-path");
const express = require("express");
const createPoolConnection = require("../config/databasePool");

const router = express.Router();

const getClassInfoGvm = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    // Lấy danh sách phòng ban để lọc
    const qrPhongBan = `select MaPhongBan from phongban where isKhoa = 1`;
    const [phongBanList] = await connection.query(qrPhongBan);

    res.render("xemCacLopGvm.ejs", {
      phongBanList: phongBanList,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const updateQCGvm = async (req, res) => {
  const isKhoa = req.session.isKhoa;
  const tableName = process.env.DB_TABLE_QC;
  const jsonData = req.body;

  let connection;

  try {
    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    // Duyệt qua từng phần tử trong jsonData
    for (let item of jsonData) {
      const {
        ID,
        Khoa,
        Dot,
        KiHoc,
        NamHoc,
        GiaoVien,
        GiaoVienGiangDay,
        MoiGiang,
        SoTinChi,
        MaHocPhan,
        LopHocPhan,
        TenLop,
        BoMon,
        LL,
        SoTietCTDT,
        HeSoT7CN,
        SoSinhVien,
        HeSoLopDong,
        QuyChuan,
        GhiChu,
        KhoaDuyet,
        DaoTaoDuyet,
        TaiChinhDuyet,
        NgayBatDau,
        NgayKetThuc,
      } = item;

      if (KhoaDuyet == 1) {
        if (!GiaoVienGiangDay || GiaoVienGiangDay.length === 0) {
          return res.status(200).json({
            message: `Lớp học phần ${LopHocPhan} (${TenLop}) chưa được điền giảng viên`,
          });
        }
      }

      let updateQuery, updateValues;
      if (isKhoa == 1) {
        // Nếu chưa duyệt đầy đủ, tiến hành cập nhật
        updateQuery = `
      UPDATE ${tableName}
      SET 
        Khoa = ?, 
        Dot = ?, 
        KiHoc = ?, 
        NamHoc = ?, 
        GiaoVien = ?, 
        GiaoVienGiangDay = ?, 
        MoiGiang = ?, 
        SoTinChi = ?, 
        MaHocPhan = ?, 
        LopHocPhan = ?, 
        TenLop = ?, 
        BoMon = ?, 
        LL = ?, 
        SoTietCTDT = ?, 
        HeSoT7CN = ?, 
        SoSinhVien = ?, 
        HeSoLopDong = ?, 
        QuyChuan = ?, 
        GhiChu = ?,
        KhoaDuyet = ?,
        DaoTaoDuyet = ?,
        TaiChinhDuyet = ?,
        NgayBatDau = ?,
        NgayKetThuc = ?
      WHERE ID = ?
    `;

        updateValues = [
          Khoa,
          Dot,
          KiHoc,
          NamHoc,
          GiaoVien,
          GiaoVienGiangDay,
          MoiGiang,
          SoTinChi,
          MaHocPhan,
          LopHocPhan,
          TenLop,
          BoMon,
          LL,
          SoTietCTDT,
          HeSoT7CN,
          SoSinhVien,
          HeSoLopDong,
          QuyChuan,
          GhiChu,
          KhoaDuyet,
          DaoTaoDuyet,
          TaiChinhDuyet,
          isNaN(new Date(NgayBatDau).getTime()) ? null : NgayBatDau,
          isNaN(new Date(NgayKetThuc).getTime()) ? null : NgayKetThuc,
          ID,
        ];
      } else {
        // Nếu chưa duyệt đầy đủ, tiến hành cập nhật
        updateQuery = `
      UPDATE ${tableName}
      SET 
        KhoaDuyet = ?,
        DaoTaoDuyet = ?,
        TaiChinhDuyet = ?
      WHERE ID = ?
    `;

        updateValues = [KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet, ID];
      }

      await connection.query(updateQuery, updateValues);

      // Ghi log cho việc duyệt với thông tin chi tiết
      const userId = req.session.userId || req.session.userInfo?.ID || 0;
      const tenNhanVien = req.session.TenNhanVien || req.session.username || 'Unknown User';
      const maPhongBan = req.session.MaPhongBan || 'Unknown Department';
      
      // Lấy tên phòng ban thực tế từ database
      let tenPhongBan = maPhongBan;
      try {
        const [phongBanInfo] = await connection.query(
          "SELECT TenPhongBan FROM phongban WHERE MaPhongBan = ?",
          [maPhongBan]
        );
        if (phongBanInfo.length > 0) {
          tenPhongBan = phongBanInfo[0].TenPhongBan;
        }
      } catch (error) {
        console.log("Không lấy được tên phòng ban:", error);
      }

      let logContent = [];
      if (KhoaDuyet === 1) {
        logContent.push(`${tenPhongBan} thay đổi duyệt môn "${LopHocPhan} - ${TenLop}": Đã duyệt`);
      }
      if (DaoTaoDuyet === 1) {
        logContent.push(`Đào tạo thay đổi duyệt môn "${LopHocPhan} - ${TenLop}": Đã duyệt`);
      }
      if (TaiChinhDuyet === 1) {
        logContent.push(`Tài chính thay đổi duyệt môn "${LopHocPhan} - ${TenLop}": Đã duyệt`);
      }

      if (logContent.length > 0) {
        await connection.query(
          "INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES (?, ?, ?, ?, ?, NOW())",
          [
            userId,
            tenNhanVien,
            maPhongBan,
            "Thay đổi thông tin giảng dạy",
            logContent.join(". ")
          ]
        );
      }
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

module.exports = { getClassInfoGvm, updateQCGvm };
