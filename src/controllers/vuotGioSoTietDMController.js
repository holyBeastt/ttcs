const createPoolConnection = require("../config/databasePool");

// Controller cho trang soTietDM
const renderSoTietDM = async (req, res) => {
  const pool = await createPoolConnection();
  try {
    // Lấy dữ liệu hiện tại
    const [rows] = await pool.execute(
      "SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu, VuotGio, NCKH FROM sotietdinhmuc LIMIT 1"
    );
    res.render("vuotGioSoTietDM.ejs", {
      currentData: rows[0] || { GiangDay: 0, GiangDayChuaNghiHuu: 280, GiangDayDaNghiHuu: 560, VuotGio: 0, NCKH: 0 },
    });
  } catch (error) {
    console.error("Lỗi khi render trang soTietDM:", error);
    res.status(500).send("Có lỗi xảy ra khi tải trang. Vui lòng thử lại sau.");
  } finally {
    if (pool) pool.release();
  }
};

// Controller cập nhật số tiết định mức
const updateSoTietDM = async (req, res) => {
  const pool = await createPoolConnection();
  try {
    const { soTietDaoTaoChuaNghiHuu, soTietDaoTaoDaNghiHuu, soTietVuotGio, soTietNCKH } = req.body;

    // Validate input
    if (!soTietDaoTaoChuaNghiHuu || !soTietDaoTaoDaNghiHuu || !soTietVuotGio || !soTietNCKH) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin",
      });
    }

    // Lấy dữ liệu cũ để so sánh thay đổi
    const [oldRecords] = await pool.execute(
      "SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu, VuotGio, NCKH FROM sotietdinhmuc LIMIT 1"
    );
    const oldData = oldRecords.length > 0 ? oldRecords[0] : null;

    // Kiểm tra xem đã có dữ liệu chưa
    const [existingRows] = await pool.execute(
      "SELECT COUNT(*) as count FROM sotietdinhmuc"
    );

    let isInsert = false;
    if (existingRows[0].count === 0) {
      // Nếu chưa có dữ liệu, thêm mới
      await pool.execute(
        "INSERT INTO sotietdinhmuc (GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu, VuotGio, NCKH) VALUES (?, ?, ?, ?, ?)",
        [soTietDaoTaoChuaNghiHuu, soTietDaoTaoChuaNghiHuu, soTietDaoTaoDaNghiHuu, soTietVuotGio, soTietNCKH]
      );
      isInsert = true;
    } else {
      // Nếu đã có dữ liệu, cập nhật
      await pool.execute(
        "UPDATE sotietdinhmuc SET GiangDay = ?, GiangDayChuaNghiHuu = ?, GiangDayDaNghiHuu = ?, VuotGio = ?, NCKH = ?",
        [soTietDaoTaoChuaNghiHuu, soTietDaoTaoChuaNghiHuu, soTietDaoTaoDaNghiHuu, soTietVuotGio, soTietNCKH]
      );
    }

    // Ghi log
    const logQuery = `
      INSERT INTO lichsunhaplieu 
      (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    
    const userId = 1;
    const tenNhanVien = 'ADMIN';
    const khoa = 'DAOTAO';
    const loaiThongTin = 'Admin Log';
    
    let noiDungThayDoi;
    if (isInsert) {
      // Ghi log thêm mới
      noiDungThayDoi = `Admin thêm số tiết định mức: Giảng dạy (Chưa nghỉ hưu) ${soTietDaoTaoChuaNghiHuu}, Giảng dạy (Đã nghỉ hưu) ${soTietDaoTaoDaNghiHuu}, Vượt giờ ${soTietVuotGio}, NCKH ${soTietNCKH}`;
    } else {
      // Ghi log cập nhật với so sánh chi tiết
      let changes = [];
      if (oldData.GiangDayChuaNghiHuu != soTietDaoTaoChuaNghiHuu) {
        changes.push(`GiangDay (Chưa nghỉ hưu): "${oldData.GiangDayChuaNghiHuu}" -> "${soTietDaoTaoChuaNghiHuu}"`);
      }
      if (oldData.GiangDayDaNghiHuu != soTietDaoTaoDaNghiHuu) {
        changes.push(`GiangDay (Đã nghỉ hưu): "${oldData.GiangDayDaNghiHuu}" -> "${soTietDaoTaoDaNghiHuu}"`);
      }
      if (oldData.VuotGio != soTietVuotGio) {
        changes.push(`VuotGio: "${oldData.VuotGio}" -> "${soTietVuotGio}"`);
      }
      if (oldData.NCKH != soTietNCKH) {
        changes.push(`NCKH: "${oldData.NCKH}" -> "${soTietNCKH}"`);
      }
      
      noiDungThayDoi = changes.length > 0 
        ? `Admin cập nhật số tiết định mức: ${changes.join(', ')}`
        : `Admin cập nhật số tiết định mức: Không có thay đổi`;
    }
    
    await pool.query(logQuery, [
      userId,
      tenNhanVien,
      khoa,
      loaiThongTin,
      noiDungThayDoi
    ]);

    res.status(200).json({
      success: true,
      message: "Cập nhật định mức thành công",
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật định mức:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật định mức",
    });
  } finally {
    if (pool) pool.release();
  }
};
const getSoTietDM = async (req, res) => {
  const pool = await createPoolConnection();
  const TenNhanVien = req.params.TenNhanVien;
  try {
    // Lấy dữ liệu hiện tại
    const [rows] = await pool.execute(
      "SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu, VuotGio, NCKH FROM sotietdinhmuc LIMIT 1"
    );
    const [rows1] = await pool.execute(
      "SELECT *FROM nhanvien WHERE TenNhanVien = ? ", [TenNhanVien]
    );
    res.json({
      success: true,
      soTietDM: rows,
      nhanVien: rows1,
    });
  } catch (error) {
    res.status(500).send("Có lỗi xảy ra khi lấy số tiết định mức. Vui lòng thử lại sau.");
  } finally {
    if (pool) pool.release();
  }
};

module.exports = {
  renderSoTietDM,
  updateSoTietDM,
  getSoTietDM,
};
