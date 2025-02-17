const express = require("express");
const multer = require("multer");
const router = express.Router();
const createPoolConnection = require("../config/databasePool");

const addClass = async (req, res) => {
  const MaPhongBan = req.params.MaPhongBan;
  const GiangVien = req.body.GiangVien;
  let connection;
  try {
    connection = await createPoolConnection();
    const query = `SELECT id_User FROM nhanvien WHERE TenNhanVien = ?`;
    const [rows] = await connection.query(query, [GiangVien]);
    const id_User = rows[0].id_User;
    let {
      [`SoTC`]: SoTC = 0,
      [`TenHocPhan`]: TenHocPhan = "", // Gán giá trị mặc định là chuỗi rỗng
      [`LenLop`]: LenLop = 0,
      [`HeSoT7CN`]: HeSoT7CN, // Gán giá trị mặc định là 0
      [`SoSV`]: SoSV = 0, // Gán giá trị mặc định là 0
      [`QuyChuan`]: QuyChuan = 0, // Gán giá trị mặc định là chuỗi rỗng
      [`HocKy`]: HocKy, // Gán giá trị mặc định là chuỗi rỗng
      [`NamHoc`]: NamHoc, // Gán giá trị mặc định là chuỗi rỗng
      [`HinhThucKTGiuaKy`]: HinhThucKTGiuaKy, // Gán giá trị mặc định là chuỗi rỗng
      [`Lop`]: Lop = "", // Gán giá trị mặc định là chuỗi rỗng
      [`he_dao_tao`]: he_dao_tao = "", // Gán giá trị mặc định là chuỗi rỗng
    } = req.body; // Đảm bảo rằng các biến được khai báo đúng cách
    SoTC = SoTC || 0;
    LenLop = LenLop || 0;
    let SoDe = 0,
      HeSoLopDong = 0;
    if (SoSV >= 41 && SoSV <= 50) {
      HeSoLopDong = 1.1;
      SoDe = 3;
    } else if (SoSV >= 51 && SoSV <= 65) {
      HeSoLopDong = 1.2;
      SoDe = 3;
    } else if (SoSV >= 66 && SoSV <= 80) {
      HeSoLopDong = 1.3;
      SoDe = 3;
    } else if (SoSV >= 81 && SoSV <= 100) {
      HeSoLopDong = 1.4;
      SoDe = 4;
    } else if (SoSV >= 101) {
      HeSoLopDong = 1.5;
      SoDe = 4;
    } else {
      HeSoLopDong = 1; // Giá trị mặc định nếu không nằm trong khoảng
      SoDe = 2;
    }
    let SoTietKT = 0;
    if (HinhThucKTGiuaKy === "none") {
      SoTietKT = 0;
    }
    if (
      HinhThucKTGiuaKy === "Coi, chấm TN" ||
      HinhThucKTGiuaKy === "Coi, chấm viết"
    ) {
      let number = HeSoT7CN * (0.05 * SoSV + 2);
      SoTietKT = parseFloat(number.toFixed(2));
    }
    if (
      HinhThucKTGiuaKy === "Coi, chấm VĐ" ||
      HinhThucKTGiuaKy === "Coi, chấm TH"
    ) {
      let number = HeSoT7CN * (0.125 * SoSV + 2);
      SoTietKT = parseFloat(number.toFixed(2));
    }
    console.log(
      SoTC,
      TenHocPhan,
      LenLop,
      HeSoT7CN,
      SoSV,
      HeSoLopDong,
      QuyChuan,
      HocKy,
      NamHoc,
      HinhThucKTGiuaKy,
      SoTietKT,
      Lop,
      MaPhongBan,
      he_dao_tao
    );
    const query1 = `INSERT INTO lopngoaiquychuan (SoTC, TenHocPhan, id_User, LenLop, HeSoT7CN, SoSV, HeSoLopDong, QuyChuan, HocKy, NamHoc, GiangVien, HinhThucKTGiuaKy, SoTietKT, Lop, SoDe, Khoa, he_dao_tao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
    const [result] = await connection.query(query1, [
      SoTC,
      TenHocPhan,
      id_User,
      LenLop,
      HeSoT7CN,
      SoSV,
      HeSoLopDong,
      QuyChuan,
      HocKy,
      NamHoc,
      GiangVien,
      HinhThucKTGiuaKy,
      SoTietKT,
      Lop,
      SoDe,
      MaPhongBan,
      he_dao_tao,
    ]);
    const MaGiangDay = result.insertId;

    const query2 = `INSERT INTO giuaky (TenHocPhan, id_User, HeSoT7CN, SoSV, HocKy, NamHoc, GiangVien, HinhThucKTGiuaKy, SoTietKT, Lop, SoDe, Khoa, Nguon, MaGiangDayNguon, he_dao_tao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
    await connection.query(query2, [
      TenHocPhan,
      id_User,
      HeSoT7CN,
      SoSV,
      HocKy,
      NamHoc,
      GiangVien,
      HinhThucKTGiuaKy,
      SoTietKT,
      Lop,
      SoDe,
      MaPhongBan,
      "lopngoaiquychuan",
      MaGiangDay,
      he_dao_tao,
    ]);

    res.status(200).send({ message: "Thêm lớp thành công" });
  } catch (error) {
    console.error("Lỗi khi thêm dữ liệu: ", error);
    // Đảm bảo không gửi phản hồi nếu đã có lỗi
    res.status(500).send("Lỗi server, không thể thêm dữ liệu");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const getLopGiuaKi = async (req, res) => {
  const MaPhongBan = req.params.maPhongBan;
  const { Dot, Ki, Nam } = req.params;
  console.log(Dot, Ki, Nam);
  let connection;
  try {
    connection = await createPoolConnection();
    const query = `SELECT * From giangday WHERE Khoa = ? AND Dot = ? AND HocKy = ? AND NamHoc = ? ORDER BY TenHocPhan`;
    const [result] = await connection.query(query, [MaPhongBan, Dot, Ki, Nam]);
    res.json({
      success: true,
      maBoMon: result,
    });
  } catch (error) {
    console.error("Lỗi: ", error);
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};
const SaveNote = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { id, ghiChu } = req.body;
    console.log(id, ghiChu);
    const query = `
        UPDATE giangday 
        SET GhiChu = ? , HoanThanh = ?
        WHERE MaGiangDay = ?
        `;
    await connection.query(query, [ghiChu, false, id]);
    const query1 = `
        UPDATE giuaky 
        SET GhiChu = ? , HoanThanh = ?
        WHERE MaGiangDayNguon = ? AND Nguon = "giangday"
        `;
    await connection.query(query1, [ghiChu, false, id]);

    res.json({ success: true, message: "Ghi chú đã được lưu thành công" });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi khi lưu ghi chú" });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};
const DoneNote = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { id, ghiChu } = req.body;
    const mGhiChu = ghiChu + " Đã sửa";

    console.log(id, ghiChu, mGhiChu);
    const query = `
            UPDATE giangday 
            SET GhiChu = ?, HoanThanh = ? 
            WHERE MaGiangDay = ?
        `;
    await connection.query(query, [mGhiChu, true, id]);
    const query1 = `
        UPDATE giuaky 
        SET GhiChu = ? , HoanThanh = ?
        WHERE MaGiangDayNguon = ? AND Nguon = "giangday"
        `;
    await connection.query(query1, [mGhiChu, true, id]);
    res.json({ success: true, message: "Ghi chú đã được lưu thành công" });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi khi lưu ghi chú" });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};
const SaveNoteAddClass = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { id, ghiChu } = req.body;

    console.log(id, ghiChu);
    const query = `
          UPDATE lopngoaiquychuan 
          SET GhiChu = ? , HoanThanh = ?
          WHERE MaGiangDay = ?
          `;
    await connection.query(query, [ghiChu, false, id]);
    const query1 = `
          UPDATE giuaky 
          SET GhiChu = ? , HoanThanh = ?
          WHERE MaGiangDayNguon = ? AND Nguon = "lopngoaiquychuan"
          `;
    await connection.query(query1, [ghiChu, false, id]);

    res.json({ success: true, message: "Ghi chú đã được lưu thành công" });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi khi lưu ghi chú" });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};
const DoneNoteAddClass = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { id, ghiChu } = req.body;
    const mGhiChu = ghiChu + " Đã sửa";

    console.log(id, ghiChu, mGhiChu);
    const query = `
              UPDATE lopngoaiquychuan 
              SET GhiChu = ?, HoanThanh = ? 
              WHERE MaGiangDay = ?
          `;
    await connection.query(query, [mGhiChu, true, id]);
    const query1 = `
          UPDATE giuaky 
          SET GhiChu = ? , HoanThanh = ?
          WHERE MaGiangDayNguon = ? AND Nguon = "lopngoaiquychuan"
          `;
    await connection.query(query1, [mGhiChu, true, id]);
    res.json({ success: true, message: "Ghi chú đã được lưu thành công" });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi khi lưu ghi chú" });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};
const SaveNoteDuyet = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { id, ghiChu } = req.body;

    console.log(id, ghiChu);
    const query = `SELECT * FROM giuaky WHERE MaGiangDay = ?`;
    const [rows] = await connection.query(query, [id]);
    const table = rows[0].Nguon;
    const MaGiangDay = rows[0].MaGiangDayNguon;

    const query1 = `
        UPDATE giuaky 
        SET GhiChu = ? , HoanThanh = ?
        WHERE MaGiangDay = ?`;
    await connection.query(query1, [ghiChu, false, id]);
    if (table === "lopngoaiquychuan") {
      const query = `
            UPDATE lopngoaiquychuan 
            SET GhiChu = ? , HoanThanh = ?
            WHERE MaGiangDay = ?
            `;
      await connection.query(query, [ghiChu, false, MaGiangDay]);
    } else if (table === "giangday") {
      const query = `
                UPDATE giangday 
                SET GhiChu = ? , HoanThanh = ?
                WHERE MaGiangDay = ?
                `;
      await connection.query(query, [ghiChu, false, MaGiangDay]);
    }
    res.json({ success: true, message: "Ghi chú đã được lưu thành công" });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi khi lưu ghi chú" });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};
const DoneNoteDuyet = async (req, res) => {
  let connection = await createPoolConnection();
  try {
    const { id, ghiChu } = req.body;
    const mGhiChu = ghiChu + " Đã sửa";

    console.log(id, ghiChu, mGhiChu);
    const query = `SELECT * FROM giuaky WHERE MaGiangDay = ?`;
    const [rows] = await connection.query(query, [id]);
    const table = rows[0].Nguon;
    const MaGiangDay = rows[0].MaGiangDayNguon;

    const query1 = `
            UPDATE giuaky 
            SET GhiChu = ? , HoanThanh = ?
            WHERE MaGiangDay = ?`;
    await connection.query(query1, [mGhiChu, true, id]);
    if (table === "lopngoaiquychuan") {
      const query = `
                UPDATE lopngoaiquychuan 
                SET GhiChu = ? , HoanThanh = ?
                WHERE MaGiangDay = ?`;
      await connection.query(query, [mGhiChu, true, MaGiangDay]);
    } else if (table === "giangday") {
      const query = `
                UPDATE giangday 
                SET GhiChu = ? , HoanThanh = ?
                WHERE MaGiangDay = ?`;
      await connection.query(query, [mGhiChu, true, MaGiangDay]);
    }
    res.json({ success: true, message: "Ghi chú đã được lưu thành công" });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi khi lưu ghi chú" });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};
// Hàm xử lý cập nhật dữ liệu
const updateLopThiGk = async (req, res) => {
  const globalData = req.body; // Lấy dữ liệu từ client gửi đến
  if (!globalData || globalData.length === 0) {
    return res.status(400).json({ message: "Không có dữ liệu để cập nhật." });
  }

  // Tạo kết nối tới database MySQL
  const connection = await createPoolConnection();

  try {
    // Duyệt qua mỗi phần tử trong globalData và cập nhật vào bảng giangday
    for (let data of globalData) {
      const { hinhThucKTGiuaKy, heSoT7CN, select, MaGiangDay, GiangVien } =
        data;
      // Truy vấn dữ liệu từ bảng giangday bằng MaGiangDay
      const query1 = `SELECT * FROM giangday WHERE MaGiangDay = ?`;
      let [rows] = await connection.query(query1, [MaGiangDay]);

      const query = `SELECT * FROM nhanvien WHERE TenNhanVien = ?`;
      const [gv] = await connection.query(query, [GiangVien]);
      const id_User = gv[0].id_User;

      // Kiểm tra nếu không tìm thấy dữ liệu
      if (rows.length === 0) {
        console.log(`Không tìm thấy dữ liệu với MaGiangDay: ${MaGiangDay}`);
        continue; // Bỏ qua phần tử này nếu không tìm thấy dữ liệu
      }
      // Lấy dữ liệu của row đầu tiên (vì chỉ có 1 dòng dữ liệu trả về với mỗi MaGiangDay)
      let row = rows[0];
      if (select) {
        let SoTietKT = 0;
        let SoDe = 0;
        if (row.SoSV >= 41 && row.SoSV <= 80) {
          SoDe = 3;
        } else if (row.SoSV >= 81) {
          SoDe = 4;
        } else {
          SoDe = 2;
        }

        if (hinhThucKTGiuaKy === "none") {
          SoTietKT = 0;
        } else if (
          hinhThucKTGiuaKy === "Coi, chấm TN" ||
          hinhThucKTGiuaKy === "Coi, chấm viết"
        ) {
          let number = heSoT7CN * (0.05 * row.SoSV + 2);
          SoTietKT = parseFloat(number.toFixed(2));
        } else if (
          hinhThucKTGiuaKy === "Coi, chấm VĐ" ||
          hinhThucKTGiuaKy === "Coi, chấm TH"
        ) {
          let number = heSoT7CN * (0.125 * row.SoSV + 2);
          SoTietKT = parseFloat(number.toFixed(2));
        }

        // Chuẩn bị mảng dữ liệu cho câu lệnh INSERT
        let valuesToInsert = [
          row.MaGiangDay,
          row.TenHocPhan,
          id_User,
          heSoT7CN,
          row.SoSV,
          row.HocKy,
          row.NamHoc,
          row.MaHocPhan,
          GiangVien,
          hinhThucKTGiuaKy,
          SoTietKT,
          row.Lop,
          SoDe,
          row.Khoa,
          row.he_dao_tao,
        ];
        const query = `
          INSERT INTO giuaky (MaGiangDayNguon, TenHocPhan, id_User, HeSoT7CN, SoSV, HocKy, NamHoc, MaHocPhan, GiangVien, HinhThucKTGiuaKy, SoTietKT, Lop, SoDe, Khoa, he_dao_tao, Nguon) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            id_User = VALUES(id_User),
            HeSoT7CN = VALUES(HeSoT7CN),
            GiangVien = VALUES(GiangVien),
            HinhThucKTGiuaKy = VALUES(HinhThucKTGiuaKy),
            SoTietKT = VALUES(SoTietKT),
            SoDe = VALUES(SoDe);
        `;

        try {
          await connection.query(query, [
            row.MaGiangDay,
            row.TenHocPhan,
            id_User,
            heSoT7CN,
            row.SoSV,
            row.HocKy,
            row.NamHoc,
            row.MaHocPhan,
            GiangVien,
            hinhThucKTGiuaKy,
            SoTietKT,
            row.Lop,
            SoDe,
            row.Khoa,
            row.he_dao_tao,
            "giangday", // Thêm giá trị cho cột `Nguon`
          ]);
        
        } catch (error) {
          console.error("Lỗi khi thực hiện truy vấn:", error);
        }

        const query3 = `UPDATE giangday SET DaChon = 1, HinhThucKTGiuaKy= ?, GiangVienCoiGK= ?  WHERE MaGiangDay = ?`;
        await connection.query(query3, [
          hinhThucKTGiuaKy,
          GiangVien,
          MaGiangDay,
        ]);
      } else {
        const query2 = `DELETE FROM giuaky WHERE MaGiangDayNguon = ?`;
        await connection.query(query2, [MaGiangDay]);
        const query3 = `UPDATE giangday SET DaChon = 0, GiangVienCoiGK= NULL WHERE MaGiangDay = ?`;
        await connection.query(query3, [MaGiangDay]);
      }
    }

    // Gửi phản hồi thành công
    res.status(200).json({ message: "Cập nhật thành công" }); // Phản hồi thành công
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu:", error);
    res.status(500).json({ message: "Có lỗi xảy ra khi cập nhật dữ liệu." });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};
const getLopGK = async (req, res) => {
  const MaPhongBan = req.params.maPhongBan;
  const { Ki, Nam } = req.params;
  console.log(Ki, Nam);
  let connection;
  try {
    connection = await createPoolConnection();
    const query2 = `SELECT * From giuaky WHERE Khoa = ? AND HocKy = ? AND NamHoc = ? `;
    const [result] = await connection.query(query2, [MaPhongBan, Ki, Nam]);
    res.json({
      success: true,
      maBoMon: result,
    });
  } catch (error) {
    console.error("Lỗi: ", error);
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};
const updateKhoaDuyet = async (req, res) => {
  const { MaGiangDay, khoaDuyet } = req.body;
  console.log(khoaDuyet);
  let connection;
  try {
    connection = await createPoolConnection();
    const query = `SELECT * FROM giuaky WHERE MaGiangDay = ?`;
    const [rows] = await connection.query(query, [MaGiangDay]);
    const MaGiangDayNguon = rows[0].MaGiangDayNguon;
    const Table = rows[0].Nguon;
    if (Table === "lopngoaiquychuan") {
      const query1 = `UPDATE lopngoaiquychuan SET KhoaDuyet = ? WHERE MaGiangDay = ?`;
      await connection.query(query1, [khoaDuyet, MaGiangDayNguon]);
      const query2 = `UPDATE giuaky SET KhoaDuyet = ? WHERE MaGiangDay = ?`;
      await connection.query(query2, [khoaDuyet, MaGiangDay]);
    } else {
      const query1 = `UPDATE giangday SET KhoaDuyet = ? WHERE MaGiangDay = ?`;
      await connection.query(query1, [khoaDuyet, MaGiangDayNguon]);
      const query2 = `UPDATE giuaky SET KhoaDuyet = ? WHERE MaGiangDay = ?`;
      await connection.query(query2, [khoaDuyet, MaGiangDay]);
    }

    res.status(200).send({ message: "Cập nhật thành công" }); // Phản hồi thành công
  } catch (error) {
    console.error("Lỗi: ", error);
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};
const deleteLopGK = async (req, res) => {
  const { MaGiangDay } = req.body;
  let connection;
  try {
    connection = await createPoolConnection();
    const query = `SELECT * FROM giuaky WHERE MaGiangDay = ?`;
    const [rows] = await connection.query(query, [MaGiangDay]);
    const MaGiangDayNguon = rows[0].MaGiangDayNguon;
    const Table = rows[0].Nguon;
    if (Table === "lopngoaiquychuan") {
      const query = `DELETE FROM lopngoaiquychuan WHERE MaGiangDay = ?`;
      await connection.query(query, [MaGiangDayNguon]);
      const query2 = `DELETE FROM giuaky WHERE MaGiangDay = ?`;
      await connection.query(query2, [MaGiangDay]);
    } else {
      const query1 = `UPDATE giangday SET DaChon = 0, GiangVienCoiGK = NULL, KhoaDuyet = 0 WHERE MaGiangDay = ?`;
      await connection.query(query1, [MaGiangDayNguon]);
      const query2 = `DELETE FROM giuaky WHERE MaGiangDay = ?`;
      await connection.query(query2, [MaGiangDay]);
    }
    res.status(200).send({ message: "Cập nhật thành công" }); // Phản hồi thành công
  } catch (error) {
    console.error("Lỗi: ", error);
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const getLopNgoaiQuyChuan = async (req, res) => {
  const MaPhongBan = req.params.MaPhongBan;
  const { Nam } = req.params;
  console.log(MaPhongBan, Nam);
  let connection;
  try {
    connection = await createPoolConnection();
    if (MaPhongBan === "DAOTAO" || MaPhongBan === "TAICHINH") {
      const query = `SELECT * FROM lopngoaiquychuan WHERE NamHoc = ?`;
      const [rows] = await connection.query(query, [Nam]);
      res.json({
        success: true,
        maBoMon: rows,
      });
    } else {
      const query = `SELECT * FROM lopngoaiquychuan WHERE Khoa = ? AND NamHoc = ?`;
      const [rows] = await connection.query(query, [MaPhongBan, Nam]);
      res.json({
        success: true,
        maBoMon: rows,
      });
    }
  } catch (error) {
    console.error("Lỗi: ", error);
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};
const updateDuyet = async (req, res) => {
  const { MaGiangDay, KhoaDuyet, daoTaoDuyet, MaPhongBan } = req.body;
  let connection;
  try {
    connection = await createPoolConnection();
    const query = `SELECT * FROM giuaky WHERE MaGiangDay = ?`;
    const [rows] = await connection.query(query, [MaGiangDay]);
    const MaGiangDayNguon = rows[0].MaGiangDayNguon;
    const Table = rows[0].Nguon;
    if (MaPhongBan === "DAOTAO") {
      if (Table === "lopngoaiquychuan") {
        const query1 = `UPDATE lopngoaiquychuan SET KhoaDuyet = ?, DaoTaoDuyet = ? WHERE MaGiangDay = ?`;
        await connection.query(query1, [
          KhoaDuyet,
          daoTaoDuyet,
          MaGiangDayNguon,
        ]);
        const query2 = `UPDATE giuaky SET KhoaDuyet = ?, DaoTaoDuyet = ? WHERE MaGiangDay = ?`;
        await connection.query(query2, [KhoaDuyet, daoTaoDuyet, MaGiangDay]);
      } else {
        const query1 = `UPDATE giuaky SET KhoaDuyet = ?, DaoTaoDuyet = ? WHERE MaGiangDay = ?`;
        await connection.query(query1, [KhoaDuyet, daoTaoDuyet, MaGiangDay]);
      }
    }
    if (MaPhongBan === "TAICHINH") {
      if (Table === "lopngoaiquychuan") {
        const query1 = `UPDATE lopngoaiquychuan SET DaoTaoDuyet = ?, TaiChinhDuyet = ? WHERE MaGiangDay = ?`;
        await connection.query(query1, [
          KhoaDuyet,
          daoTaoDuyet,
          MaGiangDayNguon,
        ]);
        const query2 = `UPDATE giuaky SET DaoTaoDuyet = ?, TaiChinhDuyet = ? WHERE MaGiangDay = ?`;
        await connection.query(query2, [KhoaDuyet, daoTaoDuyet, MaGiangDay]);
      } else {
        const query1 = `UPDATE giuaky SET DaoTaoDuyet = ?, TaiChinhDuyet = ? WHERE MaGiangDay = ?`;
        await connection.query(query1, [KhoaDuyet, daoTaoDuyet, MaGiangDay]);
      }
    }
    res.status(200).send({ message: "Cập nhật thành công" }); // Phản hồi thành công
  } catch (error) {
    console.error("Lỗi: ", error);
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};
const deletelopngoaiquychuan = async (req, res) => {
  const { MaGiangDay } = req.body;
  let connection;
  try {
    connection = await createPoolConnection();
    const query = `SELECT * FROM lopngoaiquychuan WHERE MaGiangDay = ?`;
    const [rows] = await connection.query(query, [MaGiangDay]);
    const result = rows[0];

    const query1 = `DELETE FROM lopngoaiquychuan WHERE MaGiangDay = ?`;
    await connection.query(query1, [MaGiangDay]);

    const query2 = `DELETE FROM giuaky WHERE TenHocPhan = ? AND id_User = ? AND HocKy = ? AND NamHoc = ? AND Lop = ?`;
    await connection.query(query2, [
      result.TenHocPhan,
      result.id_User,
      result.HocKy,
      result.NamHoc,
      result.Lop,
    ]);
    res.json({
      success: true,
    });
  } catch (error) {
    console.error("Lỗi: ", error);
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};
const updatelopngoaiquychuan = async (req, res) => {
  const globalData = req.body; // Lấy dữ liệu từ client gửi đến
  if (!globalData || globalData.length === 0) {
    return res.status(400).json({ message: "Không có dữ liệu để cập nhật." });
  }

  // Tạo kết nối tới database MySQL
  const connection = await createPoolConnection();

  try {
    // Duyệt qua mỗi phần tử trong globalData và cập nhật vào bảng giangday
    for (let data of globalData) {
      const {
        tenHocPhan,
        soTC,
        maLop,
        soSV,
        soTietTKB,
        soTietQC,
        hinhThucKTGiuaKy,
        heSoT7CN,
        he_dao_tao,
        MaGiangDay,
      } = data;
      console.log(data);

      let SoTietKT = 0;
      let SoDe = 0,
        HeSoLopDong = 0;
      if (soSV >= 41 && soSV <= 50) {
        HeSoLopDong = 1.1;
        SoDe = 3;
      } else if (soSV >= 51 && soSV <= 65) {
        HeSoLopDong = 1.2;
        SoDe = 3;
      } else if (soSV >= 66 && soSV <= 80) {
        HeSoLopDong = 1.3;
        SoDe = 3;
      } else if (soSV >= 81 && soSV <= 100) {
        HeSoLopDong = 1.4;
        SoDe = 4;
      } else if (soSV >= 101) {
        HeSoLopDong = 1.5;
        SoDe = 4;
      } else {
        HeSoLopDong = 1; // Giá trị mặc định nếu không nằm trong khoảng
        SoDe = 2;
      }

      if (hinhThucKTGiuaKy === "none") {
        SoTietKT = 0;
      } else if (
        hinhThucKTGiuaKy === "Coi, chấm TN" ||
        hinhThucKTGiuaKy === "Coi, chấm viết"
      ) {
        let number = heSoT7CN * (0.05 * soSV + 2);
        SoTietKT = parseFloat(number.toFixed(2));
      } else if (
        hinhThucKTGiuaKy === "Coi, chấm VĐ" ||
        hinhThucKTGiuaKy === "Coi, chấm TH"
      ) {
        let number = heSoT7CN * (0.125 * soSV + 2);
        SoTietKT = parseFloat(number.toFixed(2));
      }

      // Chuẩn bị mảng dữ liệu cho câu lệnh INSERT
      let valuesToInsert = [
        tenHocPhan,
        heSoT7CN,
        soSV,
        soTietTKB,
        soTietQC,
        HeSoLopDong,
        hinhThucKTGiuaKy,
        SoTietKT,
        maLop,
        SoDe,
        soTC,
        he_dao_tao,
        MaGiangDay,
      ];

      // Câu lệnh Update vào bảng giuaky
      const query2 = `
                UPDATE lopngoaiquychuan SET TenHocPhan = ?, HeSoT7CN = ?, SoSV = ?, LenLop =?, QuyChuan = ?, HeSoLopDong = ?, HinhThucKTGiuaKy = ?, SoTietKT = ?, Lop = ?, SoDe = ?, SoTC = ?, he_dao_tao = ?
                WHERE MaGiangDay = ? 
            `;

      // Thực hiện câu lệnh Update
      await connection.query(query2, valuesToInsert);

      const query1 = `
                UPDATE giuaky SET TenHocPhan = ?, HeSoT7CN = ?, SoSV = ?, HinhThucKTGiuaKy = ?, SoTietKT = ?, Lop = ?, SoDe = ?, he_dao_tao = ?
                WHERE MaGiangDayNguon = ? AND Nguon = "lopngoaiquychuan"
            `;

      // Thực hiện câu lệnh INSERT
      await connection.query(query1, [
        tenHocPhan,
        heSoT7CN,
        soSV,
        hinhThucKTGiuaKy,
        SoTietKT,
        maLop,
        SoDe,
        he_dao_tao,
        MaGiangDay,
      ]);
    }

    // Gửi phản hồi thành công
    res.status(200).json({ message: "Cập nhật thành công" }); // Phản hồi thành công
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu:", error);
    res.status(500).json({ message: "Có lỗi xảy ra khi cập nhật dữ liệu." });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// hàm gốc
// const getLopGiangDay = async (req, res) => {
//     const { Nam, MaPhongBan } = req.params;
//     console.log(Nam, MaPhongBan);
//     let connection

//     try {
//         connection = await createPoolConnection();
//         console.log(Nam, MaPhongBan);
//         const query = `
//         SELECT MaGiangDay, TenHocPhan, GiangVien, SoTC, Lop, LenLop, QuyChuan, 'Lớp quy chuẩn' AS source
//         FROM giangday
//         WHERE Khoa = ? AND HocKy = ? AND he_dao_tao LIKE ? AND NamHoc = ?
//         UNION ALL
//         SELECT MaGiangDay, TenHocPhan, GiangVien, SoTC, Lop, LenLop, QuyChuan, 'Lớp ngoài quy chuẩn' AS source
//         FROM lopngoaiquychuan
//         WHERE Khoa = ? AND HocKy = ? AND he_dao_tao LIKE ? AND NamHoc = ?`;

//         const [rows11] = await connection.query(query, [MaPhongBan, 1, "Mật mã", Nam, MaPhongBan, 1, "Mật mã", Nam]);
//         const [rows12] = await connection.query(query, [MaPhongBan, 1, "Đóng học phí", Nam, MaPhongBan, 1, "Đóng học phí", Nam]);
//         const [rows13] = await connection.query(query, [MaPhongBan, 2, "Mật mã", Nam, MaPhongBan, 2, "Mật mã", Nam]);
//         const [rows14] = await connection.query(query, [MaPhongBan, 2, "Đóng học phí", Nam, MaPhongBan, 2, "Mật mã", Nam]);
//         const query1 = `SELECT * FROM giuaky WHERE Khoa = ? AND HocKy = ? AND he_dao_tao = ? AND NamHoc = ?`;
//         const [rows21] = await connection.query(query1, [MaPhongBan, 1, "Mật mã", Nam]);
//         const [rows22] = await connection.query(query1, [MaPhongBan, 1, "Đóng học phí", Nam]);
//         const [rows23] = await connection.query(query1, [MaPhongBan, 2, "Mật mã", Nam]);
//         const [rows24] = await connection.query(query1, [MaPhongBan, 2, "Đóng học phí", Nam]);
//         res.json({
//             success: true,
//             rows11: rows11,
//             rows12: rows12,
//             rows13: rows13,
//             rows14: rows14,
//             rows21: rows21,
//             rows22: rows22,
//             rows23: rows23,
//             rows24: rows24,
//         });
//     } catch (error) {
//         console.error("Lỗi: ", error);
//         res.status(500).send("Đã có lỗi xảy ra");
//     } finally {
//         if (connection) connection.release(); // hoặc connection.end();
//     }
// };

// hàm sửa
const getLopGiangDay = async (req, res) => {
  const { Nam, MaPhongBan, TenNhanVien } = req.params;
  console.log(Nam, MaPhongBan, TenNhanVien);
  let connection;

  try {
    connection = await createPoolConnection();

    // Truy vấn kết hợp giangday và lopngoaiquychuan
    const query = `
            SELECT MaGiangDay, TenHocPhan, GiangVien, SoTC, Lop, LenLop, QuyChuan, 'Lớp quy chuẩn' AS source 
            FROM giangday 
            WHERE TRIM(GiangVien) = TRIM(?) AND HocKy = ? AND he_dao_tao LIKE ? AND NamHoc = ?
            UNION ALL
            SELECT MaGiangDay, TenHocPhan, GiangVien, SoTC, Lop, LenLop, QuyChuan, 'Lớp ngoài quy chuẩn' AS source 
            FROM lopngoaiquychuan 
            WHERE TRIM(GiangVien) = TRIM(?) AND HocKy = ? AND he_dao_tao LIKE ? AND NamHoc = ?`;

    // Truy vấn giuaky
    const query1 = `
            SELECT * 
            FROM giuaky 
            WHERE TRIM(GiangVien) = TRIM(?) AND HocKy = ? AND he_dao_tao LIKE ? AND NamHoc = ?`;

    // Tạo các mảng kết quả giống mã cũ
    const [rows11] = await connection.query(query, [
      TenNhanVien,
      1,
      "%Mật mã%",
      Nam,
      TenNhanVien,
      1,
      "%Mật mã%",
      Nam,
    ]);
    const [rows12] = await connection.query(query, [
      TenNhanVien,
      1,
      "%Đóng học phí%",
      Nam,
      TenNhanVien,
      1,
      "%Đóng học phí%",
      Nam,
    ]);
    const [rows13] = await connection.query(query, [
      TenNhanVien,
      2,
      "%Mật mã%",
      Nam,
      TenNhanVien,
      2,
      "%Mật mã%",
      Nam,
    ]);
    const [rows14] = await connection.query(query, [
      TenNhanVien,
      2,
      "%Đóng học phí%",
      Nam,
      TenNhanVien,
      2,
      "%Đóng học phí%",
      Nam,
    ]);

    const [rows21] = await connection.query(query1, [
      TenNhanVien,
      1,
      "%Mật mã%",
      Nam,
    ]);
    const [rows22] = await connection.query(query1, [
      TenNhanVien,
      1,
      "%Đóng học phí%",
      Nam,
    ]);
    const [rows23] = await connection.query(query1, [
      TenNhanVien,
      2,
      "%Mật mã%",
      Nam,
    ]);
    const [rows24] = await connection.query(query1, [
      TenNhanVien,
      2,
      "%Đóng học phí%",
      Nam,
    ]);

    // console.log(rows12);
    // Trả về kết quả giống cấu trúc cũ
    res.json({
      success: true,
      rows11: rows11,
      rows12: rows12,
      rows13: rows13,
      rows14: rows14,
      rows21: rows21,
      rows22: rows22,
      rows23: rows23,
      rows24: rows24,
    });
  } catch (error) {
    console.error("Lỗi: ", error);
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const getTTVuotGio = async (req, res) => {
  const { Nam, MaPhongBan, TenNhanVien } = req.params;
  console.log(Nam, MaPhongBan, TenNhanVien);
  // Tách năm thành hai phần và chuyển thành số
  const [start, end] = Nam.split(" - ").map(Number);

  // Trừ đi 1 cho mỗi năm
  const previousNam = `${start - 1} - ${end - 1}`;

  console.log(previousNam); // Ví dụ: "2024 - 2025" -> "2023 - 2024"
  let connection;

  try {
    connection = await createPoolConnection();

    // Truy vấn kết hợp giangday và lopngoaiquychuan
    const query = `
            SELECT MaGiangDay, TenHocPhan, GiangVien, SoTC, Lop, LenLop, QuyChuan, 'Lớp quy chuẩn' AS source 
            FROM giangday 
            WHERE TRIM(GiangVien) = TRIM(?) AND HocKy = ? AND he_dao_tao LIKE ? AND NamHoc = ?
            UNION ALL
            SELECT MaGiangDay, TenHocPhan, GiangVien, SoTC, Lop, LenLop, QuyChuan, 'Lớp ngoài quy chuẩn' AS source 
            FROM lopngoaiquychuan 
            WHERE TRIM(GiangVien) = TRIM(?) AND HocKy = ? AND he_dao_tao LIKE ? AND NamHoc = ?`;

    // Truy vấn giuaky
    const query1 = `
            SELECT * 
            FROM giuaky 
            WHERE TRIM(GiangVien) = TRIM(?) AND HocKy = ? AND he_dao_tao LIKE ? AND NamHoc = ?`;

    // Tạo các mảng kết quả giống mã cũ
    const [rows11] = await connection.query(query, [
      TenNhanVien,
      1,
      "%Mật mã%",
      Nam,
      TenNhanVien,
      1,
      "%Mật mã%",
      Nam,
    ]);
    const [rows12] = await connection.query(query, [
      TenNhanVien,
      1,
      "%Đóng học phí%",
      Nam,
      TenNhanVien,
      1,
      "%Đóng học phí%",
      Nam,
    ]);
    const [rows13] = await connection.query(query, [
      TenNhanVien,
      2,
      "%Mật mã%",
      Nam,
      TenNhanVien,
      2,
      "%Mật mã%",
      Nam,
    ]);
    const [rows14] = await connection.query(query, [
      TenNhanVien,
      2,
      "%Đóng học phí%",
      Nam,
      TenNhanVien,
      2,
      "%Đóng học phí%",
      Nam,
    ]);

    const [rows21] = await connection.query(query1, [
      TenNhanVien,
      1,
      "%Mật mã%",
      Nam,
    ]);
    const [rows22] = await connection.query(query1, [
      TenNhanVien,
      1,
      "%Đóng học phí%",
      Nam,
    ]);
    const [rows23] = await connection.query(query1, [
      TenNhanVien,
      2,
      "%Mật mã%",
      Nam,
    ]);
    const [rows24] = await connection.query(query1, [
      TenNhanVien,
      2,
      "%Đóng học phí%",
      Nam,
    ]);
    const queryB = `
        SELECT *, 
            CASE 
                WHEN TRIM(GiangVien1Real) = TRIM(?) THEN 'HD chính'
                WHEN TRIM(GiangVien2Real) = TRIM(?) THEN 'HD hai'
            END AS VaiTro
        FROM doantotnghiep 
        WHERE (TRIM(GiangVien1Real) = TRIM(?) OR TRIM(GiangVien2Real) = TRIM(?)) 
          AND NamHoc = ?
        `;

    const [rowsB] = await connection.query(queryB, [TenNhanVien, TenNhanVien, TenNhanVien, TenNhanVien, Nam]);
    const cleanTenNhanVien = TenNhanVien.replace(/\s+/g, ' ').trim();
    const queryC1 = `SELECT *, 
            CASE 
                WHEN TRIM(ChuNhiem) LIKE ? THEN 'Chủ nhiệm'
                WHEN TRIM(ThuKy) LIKE ? THEN 'Thư ký'
                WHEN TRIM(DanhSachThanhVien) LIKE ? THEN 'Thành viên'
            END AS VaiTro
        FROM detaiduan 
        WHERE (TRIM(ChuNhiem) LIKE ? OR TRIM(ThuKy) LIKE ? OR TRIM(DanhSachThanhVien) LIKE ?) 
          AND NamHoc = ?`;

    const [rowsC1] = await connection.query(queryC1, [
        `%${cleanTenNhanVien}%`, // Thêm `%` để tìm chuỗi chứa
        `%${cleanTenNhanVien}%`,
        `%${cleanTenNhanVien}%`,
        `%${cleanTenNhanVien}%`,
        `%${cleanTenNhanVien}%`,
        `%${cleanTenNhanVien}%`,
        Nam
    ]);
    const queryC2 = `SELECT *, 
            CASE 
                WHEN TRIM(TacGia) LIKE ? THEN 'Tác giả chính'
                WHEN TRIM(TacGiaChiuTrachNhiem) LIKE ? THEN 'Tác giả'
                WHEN TRIM(DanhSachThanhVien) LIKE ? THEN 'Thành viên'
            END AS VaiTro
        FROM baibaokhoahoc 
        WHERE (TRIM(TacGia) LIKE ? OR TRIM(TacGiaChiuTrachNhiem) LIKE ? OR TRIM(DanhSachThanhVien) LIKE ?) 
          AND NamHoc = ?`;

    const [rowsC2] = await connection.query(queryC2, [
        `%${cleanTenNhanVien}%`, // Thêm `%` để tìm chuỗi chứa
        `%${cleanTenNhanVien}%`,
        `%${cleanTenNhanVien}%`,
        `%${cleanTenNhanVien}%`,
        `%${cleanTenNhanVien}%`,
        `%${cleanTenNhanVien}%`,
        Nam
    ]);
    const queryC3 = `SELECT *, 
            CASE 
                WHEN TRIM(TacGia) LIKE ? THEN 'Tác giả chính'
                WHEN TRIM(DanhSachThanhVien) LIKE ? THEN 'Thành viên'
            END AS VaiTro
        FROM bangsangchevagiaithuong 
        WHERE (TRIM(TacGia) LIKE ? OR TRIM(DanhSachThanhVien) LIKE ?) 
          AND NamHoc = ?`;

    const [rowsC3] = await connection.query(queryC3, [
        `%${cleanTenNhanVien}%`, // Thêm `%` để tìm chuỗi chứa
        `%${cleanTenNhanVien}%`,
        `%${cleanTenNhanVien}%`,
        `%${cleanTenNhanVien}%`,
        Nam
    ]);
    const queryC4 = `SELECT *, 
            CASE 
                WHEN TRIM(TacGia) LIKE ? THEN 'Tác giả chính'
                WHEN TRIM(DongChuBien) LIKE ? THEN 'Đồng chủ biên'
                WHEN TRIM(DanhSachThanhVien) LIKE ? THEN 'Thành viên'
            END AS VaiTro
        FROM sachvagiaotrinh 
        WHERE (TRIM(TacGia) LIKE ? OR TRIM(DongChuBien) LIKE ? OR TRIM(DanhSachThanhVien) LIKE ?) 
          AND NamHoc = ?`;

    const [rowsC4] = await connection.query(queryC4, [
        `%${cleanTenNhanVien}%`, // Thêm `%` để tìm chuỗi chứa
        `%${cleanTenNhanVien}%`,
        `%${cleanTenNhanVien}%`,
        `%${cleanTenNhanVien}%`,
        `%${cleanTenNhanVien}%`,
        `%${cleanTenNhanVien}%`,
        Nam
    ]);
    const queryC5 = `SELECT * 
                      FROM nckhvahuanluyendoituyen 
                      WHERE TRIM(DanhSachThanhVien) LIKE ?
                      AND NamHoc = ?`;

    const [rowsC5] = await connection.query(queryC5, [
        `%${cleanTenNhanVien}%`,
        Nam
    ]);
    const queryC6 = `SELECT * 
                      FROM xaydungctdt 
                      WHERE TRIM(DanhSachThanhVien) LIKE ?
                      AND NamHoc = ?;`;

    const [rowsC6] = await connection.query(queryC6, [
        `%${cleanTenNhanVien}%`,
        Nam
    ]);
    const queryC7 = `SELECT *, 
            CASE 
                WHEN TRIM(TacGia) LIKE ? THEN 'Tác giả chính'
                WHEN TRIM(DanhSachThanhVien) LIKE ? THEN 'Thành viên'
            END AS VaiTro
        FROM biensoangiaotrinhbaigiang 
        WHERE (TRIM(TacGia) LIKE ? OR TRIM(DanhSachThanhVien) LIKE ?) 
          AND NamHoc = ?`;

    const [rowsC7] = await connection.query(queryC7, [
        `%${cleanTenNhanVien}%`, // Thêm `%` để tìm chuỗi chứa
        `%${cleanTenNhanVien}%`,
        `%${cleanTenNhanVien}%`,
        `%${cleanTenNhanVien}%`,
        Nam
    ]);
    // const queryC8 = `SELECT *, 
    //         CASE 
    //             WHEN TRIM(TacGia) LIKE ? THEN 'Tác giả chính'
    //             WHEN TRIM(DongChuBien) LIKE ? THEN 'Đồng chủ biên'
    //             WHEN TRIM(DanhSachThanhVien) LIKE ? THEN 'Thành viên'
    //         END AS VaiTro
    //     FROM sachvagiaotrinh 
    //     WHERE (TRIM(TacGia) LIKE ? OR TRIM(DongChuBien) LIKE ? OR TRIM(DanhSachThanhVien) LIKE ?) 
    //       AND NamHoc = ?`;

    // const [rowsC8] = await connection.query(queryC8, [
    //     `%${cleanTenNhanVien}%`, // Thêm `%` để tìm chuỗi chứa
    //     `%${cleanTenNhanVien}%`,
    //     `%${cleanTenNhanVien}%`,
    //     `%${cleanTenNhanVien}%`,
    //     `%${cleanTenNhanVien}%`,
    //     `%${cleanTenNhanVien}%`,
    //     Nam
    // ]);
    const queryC9 = `SELECT *FROM nhiemvukhoahocvacongnghe 
                      WHERE TRIM(GiangVien) LIKE ? AND NamHoc = ?`;

    const [rowsC9] = await connection.query(queryC9, [
        `%${cleanTenNhanVien}%`,
        previousNam
    ]);
    const [rowsF] = await connection.query(queryC9, [
        `%${cleanTenNhanVien}%`,
        Nam
    ]);
    // Trả về kết quả giống cấu trúc cũ
    res.json({
      success: true,
      rows11: rows11,
      rows12: rows12,
      rows13: rows13,
      rows14: rows14,
      rows21: rows21,
      rows22: rows22,
      rows23: rows23,
      rows24: rows24,
      rowsB: rowsB,
      rowsC1: rowsC1,
      rowsC2: rowsC2,
      rowsC3: rowsC3,
      rowsC4: rowsC4,
      rowsC5: rowsC5,
      rowsC6: rowsC6,
      rowsC7: rowsC7,
      rowsC9: rowsC9,
      rowsF: rowsF,
    });
  } catch (error) {
    console.error("Lỗi: ", error);
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

module.exports = {
  addClass,
  getLopGiuaKi,
  SaveNote,
  DoneNote,
  updateLopThiGk,
  getLopGK,
  updateKhoaDuyet,
  deleteLopGK,
  getLopNgoaiQuyChuan,
  updateDuyet,
  deletelopngoaiquychuan,
  updatelopngoaiquychuan,
  getLopGiangDay,
  SaveNoteAddClass,
  DoneNoteAddClass,
  SaveNoteDuyet,
  DoneNoteDuyet,
  getTTVuotGio,
};
