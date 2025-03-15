// //const connection = require("../config/database");
// const createPoolConnection = require("../config/databasePool");
// require("dotenv").config();

// const login = async (req, res) => {
//   const { username, password } = req.body;
//   let connection;

//   try {
//     connection = createPoolConnection();
//     // Truy vấn người dùng từ cơ sở dữ liệu
//     const [users] = await connection.query(
//       "SELECT * FROM taikhoannguoidung WHERE TenDangNhap = ?",
//       [username]
//     ); // select cả password

//     // Kiểm tra nếu có người dùng
//     if (users.length > 0) {
//       const user = users[0];

//       // So sánh mật khẩu
//       if (user.MatKhau == password) {
//         req.session.userId = user.id_User; // Lưu id_User vào session

//         // Lấy tên người dùng
//         query = `select TenNhanVien from nhanvien
//             join taikhoannguoidung on nhanvien.id_User = taikhoannguoidung.id_User
//             where TenDangNhap = ?`;
//         const [TenNhanViens] = await connection.query(query, [username]);
//         const TenNhanVien = TenNhanViens[0].TenNhanVien;

//         // Phân quyền người dùng
//         const [roles] = await connection.query(
//           "SELECT MaPhongBan, Quyen,isKhoa FROM role WHERE TenDangNhap = ?",
//           [username]
//         );

//         const MaPhongBan = roles[0].MaPhongBan;
//         const role = roles[0].Quyen;
//         const isKhoa = roles[0].isKhoa;
//         req.session.role = role;
//         req.session.MaPhongBan = MaPhongBan;
//         req.session.isKhoa = isKhoa;

//         let url;

//         if (role == "ADMIN" || role == "") {
//           req.session.role = "ADMIN"; // Gán vai trò admin nếu không có vai trò
//           req.session.MaPhongBan = null;
//           url = "/admin"; // Đăng nhập vào trang admin
//         } else if (isKhoa == 1) {
//           url = "/mainkhoa";
//         } else {
//           url = "/maindt";
//         }

//         // Trả về phản hồi thành công với url
//         return res
//           .status(200)
//           .json({ url, role, MaPhongBan, isKhoa, TenNhanVien, username });
//       } else {
//         return res.status(401).json({ message: "Mật khẩu không chính xác" });
//       }
//     } else {
//       return res.status(404).json({ message: "Tên tài khoản không chính xác" });
//     }
//   } catch (err) {
//     // Xử lý lỗi
//     console.error(err);
//     return res.status(500).json({ message: "Lỗi máy chủ" });
//   } finally {
//     if (connection) connection.release(); // Giải phóng kết nối
//   }
// };

// module.exports = login;

//log_giangday
const createPoolConnection = require("../config/databasePool");
const { use } = require("../routes/adminRoute");
require("dotenv").config();

const createTriggergiangday = async (connection, userId, tenNhanVien) => {
  // Tạo câu lệnh SQL để tạo trigger
  const dropTriggerQuery = `DROP TRIGGER IF EXISTS giangday_log;`;
  const triggerQuery = `
  CREATE TRIGGER giangday_log
  AFTER UPDATE ON quychuan
  FOR EACH ROW
BEGIN
  DECLARE change_message VARCHAR(255) DEFAULT '';
  DECLARE loai_thong_tin VARCHAR(50);

  -- Xác định loại thông tin dựa trên giá trị MoiGiang
  IF NEW.MoiGiang = 1 THEN
      SET loai_thong_tin = 'Thay đổi thông tin lớp mời giảng';
  ELSE
      SET loai_thong_tin = 'Thay đổi thông tin lớp vượt giờ';
  END IF;

  -- Kiểm tra cột GiaoVienGiangDay
  IF OLD.GiaoVienGiangDay != NEW.GiaoVienGiangDay THEN
     SET change_message = CONCAT(change_message, 'Giảng Viên giảng dạy cho môn "', NEW.LopHocPhan, ' - ', NEW.TenLop, '": từ "', OLD.GiaoVienGiangDay, '" thành "', NEW.GiaoVienGiangDay, '". ');
  END IF;

  -- Kiểm tra cột KhoaDuyet
  IF OLD.KhoaDuyet != NEW.KhoaDuyet THEN
      IF OLD.KhoaDuyet = 0 AND NEW.KhoaDuyet = 1 THEN
          SET change_message = CONCAT(change_message, 'Khoa thay đổi duyệt môn "',  NEW.LopHocPhan, ' - ', NEW.TenLop, '": Đã duyệt. ');
      ELSEIF OLD.KhoaDuyet = 1 AND NEW.KhoaDuyet = 0 THEN
          SET change_message = CONCAT(change_message, 'Khoa thay đổi duyệt môn "',  NEW.LopHocPhan, ' - ', NEW.TenLop, '": Hủy duyệt. ');
      END IF;
  END IF;

  -- Kiểm tra cột DaoTaoDuyet
  IF OLD.DaoTaoDuyet != NEW.DaoTaoDuyet THEN
      IF OLD.DaoTaoDuyet = 0 AND NEW.DaoTaoDuyet = 1 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt môn "',  NEW.LopHocPhan, ' - ', NEW.TenLop, '": Đã duyệt. ');
      ELSEIF OLD.DaoTaoDuyet = 1 AND NEW.DaoTaoDuyet = 0 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt môn "',  NEW.LopHocPhan, ' - ', NEW.TenLop, '": Hủy duyệt. ');
      END IF;
  END IF;

  -- Kiểm tra cột TaiChinhDuyet
  IF OLD.TaiChinhDuyet != NEW.TaiChinhDuyet THEN
      IF OLD.TaiChinhDuyet = 0 AND NEW.TaiChinhDuyet = 1 THEN
          SET change_message = CONCAT(change_message, 'Tài chính thay đổi duyệt môn "',  NEW.LopHocPhan, ' - ', NEW.TenLop, '": Đã duyệt. ');
      ELSEIF OLD.TaiChinhDuyet = 1 AND NEW.TaiChinhDuyet = 0 THEN
          SET change_message = CONCAT(change_message, 'Tài chính thay đổi duyệt môn "',  NEW.LopHocPhan, ' - ', NEW.TenLop, '": Hủy duyệt. ');
      END IF;
  END IF;

  -- Kiểm tra cột GiaoVien
  IF OLD.GiaoVien != NEW.GiaoVien THEN
      SET change_message = CONCAT(change_message, 'Giảng viên cho môn "',  NEW.LopHocPhan, ' - ', NEW.TenLop, '": từ "', OLD.GiaoVien, '" thành "', NEW.GiaoVien, '". ');
  END IF;

  -- Nếu có thay đổi, ghi lại thông tin vào bảng lichsunhaplieu
  IF change_message != '' THEN
      INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (
        ${userId},  
          '${tenNhanVien}',
          loai_thong_tin,  -- Loại thông tin
          change_message,  -- Nội dung mới với thông báo thay đổi
          NOW()  -- Thời gian thay đổi
      );
  END IF;
END;

  `;
  try {
    // Lấy kết nối từ pool
    const connection = await createPoolConnection();
    try {
      // Tạo trigger sau khi đăng nhập thành công
      await connection.query(dropTriggerQuery);
      await connection.query(triggerQuery);
    } finally {
      if (connection) connection.release(); // Giải phóng kết nối
    }
  } catch (error) {
    console.error("Lỗi khi tạo trigger:", error.message);
  }
};
//log_doantotnghiep
const createTriggerdoan = async (connection, userId, tenNhanVien) => {
  // Tạo câu lệnh SQL để tạo trigger
  const dropTriggerQuery = `DROP TRIGGER IF EXISTS doan_log;`;
  const triggerQuery = `
CREATE TRIGGER doan_log
AFTER UPDATE ON doantotnghiep
FOR EACH ROW
BEGIN
  DECLARE change_message VARCHAR(1000) DEFAULT '';
  DECLARE loai_thong_tin VARCHAR(50) DEFAULT 'Thay đổi thông tin đồ án';

  -- Kiểm tra cột Giangvien1real
  IF OLD.GiangVien1Real != NEW.GiangVien1Real THEN
     SET change_message = CONCAT(change_message, 'Giảng Viên 1 cho đồ án "', NEW.TenDeTai, '": từ "', OLD.GiangVien1Real, '" thành "', NEW.GiangVien1Real, '". ');
  END IF;

  -- Kiểm tra cột Giangvien2real
  IF OLD.GiangVien2Real != NEW.GiangVien2Real THEN
     SET change_message = CONCAT(change_message, 'Giảng Viên 2 cho đồ án "', NEW.TenDeTai, '": từ "', OLD.GiangVien2Real, '" thành "', NEW.GiangVien2Real, '". ');
  END IF;

  -- Kiểm tra cột KhoaDuyet
  IF OLD.KhoaDuyet != NEW.KhoaDuyet THEN
      IF OLD.KhoaDuyet = 0 AND NEW.KhoaDuyet = 1 THEN
          SET change_message = CONCAT(change_message, 'Khoa thay đổi duyệt đồ án "', NEW.TenDeTai, '": Đã duyệt. ');
      ELSEIF OLD.KhoaDuyet = 1 AND NEW.KhoaDuyet = 0 THEN
          SET change_message = CONCAT(change_message, 'Khoa thay đổi duyệt đồ án "', NEW.TenDeTai, '": Hủy duyệt. ');
      END IF;
  END IF;

  -- Kiểm tra cột DaoTaoDuyet
  IF OLD.DaoTaoDuyet != NEW.DaoTaoDuyet THEN
      IF OLD.DaoTaoDuyet = 0 AND NEW.DaoTaoDuyet = 1 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt đồ án "', NEW.TenDeTai, '": Đã duyệt. ');
      ELSEIF OLD.DaoTaoDuyet = 1 AND NEW.DaoTaoDuyet = 0 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt đồ án "', NEW.TenDeTai, '": Hủy duyệt. ');
      END IF;
  END IF;

  -- Kiểm tra cột TaiChinhDuyet
  IF OLD.TaiChinhDuyet != NEW.TaiChinhDuyet THEN
      IF OLD.TaiChinhDuyet = 0 AND NEW.TaiChinhDuyet = 1 THEN
          SET change_message = CONCAT(change_message, 'Tài chính thay đổi duyệt đồ án "', NEW.TenDeTai, '": Đã duyệt. ');
      ELSEIF OLD.TaiChinhDuyet = 1 AND NEW.TaiChinhDuyet = 0 THEN
          SET change_message = CONCAT(change_message, 'Tài chính thay đổi duyệt đồ án "', NEW.TenDeTai, '": Hủy duyệt. ');
      END IF;
  END IF;

  -- Nếu có thay đổi, ghi lại thông tin vào bảng lichsunhaplieu
  IF change_message != '' THEN
      INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (
        ${userId},  
          '${tenNhanVien}',  -- Giả sử có cột TenNhanVien
          loai_thong_tin,
          change_message,
          NOW()
      );
  END IF;
END;

  `;
  try {
    // Lấy kết nối từ pool
    const connection = await createPoolConnection();
    try {
      // Tạo trigger sau khi đăng nhập thành công
      await connection.query(dropTriggerQuery);
      await connection.query(triggerQuery);
    } finally {
      if (connection) connection.release(); // Giải phóng kết nối
    }
  } catch (error) {
    console.error("Lỗi khi tạo trigger:", error.message);
  }
};

//log_nckh
const createTriggerbaibaokhoahoc = async (connection, userId, tenNhanVien) => {
  // Tạo câu lệnh SQL để tạo trigger
  const dropTriggerQuery = `DROP TRIGGER IF EXISTS baibaokhoahoc_log;`;
  const triggerQuery = `
CREATE TRIGGER baibaokhoahoc_log
AFTER UPDATE ON baibaokhoahoc
FOR EACH ROW
BEGIN
  DECLARE change_message VARCHAR(1000) DEFAULT '';
  DECLARE loai_thong_tin VARCHAR(50) DEFAULT 'Thay đổi thông tin NCKH';
  
  -- Kiểm tra cột DaoTaoDuyet
  IF OLD.DaoTaoDuyet != NEW.DaoTaoDuyet THEN
      IF OLD.DaoTaoDuyet = 0 AND NEW.DaoTaoDuyet = 1 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt bài báo "', NEW.TenBaiBao, '": Đã duyệt. ');
      ELSEIF OLD.DaoTaoDuyet = 1 AND NEW.DaoTaoDuyet = 0 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt bài báo "', NEW.TenBaiBao, '": Hủy duyệt. ');
      END IF;
  END IF;

  -- Nếu có thay đổi, ghi lại thông tin vào bảng lichsunhaplieu
  IF change_message != '' THEN
      INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (
        ${userId},  
          '${tenNhanVien}',  -- Giả sử có cột TenNhanVien
          loai_thong_tin,
          change_message,
          NOW()
      );
  END IF;
END;

  `;
  try {
    // Lấy kết nối từ pool
    const connection = await createPoolConnection();
    try {
      // Tạo trigger sau khi đăng nhập thành công
      await connection.query(dropTriggerQuery);
      await connection.query(triggerQuery);
    } finally {
      if (connection) connection.release(); // Giải phóng kết nối
    }
  } catch (error) {
    console.error("Lỗi khi tạo trigger:", error.message);
  }
};

const createTriggerbangsangche = async (connection, userId, tenNhanVien) => {
  // Tạo câu lệnh SQL để tạo trigger
  const dropTriggerQuery = `DROP TRIGGER IF EXISTS bangsangche_log;`;
  const triggerQuery = `
CREATE TRIGGER bangsangche_log
AFTER UPDATE ON bangsangchevagiaithuong
FOR EACH ROW
BEGIN
  DECLARE change_message VARCHAR(1000) DEFAULT '';
  DECLARE loai_thong_tin VARCHAR(50) DEFAULT 'Thay đổi thông tin NCKH';
  
  -- Kiểm tra cột DaoTaoDuyet
  IF OLD.DaoTaoDuyet != NEW.DaoTaoDuyet THEN
      IF OLD.DaoTaoDuyet = 0 AND NEW.DaoTaoDuyet = 1 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt bằng sáng chế và giải thưởng "', NEW.TenBangSangCheVaGiaiThuong, '": Đã duyệt. ');
      ELSEIF OLD.DaoTaoDuyet = 1 AND NEW.DaoTaoDuyet = 0 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt bằng sáng chế và giải thưởng "', NEW.TenBangSangCheVaGiaiThuong, '": Hủy duyệt. ');
      END IF;
  END IF;

  -- Nếu có thay đổi, ghi lại thông tin vào bảng lichsunhaplieu
  IF change_message != '' THEN
      INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (
        ${userId},  
          '${tenNhanVien}',  -- Giả sử có cột TenNhanVien
          loai_thong_tin,
          change_message,
          NOW()
      );
  END IF;
END;

  `;
  try {
    // Lấy kết nối từ pool
    const connection = await createPoolConnection();
    try {
      // Tạo trigger sau khi đăng nhập thành công
      await connection.query(dropTriggerQuery);
      await connection.query(triggerQuery);
    } finally {
      if (connection) connection.release(); // Giải phóng kết nối
    }
  } catch (error) {
    console.error("Lỗi khi tạo trigger:", error.message);
  }
};

const createTriggerbiensoangiaotrinh = async (connection, userId, tenNhanVien) => {
  // Tạo câu lệnh SQL để tạo trigger
  const dropTriggerQuery = `DROP TRIGGER IF EXISTS biensoan_log;`;
  const triggerQuery = `
CREATE TRIGGER biensoan_log
AFTER UPDATE ON biensoangiaotrinhbaigiang
FOR EACH ROW
BEGIN
  DECLARE change_message VARCHAR(1000) DEFAULT '';
  DECLARE loai_thong_tin VARCHAR(50) DEFAULT 'Thay đổi thông tin NCKH';
  
  -- Kiểm tra cột DaoTaoDuyet
  IF OLD.DaoTaoDuyet != NEW.DaoTaoDuyet THEN
      IF OLD.DaoTaoDuyet = 0 AND NEW.DaoTaoDuyet = 1 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt giáo trình "', NEW.TenGiaoTrinhBaiGiang, '": Đã duyệt. ');
      ELSEIF OLD.DaoTaoDuyet = 1 AND NEW.DaoTaoDuyet = 0 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt giáo trình "', NEW.TenGiaoTrinhBaiGiang, '": Hủy duyệt. ');
      END IF;
  END IF;

  -- Nếu có thay đổi, ghi lại thông tin vào bảng lichsunhaplieu
  IF change_message != '' THEN
      INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (
        ${userId},  
          '${tenNhanVien}',  -- Giả sử có cột TenNhanVien
          loai_thong_tin,
          change_message,
          NOW()
      );
  END IF;
END;

  `;
  try {
    // Lấy kết nối từ pool
    const connection = await createPoolConnection();
    try {
      // Tạo trigger sau khi đăng nhập thành công
      await connection.query(dropTriggerQuery);
      await connection.query(triggerQuery);
    } finally {
      if (connection) connection.release(); // Giải phóng kết nối
    }
  } catch (error) {
    console.error("Lỗi khi tạo trigger:", error.message);
  }
};

const createTriggerdetaiduan = async (connection, userId, tenNhanVien) => {
  // Tạo câu lệnh SQL để tạo trigger
  const dropTriggerQuery = `DROP TRIGGER IF EXISTS detaiduan_log;`;
  const triggerQuery = `
CREATE TRIGGER detaiduan_log
AFTER UPDATE ON detaiduan
FOR EACH ROW
BEGIN
  DECLARE change_message VARCHAR(1000) DEFAULT '';
  DECLARE loai_thong_tin VARCHAR(50) DEFAULT 'Thay đổi thông tin NCKH';
  
  -- Kiểm tra cột DaoTaoDuyet
  IF OLD.DaoTaoDuyet != NEW.DaoTaoDuyet THEN
      IF OLD.DaoTaoDuyet = 0 AND NEW.DaoTaoDuyet = 1 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt đề tài "', NEW.TenDeTai, '": Đã duyệt. ');
      ELSEIF OLD.DaoTaoDuyet = 1 AND NEW.DaoTaoDuyet = 0 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt đề tài "', NEW.TenDeTai, '": Hủy duyệt. ');
      END IF;
  END IF;

  -- Nếu có thay đổi, ghi lại thông tin vào bảng lichsunhaplieu
  IF change_message != '' THEN
      INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (
        ${userId},  
          '${tenNhanVien}',  -- Giả sử có cột TenNhanVien
          loai_thong_tin,
          change_message,
          NOW()
      );
  END IF;
END;

  `;
  try {
    // Lấy kết nối từ pool
    const connection = await createPoolConnection();
    try {
      // Tạo trigger sau khi đăng nhập thành công
      await connection.query(dropTriggerQuery);
      await connection.query(triggerQuery);
    } finally {
      if (connection) connection.release(); // Giải phóng kết nối
    }
  } catch (error) {
    console.error("Lỗi khi tạo trigger:", error.message);
  }
};

const createTriggernckhvahuanluyen = async (connection, userId, tenNhanVien) => {
  // Tạo câu lệnh SQL để tạo trigger
  const dropTriggerQuery = `DROP TRIGGER IF EXISTS huanluyen_log;`;
  const triggerQuery = `
CREATE TRIGGER huanluyen_log
AFTER UPDATE ON nckhvahuanluyendoituyen
FOR EACH ROW
BEGIN
  DECLARE change_message VARCHAR(1000) DEFAULT '';
  DECLARE loai_thong_tin VARCHAR(50) DEFAULT 'Thay đổi thông tin NCKH';
  
  -- Kiểm tra cột DaoTaoDuyet
  IF OLD.DaoTaoDuyet != NEW.DaoTaoDuyet THEN
      IF OLD.DaoTaoDuyet = 0 AND NEW.DaoTaoDuyet = 1 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt NCKH và Huấn luyện đội tuyển "', NEW.TenDeTai, '": Đã duyệt. ');
      ELSEIF OLD.DaoTaoDuyet = 1 AND NEW.DaoTaoDuyet = 0 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt NCKH và Huấn luyện đội tuyển "', NEW.TenDeTai, '": Hủy duyệt. ');
      END IF;
  END IF;

  -- Nếu có thay đổi, ghi lại thông tin vào bảng lichsunhaplieu
  IF change_message != '' THEN
      INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (
        ${userId},  
          '${tenNhanVien}',  -- Giả sử có cột TenNhanVien
          loai_thong_tin,
          change_message,
          NOW()
      );
  END IF;
END;

  `;
  try {
    // Lấy kết nối từ pool
    const connection = await createPoolConnection();
    try {
      // Tạo trigger sau khi đăng nhập thành công
      await connection.query(dropTriggerQuery);
      await connection.query(triggerQuery);
    } finally {
      if (connection) connection.release(); // Giải phóng kết nối
    }
  } catch (error) {
    console.error("Lỗi khi tạo trigger:", error.message);
  }
};

const createTriggernckhvacongnghe = async (connection, userId, tenNhanVien) => {
  // Tạo câu lệnh SQL để tạo trigger
  const dropTriggerQuery = `DROP TRIGGER IF EXISTS congnghe_log;`;
  const triggerQuery = `
CREATE TRIGGER congnghe_log
AFTER UPDATE ON nhiemvukhoahocvacongnghe
FOR EACH ROW
BEGIN
  DECLARE change_message VARCHAR(1000) DEFAULT '';
  DECLARE loai_thong_tin VARCHAR(50) DEFAULT 'Thay đổi thông tin NCKH';
  
  -- Kiểm tra cột DaoTaoDuyet
  IF OLD.DaoTaoDuyet != NEW.DaoTaoDuyet THEN
      IF OLD.DaoTaoDuyet = 0 AND NEW.DaoTaoDuyet = 1 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt nhiệm vụ "', NEW.TenNhiemVu, '": Đã duyệt. ');
      ELSEIF OLD.DaoTaoDuyet = 1 AND NEW.DaoTaoDuyet = 0 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt nhiệm vụ "', NEW.TenNhiemVu, '": Hủy duyệt. ');
      END IF;
  END IF;

  -- Nếu có thay đổi, ghi lại thông tin vào bảng lichsunhaplieu
  IF change_message != '' THEN
      INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (
        ${userId},  
          '${tenNhanVien}',  -- Giả sử có cột TenNhanVien
          loai_thong_tin,
          change_message,
          NOW()
      );
  END IF;
END;

  `;
  try {
    // Lấy kết nối từ pool
    const connection = await createPoolConnection();
    try {
      // Tạo trigger sau khi đăng nhập thành công
      await connection.query(dropTriggerQuery);
      await connection.query(triggerQuery);
    } finally {
      if (connection) connection.release(); // Giải phóng kết nối
    }
  } catch (error) {
    console.error("Lỗi khi tạo trigger:", error.message);
  }
};

const createTriggersachvagiaotrinh = async (connection, userId, tenNhanVien) => {
  // Tạo câu lệnh SQL để tạo trigger
  const dropTriggerQuery = `DROP TRIGGER IF EXISTS sachvagt_log;`;
  const triggerQuery = `
CREATE TRIGGER sachvagt_log
AFTER UPDATE ON sachvagiaotrinh
FOR EACH ROW
BEGIN
  DECLARE change_message VARCHAR(1000) DEFAULT '';
  DECLARE loai_thong_tin VARCHAR(50) DEFAULT 'Thay đổi thông tin NCKH';
  
  -- Kiểm tra cột DaoTaoDuyet
  IF OLD.DaoTaoDuyet != NEW.DaoTaoDuyet THEN
      IF OLD.DaoTaoDuyet = 0 AND NEW.DaoTaoDuyet = 1 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt sách và giáo trình "', NEW.TenSachVaGiaoTrinh, '": Đã duyệt. ');
      ELSEIF OLD.DaoTaoDuyet = 1 AND NEW.DaoTaoDuyet = 0 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt sách và giáo trình "', NEW.TenSachVaGiaoTrinh, '": Hủy duyệt. ');
      END IF;
  END IF;

  -- Nếu có thay đổi, ghi lại thông tin vào bảng lichsunhaplieu
  IF change_message != '' THEN
      INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (
        ${userId},  
          '${tenNhanVien}',  -- Giả sử có cột TenNhanVien
          loai_thong_tin,
          change_message,
          NOW()
      );
  END IF;
END;

  `;
  try {
    // Lấy kết nối từ pool
    const connection = await createPoolConnection();
    try {
      // Tạo trigger sau khi đăng nhập thành công
      await connection.query(dropTriggerQuery);
      await connection.query(triggerQuery);
    } finally {
      if (connection) connection.release(); // Giải phóng kết nối
    }
  } catch (error) {
    console.error("Lỗi khi tạo trigger:", error.message);
  }
};

const createTriggerxaydungctdt = async (connection, userId, tenNhanVien) => {
  // Tạo câu lệnh SQL để tạo trigger
  const dropTriggerQuery = `DROP TRIGGER IF EXISTS xaydung_log;`;
  const triggerQuery = `
CREATE TRIGGER xaydung_log
AFTER UPDATE ON xaydungctdt
FOR EACH ROW
BEGIN
  DECLARE change_message VARCHAR(1000) DEFAULT '';
  DECLARE loai_thong_tin VARCHAR(50) DEFAULT 'Thay đổi thông tin NCKH';
  
  -- Kiểm tra cột DaoTaoDuyet
  IF OLD.DaoTaoDuyet != NEW.DaoTaoDuyet THEN
      IF OLD.DaoTaoDuyet = 0 AND NEW.DaoTaoDuyet = 1 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt chương trình đào tạo "', NEW.TenChuongTrinh, '": Đã duyệt. ');
      ELSEIF OLD.DaoTaoDuyet = 1 AND NEW.DaoTaoDuyet = 0 THEN
          SET change_message = CONCAT(change_message, 'Đào tạo thay đổi duyệt chương trình đào tạo "', NEW.TenChuongTrinh, '": Hủy duyệt. ');
      END IF;
  END IF;

  -- Nếu có thay đổi, ghi lại thông tin vào bảng lichsunhaplieu
  IF change_message != '' THEN
      INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (
        ${userId},  
          '${tenNhanVien}',  -- Giả sử có cột TenNhanVien
          loai_thong_tin,
          change_message,
          NOW()
      );
  END IF;
END;

  `;
  try {
    // Lấy kết nối từ pool
    const connection = await createPoolConnection();
    try {
      // Tạo trigger sau khi đăng nhập thành công
      await connection.query(dropTriggerQuery);
      await connection.query(triggerQuery);
    } finally {
      if (connection) connection.release(); // Giải phóng kết nối
    }
  } catch (error) {
    console.error("Lỗi khi tạo trigger:", error.message);
  }
};

//lopngoaiquychuan_log
const createTriggerlopngoaiquychuan = async (connection, userId, tenNhanVien) => {
  // Tạo câu lệnh SQL để tạo trigger
  const dropTriggerQuery = `DROP TRIGGER IF EXISTS themngoai_log;`;
  const triggerQuery = `
CREATE TRIGGER themngoai_log
AFTER INSERT ON lopngoaiquychuan
FOR EACH ROW
BEGIN
  DECLARE change_message VARCHAR(255);
  SET change_message = CONCAT('Thêm mới lớp ngoài quy chuẩn: ', NEW.TenHocPhan, ' - ', NEW.Lop);

  INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
  VALUES (
    ${userId},
    '${tenNhanVien}',
    'Thêm mới lớp ngoài quy chuẩn',
    change_message,
    NOW()
  );
END;


  `;
  try {
    // Lấy kết nối từ pool
    const connection = await createPoolConnection();
    try {
      // Tạo trigger sau khi đăng nhập thành công
      await connection.query(dropTriggerQuery);
      await connection.query(triggerQuery);
    } finally {
      if (connection) connection.release(); // Giải phóng kết nối
    }
  } catch (error) {
    console.error("Lỗi khi tạo trigger:", error.message);
  }
};
//log thông tin gv mời
const createTriggeraddgvmoi = async (connection, userId, tenNhanVien) => {
  // Tạo câu lệnh SQL để tạo trigger
  const dropTriggerQuery = `DROP TRIGGER IF EXISTS addgvmoi_log;`;
  const triggerQuery = `
CREATE TRIGGER addgvmoi_log
AFTER INSERT ON gvmoi
FOR EACH ROW
BEGIN
  DECLARE change_message VARCHAR(255);
  SET change_message = CONCAT('Thêm giảng viên mời mới: ', NEW.HoTen, ' - ', NEW.MaGvm);

  INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
  VALUES (
    ${userId},
    '${tenNhanVien}',
    'Thay đổi thông tin giảng viên mời',
    change_message,
    NOW()
  );
END;


  `;
  try {
    // Lấy kết nối từ pool
    const connection = await createPoolConnection();
    try {
      // Tạo trigger sau khi đăng nhập thành công
      await connection.query(dropTriggerQuery);
      await connection.query(triggerQuery);
    } finally {
      if (connection) connection.release(); // Giải phóng kết nối
    }
  } catch (error) {
    console.error("Lỗi khi tạo trigger:", error.message);
  }
};

const createTriggergvmoi = async (connection, userId, tenNhanVien) => {
  // Tạo câu lệnh SQL để tạo trigger
  const dropTriggerQuery = `DROP TRIGGER IF EXISTS gvmoi_log;`;
  const triggerQuery = `
  CREATE TRIGGER gvmoi_log
  AFTER UPDATE ON gvmoi
  FOR EACH ROW
BEGIN
  DECLARE change_message VARCHAR(255) DEFAULT '';

  -- Kiểm tra cột Hoten
  IF OLD.HoTen != NEW.HoTen THEN
     SET change_message = CONCAT(change_message, 'Tên giảng viên mời được đổi từ "', OLD.Hoten, '" thành "', NEW.HoTen, '". ');
  END IF;

  -- Kiểm tra cột tình trạng giảng dạy
  IF OLD.TinhTrangGiangDay != NEW.TinhTrangGiangDay THEN
      IF OLD.TinhTrangGiangDay = 0 AND NEW.TinhTrangGiangDay = 1 THEN
          SET change_message = CONCAT(change_message, 'Thay đổi tình trạng giảng dạy "',  NEW.HoTen, '": Đang giảng dạy ');
      ELSEIF OLD.TinhTrangGiangDay = 1 AND NEW.TinhTrangGiangDay = 0 THEN
          SET change_message = CONCAT(change_message, 'Thay đổi tình trạng giảng dạy "',  NEW.HoTen, '": Đã ngừng giảng dạy ');
      END IF;
  END IF;

  -- Kiểm tra cột CCCD ảnh
  IF OLD.MatTruocCCCD != NEW.MatTruocCCCD or OLD.MatSauCCCD != NEW.MatSauCCCD THEN
          SET change_message = CONCAT(change_message, 'Cập nhật ảnh CCCD của giảng viên "',  NEW.HoTen, ' - ', NEW.CCCD, '" .');
  END IF;

  -- Kiểm tra cột CCCD
   IF OLD.CCCD != NEW.CCCD THEN
     SET change_message = CONCAT(change_message, 'Thay đổi số CCCD của giảng viên  "', NEW.Hoten, '" thành "', NEW.CCCD, '". ');
  END IF;

  -- Kiểm tra cột STK
  IF OLD.STK != NEW.STK THEN
      SET change_message = CONCAT(change_message, 'Thay đổi STK của giảng viên mời "',  NEW.HoTen, ' - ', NEW.CCCD, '": từ "', OLD.STK, '" thành "', NEW.STK, '". ');
  END IF;

 -- Kiểm tra cột SĐT
  IF OLD.DienThoai != NEW.DienThoai THEN
      SET change_message = CONCAT(change_message, 'Thay đổi SĐT của giảng viên mời"',  NEW.HoTen, ' - ', NEW.CCCD, '": từ "', OLD.DienThoai, '" thành "', NEW.DienThoai, '". ');
  END IF;

   -- Kiểm tra cột Email
  IF OLD.Email != NEW.Email THEN
      SET change_message = CONCAT(change_message, 'Thay đổi Email của giảng viên mời"',  NEW.HoTen, ' - ', NEW.CCCD, '": từ "', OLD.Email, '" thành "', NEW.Email, '". ');
  END IF;

  -- Nếu có thay đổi, ghi lại thông tin vào bảng lichsunhaplieu
  IF change_message != '' THEN
      INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (
        ${userId},  
          '${tenNhanVien}',
          'Thay đổi thông tin giảng viên mời',
          change_message,  -- Nội dung mới với thông báo thay đổi
          NOW()  -- Thời gian thay đổi
      );
  END IF;
END;

  `;
  try {
    // Lấy kết nối từ pool
    const connection = await createPoolConnection();
    try {
      // Tạo trigger sau khi đăng nhập thành công
      await connection.query(dropTriggerQuery);
      await connection.query(triggerQuery);
    } finally {
      if (connection) connection.release(); // Giải phóng kết nối
    }
  } catch (error) {
    console.error("Lỗi khi tạo trigger:", error.message);
  }
};

const login = async (req, res) => {
  const { username, password } = req.body;
  let connection;

  try {
    connection = await createPoolConnection(); // Đảm bảo dùng await

    // Truy vấn người dùng từ cơ sở dữ liệu
    const [users] = await connection.query(
      "SELECT * FROM taikhoannguoidung WHERE TenDangNhap = ?",
      [username]
    );

    // Kiểm tra nếu có người dùng
    if (users.length > 0) {
      const user = users[0];

      // So sánh mật khẩu
      if (user.MatKhau == password) {
        req.session.userId = user.id_User; // Lưu id_User vào session

        // Lấy tên người dùng
        const query = `SELECT TenNhanVien FROM nhanvien 
            JOIN taikhoannguoidung ON nhanvien.id_User = taikhoannguoidung.id_User
            WHERE TenDangNhap = ?`;
        const [TenNhanViens] = await connection.query(query, [username]);
        const TenNhanVien = TenNhanViens[0]?.TenNhanVien;
        await createTriggergiangday(connection, req.session.userId, TenNhanVien);
        await createTriggerdoan(connection, req.session.userId, TenNhanVien);
        await createTriggerbaibaokhoahoc(connection, req.session.userId, TenNhanVien);
        await createTriggerbangsangche(connection, req.session.userId, TenNhanVien);
        await createTriggerbiensoangiaotrinh(connection, req.session.userId, TenNhanVien);
        await createTriggerdetaiduan(connection, req.session.userId, TenNhanVien);
        await createTriggernckhvahuanluyen(connection, req.session.userId, TenNhanVien);
        await createTriggernckhvacongnghe(connection, req.session.userId, TenNhanVien);
        await createTriggersachvagiaotrinh(connection, req.session.userId, TenNhanVien);
        await createTriggerxaydungctdt(connection, req.session.userId, TenNhanVien);
        await createTriggerlopngoaiquychuan(connection, req.session.userId, TenNhanVien);
        await createTriggeraddgvmoi(connection, req.session.userId, TenNhanVien);
        await createTriggergvmoi(connection, req.session.userId, TenNhanVien);
        
        // Phân quyền người dùng
        const [roles] = await connection.query(
          "SELECT MaPhongBan, Quyen, isKhoa FROM role WHERE TenDangNhap = ?",
          [username]
        );

        const MaPhongBan = roles[0]?.MaPhongBan; // Kiểm tra an toàn
        const role = roles[0]?.Quyen; // Kiểm tra an toàn
        const isKhoa = roles[0]?.isKhoa; // Kiểm tra an toàn
        req.session.role = role;
        req.session.MaPhongBan = MaPhongBan;
        req.session.isKhoa = isKhoa;

        console.log("Tài khoản đăng nhập: " + username + " Phòng ban: " + MaPhongBan + " Quyền: " + role);

        // Tạo 1 req.session để dùng làm mẫu
        req.session.tmp = 0;

        let url;

        if (role === "ADMIN" || role === "") {
          req.session.role = "ADMIN"; // Gán vai trò admin nếu không có vai trò
          req.session.MaPhongBan = null;
          url = "/admin"; // Đăng nhập vào trang admin
        } else if (isKhoa === 1) {
          url = "/mainkhoa";
        } else {
          url = "/maindt";
        }
        //

        // Trả về phản hồi thành công với url
        return res
          .status(200)
          .json({ url, role, MaPhongBan, isKhoa, TenNhanVien, username, id_User: user.id_User });
      } else {
        return res.status(401).json({ message: "Mật khẩu không chính xác" });
      }
    } else {
      return res.status(404).json({ message: "Tên tài khoản không chính xác" });
    }
  } catch (err) {
    // Xử lý lỗi
    console.error(err);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

module.exports = login;
