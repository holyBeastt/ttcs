const createConnection = require("../config/databasePool");

// Thêm hàm mới để kiểm tra số tầng
const checkFloorValidity = async (connection, phong, toaNha) => {
  // Lấy số tầng của phòng (chữ số đầu tiên)
  const floor = Math.floor(parseInt(phong) / 100);
  
  // Lấy số tầng của tòa nhà từ database
  const query = "SELECT SoTang FROM toanha WHERE TenToaNha = ?";
  const [results] = await connection.query(query, [toaNha]);
  
  if (results.length === 0) {
    throw new Error("Không tìm thấy thông tin tòa nhà");
  }
  
  const maxFloor = results[0].SoTang;
  
  if (floor > maxFloor) {
    throw new Error(`Tòa ${toaNha} chỉ có ${maxFloor} tầng. Không thể thêm phòng ở tầng ${floor}`);
  }
  
  return true;
};

const adminPhongHocController = {
  showPhongHocPage: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      // Sửa câu query để sắp xếp theo toanha trước, sau đó đến phong
      const phongQuery = `
        SELECT STT, phong as Phong, toanha as ToaNha, loaiphong as LoaiPhong, GhiChu 
        FROM phonghoc 
        ORDER BY toanha ASC, CAST(phong AS UNSIGNED) ASC
      `;
      const toaNhaQuery = "SELECT TenToaNha FROM toanha ORDER BY TenToaNha ASC";
      
      const [phongResults] = await connection.query(phongQuery);
      const [toaNhaResults] = await connection.query(toaNhaQuery);
      
      res.render("adminPhongHoc", { 
        phonghoc: phongResults,
        danhSachToaNha: toaNhaResults
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
      res.status(500).send("Lỗi hệ thống");
    } finally {
      if (connection) connection.release();
    }
  },

  addPhongHoc: async (req, res) => {
    const { Phong, ToaNha, LoaiPhong, GhiChu } = req.body;
    let connection;
    try {
      connection = await createConnection();
      
      // Kiểm tra số tầng trước khi thêm
      await checkFloorValidity(connection, Phong, ToaNha);
      
      const query = "INSERT INTO phonghoc (phong, toanha, loaiphong, GhiChu) VALUES (?, ?, ?, ?)";
      await connection.query(query, [Phong, ToaNha, LoaiPhong, GhiChu]);
      res.json({ success: true, message: "Thêm phòng học thành công" });
    } catch (error) {
      console.error("Lỗi khi thêm phòng học:", error);
      res.status(400).json({ success: false, message: error.message });
    } finally {
      if (connection) connection.release();
    }
  },

  updatePhongHoc: async (req, res) => {
    const { STT } = req.params;
    const { Phong, ToaNha, LoaiPhong, GhiChu } = req.body;
    let connection;
    try {
      connection = await createConnection();
      
      // Kiểm tra số tầng trước khi cập nhật
      await checkFloorValidity(connection, Phong, ToaNha);
      
      const query = "UPDATE phonghoc SET phong = ?, toanha = ?, loaiphong = ?, GhiChu = ? WHERE STT = ?";
      await connection.query(query, [Phong, ToaNha, LoaiPhong, GhiChu, STT]);
      res.json({ success: true, message: "Cập nhật phòng học thành công" });
    } catch (error) {
      console.error("Lỗi khi cập nhật phòng học:", error);
      res.status(400).json({ success: false, message: error.message });
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
    const { Phong, ToaNha } = req.body;
    let connection;
    try {
      connection = await createConnection();
      const query = "SELECT * FROM phonghoc WHERE phong = ? AND toanha = ?";
      const [results] = await connection.query(query, [Phong, ToaNha]);
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
  },

  showToaNhaPage: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const query = "SELECT * FROM toanha ORDER BY STT ASC";
      const [results] = await connection.query(query);
      res.render("toaNha", { toanha: results });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu tòa nhà:", error);
      res.status(500).send("Lỗi hệ thống");
    } finally {
      if (connection) connection.release();
    }
  },

  addToaNha: async (req, res) => {
    const { TenToaNha, SoTang, GhiChu } = req.body;
    let connection;
    try {
      connection = await createConnection();
      const query = "INSERT INTO toanha (TenToaNha, SoTang, GhiChu) VALUES (?, ?, ?)";
      await connection.query(query, [TenToaNha, SoTang, GhiChu]);
      res.json({ success: true, message: "Thêm tòa nhà thành công" });
    } catch (error) {
      console.error("Lỗi khi thêm tòa nhà:", error);
      res.status(500).json({ success: false, message: "Lỗi khi thêm tòa nhà" });
    } finally {
      if (connection) connection.release();
    }
  },

  updateToaNha: async (req, res) => {
    const { STT } = req.params;
    const { TenToaNha, SoTang, GhiChu } = req.body;
    let connection;
    try {
      connection = await createConnection();
      console.log('Updating toanha:', { STT, TenToaNha, SoTang, GhiChu });
      const query = "UPDATE toanha SET TenToaNha = ?, SoTang = ?, GhiChu = ? WHERE STT = ?";
      const [result] = await connection.query(query, [TenToaNha, SoTang, GhiChu, STT]);
      console.log('Update result:', result);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Không tìm thấy tòa nhà để cập nhật" });
      }
      res.json({ success: true, message: "Cập nhật tòa nhà thành công" });
    } catch (error) {
      console.error("Lỗi khi cập nhật tòa nhà:", error);
      res.status(500).json({ success: false, message: "Lỗi khi cập nhật tòa nhà" });
    } finally {
      if (connection) connection.release();
    }
  },

  deleteToaNha: async (req, res) => {
    const { STT } = req.params;
    let connection;
    try {
      connection = await createConnection();
      console.log('Deleting toanha:', { STT });
      const query = "DELETE FROM toanha WHERE STT = ?";
      const [result] = await connection.query(query, [STT]);
      console.log('Delete result:', result);

      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: "Không tìm thấy tòa nhà để xóa" });
      }
      res.json({ success: true, message: "Xóa tòa nhà thành công" });
    } catch (error) {
      console.error("Lỗi khi xóa tòa nhà:", error);
      res.status(500).json({ success: false, message: "Lỗi khi xóa tòa nhà" });
    } finally {
      if (connection) connection.release();
    }
  },

  checkToaNhaExistence: async (req, res) => {
    const { TenToaNha } = req.body;
    let connection;
    try {
      connection = await createConnection();
      const query = "SELECT * FROM toanha WHERE TenToaNha = ?";
      const [results] = await connection.query(query, [TenToaNha]);
      if (results.length > 0) {
        res.status(409).json({ message: "Tòa nhà này đã tồn tại!" });
      } else {
        res.json({ exists: false });
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra tòa nhà:", error);
      res.status(500).json({ message: "Lỗi khi kiểm tra tòa nhà" });
    } finally {
      if (connection) connection.release();
    }
  }
};

module.exports = adminPhongHocController;
