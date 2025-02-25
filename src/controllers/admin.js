const express = require("express");
const createPoolConnection = require("../config/databasePool");
const router = express.Router();
const mysql = require("mysql2/promise");
const { getBoMon } = require("./adminController");
const app = express();

let accountLists;
let departmentLists;
let nhanvienLists;
let idUserLists;
let query;

const getaccountList = async (req, res) => {
  let connection;
  try {
    query =
      "SELECT DISTINCT nhanvien.TenNhanVien, taikhoannguoidung.TenDangNhap, taikhoannguoidung.id_User, taikhoannguoidung.matkhau, role.Quyen, nhanvien.MaPhongBan, role.isKhoa FROM taikhoannguoidung INNER JOIN nhanvien ON taikhoannguoidung.id_User = nhanvien.id_User INNER JOIN role ON taikhoannguoidung.TenDangNhap = role.TenDangNhap ORDER BY taikhoannguoidung.id_User ASC"; // Truy vấn lấy tất cả người dùng
    connection = await createPoolConnection(); // Kết nối tới cơ sở dữ liệu
    const [results, fields] = await connection.query(query); // Thực hiện truy vấn
    accountLists = results; // Gán kết quả vào accountLists

    // Render trang thongTinTK.ejs và truyền danh sách tài khoản vào
    res.render("thongTinTK.ejs", { accountLists: accountLists });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu từ cơ sở dữ liệu: ", error);
    res.status(500).send("Lỗi server, không thể lấy dữ liệu");
  } finally {
    if (connection) connection.release(); // Trả lại connection cho pool
  }
};

const getnhanvienList = async (req, res) => {
  let connection;
  try {
    query =
      "SELECT nhanvien.id_User, nhanvien.GioiTinh , nhanvien.MaNhanVien, nhanvien.TenNhanVien,  nhanvien.MaPhongBan, nhanvien.ChucVu, nhanvien.MonGiangDayChinh, nhanvien.DienThoai, nhanvien.CCCD, nhanvien.NgayCapCCCD, nhanvien.NoiCapCCCD, nhanvien.HocVi, phongban.TenPhongBan, taikhoannguoidung.TenDangNhap, taikhoannguoidung.MatKhau, nhanvien.PhanTramMienGiam  From nhanvien LEFT JOIN taikhoannguoidung ON nhanvien.id_User = taikhoannguoidung.id_User LEFT JOIN phongban ON nhanvien.MaPhongBan = phongban.MaPhongBan  ORDER BY nhanvien.id_User ASC"; // Truy vấn lấy tất cả người dùng
    connection = await createPoolConnection(); // Kết nối tới cơ sở dữ liệu
    const [results, fields] = await connection.query(query); // Thực hiện truy vấn
    nhanvienLists = results; // Gán kết quả vào nhanvienLists

    // Render trang nhanVien.ejs và truyền danh sách tài khoản vào
    res.render("nhanVien.ejs", { nhanvienLists: nhanvienLists });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu từ cơ sở dữ liệu: ", error);
    res.status(500).send("Lỗi server, không thể lấy dữ liệu");
  } finally {
    if (connection) connection.release(); // Trả lại connection cho pool
  }
};

const getdepartmentList = async (req, res) => {
  let connection;
  try {
    query = "SELECT * FROM phongban"; // Truy vấn lấy tất cả người dùng
    connection = await createPoolConnection(); // Kết nối tới cơ sở dữ liệu
    const [results, fields] = await connection.query(query); // Thực hiện truy vấn
    departmentLists = results; // Gán kết quả vào departmentLists

    // Render trang phongBan.ejs và truyền danh sách tài khoản vào
    res.render("phongBan.ejs", { departmentLists: departmentLists });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu từ cơ sở dữ liệu: ", error);
    res.status(500).send("Lỗi server, không thể lấy dữ liệu");
  } finally {
    if (connection) connection.release(); // Trả lại connection cho pool
  }
};
const getMaPhongBanList = async (req, res) => {
  let connection;
  try {
    query = "SELECT * FROM phongban"; // Truy vấn lấy tất cả người dùng
    connection = await createPoolConnection(); // Kết nối tới cơ sở dữ liệu
    const [results, fields] = await connection.query(query); // Thực hiện truy vấn
    departmentLists = results; // Gán kết quả vào departmentLists

    // Render trang phongBan.ejs và truyền danh sách tài khoản vào
    res.render("themNhanVien.ejs", { departmentLists: departmentLists });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu từ cơ sở dữ liệu: ", error);
    res.status(500).send("Lỗi server, không thể lấy dữ liệu");
  } finally {
    if (connection) connection.release(); // Trả lại connection cho pool
  }
};

const getUpdatePhongBan = async (req, res) => {
  let connection;
  try {
    const MaPhongBan = req.params.MaPhongBan; // Lấy MaPhongBan từ request body hoặc có thể từ params

    const query = "SELECT * FROM phongban WHERE MaPhongBan = ?"; // Truy vấn lấy dữ liệu từ bảng phongban
    connection = await createPoolConnection(); // Kết nối tới cơ sở dữ liệu

    // Thực hiện truy vấn và truyền giá trị MaPhongBan
    const [results, fields] = await connection.query(query, [MaPhongBan]);

    const departmentLists = results[0]; // Gán kết quả truy vấn vào departmentLists

    // Render trang updatePB.ejs và truyền danh sách phòng ban vào
    res.render("updatePB.ejs", { departmentLists: departmentLists });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu từ cơ sở dữ liệu: ", error);
    res.status(500).send("Lỗi server, không thể lấy dữ liệu");
  } finally {
    if (connection) connection.release(); // Trả lại connection cho pool
  }
};

const getidUserLists = async (req, res) => {
  let connection;
  try {
    query = "SELECT * FROM nhanvien"; // Truy vấn lấy tất cả người dùng
    connection = await createPoolConnection(); // Kết nối tới cơ sở dữ liệu
    const [results, fields] = await connection.query(query); // Thực hiện truy vấn
    idUserLists = results; // Gán kết quả vào idUserLists

    // Render trang phongBan.ejs và truyền danh sách tài khoản vào
    res.render("themTK.ejs", { idUserLists: idUserLists });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu từ cơ sở dữ liệu: ", error);
    res.status(500).send("Lỗi server, không thể lấy dữ liệu");
  } finally {
    if (connection) connection.release(); // Trả lại connection cho pool
  }
};

const getchangePassword = async (req, res) => {
  let connection;
  try {
    // Lấy TenDangNhap từ query parameters
    const tenDangNhap = req.query.tenDangNhap;

    // Kiểm tra xem TenDangNhap có tồn tại không
    if (!tenDangNhap) {
      return res.status(400).send("Thiếu tham số TenDangNhap");
    }

    // Truy vấn lấy thông tin người dùng
    const query = "SELECT * FROM taikhoannguoidung WHERE TenDangNhap = ?"; // Sử dụng tham số để tránh SQL Injection
    connection = await createPoolConnection(); // Kết nối tới cơ sở dữ liệu

    const [results] = await connection.query(query, [tenDangNhap]); // Thực hiện truy vấn

    if (results.length === 0) {
      return res.status(404).send("Không tìm thấy tài khoản với TenDangNhap đã cho");
    }

    const account = results[0];
    account.isAdmin = account.TenDangNhap === 'ADMIN'; // Kiểm tra xem tài khoản có phải là admin không

    // Render trang changePassword.ejs và truyền thông tin tài khoản vào
    res.render("changePassword.ejs", { account: account });
  } catch (error) {
    console.error("Lỗi khi lấy trang đổi mật khẩu:", error);
    res.status(500).send("Lỗi hệ thống");
  } finally {
    if (connection) connection.release(); // Trả lại connection cho pool
  }
};

const updatePassword = async (req, res) => {
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
      return res.redirect(
        `/changePassword?tenDangNhap=${encodeURIComponent(
          TenDangNhap
        )}&message=updateSuccess&passwordChanged=false1`
      );
    }

    // Cập nhật mật khẩu mới
    const updateQuery =
      "UPDATE taikhoannguoidung SET MatKhau = ? WHERE TenDangNhap = ?";
    await connection.query(updateQuery, [newPassword, TenDangNhap]);

    return res.redirect(
      `/changePassword?tenDangNhap=${encodeURIComponent(
        TenDangNhap
      )}&message=updateSuccess&passwordChanged=true`
    );
  } catch (error) {
    console.error("Lỗi khi cập nhật mật khẩu:", error);
    return res.redirect(
      `/changePassword?tenDangNhap=${encodeURIComponent(
        TenDangNhap
      )}&message=updateSuccess&passwordChanged=false2`
    );
  } finally {
    if (connection) connection.release(); // Trả lại connection cho pool
  }
};

const getupdateBoMon = async (req, res) => {
  let connection;
  try {
    const id_BoMon = req.params.id_BoMon;
    connection = await createPoolConnection();
    const query = `SELECT * FROM bomon WHERE id_BoMon  = ?`;

    const [results, fields] = await connection.query(query, [id_BoMon]);
    const boMon = results[0];
    res.render("updateBoMon.ejs", { boMon: boMon });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
    res.status(500).send("Lỗi hệ thống");
  } finally {
    if (connection) connection.release(); // Trả lại connection cho pool
  }
};

const getNamHocList = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const query = `SELECT *FROM namhoc ORDER BY NamHoc ASC`;
    const [results] = await connection.query(query);
    res.render("namHoc.ejs", { NamHoc: results });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
    res.status(500).send("Lỗi hệ thống");
  } finally {
    if (connection) connection.release(); // Trả lại connection cho pool
  }
};
const postNamHoc = async (req, res) => {
  const NamHoc = req.body.NamHoc;
  const connection = await createPoolConnection();
  try {
    const query = `INSERT INTO namhoc (NamHoc, trangthai) VALUES (?, ?)`;
    await connection.query(query, [NamHoc, 0]);
    res.redirect("/namHoc?Success");
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu: ", error);
    res.status(500).send("Lỗi server, không thể cập nhật dữ liệu");
  } finally {
    if (connection) connection.release(); // Trả lại connection cho pool
  }
};
const deleteNamHoc = async (req, res) => {
  const NamHoc = req.params.NamHoc;
  const connection = await createPoolConnection();
  try {
    const query = `DELETE FROM namhoc WHERE NamHoc = ?`;
    const [results] = await connection.query(query, [NamHoc]);

    if (results.affectedRows > 0) {
      res.status(200).json({ message: "Xóa thành công!" }); // Trả về thông báo thành công
    } else {
      res.status(404).json({ message: "Không tìm thấy năm học để xóa." }); // Nếu không tìm thấy năm học
    }
  } catch (error) {
    console.error("Lỗi khi xóa dữ liệu: ", error);
    res.status(500).json({ message: "Lỗi server, không thể xóa dữ liệu" }); // Thông báo lỗi
  } finally {
    if (connection) connection.release(); // Trả lại connection cho pool
  }
};

const addMessage = async (req, res) => {
  const { MaPhongBan } = req.params; // Lấy MaPhongBan từ params
  const { Title, LoiNhan, Deadline } = req.body; // Lấy LoiNhan và Deadline từ body
  let connection;

  try {
    connection = await createPoolConnection();

    // Câu truy vấn SQL
    const query = `INSERT INTO thongbao (MaPhongBan, Title, LoiNhan, Deadline) VALUES (?, ?, ?, ?)`;

    // Thực hiện câu truy vấn
    await connection.query(query, [MaPhongBan, Title, LoiNhan, Deadline]);

    // Redirect về trang thay đổi thông báo
    return res.redirect(`/changeMessage/${MaPhongBan}?MessageChanged=true`);
  } catch (error) {
    console.error("Lỗi khi thêm thông báo:", error);
    return res.status(500).send("Lỗi hệ thống. Không thể thêm thông báo.");
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

function convertToMySQLFormat(dateStr) {
  // Chuyển chuỗi ISO 8601 thành đối tượng Date
  let date = new Date(dateStr);

  // Lấy các thành phần ngày, giờ, phút, giây theo múi giờ UTC
  let year = date.getUTCFullYear();
  let month = String(date.getUTCMonth() + 1).padStart(2, '0');
  let day = String(date.getUTCDate()).padStart(2, '0');
  // let hours = String(date.getUTCHours()).padStart(2, '0');
  // let minutes = String(date.getUTCMinutes()).padStart(2, '0');
  // let seconds = String(date.getUTCSeconds()).padStart(2, '0');

  // Định dạng theo chuẩn MySQL: YYYY-MM-DD HH:MM:SS
  return `${year}-${month}-${day}`;
}

const updateMessage = async (req, res) => {
  const globalData = req.body; // Lấy dữ liệu từ client gửi đến
  if (!globalData || globalData.length === 0) {
    return res.status(400).json({ message: "Không có dữ liệu để cập nhật." });
  }
  console.log(globalData)

  let connection;

  try {
    connection = await createPoolConnection();
    for (let data of globalData) {
      const { tieuDe, loiNhan, deadlineConvert, isChecked, id } = data; // Lấy LoiNhan và Deadline từ body
      // Câu truy vấn SQL
      const query = `UPDATE thongbao SET Title = ?, LoiNhan = ?, Deadline = ?, HetHan = ? WHERE id = ?`;

      // Thực hiện câu truy vấn
      await connection.query(query, [tieuDe, loiNhan, convertToMySQLFormat(deadlineConvert), isChecked, id]);
    }

    // Redirect về trang thay đổi thông báo
    res.status(200).send({ message: "Cập nhật thành công" }); // Phản hồi thành công
  } catch (error) {
    console.error("Lỗi khi thêm thông báo:", error);
    return res.status(500).send("Lỗi hệ thống. Không thể thêm thông báo.");
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};
const getshowMessage = async (req, res) => {
  const { MaPhongBan } = req.params;
  let connection;
  try {
    connection = await createPoolConnection();
    const query = `SELECT * FROM thongbao WHERE MaPhongBan = ?`;
    const [rows] = await connection.query(query, [MaPhongBan]);
    res.json({
      success: true,
      Message: rows,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông báo:", error);
    return res.status(500).send("Lỗi hệ thống. Không thể lấy thông báo.");
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};
const deleteMessage = async (req, res) => {
  const { id } = req.body;
  let connection;
  try {
    connection = await createPoolConnection();
    const query = `DELETE FROM thongbao WHERE id = ?`;
    await connection.query(query, [id]);
    res.json({
      success: true,
    });
  } catch (error) {
    console.error("Lỗi xoá thông báo:", error);
    return res.status(500).send("Lỗi hệ thống. Không thể xoá thông báo.");
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const getMessage = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const query = `SELECT * FROM thongbao`;
    const [results] = await connection.query(query);
    res.json({
      success: true,
      Message: results,
    });
  } catch (error) {
    console.error("Lỗi khi lấy thông báo:", error);
    return res.status(500).send("Lỗi hệ thống. Không thể lấy thông báo.");
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

//Đợt đồ án
const getDotDoAnList = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const query = `SELECT * FROM dotdoan ORDER BY dotdoan ASC`;
    const [results] = await connection.query(query);
    res.render("dotDoAn.ejs", { dotdoan: results });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
    res.status(500).send("Lỗi hệ thống");
  } finally {
    if (connection) connection.release();
  }
};

const postDotDoAn = async (req, res) => {
  const DotDoAn = req.body.DotDoAn;
  const connection = await createPoolConnection();
  try {
    const query = `INSERT INTO dotdoan (dotdoan) VALUES (?)`;
    await connection.query(query, [DotDoAn]);
    res.redirect("/dotDoAn?Success");
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu: ", error);
    res.status(500).send("Lỗi server, không thể cập nhật dữ liệu");
  } finally {
    if (connection) connection.release();
  }
};

const deleteDotDoAn = async (req, res) => {
  const dotdoan = req.params.dotdoan;
  const connection = await createPoolConnection();
  try {
    console.log("Attempting to delete:", dotdoan);
    const query = `DELETE FROM dotdoan WHERE dotdoan = ?`;
    const [results] = await connection.query(query, [dotdoan]);

    if (results.affectedRows > 0) {
      res.status(200).json({ message: "Xóa thành công!" });
    } else {
      res.status(404).json({ message: "Không tìm thấy đợt đồ án để xóa." });
    }
  } catch (error) {
    console.error("Lỗi khi xóa dữ liệu: ", error);
    res.status(500).json({ message: "Lỗi server, không thể xóa dữ liệu" });
  } finally {
    if (connection) connection.release();
  }
};

const getHocPhanList = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const query = "SELECT * FROM hocphan"; // Truy vấn lấy tất cả học phần
    const [results] = await connection.query(query);
    res.render("hocphan.ejs", { hocPhan: results }); // Render trang hocphan.ejs và truyền danh sách học phần vào
  } catch (error) {
    console.error("Lỗi khi lấy danh sách học phần:", error);
    res.status(500).send("Lỗi hệ thống. Không thể lấy danh sách học phần.");
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const updateHocPhan = async (req, res) => {
  const { TenHocPhan, DVHT, KiHoc, Khoa, MaBoMon } = req.body; // Lấy các trường từ body
  const { MaHocPhan } = req.params; // Lấy mã học phần từ params
  let connection;
  try {
    connection = await createPoolConnection();
    const query = `
      UPDATE hocphan 
      SET TenHocPhan = ?, DVHT = ?, KiHoc = ?, Khoa = ?, MaBoMon = ? 
      WHERE MaHocPhan = ?`; // Truy vấn cập nhật học phần
    await connection.execute(query, [TenHocPhan, DVHT, KiHoc, Khoa, MaBoMon, MaHocPhan]);
    res.status(200).json({ message: "Cập nhật học phần thành công." }); // Phản hồi thành công
  } catch (error) {
    console.error("Lỗi khi cập nhật học phần:", error);
    res.status(500).json({ message: "Lỗi hệ thống. Không thể cập nhật học phần." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const deleteHocPhan = async (req, res) => {
  const { MaHocPhan } = req.params; // Lấy mã học phần từ params
  let connection;
  try {
    connection = await createPoolConnection();
    const query = "DELETE FROM hocphan WHERE MaHocPhan = ?"; // Truy vấn xóa học phần
    const [results] = await connection.query(query, [MaHocPhan]);

    if (results.affectedRows > 0) {
      res.status(200).json({ message: "Xóa học phần thành công!" }); // Thông báo thành công
    } else {
      res.status(404).json({ message: "Không tìm thấy học phần để xóa." }); // Nếu không tìm thấy học phần
    }
  } catch (error) {
    console.error("Lỗi khi xóa học phần:", error);
    res.status(500).json({ message: "Lỗi hệ thống. Không thể xóa học phần." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

module.exports = {
  getaccountList,
  getdepartmentList,
  getnhanvienList,
  getMaPhongBanList,
  getidUserLists,
  getUpdatePhongBan,
  getchangePassword,
  updatePassword,
  getupdateBoMon,
  getNamHocList,
  postNamHoc,
  deleteNamHoc,
  addMessage,
  updateMessage,
  deleteMessage,
  getMessage,
  getshowMessage,
  getDotDoAnList,
  postDotDoAn,
  deleteDotDoAn,
  getHocPhanList,
  updateHocPhan,
  deleteHocPhan,
};
