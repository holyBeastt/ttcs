const express = require("express");
const createPoolConnection = require("../config/databasePool");
const pool = require("../config/Pool");
const ExcelJS = require("exceljs");
const path = require("path"); // Thêm dòng này
const fs = require("fs"); // Thêm dòng này

let gvmLists;
const getGvmList = async (req, res) => {
  try {
    // Lấy danh sách bộ môn để lọc

    // Lấy danh sách phòng ban để lọc
    const qrPhongBan = `select * from phongban where isKhoa = 1`;
    const [phongBanList] = await pool.query(qrPhongBan);

    // Lấy danh sách giảng viên mời
    const isKhoa = req.session.isKhoa;
    const MaPhongBan = req.session.MaPhongBan;
    console.log("MaPhongBan = ", MaPhongBan);
    let query;

    if (isKhoa == 0) {
      query = `select * from gvmoi where TinhTrangGiangDay = 1 AND CCCD != '00001'`;
    } else if (isKhoa == 1) {
      query = `SELECT * FROM gvmoi WHERE TinhTrangGiangDay = 1 AND MaPhongBan LIKE '%${MaPhongBan}%'`;
    }

    const [results, fields] = await pool.query(query);
    const gvmLists = results;

    res.render("gvmList.ejs", {
      gvmLists: gvmLists,
      phongBanList: phongBanList,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  }
};

const getGvm = async (req, res) => {
  try {
    res.json(gvmLists); // Trả về danh sách giảng viên mời
  } catch (error) {
    console.error("Error fetching GVM list:", error);
    res.status(500).json({ message: "Internal Server Error" }); // Xử lý lỗi
  }
};

// =================================================================
// Danh sách đã ngừng giảng dạy
// Render waiting list site
const getStoppedTeachingListSite = async (req, res) => {
  res.render("gvm.stoppedTeaching.ejs");
};

// Lấy data danh sách đã dừng giảng dạy
const getStoppedTeachingListData = async (req, res) => {
  const isKhoa = req.session.isKhoa;
  const MaPhongBan = req.session.MaPhongBan;
  const khoa = req.query.khoa;

  try {
    let query = `SELECT * FROM gvmoi WHERE 
    TinhTrangGiangDay = 0 AND id_Gvm != 1`;
    let params = [];

    if (isKhoa == 1) {
      query += ` AND MaPhongBan = ?`;
      params.push(MaPhongBan);
    } else if (isKhoa == 0) {
      if (khoa !== "ALL") {
        query += ` AND MaPhongBan = ?`;
        params.push(khoa);
      }
    }

    const [results] = await pool.query(query, params);

    return res.json(results);
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateStoppedTeaching = async (req, res) => {
  const updatedData = req.body;
  try {
    // Kiểm tra nếu không có dữ liệu thì không cần thực hiện gì
    if (!updatedData || updatedData.length === 0) {
      return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
    }

    // Giới hạn số lượng bản ghi mỗi batch (để tránh quá tải query)
    const batchSize = 20;
    const batches = [];
    for (let i = 0; i < updatedData.length; i += batchSize) {
      batches.push(updatedData.slice(i, i + batchSize));
    }

    // Xử lý từng batch
    for (const batch of batches) {
      let updateQuery = `
        UPDATE gvmoi
        SET 
          TinhTrangGiangDay = CASE
      `;

      const updateValues = [];
      const ids = [];

      batch.forEach((item) => {
        let { id_Gvm, TinhTrangGiangDay } = item;

        updateQuery += ` WHEN id_Gvm = ? THEN ?`;
        updateValues.push(id_Gvm, TinhTrangGiangDay);
        ids.push(id_Gvm);
      });

      updateQuery += ` END WHERE id_Gvm IN (${ids.map(() => "?").join(", ")})`;

      updateValues.push(...ids);

      // Thực hiện truy vấn cập nhật hàng loạt
      await pool.query(updateQuery, updateValues);
    }
    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  }
};

// =================================================================
// Danh sách chờ duyệt
// Render waiting list site
const getWaitingListSite = async (req, res) => {
  res.render("gvm.waitingList.ejs");
};

// Lấy danh sách chờ duyệt
const getWaitingListData = async (req, res, khoa, checkOrder) => {
  const isKhoa = req.session.isKhoa;
  const MaPhongBan = req.session.MaPhongBan;

  try {
    let query = `SELECT * FROM gvmoi WHERE 
    TinhTrangGiangDay = 1 AND
    (hoc_vien_duyet IS NULL OR hoc_vien_duyet != 1) 
    AND id_Gvm != 1`;

    if (checkOrder != "ALL") {
      if (checkOrder == "khoaChecked") {
        query += ` AND khoa_duyet = 1`;
      }
      if (checkOrder == "daoTaoChecked") {
        query += ` AND dao_tao_duyet = 1`;
      }
      if (checkOrder == "unChecked") {
        query += ` AND khoa_duyet = 0`;
      }
    }

    // Thêm điều kiện lọc
    let params = [];
    let displayOrder = ` ORDER BY 
    (khoa_duyet = 1 AND dao_tao_duyet = 0) DESC, 
    (khoa_duyet = 1 AND dao_tao_duyet = 1) DESC, 
    khoa_duyet ASC`;

    if (MaPhongBan == "HV")
      displayOrder = ` ORDER BY dao_tao_duyet DESC, khoa_duyet DESC`;

    if (isKhoa == 1) {
      query += ` AND MaPhongBan = ?`;
      displayOrder = ` ORDER BY 
      (khoa_duyet = 0 AND dao_tao_duyet = 1) DESC, 
      khoa_duyet ASC`;
      params.push(MaPhongBan);
    } else if (isKhoa == 0 && khoa !== "ALL") {
      query += ` AND MaPhongBan = ?`;
      params.push(khoa);
    }

    // Thêm điều kiện sắp xếp
    query += displayOrder;

    const [results] = await pool.query(query, params);

    return results;
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    return;
  }
};

// Lấy danh sách chờ duyệt để hiển thị
const getWaitingListToRender = async (req, res) => {
  const { khoa, checkOrder } = req.query;

  try {
    const results = await getWaitingListData(req, res, khoa, checkOrder);

    return res.json(results);
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Lấy số lượng giảng viên chờ duyệt
const getWaitingCountUnapproved = async (req, res) => {
  try {
    // Lấy isKhoa và MaPhongBan để hiển thị
    const isKhoa = req.session.isKhoa;
    const MaPhongBan = req.session.MaPhongBan;
    let query;
    if (isKhoa == 0) {
      query = `SELECT count(*) as count FROM gvmoi WHERE 
        TinhTrangGiangDay = 1 AND
        (hoc_vien_duyet IS NULL OR hoc_vien_duyet != 1) 
        AND id_Gvm != 1`;

      // Nếu là đào tạo, lấy số lượng khi khoa đã duyệt
      if (MaPhongBan === "DAOTAO") {
        query += " AND khoa_duyet = 1";
      }

      // Nếu là học viện, lấy số lượng khi đào tạo đã duyệt
      if (MaPhongBan === "HV") {
        query += " AND dao_tao_duyet = 1";
      }
    } else if (isKhoa == 1) {
      query = `SELECT count(*) as count FROM gvmoi WHERE 
      TinhTrangGiangDay = 1 AND
      MaPhongBan LIKE '%${MaPhongBan}%' 
      AND (hoc_vien_duyet IS NULL OR hoc_vien_duyet != 1) 
      AND id_Gvm != 1`;
    }

    const [results] = await pool.query(query);

    return res.json(results[0].count);
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Duyệt giảng viên
const updateWaitingList = async (req, res) => {
  const updatedData = req.body;
  try {
    // Kiểm tra nếu không có dữ liệu thì không cần thực hiện gì
    if (!updatedData || updatedData.length === 0) {
      return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
    }

    // Giới hạn số lượng bản ghi mỗi batch (để tránh quá tải query)
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < updatedData.length; i += batchSize) {
      batches.push(updatedData.slice(i, i + batchSize));
    }

    // Xử lý từng batch
    for (const batch of batches) {
      let updateQuery = `
        UPDATE gvmoi
        SET 
          khoa_duyet = CASE
      `;

      const updateValues = [];
      const ids = [];

      batch.forEach((item) => {
        let { id_Gvm, khoa_duyet } = item;

        if (item.unchecked == true) {
          khoa_duyet = 0;
        }
        updateQuery += ` WHEN id_Gvm = ? THEN ?`;
        updateValues.push(id_Gvm, khoa_duyet);
        ids.push(id_Gvm);
      });

      // Đào tạo duyệt
      updateQuery += ` END, dao_tao_duyet = CASE `;

      batch.forEach((item) => {
        const { id_Gvm, dao_tao_duyet } = item;
        updateQuery += ` WHEN id_Gvm = ? THEN ?`;
        updateValues.push(id_Gvm, dao_tao_duyet);
      });

      // Học viên duyệt
      updateQuery += ` END, hoc_vien_duyet = CASE `;

      batch.forEach((item) => {
        const { id_Gvm, hoc_vien_duyet } = item;
        updateQuery += ` WHEN id_Gvm = ? THEN ?`;
        updateValues.push(id_Gvm, hoc_vien_duyet);
      });

      updateQuery += ` END WHERE id_Gvm IN (${ids.map(() => "?").join(", ")})`;

      updateValues.push(...ids);

      // Thực hiện truy vấn cập nhật hàng loạt
      await pool.query(updateQuery, updateValues);
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  }
};

// Export danh sách chờ duyệt
const exportWaitingList = async (req, res) => {
  const { MaPhongBan, checkOrder } = req.body;

  const isKhoa = req.session.isKhoa;
  const MaPhongBanSession = req.session.MaPhongBan;

  try {
    const results = await getWaitingListData(req, res, MaPhongBan, checkOrder);

    await getGvmListXLSX(
      req,
      res,
      results,
      isKhoa == 1 ? MaPhongBanSession : MaPhongBan
    );
  } catch (error) {
    console.error("Lỗi truy vấn:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi xuất danh sách" });
  }
};

// ================================================================
// Danh sách đã duyệt
// Render checked list site
const getCheckedListSite = async (req, res) => {
  res.render("gvm.checkedList.ejs");
};

// Lấy dữ liệu danh sách đã duyệt
const getCheckedListData = async (req, res, khoa) => {
  const isKhoa = req.session.isKhoa;
  const MaPhongBan = req.session.MaPhongBan;

  try {
    let query = `SELECT * FROM gvmoi WHERE
    TinhTrangGiangDay = 1 AND
     hoc_vien_duyet = 1 AND id_Gvm != 1`;
    let params = [];

    if (isKhoa == 1) {
      query += ` AND MaPhongBan = ?`;
      params.push(MaPhongBan);
    } else if (isKhoa == 0) {
      if (khoa !== "ALL") {
        query += ` AND MaPhongBan = ?`;
        params.push(khoa);
      }
    }

    const [results] = await pool.query(query, params);

    return results;
  } catch (error) {
    console.error("Error fetching waiting list:", error);
  }
};

// Lấy danh sách đã duyệt để hiển thị
const getCheckedListToRender = async (req, res) => {
  const khoa = req.query.khoa;

  try {
    const results = await getCheckedListData(req, res, khoa);

    return res.json(results);
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const exportCheckedList = async (req, res) => {
  let { MaPhongBan } = req.body;

  const isKhoa = req.session.isKhoa;
  const MaPhongBanSession = req.session.MaPhongBan;

  if (isKhoa == 1) {
    MaPhongBan = MaPhongBanSession;
  }

  try {
    const results = await getCheckedListData(req, res, MaPhongBan);

    await getGvmListXLSX(req, res, results, MaPhongBan);
  } catch (error) {
    console.error("Lỗi truy vấn:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi xuất danh sách" });
  }
};

// Bỏ duyệt
const unCheckedLecturers = async (req, res) => {
  const updatedData = req.body;

  try {
    // Kiểm tra nếu không có dữ liệu thì không cần thực hiện gì
    if (!updatedData || updatedData.length === 0) {
      return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
    }

    // Giới hạn số lượng bản ghi mỗi batch (để tránh quá tải query)
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < updatedData.length; i += batchSize) {
      batches.push(updatedData.slice(i, i + batchSize));
    }

    // Xử lý từng batch
    for (const batch of batches) {
      let updateQuery = `
        UPDATE gvmoi
        SET 
          khoa_duyet = CASE
      `;

      const updateValues = [];
      const ids = [];

      batch.forEach((item) => {
        let { id_Gvm, khoa_duyet } = item;

        khoa_duyet = 0;
        updateQuery += ` WHEN id_Gvm = ? THEN ?`;
        updateValues.push(id_Gvm, khoa_duyet);
        ids.push(id_Gvm);
      });

      // Đào tạo duyệt
      updateQuery += ` END, dao_tao_duyet = CASE `;

      batch.forEach((item) => {
        let { id_Gvm, dao_tao_duyet } = item;

        dao_tao_duyet = 0;
        updateQuery += ` WHEN id_Gvm = ? THEN ?`;
        updateValues.push(id_Gvm, dao_tao_duyet);
      });

      // Học viên duyệt
      updateQuery += ` END, hoc_vien_duyet = CASE `;

      batch.forEach((item) => {
        const { id_Gvm, hoc_vien_duyet } = item;
        updateQuery += ` WHEN id_Gvm = ? THEN ?`;
        updateValues.push(id_Gvm, hoc_vien_duyet);
      });

      updateQuery += ` END WHERE id_Gvm IN (${ids.map(() => "?").join(", ")})`;

      updateValues.push(...ids);

      // Thực hiện truy vấn cập nhật hàng loạt
      await pool.query(updateQuery, updateValues);
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  }
};

// ===============================================================
// Dùng chung
// Hàm sanitize tên file
const sanitizeFileName = (name) => {
  return name.replace(/[\/\\?%*:|"<> ]/g, "_");
};

// Export danh sách giảng viên
const getGvmListXLSX = async (req, res, rows, MaPhongBan) => {
  try {
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: "Không có dữ liệu để xuất." });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("GiangVienMoi");

    worksheet.columns = [
      { header: "STT", key: "stt", width: 5 },
      { header: "Họ và Tên", key: "HoTen", width: 20 },
      { header: "Giới Tính", key: "GioiTinh", width: 12 },
      { header: "Ngày Sinh", key: "NgaySinh", width: 15 },
      { header: "Điện Thoại", key: "DienThoai", width: 15 },
      { header: "Email", key: "Email", width: 25 },
      { header: "Học Vị", key: "HocVi", width: 10 },
      { header: "Bằng loại", key: "BangTotNghiepLoai", width: 10 },
      { header: "Chức Vụ", key: "ChucVu", width: 12 },
      { header: "Hệ Số Lương", key: "HSL", width: 10 },
      { header: "Nơi Công Tác", key: "NoiCongTac", width: 20 },
      { header: "Số CCCD", key: "CCCD", width: 15 },
      { header: "Ngày Cấp CCCD", key: "NgayCapCCCD", width: 15 },
      { header: "Nơi Cấp", key: "NoiCapCCCD", width: 15 },
      { header: "Địa Chỉ", key: "DiaChi", width: 20 },
      { header: "Mã Số Thuế", key: "MaSoThue", width: 15 },
      { header: "Số Tài Khoản", key: "STK", width: 15 },
      { header: "Tại Ngân Hàng", key: "NganHang", width: 20 },
      { header: "Khoa", key: "MaPhongBan", width: 20 },
      { header: "Bộ Môn", key: "MonGiangDayChinh", width: 20 },
    ];

    rows.forEach((row, index) => {
      // Định dạng ngày
      row.NgaySinh = row.NgaySinh
        ? new Date(row.NgaySinh).toLocaleDateString("vi-VN")
        : "";
      row.NgayCapCCCD = row.NgayCapCCCD
        ? new Date(row.NgayCapCCCD).toLocaleDateString("vi-VN")
        : "";

      worksheet.addRow({
        stt: index + 1,
        ...row,
      });
    });

    // Định dạng tiêu đề
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { name: "Times New Roman", size: 12, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Border và font toàn bộ bảng
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.font = { name: "Times New Roman", size: 12 };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    });

    let fileName = `Danh_sach_giang_vien_moi`;
    if (MaPhongBan && MaPhongBan !== "ALL") {
      fileName += `_${sanitizeFileName(MaPhongBan)}`;
    }
    fileName += `.xlsx`;

    const filePath = path.join(__dirname, "../public/exports", fileName);
    await workbook.xlsx.writeFile(filePath);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        return res.status(500).send("Lỗi khi tải file");
      }
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error("Lỗi khi xuất Excel:", error);
    res
      .status(500)
      .json({ error: "Có lỗi xảy ra khi xuất danh sách giảng viên mới" });
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getGvmList,
  getGvm,
  //exportGvmToExcel, // Đảm bảo export controller này
  getWaitingListToRender,
  getWaitingListSite, // Danh sách chưa duyệt
  getCheckedListSite, // Danh sách đã duyệt
  getWaitingCountUnapproved,
  updateWaitingList, // Cập nhật duyệt
  getCheckedListData,
  unCheckedLecturers,
  getStoppedTeachingListSite,
  getStoppedTeachingListData, // Danh sách đã dừng giảng dạy
  updateStoppedTeaching,
  exportWaitingList,
  getCheckedListToRender,
  exportCheckedList,
};
