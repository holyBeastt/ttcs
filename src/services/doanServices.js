const pool = require("../config/Pool");

const getSoTietDoAn = async (he_dao_tao) => {
  try {
    const query = "SELECT * FROM sotietdoan where he_dao_tao = ?";
    const [results] = await pool.execute(query, [he_dao_tao]);

    return results;
  } catch (error) {
    console.error("Error fetching GVM lists: ", error);
    return res.status(500).send("Internal server error"); // Trả về chuỗi thông báo lỗi
  }
};

const getPhuLucDAData = async (
  dot,
  ki,
  namHoc,
  khoa,
  he_dao_tao,
  teacherName
) => {
  try {

    let query = `
      SELECT DISTINCT
          gv.HoTen AS GiangVien,
          edt.TenDeTai,
          edt.SinhVien,
          MAX(edt.SoTiet) AS SoTiet,
          MAX(edt.TienMoiGiang) AS TienMoiGiang,
          MAX(edt.ThanhTien) AS ThanhTien,
          MAX(edt.TruThue) AS TruThue,
          MAX(edt.ThucNhan) AS ThucNhan,
          MIN(edt.NgayBatDau) AS NgayBatDau,
          MAX(edt.NgayKetThuc) AS NgayKetThuc,
          gv.HocVi,
          gv.HSL,
          gv.DiaChi,
          gv.CCCD,
          edt.SoHopDong,
          edt.SoThanhLyHopDong,
          GROUP_CONCAT(DISTINCT edt.khoa_sinh_vien SEPARATOR ', ') AS KhoaSinhVien,
          GROUP_CONCAT(DISTINCT edt.nganh SEPARATOR ', ') AS Nganh
      FROM exportdoantotnghiep edt
      JOIN gvmoi gv ON edt.GiangVien = gv.HoTen
      WHERE  edt.Dot = ? AND edt.Ki=? AND edt.NamHoc = ? AND he_dao_tao = ? AND edt.isMoiGiang = 1
    `;

    let params = [dot, ki, namHoc, he_dao_tao];

    if (khoa && khoa !== "ALL") {
      query += `AND gv.MaPhongBan = ?`;
      params.push(khoa);
    }

    if (teacherName) {
      query += ` AND gv.HoTen LIKE ?`;
      params.push(`%${teacherName}%`);
    }

    query += ` GROUP BY gv.HoTen, edt.TenDeTai, edt.SinhVien, edt.SoTiet, 
               gv.HocVi, gv.HSL, gv.DiaChi, gv.CCCD, edt.SoHopDong, edt.SoThanhLyHopDong`;

    const [data] = await pool.execute(query, params);

    return data;
  } catch (error) {
    console.log(error);
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getSoTietDoAn,
  getPhuLucDAData
};
