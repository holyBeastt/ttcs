const createConnection = require("../config/databasePool");

const adminPhongHocController = {
  showPhongHocPage: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const query = "SELECT STT, phong as Phong, toanha as ToaNha, loaiphong as LoaiPhong FROM phonghoc ORDER BY phong ASC";
      const [results] = await connection.query(query);
      console.log("Dữ liệu phòng học:", results);
      res.render("adminPhongHoc", { phonghoc: results });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
      res.status(500).send("Lỗi hệ thống");
    } finally {
      if (connection) connection.release();
    }
  },

  addPhongHoc: async (req, res) => {
    const { Phong, ToaNha, LoaiPhong } = req.body;
    let connection;
    try {
      connection = await createConnection();
      const query = "INSERT INTO phonghoc (phong, toanha, loaiphong) VALUES (?, ?, ?)";
      await connection.query(query, [Phong, ToaNha, LoaiPhong]);
      res.json({ success: true, message: "Thêm phòng học thành công" });
    } catch (error) {
      console.error("Lỗi khi thêm phòng học:", error);
      res.status(500).json({ success: false, message: "Lỗi khi thêm phòng học" });
    } finally {
      if (connection) connection.release();
    }
  },

  updatePhongHoc: async (req, res) => {
    const { STT } = req.params;
    const { Phong, ToaNha, LoaiPhong } = req.body;
    let connection;
    try {
      connection = await createConnection();
      const query = "UPDATE phonghoc SET phong = ?, toanha = ?, loaiphong = ? WHERE STT = ?";
      await connection.query(query, [Phong, ToaNha, LoaiPhong, STT]);
      res.json({ success: true, message: "Cập nhật phòng học thành công" });
    } catch (error) {
      console.error("Lỗi khi cập nhật phòng học:", error);
      res.status(500).json({ success: false, message: "Lỗi khi cập nhật phòng học" });
    } finally {
      if (connection) connection.release();
    }
  },

  deletePhongHoc: async (req, res) => {
    const { STT } = req.params;
    let connection;
    try {
      connection = await createConnection();
      const query = "DELETE FROM phonghoc WHERE STT = ?";
      await connection.query(query, [STT]);
      res.json({ success: true, message: "Xóa phòng học thành công" });
    } catch (error) {
      console.error("Lỗi khi xóa phòng học:", error);
      res.status(500).json({ success: false, message: "Lỗi khi xóa phòng học" });
    } finally {
      if (connection) connection.release();
    }
  },

  checkPhongExistence: async (req, res) => {
    const { Phong } = req.body;
    let connection;
    try {
      connection = await createConnection();
      const query = "SELECT * FROM phonghoc WHERE phong = ?";
      const [results] = await connection.query(query, [Phong]);
      if (results.length > 0) {
        res.status(409).json({ message: "Phòng học này đã tồn tại!" });
      } else {
        res.json({ exists: false });
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra phòng học:", error);
      res.status(500).json({ message: "Lỗi khi kiểm tra phòng học" });
    } finally {
      if (connection) connection.release();
    }
  }
};

module.exports = adminPhongHocController;
