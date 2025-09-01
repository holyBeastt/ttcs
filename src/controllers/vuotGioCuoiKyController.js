const express = require("express");
const multer = require("multer");
const router = express.Router();
const createPoolConnection = require("../config/databasePool");
const pool = require("../config/Pool");
const XLSX = require('xlsx');
// const { get } = require("../routes/vuotGioCuoiKyRoute");

// Dữ liệu lưu tạm trong bộ nhớ (có thể thay bằng MySQL, MongoDB, v.v.)
let workloadData = {
  raDe: [],
  coiThi: [],
  chamThi: []
};

// GET: Lấy toàn bộ dữ liệu
const getWorkload = (req, res) => {
  res.json(workloadData);
};

// POST: Đọc file Excel và phân loại dữ liệu
const readFileExcel = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Không có file được tải lên' });
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;
    const data = {
      raDe: [],
      coiThi: [],
      chamThi: []
    };

    sheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

      // Tìm dòng tiêu đề
      let headerRowIndex = -1;
      for (let i = 0; i < rawData.length; i++) {
        if (rawData[i].includes('STT') && rawData[i].includes('Họ và tên')) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        return;
      }

      const headers = rawData[headerRowIndex];
      const sttIndex = headers.indexOf('STT');
      const hoVaTenIndex = headers.indexOf('Họ và tên');
      const khoaIndex = headers.indexOf('Khoa');
      const tenHocPhanIndex = headers.indexOf('Tên học phần');
      const lopHocPhanIndex = headers.indexOf('Lớp học phần');
      const doiTuongIndex = headers.indexOf('Đối tượng');
      const soDeIndex = headers.indexOf('Số đề');
      const soCaIndex = headers.indexOf('Số ca');
      const soBaiCham1Index = headers.indexOf('Số bài chấm 1');
      const soBaiCham2Index = headers.indexOf('Số bài chấm 2');
      const tongSoBaiIndex = headers.indexOf('Tổng số bài');
      const soTietQCIndex = headers.indexOf('Số tiết QC');

      let consecutiveEmptyRows = 0;

      // Trích xuất dữ liệu từ các dòng sau tiêu đề
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
          consecutiveEmptyRows++;
          if (consecutiveEmptyRows >= 2) {
            break; // Dừng xử lý sheet khi gặp 2 dòng trống liên tiếp
          }
          continue;
        } else {
          consecutiveEmptyRows = 0; // Reset nếu gặp dòng không trống
        }

        const hoVaTen = hoVaTenIndex >= 0 ? row[hoVaTenIndex] : '';
        const khoa = khoaIndex >= 0 ? row[khoaIndex] : '';
        const tenHocPhan = tenHocPhanIndex >= 0 ? row[tenHocPhanIndex] : '';
        const lopHocPhan = lopHocPhanIndex >= 0 ? row[lopHocPhanIndex] : '';
        const doiTuong = doiTuongIndex >= 0 ? row[doiTuongIndex] : '';
        const soTietQC = soTietQCIndex >= 0 ? row[soTietQCIndex] : null;

        if (sheetName === 'Ra đề' && soDeIndex >= 0 && row[soDeIndex] !== undefined && row[soDeIndex] !== null) {
          data.raDe.push({
            hoVaTen,
            khoa,
            tenHocPhan,
            lopHocPhan,
            doiTuong,
            soDe: row[soDeIndex],
            soTietQC
          });
        } else if (sheetName === 'Coi thi' && soCaIndex >= 0 && row[soCaIndex] !== undefined && row[soCaIndex] !== null) {
          data.coiThi.push({
            hoVaTen,
            khoa,
            tenHocPhan,
            lopHocPhan,
            doiTuong,
            soCa: row[soCaIndex],
            soTietQC
          });
        } else if (sheetName === 'Chấm thi' && (soBaiCham1Index >= 0 || soBaiCham2Index >= 0)) {
          const soBaiCham1 = soBaiCham1Index >= 0 ? row[soBaiCham1Index] : null;
          const soBaiCham2 = soBaiCham2Index >= 0 ? row[soBaiCham2Index] : null;
          const tongSoBai = tongSoBaiIndex >= 0 ? row[tongSoBaiIndex] : null;
          if (soBaiCham1 !== undefined || soBaiCham2 !== undefined) {
            data.chamThi.push({
              hoVaTen,
              khoa,
              tenHocPhan,
              lopHocPhan,
              doiTuong,
              soBaiCham1,
              soBaiCham2,
              tongSoBai,
              soTietQC
            });
          }
        }
      }
    });

    if (data.raDe.length === 0 && data.coiThi.length === 0 && data.chamThi.length === 0) {
      return res.status(400).json({ error: 'Không tìm thấy dữ liệu hợp lệ trong file' });
    }

    workloadData = data; // Cập nhật dữ liệu tạm thời
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi xử lý file' });
  }
};

// POST: Thêm 1 dòng dữ liệu (từ client)
const addWorkloadEntry = (req, res) => {
  try {
    const entry = req.body;

    if (entry.section === 'raDe') {
      workloadData.raDe.push({
        hoVaTen: entry.hoVaTen,
        khoa: entry.khoa,
        tenHocPhan: entry.tenHocPhan,
        lopHocPhan: entry.lopHocPhan,
        doiTuong: entry.doiTuong,
        soDe: entry.soDe,
        soTietQC: entry.soTietQC
      });
    } else if (entry.section === 'coiThi') {
      workloadData.coiThi.push({
        hoVaTen: entry.hoVaTen,
        khoa: entry.khoa,
        tenHocPhan: entry.tenHocPhan,
        lopHocPhan: entry.lopHocPhan,
        doiTuong: entry.doiTuong,
        soCa: entry.soCa,
        soTietQC: entry.soTietQC
      });
    } else if (entry.section === 'chamThi') {
      workloadData.chamThi.push({
        hoVaTen: entry.hoVaTen,
        khoa: entry.khoa,
        tenHocPhan: entry.tenHocPhan,
        lopHocPhan: entry.lopHocPhan,
        doiTuong: entry.doiTuong,
        soBaiCham1: entry.soBaiCham1,
        soBaiCham2: entry.soBaiCham2,
        tongSoBai: entry.tongSoBai,
        soTietQC: entry.soTietQC
      });
    }

    res.json(entry);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error adding entry' });
  }
};

const importWorkloadToDB = async (req, res) => {
  try {
    const conn = await createPoolConnection();
    const ki = req.body.ki;
    const namhoc = req.body.nam;
    const query = `INSERT INTO ketthuchocphan (giangvien, khoa, ki, namhoc, hinhthuc, tenhocphan, lophocphan, doituong, baicham1, baicham2, tongso, sotietqc, khoaduyet, taichinhduyet) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`;

    // Nhập dữ liệu ra đề
    console.log("Bắt đầu nhập dữ liệu ra đề vào DB...");
    for (const item of workloadData.raDe) {
      await conn.query(query,
        [
          item.hoVaTen,
          item.khoa,
          ki,
          namhoc,
          "Ra đề",
          item.tenHocPhan,
          item.lopHocPhan,
          item.doiTuong,
          0,
          0,
          item.soDe,
          item.soTietQC
        ]
      );
    }

    // Nhập dữ liệu coi thi
    for (const item of workloadData.coiThi) {
      await conn.query(query,
        [
          item.hoVaTen,
          item.khoa,
          ki,
          namhoc,
          "Coi thi",
          item.tenHocPhan,
          item.lopHocPhan,
          item.doiTuong,
          0,
          0,
          item.soCa,
          item.soTietQC
        ]
      );
    }

    // Nhập dữ liệu chấm thi
    for (const item of workloadData.chamThi) {
      await conn.query(query,
        [
          item.hoVaTen,
          item.khoa,
          ki,
          namhoc,
          "Chấm thi",
          item.tenHocPhan,
          item.lopHocPhan,
          item.doiTuong,
          item.soBaiCham1,
          item.soBaiCham2,
          item.tongSoBai,
          item.soTietQC
        ]
      );
    }

    conn.release();
    res.json({ message: "Dữ liệu đã được import vào cơ sở dữ liệu thành công!" });
  } catch (error) {
    console.error("Lỗi khi import vào DB:", error);
    res.status(500).json({ error: "Lỗi khi import dữ liệu vào database!" });
  }
};
const deleteWorkloadData = async (req, res) => {
  try {
    const { Ki, Nam } = req.body;
    const conn = await createPoolConnection();

    const deleteQuery = `
      DELETE FROM ketthuchocphan 
      WHERE ki = ? AND namhoc = ?
    `;

    const [result] = await conn.query(deleteQuery, [ Ki, Nam]);
    conn.release();

    res.json({ success: true, message: "Xóa dữ liệu thành công", affectedRows: result.affectedRows });
  } catch (error) {
    console.error("Lỗi khi xóa dữ liệu:", error);
    res.status(500).json({ success: false, error: "Lỗi khi xóa dữ liệu" });
  }
};

const saveWorkloadData = async (req, res) => {
  try {
    const { Ki, Nam, data } = req.body;
    console.log("Ki:", Ki, "Nam:", Nam, "data:", data);

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ success: false, error: "Dữ liệu không hợp lệ hoặc rỗng" });
    }

    const conn = await createPoolConnection();
    const insertQuery = `
      INSERT INTO ketthuchocphan 
        (giangvien, khoa, ki, namhoc, hinhthuc, tenhocphan, lophocphan, doituong, baicham1, baicham2, tongso, sotietqc, khoaduyet, khaothiduyet) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const item of data) {
      const {
        hoVaTen,
        khoa,
        tenHocPhan,
        lopHocPhan,
        doiTuong,
        soDe = 0,
        soCa = 0,
        soBaiCham1 = 0,
        soBaiCham2 = 0,
        tongSoBai = 0,
        soTietQC = 0,
        khoaduyet = 0, // Mặc định là 0 nếu không có
        khaothiduyet = 0, // Mặc định là 0 nếu không có
        Type
      } = item;

      let baicham1 = 0, baicham2 = 0, tongso = 0;

      if (Type === "Ra Đề") {
        tongso = soDe;
      } else if (Type === "Coi Thi") {
        tongso = soCa;
      } else if (Type === "Chấm Thi") {
        baicham1 = soBaiCham1;
        baicham2 = soBaiCham2;
        tongso = tongSoBai;
      }

      await conn.query(insertQuery, [
        hoVaTen,
        khoa,
        Ki,
        Nam,
        Type,
        tenHocPhan,
        lopHocPhan,
        doiTuong,
        baicham1,
        baicham2,
        tongso,
        soTietQC,
        khoaduyet,
        khaothiduyet
      ]);
    }

    conn.release();
    res.json({ success: true, message: "Thêm dữ liệu thành công" });
  } catch (error) {
    console.error("Lỗi khi thêm dữ liệu:", error);
    res.status(500).json({ success: false, error: "Lỗi khi thêm dữ liệu vào cơ sở dữ liệu" });
  }
};

const checkDataExistence = async (req, res) => {
  try {
    const { Ki, Nam } = req.body;
    const conn = await createPoolConnection();

    const checkQuery = `
      SELECT COUNT(*) AS count 
      FROM ketthuchocphan 
      WHERE ki = ? AND namhoc = ?
    `;

    const [rows] = await conn.query(checkQuery, [ Ki, Nam]);
    conn.release();

    if (rows[0].count > 0) {
      res.json({ exists: true });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error("Lỗi khi kiểm tra dữ liệu:", error);
    res.status(500).json({ success: false, error: "Lỗi khi kiểm tra dữ liệu" });
  }
};
const getList = async (req, res) => {
  try {
    const { MaPhongBan, Ki, Nam } = req.params;
    const conn = await createPoolConnection();
    console.log("MaPhongBan:", MaPhongBan, "Ki:", Ki, "Nam:", Nam);

    const query = `
      SELECT * FROM ketthuchocphan 
      WHERE khoa = ? AND ki = ? AND namhoc = ?
    `;

    const [rows] = await conn.query(query, [MaPhongBan, Ki, Nam]);
    conn.release();

    res.json({
      success: true,
      list: rows
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách:", error);
    res.status(500).json({ success: false, error: "Lỗi khi lấy danh sách" });
    if (conn) conn.release();
  }
};

const saveData = async (req, res) => {
  let { idList } = req.body;

  // Nếu idList là chuỗi "53,72,101" thì tách thành mảng
  if (typeof idList === "string") {
    idList = idList.split(",").map(id => id.trim()).filter(id => id);
  }

  if (!Array.isArray(idList) || idList.length === 0) {
    return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
  }

  try {
    const conn = await createPoolConnection();

    const query = `
      UPDATE ketthuchocphan
      SET daluu = 1
      WHERE id = ?
    `;

    for (const id of idList) {
      await conn.query(query, [id]);
    }

    conn.release();
    res.status(200).json({ message: "Cập nhật thành công" });

  } catch (err) {
    console.error("Lỗi khi cập nhật duyệt:", err);
    res.status(500).json({ message: "Cập nhật thất bại" });
  }
};


const insertMyData = async (req, res) => {
  try {
    const conn = await createPoolConnection();
    const entry = req.body;
    if (entry.section === "Ra Đề") {
      entry.soBaiCham1 = 0;
      entry.soBaiCham2 = 0;
      entry.tongSoBai = entry.soDe || 0;

    } else if (entry.section === "Coi Thi") {
      entry.soBaiCham1 = 0;
      entry.soBaiCham2 = 0;
      entry.tongSoBai = entry.soCa || 0;
    } else if (entry.section === "Chấm Thi") {
      entry.soBaiCham1 = 0;
      entry.soBaiCham2 = 0;
      entry.tongSoBai = entry.tongSoBai || 0;
    }
    const query = `INSERT INTO ketthuchocphan (giangvien, khoa, ki, namhoc, hinhthuc, tenhocphan, lophocphan, doituong, baicham1, baicham2, tongso, sotietqc) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await conn.query(query, [
      entry.hoVaTen,
      entry.khoa,
      entry.ki,
      entry.nam,
      entry.section,
      entry.tenHocPhan,
      entry.lopHocPhan,
      entry.doiTuong,
      entry.soBaiCham1,
      entry.soBaiCham2,
      entry.tongSoBai,
      entry.soTietQC,
    ]);

    // Ghi log việc thêm dữ liệu thủ công vượt giờ cuối kỳ sử dụng pool
    try {
      const logQuery = `
        INSERT INTO lichsunhaplieu 
        (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;

      const userId = req.session?.userId || req.session?.userInfo?.ID || 0;
      const tenNhanVien = req.session?.TenNhanVien || req.session?.username || 'Unknown User';
      const khoa = req.session?.MaPhongBan || entry.khoa || 'Unknown Department';
      const loaiThongTin = 'Thay đổi thông tin vượt giờ';
      const changeMessage = `${tenNhanVien} đã thêm dữ liệu thủ công vượt giờ cuối kỳ: "${entry.tenHocPhan}" - Lớp: ${entry.lopHocPhan}, Giảng viên: ${entry.hoVaTen}, Hình thức: ${entry.section}, Học kỳ: ${entry.ki}, Năm học: ${entry.nam}, Khoa: ${entry.khoa}, Quy chuẩn: ${entry.soTietQC}.`;
      
      await pool.query(logQuery, [
        userId,
        tenNhanVien,
        khoa,
        loaiThongTin,
        changeMessage
      ]);
    } catch (logError) {
      console.error("Lỗi khi ghi log:", logError);
      // Không throw error để không ảnh hưởng đến việc thêm dữ liệu chính
    }

    conn.release();
    res.json({ message: "Dữ liệu đã được import vào cơ sở dữ liệu thành công!" });
  } catch (error) {
    console.error("Lỗi khi import vào DB:", error);
    res.status(500).json({ error: "Lỗi khi import dữ liệu vào database!" });
  }
};

const getMyList = async (req, res) => {
  try {
    const { TenNhanVien, Ki, Nam } = req.params;
    const TenNhanVienClean = TenNhanVien.replace(/-/g, ' ').trim(); // Làm sạch tên nhân viên
    const conn = await createPoolConnection();
    console.log("TenNhanVien:", TenNhanVien, "Ki:", Ki, "Nam:", Nam);

    const query = `
      SELECT * FROM ketthuchocphan 
      WHERE giangvien LIKE ? AND ki = ? AND namhoc = ?
    `;

    const [rows] = await conn.query(query, [`%${TenNhanVienClean}%`, Ki, Nam]);
    conn.release();

    res.json({
      success: true,
      list: rows
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách:", error);
    res.status(500).json({ success: false, error: "Lỗi khi lấy danh sách" });
    if (conn) conn.release();
  }
};

const updateMyData = async (req, res) => {
  try {

    const dataList = req.body.data; // ⬅️ data là một mảng
    if (!Array.isArray(dataList)) {
      return res.status(400).json({ error: "Dữ liệu không hợp lệ" });
    }
    const conn = await createPoolConnection();

    for (const item of dataList) {
      const { loai, id, tenHocPhan, lopHocPhan } = item; // Lấy loai và id từ từng phần tử trong mảng
      let section, soBaiCham1, soBaiCham2, tongSoBai, soTietQC;

      // Lấy thông tin dữ liệu cũ trước khi cập nhật để ghi log
      const getOldDataQuery = `SELECT * FROM ketthuchocphan WHERE id = ?`;
      const [oldDataRows] = await conn.query(getOldDataQuery, [id]);
      const oldData = oldDataRows[0];

      if (loai === "Ra Đề") {
        section = "Ra Đề";
        soBaiCham1 = 0;
        soBaiCham2 = 0;
        tongSoBai = item.soDe || 0;
        soTietQC = item.soTietQC || 0;
      } else if (loai === "Coi Thi") {
        section = "Coi Thi";
        soBaiCham1 = 0;
        soBaiCham2 = 0;
        tongSoBai = item.soCa || 0;
        soTietQC = item.soTietQC || 0;
      } else if (loai === "Chấm Thi") {
        section = "Chấm Thi";
        soBaiCham1 = item.soBaiCham1;
        soBaiCham2 = item.soBaiCham2;
        tongSoBai = item.tongSoBai || 0;
        soTietQC = item.soTietQC || 0;
      }
      

      const query = `
        UPDATE ketthuchocphan 
        SET tenhocphan = ?, lophocphan = ?, hinhthuc = ?, baicham1 = ?, baicham2 = ?, tongso = ?, sotietqc = ?
        WHERE id = ?
      `;

      const [result] = await conn.query(query, [
        tenHocPhan,
        lopHocPhan,
        section,
        soBaiCham1 || 0,
        soBaiCham2 || 0,
        tongSoBai || 0,
        soTietQC || 0,
        id
      ]);

      // Ghi log việc cập nhật dữ liệu vượt giờ cuối kỳ sử dụng pool
      if (result.affectedRows > 0 && oldData) {
        try {
          const logQuery = `
            INSERT INTO lichsunhaplieu 
            (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
            VALUES (?, ?, ?, ?, ?, NOW())
          `;

          const userId = req.session?.userId || req.session?.userInfo?.ID || 0;
          const tenNhanVien = req.session?.TenNhanVien || req.session?.username || 'Unknown User';
          const khoa = req.session?.MaPhongBan || oldData.khoa || 'Unknown Department';
          const loaiThongTin = 'Thay đổi thông tin vượt giờ';
          
          // Tạo message chi tiết về những thay đổi
          let changes = [];
          if (oldData.tenhocphan !== tenHocPhan) changes.push(`Tên HP: "${oldData.tenhocphan}" → "${tenHocPhan}"`);
          if (oldData.lophocphan !== lopHocPhan) changes.push(`Lớp: "${oldData.lophocphan}" → "${lopHocPhan}"`);
          if (oldData.hinhthuc !== section) changes.push(`Hình thức: "${oldData.hinhthuc}" → "${section}"`);
          if (oldData.sotietqc !== soTietQC) changes.push(`Quy chuẩn: ${oldData.sotietqc} → ${soTietQC}`);
          if (oldData.tongso !== tongSoBai) changes.push(`Tổng số: ${oldData.tongso} → ${tongSoBai}`);
          
          const changeMessage = `${tenNhanVien} đã cập nhật dữ liệu vượt giờ cuối kỳ ID ${id}: ${changes.length > 0 ? changes.join(', ') : 'Không có thay đổi'} - Giảng viên: ${oldData.giangvien}, Học kỳ: ${oldData.ki}, Năm học: ${oldData.namhoc}.`;
          
          await pool.query(logQuery, [
            userId,
            tenNhanVien,
            khoa,
            loaiThongTin,
            changeMessage
          ]);
        } catch (logError) {
          console.error("Lỗi khi ghi log:", logError);
          // Không throw error để không ảnh hưởng đến việc cập nhật chính
        }
      }
    }

    conn.release();
    res.json({ 
      message: "Cập nhật dữ liệu thành công!",
      success: true
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu:", error);
    res.status(500).json({ error: "Lỗi khi cập nhật dữ liệu" });
  }
};

const deleteMyData = async (req, res) => {
  try {
    const { id } = req.body;
    const conn = await createPoolConnection();

    // Lấy thông tin dữ liệu trước khi xóa để ghi log
    const getDataQuery = `SELECT * FROM ketthuchocphan WHERE id = ?`;
    const [dataRows] = await conn.query(getDataQuery, [id]);
    const deletedData = dataRows[0];

    const deleteQuery = `
      DELETE FROM ketthuchocphan 
      WHERE id = ?
    `;

    const [result] = await conn.query(deleteQuery, [id]);
    
    // Ghi log việc xóa dữ liệu vượt giờ cuối kỳ sử dụng pool
    if (result.affectedRows > 0 && deletedData) {
      try {
        const logQuery = `
          INSERT INTO lichsunhaplieu 
          (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
          VALUES (?, ?, ?, ?, ?, NOW())
        `;

        const userId = req.session?.userId || req.session?.userInfo?.ID || 0;
        const tenNhanVien = req.session?.TenNhanVien || req.session?.username || 'Unknown User';
        const khoa = req.session?.MaPhongBan || deletedData.khoa || 'Unknown Department';
        const loaiThongTin = 'Thay đổi thông tin vượt giờ';
        const changeMessage = `${tenNhanVien} đã xóa dữ liệu vượt giờ cuối kỳ: "${deletedData.tenhocphan}" - Lớp: ${deletedData.lophocphan}, Giảng viên: ${deletedData.giangvien}, Hình thức: ${deletedData.hinhthuc}, Học kỳ: ${deletedData.ki}, Năm học: ${deletedData.namhoc}, Khoa: ${deletedData.khoa}, Quy chuẩn: ${deletedData.sotietqc}.`;
        
        await pool.query(logQuery, [
          userId,
          tenNhanVien,
          khoa,
          loaiThongTin,
          changeMessage
        ]);
      } catch (logError) {
        console.error("Lỗi khi ghi log:", logError);
        // Không throw error để không ảnh hưởng đến việc xóa chính
      }
    }

    conn.release();

    if (result.affectedRows > 0) {
      res.json({ success: true, message: "Xóa dữ liệu thành công" });
    } else {
      res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu để xóa" });
    }
  } catch (error) {
    console.error("Lỗi khi xóa dữ liệu:", error);
    res.status(500).json({ success: false, error: "Lỗi khi xóa dữ liệu" });
  }
};

const updateData = async (req, res) => {
  try {

    const dataList = req.body.data; // ⬅️ data là một mảng
    if (!Array.isArray(dataList)) {
      return res.status(400).json({ error: "Dữ liệu không hợp lệ" });
    }
    const conn = await createPoolConnection();

    for (const item of dataList) {
      const { loai, id, tenHocPhan, lopHocPhan } = item; // Lấy loai và id từ từng phần tử trong mảng
      let section, soBaiCham1, soBaiCham2, tongSoBai, soTietQC;

      // Lấy thông tin dữ liệu cũ trước khi cập nhật để ghi log
      const getOldDataQuery = `SELECT * FROM ketthuchocphan WHERE id = ?`;
      const [oldDataRows] = await conn.query(getOldDataQuery, [id]);
      const oldData = oldDataRows[0];

      if (loai === "Ra Đề") {
        section = "Ra Đề";
        soBaiCham1 = 0;
        soBaiCham2 = 0;
        tongSoBai = item.soDe || 0;
        soTietQC = item.soTietQC || 0;
        khoaduyet = item.khoaduyet || 0;
        khaothiduyet = item.khaothiduyet || 0;
      } else if (loai === "Coi Thi") {
        section = "Coi Thi";
        soBaiCham1 = 0;
        soBaiCham2 = 0;
        tongSoBai = item.soCa || 0;
        soTietQC = item.soTietQC || 0;
        khoaduyet = item.khoaduyet || 0;
        khaothiduyet = item.khaothiduyet || 0;
      } else if (loai === "Chấm Thi") {
        section = "Chấm Thi";
        soBaiCham1 = item.soBaiCham1;
        soBaiCham2 = item.soBaiCham2;
        tongSoBai = item.tongSoBai || 0;
        soTietQC = item.soTietQC || 0;
        khoaduyet = item.khoaduyet || 0;
        khaothiduyet = item.khaothiduyet || 0;
      }
      

      const query = `
        UPDATE ketthuchocphan 
        SET tenhocphan = ?, lophocphan = ?, hinhthuc = ?, baicham1 = ?, baicham2 = ?, tongso = ?, sotietqc = ?, khoaduyet = ?, khaothiduyet = ?
        WHERE id = ?
      `;

      const [result] = await conn.query(query, [
        tenHocPhan,
        lopHocPhan,
        section,
        soBaiCham1,
        soBaiCham2,
        tongSoBai,
        soTietQC,
        khoaduyet,
        khaothiduyet,
        id
      ]);

      // Ghi log việc cập nhật và duyệt dữ liệu đánh giá cuối kỳ sử dụng pool
      if (result.affectedRows > 0 && oldData) {
        try {
          // Tạo message chi tiết về những thay đổi - chuyển đổi về số để so sánh chính xác
          let changes = [];
          if (oldData.tenhocphan !== tenHocPhan) changes.push(`Tên HP: "${oldData.tenhocphan}" → "${tenHocPhan}"`);
          if (oldData.lophocphan !== lopHocPhan) changes.push(`Lớp: "${oldData.lophocphan}" → "${lopHocPhan}"`);
          if (oldData.hinhthuc !== section) changes.push(`Hình thức: "${oldData.hinhthuc}" → "${section}"`);
          
          // So sánh số cho các trường số
          const oldSoTietQC = parseInt(oldData.sotietqc) || 0;
          const newSoTietQC = parseInt(soTietQC) || 0;
          const oldTongSo = parseInt(oldData.tongso) || 0;
          const newTongSo = parseInt(tongSoBai) || 0;
          
          if (oldSoTietQC !== newSoTietQC) changes.push(`Quy chuẩn: ${oldSoTietQC} → ${newSoTietQC}`);
          if (oldTongSo !== newTongSo) changes.push(`Tổng số: ${oldTongSo} → ${newTongSo}`);
          
          // Ghi log các thay đổi về duyệt - chuyển đổi về số để so sánh chính xác
          const oldKhoaDuyet = parseInt(oldData.khoaduyet) || 0;
          const newKhoaDuyet = parseInt(khoaduyet) || 0;
          const oldKhaoThiDuyet = parseInt(oldData.khaothiduyet) || 0;
          const newKhaoThiDuyet = parseInt(khaothiduyet) || 0;
          
          if (oldKhoaDuyet !== newKhoaDuyet) {
            const khoaAction = newKhoaDuyet === 1 ? 'đã duyệt' : 'hủy duyệt';
            changes.push(`Khoa ${khoaAction}`);
          }
          if (oldKhaoThiDuyet !== newKhaoThiDuyet) {
            const khaothiAction = newKhaoThiDuyet === 1 ? 'đã duyệt' : 'hủy duyệt';
            changes.push(`Khảo thí ${khaothiAction}`);
          }
          
          // Chỉ ghi log khi có thay đổi thực sự
          if (changes.length > 0) {
            const logQuery = `
              INSERT INTO lichsunhaplieu 
              (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
              VALUES (?, ?, ?, ?, ?, NOW())
            `;

            const userId = req.session?.userId || req.session?.userInfo?.ID || 0;
            const tenNhanVien = req.session?.TenNhanVien || req.session?.username || 'Unknown User';
            const khoa = req.session?.MaPhongBan || oldData.khoa || 'Unknown Department';
            const loaiThongTin = 'Thay đổi thông tin vượt giờ';
            
            const changeMessage = `${tenNhanVien} đã cập nhật dữ liệu cuối kỳ cho "${oldData.tenhocphan}": ${changes.join(', ')}.`;
            
            await pool.query(logQuery, [
              userId,
              tenNhanVien,
              khoa,
              loaiThongTin,
              changeMessage
            ]);
          }
        } catch (logError) {
          console.error("Lỗi khi ghi log:", logError);
          // Không throw error để không ảnh hưởng đến việc cập nhật chính
        }
      }
    }

    conn.release();
    res.json({ 
      message: "Cập nhật dữ liệu thành công!",
      success: true
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu:", error);
    res.status(500).json({ error: "Lỗi khi cập nhật dữ liệu" });
  }
};

const getSuggestions = async (req, res) => {
  try {
    const conn = await createPoolConnection();

    const searchQuery = `
      SELECT TenNhanVien, MaPhongBan
      FROM nhanvien 
    `;

    const [rows] = await conn.query(searchQuery);
    conn.release();

    res.json(rows);
  } catch (error) {
    console.error("Lỗi khi lấy gợi ý:", error);
    res.status(500).json({ error: "Lỗi khi lấy gợi ý" });
  }
};

const getNameSuggestions = async (req, res) => {
  try {
    const { MaPhongBan } = req.query; // Lấy MaPhongBan từ query string
    const conn = await createPoolConnection();

    const searchQuery = `
      SELECT TenNhanVien
      FROM nhanvien
      WHERE MaPhongBan = ?
    `;

    const [rows] = await conn.query(searchQuery, [MaPhongBan]);
    conn.release();

    res.json(rows);
  } catch (error) {
    console.error("Lỗi khi lấy gợi ý:", error);
    res.status(500).json({ error: "Lỗi khi lấy gợi ý" });
  }
};


module.exports = {
  getWorkload,
  readFileExcel,
  addWorkloadEntry,
  importWorkloadToDB,
  deleteWorkloadData,
  saveWorkloadData,
  checkDataExistence,
  getList,
  saveData,
  insertMyData,
  getMyList,
  updateMyData,
  deleteMyData,
  updateData,
  getSuggestions,
  getNameSuggestions,
  
};
