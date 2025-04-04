const express = require("express");
const mysql = require("mysql2/promise"); // Ensure you have mysql2 installed
const createPoolConnection = require("../config/databasePool");

const AdminController = {
  index: (req, res) => {
    res.render("admin", { title: "Trang admin" });
  },

  showThemTaiKhoan: (req, res) => {
    res.render("themTK", { title: "Thêm Tài Khoản" });
  },

  showThemNhanVien: (req, res) => {
    res.render("themNhanVien", { title: "Thêm Nhân Viên" });
  },

  showThemPhongBan: (req, res) => {
    res.render("themPhongBan", { title: "Thêm Phòng Ban" });
  },

  showThemKyTuBD: (req, res) => {
    res.render("themKyTuBD", { title: "Thêm Ký tự bắt đầu" });
  },

  // phần thêm
  themNhanVien: async (req, res) => {
    let {
      TenNhanVien,
      NgaySinh,
      GioiTinh,
      DienThoai,
      HocVi,
      CCCD,
      NgayCapCCCD,
      NoiCapCCCD,
      DiaChiCCCD,
      DiaChiHienNay,
      ChucVu,
      NoiCongTac,
      MaPhongBan,
      MaSoThue,
      SoTaiKhoan,
      NganHang,
      ChiNhanh,
      MonGiangDayChinh,
      CacMonLienQuan,
      MatKhau,
      Quyen,
      HSL,
      Luong,
      PhanTramMienGiam,
    } = req.body;
    let TenDangNhap = req.body.TenDangNhap;

    let connection;
    try {
      connection = await createPoolConnection();

      // Kiểm tra trùng CCCD
      const checkDuplicateQuery =
        "SELECT COUNT(*) as count FROM nhanvien WHERE CCCD = ?";
      const [duplicateRows] = await connection.query(checkDuplicateQuery, [
        CCCD,
      ]);
      if (duplicateRows[0].count > 0) {
        connection.release(); // Giải phóng kết nối trước khi trả về
        return res
          .status(409)
          .json({ message: "CCCD đã tồn tại. Vui lòng kiểm tra lại." });
      }

      // Kiểm tra trùng tài khoản
      const checkDuplicateAcc =
        "SELECT COUNT(*) as count FROM taikhoannguoidung WHERE TenDangNhap = ?";
      const [duplicateAcc] = await connection.query(checkDuplicateAcc, [
        TenDangNhap,
      ]);

      if (duplicateAcc[0].count > 0) {
        connection.release(); // Giải phóng kết nối trước khi trả về
        return res.status(409).json({
          message:
            "Tên đăng nhập đã tồn tại. Vui lòng nhập tên đăng nhập khác.",
        });
      }
      const ModeHSL = parseFloat(HSL); // Chuyển thành số thực
      if (isNaN(ModeHSL) || ModeHSL < 0) {
        connection.release();
        return res.status(400).json({
          message: "Hệ số lương phải là số lớn hơn 0. Vui lòng kiểm tra lại.",
        });
      }
      if (!/^\d*$/.test(Luong)) {
        // Kiểm tra nếu Luong không phải là chuỗi số
        connection.release(); // Giải phóng kết nối trước khi trả về
        return res.status(400).json({
          message: "Lương phải là một dãy số hợp lệ. Vui lòng kiểm tra lại.",
        });
      }
      const phanTram = parseFloat(PhanTramMienGiam); // Chuyển thành số thực
      if (isNaN(phanTram) || phanTram < 0 || phanTram > 100) {
        connection.release();
        return res.status(400).json({
          message:
            "Phần trăm miễn giảm phải là số từ 0 đến 100. Vui lòng kiểm tra lại.",
        });
      }

      // Kiểm tra trùng lặp tên
      const nvQuery = "select * from nhanvien";
      const [NhanVienList] = await connection.query(nvQuery); // Truyền kết nối vào

      let nameExists = true;
      let modifiedName = TenNhanVien.trim(); // Biến tạm để lưu tên cuối cùng
      let duplicateName = [];
      let duplicateCount = 0;
      let originalName = TenNhanVien;

      while (nameExists) {
        nameExists = NhanVienList.some(
          (nv) => nv.TenNhanVien.trim() === modifiedName
        );
        if (nameExists) {
          duplicateCount++;
          modifiedName = `${originalName} (${String.fromCharCode(
            64 + duplicateCount
          )})`; // A, B, C...
        }
      }
      // Khi xử lý xong, thêm tên cuối cùng vào danh sách trùng
      if (modifiedName !== TenNhanVien) {
        duplicateName.push(`${TenNhanVien} -> ${modifiedName}`); // Ghi lại thay đổi
      }
      TenNhanVien = modifiedName; // Cập nhật tên cuối cùng

      // Thêm mới nhân viên vào csdl
      const queryInsert = `
        INSERT INTO nhanvien (
            TenNhanVien, NgaySinh, GioiTinh, DienThoai, HocVi, CCCD,
            NgayCapCCCD, NoiCapCCCD, DiaChiHienNay, DiaChiCCCD, ChucVu, NoiCongTac,
            MaPhongBan, MaSoThue, SoTaiKhoan, NganHang, ChiNhanh,
            MonGiangDayChinh, CacMonLienQuan, HSL, Luong, PhanTramMienGiam
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const valuesInsert = [
        TenNhanVien,
        NgaySinh,
        GioiTinh,
        DienThoai,
        HocVi,
        CCCD,
        NgayCapCCCD || "1899-11-29",
        NoiCapCCCD,
        DiaChiHienNay,
        DiaChiCCCD,
        ChucVu,
        NoiCongTac,
        MaPhongBan,
        MaSoThue,
        SoTaiKhoan,
        NganHang,
        ChiNhanh,
        MonGiangDayChinh || "",
        CacMonLienQuan,
        HSL,
        Luong,
        PhanTramMienGiam,
      ];

      console.log("value = ", valuesInsert);

      const [result] = await connection.execute(queryInsert, valuesInsert);
      const id_User = result.insertId;

      const MaNhanVien = `${MaPhongBan}${id_User}`;

      const queryUpdate = `UPDATE nhanvien SET MaNhanVien = ? WHERE id_User = ?`;
      await connection.execute(queryUpdate, [MaNhanVien, id_User]);

      if (!TenDangNhap) {
        TenDangNhap = `${MaPhongBan}${id_User}`;
      }

      const queryInsertTaiKhoanNguoiDung = `
        INSERT INTO taikhoannguoidung (TenDangNhap, MatKhau, id_User) 
        VALUES (?, ?, ?)
      `;
      await connection.execute(queryInsertTaiKhoanNguoiDung, [
        TenDangNhap,
        MatKhau,
        id_User,
      ]);

      const querySelectIsKhoa =
        "SELECT isKhoa FROM phongban WHERE MaPhongBan = ?";
      const [resultIsKhoa] = await connection.execute(querySelectIsKhoa, [
        MaPhongBan,
      ]);
      const isKhoa = resultIsKhoa.length > 0 ? resultIsKhoa[0].isKhoa : 0;

      const queryInsertRole = `
        INSERT INTO role (TenDangNhap, MaPhongBan, Quyen, isKhoa)
        VALUES (?, ?, ?, ?)
      `;
      await connection.execute(queryInsertRole, [
        TenDangNhap,
        MaPhongBan,
        Quyen,
        isKhoa,
      ]);

      if (duplicateName.length > 0) {
        const message = "Tên giảng viên bị trùng sẽ được lưu như sau: ";

        // Mã hóa duplicateName và nối với thông điệp
        const encodedDuplicateNames = duplicateName.join(",");

        // Nối thông điệp và danh sách tên đã mã hóa
        return res.status(200).json({
          message: `${message}${duplicateName}`,
          MaNhanVien: MaNhanVien,
        });
      }

      res
        .status(200)
        .json({ message: "Thêm nhân viên thành công", MaNhanVien: MaNhanVien });
    } catch (error) {
      console.error("Lỗi khi thêm nhân viên:", error);
      res.status(500).json({
        message: "Đã xảy ra lỗi khi thêm nhân viên",
        error: error.message,
      });
    } finally {
      if (connection) {
        try {
          connection.release(); // Trả lại kết nối vào pool
        } catch (error) {
          console.error("Lỗi khi trả lại kết nối:", error);
        }
      }
    }
  },

  themPhongBan: async (req, res) => {
    const { maPhongBan, tenPhongBan, ghiChu, khoa } = req.body;
    let connection;
    try {
      connection = await createPoolConnection();

      const query = `
            INSERT INTO phongban (maPhongBan, tenPhongBan, ghiChu, isKhoa)
            VALUES (?, ?, ?, ?)
        `;

      const values = [maPhongBan, tenPhongBan, ghiChu, khoa ? 1 : 0];

      await connection.execute(query, values);
      res.redirect("/phongBan?themphongbanthanhcong");
    } catch (error) {
      console.error("Lỗi khi thêm phòng ban:", error);
      res.status(500).json({ message: "Đã xảy ra lỗi khi thêm phòng ban" });
    } finally {
      if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
  },

  postthemTK: async (req, res) => {
    const TenDangNhap = req.body.TenDangNhap;
    const id_User = req.body.id_User;
    const MatKhau = req.body.MatKhau;
    //const MaPhongBan = req.body.MaPhongBan;
    const Quyen = req.body.Quyen;
    const Khoa = req.body.isKhoa;
    const connection = await createPoolConnection();

    // Check trùng tên đăng nhập
    const checkDuplicateQuery = `
    SELECT COUNT(*) as count 
    FROM taikhoannguoidung 
    WHERE LOWER(TenDangNhap) = LOWER(?)
  `;

    const [duplicateRows] = await connection.query(checkDuplicateQuery, [
      TenDangNhap,
    ]);

    console.log(duplicateRows);

    if (duplicateRows[0].count > 0) {
      connection.release(); // Giải phóng kết nối trước khi trả về
      return res
        .status(409)
        .json({ message: "Tên đăng nhập đã tồn tại. Vui lòng kiểm tra lại." });
    }

    // Lấy dữ liệu phòng ban
    const queryP = "SELECT MaPhongBan FROM nhanvien where id_User = ?";
    const [rs] = await connection.query(queryP, [id_User]);

    let MaPhongBan = rs[0].MaPhongBan;

    try {
      // Cập nhật bảng thứ hai
      const query2 = `
      INSERT INTO taikhoannguoidung (TenDangNhap, id_User, MatKhau)
      VALUES (?, ?, ?)
    `;
      await connection.query(query2, [TenDangNhap, id_User, MatKhau]);

      // Cập nhật bảng đầu tiên
      const query1 = `
          INSERT INTO role (TenDangNhap, MaPhongBan, Quyen, isKhoa)
          VALUES (?, ?, ?, ?)
      `;
      await connection.query(query1, [TenDangNhap, MaPhongBan, Quyen, Khoa]);

      return res.status(200).json({ message: "Tạo tài khoản mới thành công" });
      //res.redirect("/thongTinTK?ThemTK=Success");
    } catch (error) {
      console.error("Lỗi khi cập nhật dữ liệu: ", error);
      res.redirect("/thongTinTK?ThemTK=False");
    } finally {
      if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
  },

  getNhanVien: (req, res) => {
    res.render("nhanVien", { title: "Danh sách nhân viên" });
  },

  // phần hiển thị danh sách
  getListNhanVien: async (req, res) => {
    let connection;
    try {
      connection = await createPoolConnection();
      const [rows] = await connection.query(
        "SELECT id_User, MaNhanVien, TenNhanVien, MaPhongBan FROM nhanvien"
      );
      res.json(rows);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách nhân viên:", error);
      res
        .status(500)
        .json({ message: "Đã xảy ra lỗi khi lấy danh sách nhân viên" });
    } finally {
      if (connection) connection.release();
    }
  },

  getListPhongBan: async (req, res) => {
    let connection;
    try {
      connection = await createPoolConnection();
      console.log("Đang truy vấn danh sách phòng ban...");
      const [rows] = await connection.query(
        "SELECT maPhongBan, tenPhongBan, ghiChu, isKhoa FROM phongban"
      );
      console.log("Kết quả truy vấn:", rows);
      res.json(rows);
    } catch (error) {
      console.error("Lỗi chi tiết khi lấy danh sách phòng ban:", error);
      res.status(500).json({
        message: "Đã xảy ra lỗi khi lấy danh sách phòng ban",
        error: error.message,
      });
    } finally {
      if (connection) connection.release();
    }
  },
  getUpdateNV: async (req, res) => {
    let connection = await createPoolConnection();
    try {
      const id_User = parseInt(req.params.id);

      // Lấy dữ liệu nhân viên
      const query1 = "SELECT * FROM `nhanvien` WHERE id_User = ?";
      const [results1] = await connection.query(query1, [id_User]);
      let user = results1 && results1.length > 0 ? results1[0] : {};

      // Lấy dữ liệu phòng ban
      const query2 = "SELECT * FROM phongban";
      const [results2] = await connection.query(query2);
      let departmentLists = results2; // Gán kết quả vào departmentLists

      // Lấy dữ liệu tài khoản
      const query3 = "SELECT * FROM `taikhoannguoidung` WHERE id_User = ?";
      const [results3] = await connection.query(query3, [id_User]);
      let account = results3 && results3.length > 0 ? results3[0] : {};
      let TenDangNhap = account.TenDangNhap || "";

      // Lấy dữ liệu role
      const query4 = "SELECT * FROM `role` WHERE TenDangNhap = ?";
      const [results4] = await connection.query(query4, [TenDangNhap]);
      let role = results4 && results4.length > 0 ? results4[0] : {};

      // Render trang với 2 biến: value và departmentLists
      res.render("updateNV.ejs", {
        value: user,
        departmentLists: departmentLists,
        account: account,
        role: role,
      });
    } catch (error) {
      console.error("Lỗi: ", error);
      res.status(500).send("Đã có lỗi xảy ra");
    } finally {
      if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
  },
  getUpdateTK: async (req, res) => {
    let connection = await createPoolConnection();
    try {
      const TenDangNhap = req.params.TenDangNhap;

      // Lấy dữ liệu tài khoản
      const query1 = "SELECT * FROM `taikhoannguoidung` WHERE TenDangNhap = ?";
      const [results1] = await connection.query(query1, [TenDangNhap]);
      let accountList = results1 && results1.length > 0 ? results1[0] : {};

      // Lấy dữ liệu phòng ban
      const query2 = "SELECT * FROM phongban";
      const [results2] = await connection.query(query2);
      let departmentLists = results2; // Gán kết quả vào departmentLists

      // Lấy dữ liệu nhân viên
      const id_User = accountList.id_User;
      const query3 =
        "SELECT nhanvien.TenNhanVien, nhanvien.id_User, nhanvien.MaPhongBan, phongban.isKhoa FROM nhanvien INNER JOIN phongban ON nhanvien.MaPhongBan = phongban.MaPhongBan WHERE id_User = ?";
      const [results3] = await connection.query(query3, [id_User]);
      id = results3 && results3.length > 0 ? results3[0] : {}; // Gán kết quả đầu tiên nếu có

      //Lấy dữ liệu bảng nhân viên
      const query4 = "SELECT * FROM nhanvien";
      const [results4] = await connection.query(query4);
      let user = results4; // Gán kết quả vào user

      //Lấy dữ liệu quyền
      const query5 = "SELECT * FROM `role` WHERE TenDangNhap = ?";
      const [results5] = await connection.query(query5, [TenDangNhap]);
      let role = results5 && results5.length > 0 ? results5[0] : {};

      //Lấy danh sách quyền theo phòng ban
      const PhongBan = accountList.MaPhongBan;
      const query6 = "SELECT *FROM role WHERE MaPhongBan = ?";
      const [results6] = await connection.query(query6, [PhongBan]);
      let roleList = results6;

      // Render trang với 2 biến: value và departmentLists
      res.render("updateTK.ejs", {
        accountList: accountList,
        departmentLists: departmentLists,
        user: user,
        id: id,
        role: role,
        roleList: roleList,
      });
    } catch (error) {
      console.error("Lỗi: ", error);
      res.status(500).send("Đã có lỗi xảy ra");
    } finally {
      if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
  },

  getTenNhanVien: async (req, res) => {
    const TenNhanVien = req.query.TenNhanVien; // Lấy TenNhanVien từ query string
    let connection = await createPoolConnection();
    try {
      // Lấy MaPhongBan và isKhoa từ bảng nhanvien và phongban dựa vào TenNhanVien
      const query1 = `
            SELECT nhanvien.MaPhongBan, phongban.isKhoa, nhanvien.id_User 
            FROM nhanvien 
            INNER JOIN phongban ON nhanvien.MaPhongBan = phongban.MaPhongBan 
            WHERE nhanvien.TenNhanVien = ?
        `;
      const [results1] = await connection.query(query1, [TenNhanVien]);

      // Nếu có kết quả thì lấy MaPhongBan và isKhoa
      const MaPhongBan = results1.length > 0 ? results1[0].MaPhongBan : null;
      const isKhoa = results1.length > 0 ? results1[0].isKhoa : null;
      const id_User = results1.length > 0 ? results1[0].id_User : null;

      // Trả về dữ liệu JSON
      res.json({ MaPhongBan, isKhoa, id_User });
    } catch (error) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu: ", error);
      res.status(500).json({ error: "Đã có lỗi xảy ra" });
    } finally {
      if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
  },

  getthemTaiKhoan: async (req, res) => {
    let connection = await createPoolConnection();
    try {
      // Kết nối tới cơ sở dữ liệu
      const query2 = "SELECT TenNhanVien FROM nhanvien";
      const [results2] = await connection.query(query2);
      let TenNhanVien = results2;

      // Render trang với 2 biến: departmentLists và user
      res.render("themTk.ejs", {
        TenNhanVien: TenNhanVien,
      });
    } catch (error) {
      console.error("Lỗi: ", error);
      res.status(500).send("Đã có lỗi xảy ra");
    } finally {
      if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
  },

  getQuyenByPhongBan: async (req, res) => {
    const maPhongBan = req.query.MaPhongBan;
    let connection = await createPoolConnection();

    try {
      // Tạo kết nối đến database
      // Thực hiện truy vấn
      const [results] = await connection.execute(
        "SELECT isKhoa FROM phongban WHERE MaPhongBan = ?",
        [maPhongBan]
      );

      // Trả về kết quả isKhoa
      if (results.length > 0) {
        return res.json({ isKhoa: results[0].isKhoa });
      } else {
        return res.json({ isKhoa: 0 }); // Giá trị mặc định nếu không tìm thấy
      }
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      return res.status(500).json({ error: "Database error" });
    } finally {
      if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
  },
  getBoMon: async (req, res) => {
    let connection;
    try {
      // Lấy dữ liệu bộ môn
      connection = await createPoolConnection();
      const query = "SELECT * FROM `bomon` ORDER BY MaPhongBan, MaBoMon";
      const [results] = await connection.query(query);
      // Render trang với 2 biến: boMon
      res.render("boMon.ejs", {
        boMon: results,
      });
    } catch (error) {
      console.error("Lỗi: ", error);
      res.status(500).send("Đã có lỗi xảy ra");
    } finally {
      if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
  },

  getPhongBan: async (req, res) => {
    let connection;
    try {
      connection = await createPoolConnection();
      const query = "SELECT MaPhongBan FROM `phongban`";
      const [result] = await connection.query(query);
      res.json({
        success: true,
        MaPhongBan: result,
      });
    } catch (error) {
      console.error("Lỗi: ", error);
      res.status(500).send("Đã có lỗi xảy ra");
    } finally {
      if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
  },

  themBoMon: async (req, res) => {
    const { MaPhongBan, MaBoMon, TenBoMon, TruongBoMon } = req.body;
    const connection = await createPoolConnection();
    try {
      const query = `INSERT INTO bomon (MaPhongBan, MaBoMon, TenBoMon, TruongBoMon) 
                      VALUES (?, ?, ?, ?)`;
      await connection.query(query, [
        MaPhongBan,
        MaBoMon,
        TenBoMon,
        TruongBoMon,
      ]);

      res.redirect("/boMon?Success");
    } catch (error) {
      console.error("Lỗi khi cập nhật dữ liệu: ", error);
      res.status(500).send("Lỗi server, không thể cập nhật dữ liệu");
    } finally {
      if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
  },

  getViewNV: async (req, res) => {
    let connection;
    try {
      const id_User = parseInt(req.params.id);

      // Lấy dữ liệu nhân viên
      connection = await createPoolConnection();
      const query1 = "SELECT * FROM `nhanvien` WHERE id_User = ?";
      const [results1] = await connection.query(query1, [id_User]);
      let user = results1 && results1.length > 0 ? results1[0] : {};
      let maBoMon = user.MonGiangDayChinh || "";

      // Lấy dữ liệu tài khoản
      const query2 = "SELECT * FROM `taikhoannguoidung` WHERE id_User = ?";
      const [results2] = await connection.query(query2, [id_User]);
      let account = results2 && results2.length > 0 ? results2[0] : {};
      let TenDangNhap = account.TenDangNhap || "";

      // Lấy dữ liệu role
      const query3 = "SELECT * FROM `role` WHERE TenDangNhap = ?";
      const [results3] = await connection.query(query3, [TenDangNhap]);
      let role = results3 && results3.length > 0 ? results3[0] : {};

      //Lấy tên môn học
      const query4 = "SELECT * FROM bomon WHERE MaBoMon = ?";
      const [results4] = await connection.query(query4, [maBoMon]);
      let TenBoMon = results4 && results4.length > 0 ? results4[0] : {};

      // Render trang với 2 biến: value và departmentLists
      res.render("viewNV.ejs", {
        value: user,
        account: account,
        role: role,
        tenBoMon: TenBoMon,
      });
    } catch (error) {
      console.error("Lỗi: ", error);
      res.status(500).send("Đã có lỗi xảy ra");
    } finally {
      if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
  },
  getNamHoc: async (req, res) => {
    let connection;
    try {
      const connection = await createPoolConnection();
      const query1 =
        "SELECT *FROM `namhoc` ORDER BY trangthai DESC , NamHoc ASC";
      const [result1] = await connection.query(query1);
      const query2 = "SELECT *FROM `ki` ORDER BY trangthai DESC";
      const [result2] = await connection.query(query2);
      const query3 = "SELECT *FROM `dot` ORDER BY trangthai DESC";
      const [result3] = await connection.query(query3);

      // Đóng kết nối sau khi truy vấn hoàn thành
      //connection.end();

      res.json({
        success: true,
        NamHoc: result1,
        Ki: result2,
        Dot: result3,
      });
    } catch (error) {
      console.error("Lỗi: ", error);
      res.status(500).json({
        success: false,
        message: "Đã có lỗi xảy ra khi lấy dữ liệu năm học",
      });
    } finally {
      if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
  },
  getBoMonList: async (req, res) => {
    let maPhongBan = req.params.maPhongBan;

    let connection = await createPoolConnection();
    try {
      let results;
      const query = `SELECT * FROM bomon WHERE MaPhongBan = ?`;
      [results] = await connection.query(query, [maPhongBan]);
      res.json({
        success: true,
        maBoMon: results,
      });
    } catch (error) {
      console.error("Lỗi: ", error);
      res.status(500).send("Đã có lỗi xảy ra");
    } finally {
      if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
  },
  suggest: async (req, res) => {
    const query = req.params.query;
    let connection = await createPoolConnection();
    try {
      const results = await connection.query(
        "SELECT TenNhanVien FROM nhanvien WHERE TenNhanVien LIKE ?",
        [`%${query}%`]
      );
      res.json(results);
    } catch (error) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", error);
      res.status(500).send("Lỗi server");
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
  suggestPb: async (req, res) => {
    const query = req.params.query;
    const MaPhongBan = req.params.MaPhongBan;
    let connection = await createPoolConnection();
    try {
      const results = await connection.query(
        "SELECT TenNhanVien FROM nhanvien WHERE TenNhanVien LIKE ? AND MaPhongBan = ?",
        [`%${query}%`, MaPhongBan]
      );
      res.json(results);
    } catch (error) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", error);
      res.status(500).send("Lỗi server");
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
  infome: async (req, res) => {
    const id_User = req.params.id_User;
    let connection;
    try {
      connection = await createPoolConnection();

      const query1 = "SELECT * FROM `nhanvien` WHERE id_User = ?";
      const [results1] = await connection.query(query1, [id_User]);
      let user = results1 && results1.length > 0 ? results1[0] : {};

      // Lấy dữ liệu phòng ban
      const query2 = "SELECT * FROM phongban";
      const [results2] = await connection.query(query2);
      let departmentLists = results2; // Gán kết quả vào departmentLists

      // Lấy dữ liệu tài khoản
      const query3 = "SELECT * FROM `taikhoannguoidung` WHERE id_User = ?";
      const [results3] = await connection.query(query3, [id_User]);
      let account = results3 && results3.length > 0 ? results3[0] : {};
      let TenDangNhap = account.TenDangNhap || "";

      // Lấy dữ liệu role
      const query4 = "SELECT * FROM `role` WHERE TenDangNhap = ?";
      const [results4] = await connection.query(query4, [TenDangNhap]);
      let role = results4 && results4.length > 0 ? results4[0] : {};

      // Render trang với 2 biến: value và departmentLists
      res.render("thongTinCaNhan.ejs", {
        user: user,
        departmentLists: departmentLists,
        account: account,
        role: role,
      });
    } catch (error) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", error);
      res.status(500).send("Lỗi server");
    } finally {
      if (connection) {
        connection.release();
      }
    }
  },
  // updateMe: async (req, res) => {
  //   // Lấy các thông tin từ form
  //   let connection; // Khai báo biến connection

  //   const {
  //     TenNhanVien,
  //     GioiTinh,
  //     NgaySinh,
  //     CCCD,
  //     NgayCapCCCD,
  //     NoiCapCCCD,
  //     DiaChiHienNay,
  //     DienThoai,
  //     MaSoThue,
  //     HocVi,
  //     ChucVu,
  //     SoTaiKhoan,
  //     NganHang,
  //     ChiNhanh,
  //     MaPhongBan,
  //     Id_User,
  //     TenDangNhap,
  //     Quyen,
  //     HSL,
  //   } = req.body;

  //   const MaNhanVien = `${MaPhongBan}${Id_User}`;
  //   try {
  //     connection = await createPoolConnection(); // Lấy kết nối từ pool

  //     // Truy vấn để update dữ liệu vào cơ sở dữ liệu
  //     const query = `UPDATE nhanvien SET
  //       TenNhanVien = ?,
  //       GioiTinh = ?,
  //       NgaySinh = ?,
  //       CCCD = ?,
  //       NgayCapCCCD = ?,
  //       NoiCapCCCD = ?,
  //       DiaChiHienNay = ?,
  //       DienThoai = ?,
  //       MaSoThue = ?,
  //       HocVi = ?,
  //       ChucVu = ?,
  //       SoTaiKhoan = ?,
  //       NganHang = ?,
  //       ChiNhanh = ?,
  //       MaPhongBan = ?,
  //       NoiCongTac = ?,
  //       DiaChiCCCD = ?,
  //       MonGiangDayChinh = ?,
  //       CacMonLienQuan = ?,
  //       MaNhanVien = ?,
  //       HSL = ?
  //       WHERE id_User = ?`;

  //     const [updateResult] = await connection.query(query, [
  //       TenNhanVien,
  //       GioiTinh,
  //       NgaySinh,
  //       CCCD,
  //       NgayCapCCCD,
  //       NoiCapCCCD,
  //       DiaChiHienNay,
  //       DienThoai,
  //       MaSoThue,
  //       HocVi,
  //       ChucVu,
  //       SoTaiKhoan,
  //       NganHang,
  //       ChiNhanh,
  //       MaPhongBan,
  //       req.body.NoiCongTac, // Lấy từ req.body
  //       req.body.DiaChiCCCD, // Lấy từ req.body
  //       req.body.MonGiangDayChinh, // Lấy từ req.body
  //       req.body.CacMonLienQuan, // Lấy từ req.body
  //       MaNhanVien,
  //       HSL,
  //       Id_User,
  //     ]);

  //     // Cập nhật bảng role sau khi cập nhật nhân viên thành công
  //     // const queryRole = `UPDATE role SET MaPhongBan = ?, Quyen = ? WHERE TenDangNhap = ?`;
  //     // const [roleUpdateResult] = await connection.query(queryRole, [
  //     //   MaPhongBan,
  //     //   Quyen,
  //     //   TenDangNhap,
  //     // ]);

  //     console.log(`${TenNhanVien.trim()} vừa thay đổi thông tin cá nhân`);
  //     // console.log("Bảng role đã được cập nhật:", roleUpdateResult);
  //     res.status(200).json({
  //       message: `Cập nhật thông tin thành công`,
  //     });
  //   } catch (error) {
  //     console.error("Error executing query: ", error);
  //   } finally {
  //     if (connection) connection.release(); // Giải phóng kết nối
  //   }
  // },

  updateMe: async (req, res) => {
    // Lấy các thông tin từ form
    let connection; // Khai báo biến connection

    const {
      TenNhanVien,
      NgaySinh,
      HocVi,
      ChucVu,
      Luong,
      Id_User,
      TenDangNhap,
      Quyen,
      HSL,
      PhanTramMienGiam,
    } = req.body;

    try {
      connection = await createPoolConnection(); // Lấy kết nối từ pool

      // Truy vấn để update dữ liệu vào cơ sở dữ liệu
      const query = `UPDATE nhanvien SET 
        TenNhanVien = ?,
        NgaySinh = ?,
        HocVi = ?,
        ChucVu = ?,
        HSL = ?,
        Luong = ?,
        PhanTramMienGiam = ?
        WHERE id_User = ?`;

      const [updateResult] = await connection.query(query, [
        TenNhanVien,
        NgaySinh,
        HocVi,
        ChucVu,
        HSL,
        Luong,
        PhanTramMienGiam,
        Id_User,
      ]);

      console.log(`${TenNhanVien.trim()} vừa thay đổi thông tin cá nhân`);
      // console.log("Bảng role đã được cập nhật:", roleUpdateResult);
      res.status(200).json({
        message: `Cập nhật thông tin thành công`,
      });
    } catch (error) {
      console.error("Error executing query: ", error);
    } finally {
      if (connection) connection.release(); // Giải phóng kết nối
    }
  },
  getKyTuBD: async (req, res) => {
    let connection;
    try {
      connection = await createPoolConnection();
      const [kyTuBD] = await connection.query(
        "SELECT lop_vi_du, viet_tat, gia_tri_so_sanh FROM kitubatdau"
      );
      res.render("vuotGioKyTuBD", {
        kyTuBD,
        message: req.query.success ? "Thêm mới thành công!" : null,
      });
    } catch (error) {
      console.error("Lỗi:", error);
      res.status(500).send("Đã xảy ra lỗi");
    } finally {
      if (connection) connection.release();
    }
  },

  postKyTuBD: async (req, res) => {
    let { viet_tat, loai_dao_tao, he_dao_tao } = req.body;
    viet_tat = viet_tat.toUpperCase();
    const lop_vi_du = viet_tat + "10";
    const gia_tri_so_sanh = `${loai_dao_tao} (${he_dao_tao})`;
    let connection;
    try {
      connection = await createPoolConnection();
      // Kiểm tra khoa
      if (he_dao_tao == "ALL") {
        return res.redirect("/kytubatdau?success=false&message=khoaALL");
      }

      // Kiểm tra trùng lặp cả viết tắt và gia_tri_so_sanh
      const [rows] = await connection.query(
        `SELECT * FROM kitubatdau WHERE viet_tat = ? AND gia_tri_so_sanh = ?`,
        [viet_tat, gia_tri_so_sanh]
      );

      // Xử lý kết quả
      if (rows.length > 0) {
        return res.redirect(
          "/kytubatdau?success=false&message=duplicateKiTuAndHeDaoTao"
        );
      }

      // Thêm vào bảng kí tự bắt đầu
      const insertQuery = `
        INSERT INTO kitubatdau (lop_vi_du, viet_tat, gia_tri_so_sanh) 
        VALUES (?, ?, ?)
      `;
      await connection.execute(insertQuery, [
        lop_vi_du,
        viet_tat,
        gia_tri_so_sanh,
      ]);

      res.redirect("/kytubatdau?success=true&message=insertSuccess");
    } catch (error) {
      console.error("Lỗi khi thêm ký tự bắt đầu:", error);
      const [kyTuBD] = await connection.query("SELECT * FROM kitubatdau");
      res.render("vuotGioKyTuBD", {
        kyTuBD,
        message: "Có lỗi xảy ra khi thêm mới!",
      });
    } finally {
      if (connection) connection.release();
    }
  },

  deleteKyTuBD: async (req, res) => {
    const lop_vi_du = req.params.lop_vi_du;
    const connection = await createPoolConnection();
    try {
      const query = `DELETE FROM kitubatdau WHERE lop_vi_du = ?`;
      const [results] = await connection.query(query, [lop_vi_du]);

      if (results.affectedRows > 0) {
        res.status(200).json({ message: "Xóa thành công!" }); // Trả về thông báo thành công
      } else {
        res.status(404).json({ message: "Không tìm thấy Hệ đào tạođể xóa." }); // Nếu không tìm thấy ký tự bắt đầu
      }
    } catch (error) {
      console.error("Lỗi khi xóa dữ liệu: ", error);
      res.status(500).json({ message: "Lỗi server, không thể xóa dữ liệu" }); // Thông báo lỗi
    } finally {
      if (connection) connection.release(); // Trả lại connection cho pool
    }
  },
  updateKyTuBD: async (req, res) => {
    const oldlop_vi_du = req.params.lop_vi_du;
    const { lop_vi_du, viet_tat, loai_dao_tao, he_dao_tao } = req.body;
    const gia_tri_so_sanh = `${loai_dao_tao} (${he_dao_tao})`;
    let connection;

    try {
      connection = await createPoolConnection();

      // Kiểm tra trùng lặp, loại trừ bản ghi hiện tại
      const [existingRows] = await connection.query(
        `SELECT * FROM kitubatdau 
         WHERE viet_tat = ? AND gia_tri_so_sanh = ? AND lop_vi_du != ?`,
        [viet_tat, gia_tri_so_sanh, oldlop_vi_du]
      );

      if (existingRows.length > 0) {
        return res.status(409).json({
          success: false,
          message: "Đã tồn tại kí tự bắt đầu với hệ đào tạo này",
        });
      }

      const query = `
        UPDATE kitubatdau 
        SET lop_vi_du = ?, viet_tat = ?, gia_tri_so_sanh = ?
        WHERE lop_vi_du = ?
      `;

      const [result] = await connection.execute(query, [
        lop_vi_du,
        viet_tat,
        gia_tri_so_sanh,
        oldlop_vi_du,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy bản ghi để cập nhật",
        });
      }

      res.status(200).json({
        success: true,
        message: "Cập nhật thành công",
      });
    } catch (error) {
      console.error("Lỗi khi cập nhật:", error);
      res.status(500).json({
        success: false,
        message: "Đã xảy ra lỗi khi cập nhật",
      });
    } finally {
      if (connection) connection.release();
    }
  },

  checkKyTuBD: async (req, res) => {
    const { viet_tat, gia_tri_so_sanh } = req.body;
    let connection;
    try {
      connection = await createPoolConnection();
      const [rows] = await connection.query(
        `SELECT * FROM kitubatdau WHERE viet_tat = ? AND gia_tri_so_sanh = ?`,
        [viet_tat, gia_tri_so_sanh]
      );

      if (rows.length > 0) {
        return res.status(409).json({
          message: "Kí tự bắt đầu với hệ đào tạo này đã tồn tại",
        });
      }
      res.json({ exists: false });
    } catch (error) {
      console.error("Lỗi khi kiểm tra:", error);
      res.status(500).json({ message: "Lỗi khi kiểm tra" });
    } finally {
      if (connection) connection.release();
    }
  },
  // Other methods can be added here as needed...

  // Thêm các phương thức cho TienLuong
  getTienLuong: async (req, res) => {
    let connection;
    try {
      connection = await createPoolConnection();
      const [tienLuong] = await connection.query("SELECT * FROM tienluong");
      res.render("tienluong", {
        tienluong: tienLuong,
        message: req.query.success ? "Thêm mới thành công!" : null,
      });
    } catch (error) {
      console.error("Lỗi:", error);
      res.status(500).send("Đã xảy ra lỗi");
    } finally {
      if (connection) connection.release();
    }
  },

  postTienLuong: async (req, res) => {
    let { he_dao_tao, HocVi, SoTien } = req.body;
    let connection;
    try {
      connection = await createPoolConnection();
      // Thêm vào bảng TienLuong
      const insertQuery = `
        INSERT INTO tienluong (he_dao_tao, HocVi, SoTien) 
        VALUES (?, ?, ?)
      `;
      await connection.execute(insertQuery, [he_dao_tao, HocVi, SoTien]);

      res.redirect("/tienluong?success=true&message=insertSuccess");
    } catch (error) {
      console.error("Lỗi khi thêm tiền lương:", error);
      res.status(500).send("Có lỗi xảy ra khi thêm mới!");
    } finally {
      if (connection) connection.release();
    }
  },

  updateTienLuong: async (req, res) => {
    const STT = req.params.STT; // Sử dụng STT từ params
    const { he_dao_tao, HocVi, SoTien } = req.body; // Lấy dữ liệu từ body
    let connection;

    try {
      connection = await createPoolConnection();
      const query = `
            UPDATE tienluong 
            SET he_dao_tao = ?, HocVi = ?, SoTien = ?
            WHERE STT = ?
        `;

      const [result] = await connection.execute(query, [
        he_dao_tao,
        HocVi,
        SoTien,
        STT, // Sử dụng STT ở đây
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy bản ghi để cập nhật",
        });
      }

      res.status(200).json({
        success: true,
        message: "Cập nhật thành công",
      });
    } catch (error) {
      console.error("Lỗi khi cập nhật:", error);
      res.status(500).json({
        success: false,
        message: "Đã xảy ra lỗi khi cập nhật",
      });
    } finally {
      if (connection) connection.release();
    }
  },

  deleteTienLuong: async (req, res) => {
    const STT = req.params.STT; // ID của bản ghi cần xóa
    const connection = await createPoolConnection();
    try {
      const query = `DELETE FROM tienluong WHERE STT = ?`;
      const [results] = await connection.query(query, [STT]);

      if (results.affectedRows > 0) {
        res.status(200).json({ message: "Xóa thành công!" });
      } else {
        res.status(404).json({ message: "Không tìm thấy tiền lương để xóa." });
      }
    } catch (error) {
      console.error("Lỗi khi xóa dữ liệu: ", error);
      res.status(500).json({ message: "Lỗi server, không thể xóa dữ liệu" });
    } finally {
      if (connection) connection.release();
    }
  },

  checkExistence: async (req, res) => {
    const { he_dao_tao, HocVi } = req.body;
    let connection;

    try {
      connection = await createPoolConnection();
      const query = `
            SELECT COUNT(*) as count FROM tienluong 
            WHERE he_dao_tao = ? AND HocVi = ?
        `;
      const [result] = await connection.execute(query, [he_dao_tao, HocVi]);

      if (result[0].count > 0) {
        return res.status(409).json({
          message: `Hệ Đào Tạo và Học Vị đã chọn: ${he_dao_tao} và ${HocVi} đã tồn tại.`,
        });
      }

      res.status(200).json({ message: "Kết hợp chưa tồn tại." });
    } catch (error) {
      console.error("Lỗi khi kiểm tra sự tồn tại:", error);
      res.status(500).json({ message: "Đã xảy ra lỗi." });
    } finally {
      if (connection) connection.release();
    }
  },

  themHocPhan: async (req, res) => {
    const { MaHocPhan, TenHocPhan, DVHT, KiHoc, Khoa, MaBoMon } = req.body;

    let connection;
    try {
      connection = await createPoolConnection();
      const query = `INSERT INTO hocphan (MaHocPhan, TenHocPhan, DVHT, KiHoc, Khoa, MaBoMon) VALUES (?, ?, ?, ?, ?, ?)`;
      await connection.query(query, [
        MaHocPhan,
        TenHocPhan,
        DVHT,
        KiHoc,
        Khoa,
        MaBoMon,
      ]);

      res.redirect("/hocphan"); // Chuyển hướng về trang danh sách học phần
    } catch (error) {
      console.error("Lỗi khi thêm học phần:", error);
      res.status(500).send("Đã xảy ra lỗi khi thêm học phần");
    } finally {
      if (connection) connection.release();
    }
  },
};

module.exports = AdminController; // Export the entire controller
