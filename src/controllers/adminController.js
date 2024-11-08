const express = require("express");
const mysql = require("mysql2/promise"); // Ensure you have mysql2 installed
const createPoolConnection = require("../config/databasePool");
const connection = require("../config/database"); // Adjust the path as necessary

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

  // themNhanVien: async (req, res) => {
  //   const {
  //     TenNhanVien,
  //     NgaySinh,
  //     GioiTinh,
  //     DienThoai,
  //     HocVi,
  //     CCCD,
  //     NgayCapCCCD,
  //     NoiCapCCCD,
  //     DiaChiCCCD,
  //     DiaChiHienNay,
  //     ChucVu,
  //     NoiCongTac,
  //     MaPhongBan,
  //     MaSoThue,
  //     SoTaiKhoan,
  //     NganHang,
  //     ChiNhanh,
  //     MonGiangDayChinh,
  //     CacMonLienQuan,
  //     MatKhau, // Lấy từ form
  //     Quyen,
  //     HSL, // Lấy từ form
  //   } = req.body;
  //   let TenDangNhap = req.body.TenDangNhap; // Lấy từ form

  //   try {
  //     // Đầu tiên, chèn dữ liệu vào CSDL mà không cần MaNhanVien
  //     const queryInsert = `
  //         INSERT INTO nhanvien (
  //             TenNhanVien, NgaySinh, GioiTinh, DienThoai, HocVi, CCCD,
  //             NgayCapCCCD, NoiCapCCCD, DiaChiHienNay, DiaChiCCCD, ChucVu, NoiCongTac,
  //             MaPhongBan, MaSoThue, SoTaiKhoan, NganHang, ChiNhanh,
  //             MonGiangDayChinh, CacMonLienQuan,HSL
  //         ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)
  //     `;

  //     const valuesInsert = [
  //       TenNhanVien,
  //       NgaySinh,
  //       GioiTinh,
  //       DienThoai,
  //       HocVi,
  //       CCCD,
  //       NgayCapCCCD,
  //       NoiCapCCCD,
  //       DiaChiHienNay,
  //       DiaChiCCCD,
  //       ChucVu,
  //       NoiCongTac,
  //       MaPhongBan,
  //       MaSoThue,
  //       SoTaiKhoan,
  //       NganHang,
  //       ChiNhanh,
  //       MonGiangDayChinh,
  //       CacMonLienQuan,
  //       HSL,
  //     ];

  //     console.log(MaPhongBan);
  //     // Chèn nhân viên và lấy id_User vừa tạo
  //     const [result] = await connection
  //       .promise()
  //       .query(queryInsert, valuesInsert);
  //     const id_User = result.insertId; // Lấy id_User vừa được tạo

  //     // Tạo MaNhanVien bằng cách ghép MaPhongBan với id_User
  //     const MaNhanVien = `${MaPhongBan}${id_User}`;

  //     // Cập nhật lại MaNhanVien trong CSDL
  //     const queryUpdate = `UPDATE nhanvien SET MaNhanVien = ? WHERE id_User = ?`;
  //     await connection.promise().query(queryUpdate, [MaNhanVien, id_User]);

  //     if (!TenDangNhap) {
  //       TenDangNhap = `${MaPhongBan}${id_User}`;
  //     }

  //     const queryInsertTaiKhoanNguoiDung = `
  //       INSERT INTO taikhoannguoidung (TenDangNhap, MatKhau, id_User)
  //       VALUES (?, ?, ?)
  //     `;
  //     await connection
  //       .promise()
  //       .query(queryInsertTaiKhoanNguoiDung, [TenDangNhap, MatKhau, id_User]);

  //     // Truy vấn lấy isKhoa từ bảng phongban dựa trên MaPhongBan
  //     const querySelectIsKhoa =
  //       "SELECT isKhoa FROM phongban WHERE MaPhongBan = ?";
  //     const [resultIsKhoa] = await connection
  //       .promise()
  //       .query(querySelectIsKhoa, [MaPhongBan]);
  //     const isKhoa = resultIsKhoa.length > 0 ? resultIsKhoa[0].isKhoa : 0;

  //     // Chèn dữ liệu vào bảng role
  //     const queryInsertRole = `
  //       INSERT INTO role (TenDangNhap, MaPhongBan, Quyen, isKhoa)
  //       VALUES (?, ?, ?, ?)
  //     `;
  //     await connection
  //       .promise()
  //       .query(queryInsertRole, [TenDangNhap, MaPhongBan, Quyen, isKhoa]);

  //     res
  //       .status(200)
  //       .json({ message: "Thêm nhân viên thành công", MaNhanVien: MaNhanVien });
  //   } catch (error) {
  //     console.error("Lỗi khi thêm nhân viên:", error);
  //     res.status(500).json({
  //       message: "Đã xảy ra lỗi khi thêm nhân viên",
  //       error: error.message,
  //     });
  //   }
  // },

  // phần thêm
  themNhanVien: async (req, res) => {
    const {
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
    } = req.body;
    let TenDangNhap = req.body.TenDangNhap;

    let connection;
    try {
      connection = await createPoolConnection();

      const queryInsert = `
        INSERT INTO nhanvien (
            TenNhanVien, NgaySinh, GioiTinh, DienThoai, HocVi, CCCD,
            NgayCapCCCD, NoiCapCCCD, DiaChiHienNay, DiaChiCCCD, ChucVu, NoiCongTac,
            MaPhongBan, MaSoThue, SoTaiKhoan, NganHang, ChiNhanh,
            MonGiangDayChinh, CacMonLienQuan, HSL
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const valuesInsert = [
        TenNhanVien,
        NgaySinh,
        GioiTinh,
        DienThoai,
        HocVi,
        CCCD,
        NgayCapCCCD,
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
        MonGiangDayChinh,
        CacMonLienQuan,
        HSL,
      ];

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
          await connection.release(); // Trả lại kết nối vào pool
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

    // thêm

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

      res.redirect("/thongTinTK?Success");
    } catch (error) {
      console.error("Lỗi khi cập nhật dữ liệu: ", error);
      res.status(500).send("Lỗi server, không thể cập nhật dữ liệu");
    } finally {
      if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
  },

  getNhanVien: (req, res) => {
    res.render("nhanVien", { title: "Danh sách nhân viên" });
  },

  // phần hiển thị danh sách
  getListNhanVien: async (req, res) => {
    try {
      const [rows] = await connection
        .promise()
        .query(
          "SELECT id_User, MaNhanVien, TenNhanVien, MaPhongBan FROM nhanvien"
        );
      res.json(rows);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách nhân viên:", error);
      res
        .status(500)
        .json({ message: "Đã xảy ra lỗi khi lấy danh sách nhân viên" });
    }
  },

  getListPhongBan: async (req, res) => {
    try {
      console.log("Đang truy vấn danh sách phòng ban...");
      const [rows] = await connection
        .promise()
        .query("SELECT maPhongBan, tenPhongBan, ghiChu, isKhoa FROM phongban");
      console.log("Kết quả truy vấn:", rows);
      res.json(rows);
    } catch (error) {
      console.error("Lỗi chi tiết khi lấy danh sách phòng ban:", error);
      res.status(500).json({
        message: "Đã xảy ra lỗi khi lấy danh sách phòng ban",
        error: error.message,
      });
    }
  },
  getUpdateNV: async (req, res) => {
    let connection = await createPoolConnection();
    try {
      const id_User = parseInt(req.params.id) + 1;

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
  updatePassword: async (req, res) => {
    let connection;
    try {
      const { TenDangNhap, currentPassword, newPassword } = req.body;

      // Kiểm tra xem TenDangNhap có tồn tại không
      if (!TenDangNhap) {
        return res.status(400).send("Thiếu tham số TenDangNhap");
      }

      // Truy vấn lấy tài khoản từ CSDL
      const query = "SELECT * FROM taikhoannguoidung WHERE TenDangNhap = ?";
      connection = await createPoolConnection();
      const [results] = await connection.query(query, [TenDangNhap]);

      if (results.length === 0) {
        return res.status(404).send("Tài khoản không tồn tại");
      }

      const account = results[0];

      // So sánh mật khẩu nhập vào với mật khẩu trong CSDL
      if (account.MatKhau !== currentPassword) {
        return res.status(401).send("Mật khẩu hiện tại không đúng");
      }

      // Cập nhật mật khẩu mới
      const updateQuery =
        "UPDATE taikhoannguoidung SET MatKhau = ? WHERE TenDangNhap = ?";
      await connection.query(updateQuery, [newPassword, TenDangNhap]);

      return res.redirect(
        `/changePassword?tenDangNhap=${encodeURIComponent(
          TenDangNhap
        )}&message=updateSuccess`
      );
    } catch (error) {
      console.error("Lỗi khi cập nhật mật khẩu:", error);
      res.status(500).send("Lỗi hệ thống");
    } finally {
      if (connection) connection.release(); // Đảm bảo giải phóng kết nối
    }
  },
  getBoMon: async (req, res) => {
    let connection;
    try {
      // Lấy dữ liệu bộ môn
      connection = await createPoolConnection();
      const query = "SELECT * FROM `bomon`";
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
      const query = "SELECT MaPhongBan FROM `phongban` WHERE isKhoa = 1";
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
      const id_User = parseInt(req.params.id) + 1;

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
      const [results4] = await connection.query(query4,[maBoMon]);
      let TenBoMon = results4 && results4.length > 0 ? results4[0] : {};;

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
      const query1 = "SELECT *FROM `namhoc` ORDER BY trangthai DESC";
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
    console.log(maPhongBan);
  
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
      const results = await connection.query("SELECT TenNhanVien FROM nhanvien WHERE TenNhanVien LIKE ?", [`%${query}%`]);
      res.json(results);
    } catch (error) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", error);
      res.status(500).send("Lỗi server");
    }finally{
      if (connection) {
        connection.release();
      }
    }
  },

  // Other methods can be added here as needed...
};

module.exports = AdminController; // Export the entire controller
