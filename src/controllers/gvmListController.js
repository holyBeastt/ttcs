const express = require("express");
//const connection = require("../config/database");
const createConnection = require("../config/databaseAsync");
const createPoolConnection = require("../config/databasePool");
const ExcelJS = require("exceljs");
const router = express.Router();
const mysql = require("mysql2/promise");
const xlsx = require("xlsx");

let gvmLists;
const getGvmList = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    // Lấy danh sách bộ môn để lọc

    // Lấy danh sách phòng ban để lọc
    const qrPhongBan = `select * from phongban where isKhoa = 1`;
    const [phongBanList] = await connection.query(qrPhongBan);

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

    const [results, fields] = await connection.query(query);
    const gvmLists = results;

    res.render("gvmList.ejs", {
      gvmLists: gvmLists,
      phongBanList: phongBanList,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
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

// Hàm xuất dữ liệu ra Excel
// const exportGvmToExcel = async (req, res) => {
//   console.log("Hàm exportGvmToExcel được gọi");
//   try {
//     const connection = await mysql.createConnection({
//       host: "localhost",
//       user: "root",
//       database: "csdl_last",
//     });
//     console.log("Kết nối database thành công");
//     const [rows] = await connection.execute("SELECT * FROM gvmoi");
//     console.log("Lấy dữ liệu từ bảng gvmoi thành công");
//     if (rows.length === 0) {
//       console.log("Không có dữ liệu để xuất khẩu");
//       res.status(404).send("Không có dữ liệu để xuất khẩu");
//       return;
//     }
//     const ws = xlsx.utils.json_to_sheet(rows);
//     const wb = xlsx.utils.book_new();
//     xlsx.utils.book_append_sheet(wb, ws, "GiangVienMoi");
//     console.log("Tạo file Excel thành công");
//     const filePath = "./gvmList.xlsx";
//     xlsx.writeFile(wb, filePath);
//     console.log("Ghi file Excel thành công");
//     res.download(filePath, "gvmList.xlsx", (err) => {
//       if (err) {
//         console.log("Lỗi khi tải file:", err);
//       } else {
//         console.log("File đã được tải thành công!");
//       }
//     });
//   } catch (error) {
//     console.error("Lỗi khi xuất dữ liệu:", error);
//     res.status(500).send("Có lỗi xảy ra khi xuất dữ liệu");
//   }
// };

// Lấy danh sách chờ duyệt
const getWaitingListData = async (req, res) => {
  let connection;
  const isKhoa = req.session.isKhoa;
  const MaPhongBan = req.session.MaPhongBan;
  const khoa = req.query.khoa;

  try {
    connection = await createPoolConnection();

    let query = `SELECT * FROM gvmoi WHERE 
    TinhTrangGiangDay = 1 AND
    (hoc_vien_duyet IS NULL OR hoc_vien_duyet != 1) 
    AND id_Gvm != 1`;

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

    const [results] = await connection.query(query, params);

    return res.json(results);
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// Lấy danh sách đã duyệt
const getCheckedListData = async (req, res) => {
  let connection;
  const isKhoa = req.session.isKhoa;
  const MaPhongBan = req.session.MaPhongBan;
  const khoa = req.query.khoa;

  try {
    connection = await createPoolConnection();

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

    const [results] = await connection.query(query, params);

    return res.json(results);
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// Lấy số lượng giảng viên chờ duyệt
const getWaitingCountUnapproved = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

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

    const [results] = await connection.query(query);

    return res.json(results[0].count);
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// Render waiting list site
const getWaitingListSite = async (req, res) => {
  res.render("gvm.waitingList.ejs");
};

// Render checked list site
const getCheckedListSite = async (req, res) => {
  res.render("gvm.checkedList.ejs");
};

// Duyệt giảng viên
const updateWaitingList = async (req, res) => {
  let connection;
  const updatedData = req.body;
  try {
    // Kiểm tra nếu không có dữ liệu thì không cần thực hiện gì
    if (!updatedData || updatedData.length === 0) {
      return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
    }

    connection = await createPoolConnection();

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
      await connection.query(updateQuery, updateValues);
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

// Site đã duyệt
const unCheckedLecturers = async (req, res) => {
  let connection;
  const updatedData = req.body;

  try {
    // Kiểm tra nếu không có dữ liệu thì không cần thực hiện gì
    if (!updatedData || updatedData.length === 0) {
      return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
    }

    connection = await createPoolConnection();

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
      await connection.query(updateQuery, updateValues);
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

// Render waiting list site
const getStoppedTeachingListSite = async (req, res) => {
  res.render("gvm.stoppedTeaching.ejs");
};

// Lấy data danh sách đã dừng giảng dạy
const getStoppedTeachingListData = async (req, res) => {
  let connection;
  const isKhoa = req.session.isKhoa;
  const MaPhongBan = req.session.MaPhongBan;
  const khoa = req.query.khoa;

  try {
    connection = await createPoolConnection();

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

    const [results] = await connection.query(query, params);

    return res.json(results);
  } catch (error) {
    console.error("Error fetching waiting list:", error);
    res.status(500).json({ message: "Internal Server Error" });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const updateStoppedTeaching = async (req, res) => {
  let connection;
  const updatedData = req.body;
  try {
    // Kiểm tra nếu không có dữ liệu thì không cần thực hiện gì
    if (!updatedData || updatedData.length === 0) {
      return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
    }

    connection = await createPoolConnection();

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
      await connection.query(updateQuery, updateValues);
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getGvmList,
  getGvm,
  //exportGvmToExcel, // Đảm bảo export controller này
  getWaitingListData,
  getWaitingListSite, // Danh sách chưa duyệt
  getCheckedListSite, // Danh sách đã duyệt
  getWaitingCountUnapproved,
  updateWaitingList, // Cập nhật duyệt
  getCheckedListData,
  unCheckedLecturers,
  getStoppedTeachingListSite,
  getStoppedTeachingListData, // Danh sách đã dừng giảng dạy
  updateStoppedTeaching,
};
