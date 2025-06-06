const express = require("express");
const multer = require("multer");
const createPoolConnection = require("../config/databasePool");

const getSoHopDongPage = async (req, res) => {
  try {
    // Render the contract numbers page
    res.render('hopdong.soHopDongMoiGiang.ejs', {
      title: 'Quản lý Số Hợp Đồng',
      user: req.user || {}
    });
  } catch (error) {
    console.error('Error rendering so hop dong page:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Lấy danh sách hợp đồng theo điều kiện
const getHopDongList = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa, heDaoTao } = req.query;

    let query = `
      SELECT 
        id_Gvm,
        HoTen,
        SoHopDong,
        SoThanhLyHopDong,
        Dot,
        KiHoc,
        NamHoc,
        MaPhongBan as Khoa,
        he_dao_tao as HeDaoTao,
        NgayBatDau,
        NgayKetThuc
      FROM hopdonggvmoi 
      WHERE 1=1
    `;
    let params = [];

    if (dot) {
      query += ` AND Dot = ?`;
      params.push(dot);
    }
    if (ki) {
      query += ` AND KiHoc = ?`;
      params.push(ki);
    }
    if (nam) {
      query += ` AND NamHoc = ?`;
      params.push(nam);
    }
    if (khoa && khoa !== 'ALL' && khoa !== '') {
      query += ` AND MaPhongBan = ?`;
      params.push(khoa);
    }
    if (heDaoTao && heDaoTao !== '') {
      query += ` AND he_dao_tao = ?`;
      params.push(heDaoTao);
    }

    // Sắp xếp theo khoa, hệ đào tạo, rồi mới đến tên để nhóm theo khoa
    query += ` ORDER BY MaPhongBan, he_dao_tao, HoTen`;

    const [rows] = await connection.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching hop dong list:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách hợp đồng' });
  } finally {
    if (connection) connection.release();
  }
};

// Setup số hợp đồng tự động tăng dần cho toàn bộ
const setupSoHopDongToanBo = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa, heDaoTao, startingNumber } = req.body;

    // Validate input
    if (!dot || !ki || !nam || !startingNumber) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: đợt, kì, năm học, số bắt đầu'
      });
    }

    // Build query để lấy danh sách hợp đồng cần cập nhật, nhóm theo khoa và hệ đào tạo
    let query = `
      SELECT MaHopDong, id_Gvm, HoTen, MaPhongBan, he_dao_tao
      FROM hopdonggvmoi 
      WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?
    `;
    let params = [dot, ki, nam];

    if (khoa && khoa !== 'ALL') {
      query += ` AND MaPhongBan = ?`;
      params.push(khoa);
    }
    if (heDaoTao) {
      query += ` AND he_dao_tao = ?`;
      params.push(heDaoTao);
    }

    // Sắp xếp theo khoa, hệ đào tạo, rồi mới đến tên để đảm bảo số tăng dần theo từng nhóm
    query += ` ORDER BY MaPhongBan, he_dao_tao, HoTen`;

    const [rows] = await connection.execute(query, params);

    if (rows.length === 0) {
      return res.json({ success: false, message: 'Không tìm thấy hợp đồng nào phù hợp điều kiện' });
    }

    // Bắt đầu transaction
    await connection.beginTransaction();

    // Nhóm dữ liệu theo khoa và hệ đào tạo
    const groupedData = {};
    rows.forEach(row => {
      const key = `${row.MaPhongBan}_${row.he_dao_tao || 'null'}`;
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(row);
    });

    let currentNumber = parseInt(startingNumber);
    let updatedCount = 0;

    // Xử lý từng nhóm khoa-hệ đào tạo
    for (const groupKey in groupedData) {
      const group = groupedData[groupKey];

      for (const row of group) {
        // Validate row has required fields
        if (!row.MaHopDong) {
          console.error('Row missing MaHopDong field:', row);
          throw new Error('Database row missing required MaHopDong field');
        }

        const soHopDong = `${String(currentNumber).padStart(3, '0')}/HĐ-ĐT`;

        const updateQuery = `UPDATE hopdonggvmoi SET SoHopDong = ? WHERE MaHopDong = ?`;
        await connection.execute(updateQuery, [soHopDong, row.MaHopDong]);

        currentNumber++;
        updatedCount++;
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Đã cập nhật số hợp đồng cho ${updatedCount} hợp đồng thành công (nhóm theo khoa và hệ đào tạo)`,
      updatedCount
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error setting up so hop dong toan bo:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi setup số hợp đồng: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

// Lấy tổng quan số hợp đồng theo khoa và hệ đào tạo
const getContractSummary = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa, heDaoTao } = req.query;

    let query = `
      SELECT 
        MaPhongBan as khoa,
        he_dao_tao as heDaoTao,
        COUNT(*) as count,
        MIN(SoHopDong) as firstContract,
        MAX(SoHopDong) as lastContract
      FROM hopdonggvmoi 
      WHERE SoHopDong IS NOT NULL AND SoHopDong != ''
    `;
    let params = [];

    if (dot) {
      query += ` AND Dot = ?`;
      params.push(dot);
    }
    if (ki) {
      query += ` AND KiHoc = ?`;
      params.push(ki);
    }
    if (nam) {
      query += ` AND NamHoc = ?`;
      params.push(nam);
    }
    if (khoa && khoa !== 'ALL' && khoa !== '') {
      query += ` AND MaPhongBan = ?`;
      params.push(khoa);
    }
    if (heDaoTao && heDaoTao !== '') {
      query += ` AND he_dao_tao = ?`;
      params.push(heDaoTao);
    }

    query += ` GROUP BY MaPhongBan, he_dao_tao ORDER BY MaPhongBan, he_dao_tao`;

    const [rows] = await connection.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching contract summary:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy tổng quan số hợp đồng' });
  } finally {
    if (connection) connection.release();
  }
};

// Xem trước kết quả setup
const previewSetup = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa, heDaoTao, mode, startingNumber } = req.body;

    let query = `
      SELECT MaHopDong, id_Gvm, HoTen, MaPhongBan as Khoa, he_dao_tao as HeDaoTao, SoHopDong
      FROM hopdonggvmoi 
      WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?
    `;
    let params = [dot, ki, nam];

    if (khoa && khoa !== 'ALL' && khoa !== '') {
      query += ` AND MaPhongBan = ?`;
      params.push(khoa);
    }
    if (heDaoTao && heDaoTao !== '') {
      query += ` AND he_dao_tao = ?`;
      params.push(heDaoTao);
    }

    // Sắp xếp theo khoa, hệ đào tạo, rồi mới đến tên
    query += ` ORDER BY MaPhongBan, he_dao_tao, HoTen`;

    const [rows] = await connection.execute(query, params);

    let preview = [];

    // Nhóm dữ liệu theo khoa và hệ đào tạo
    const groupedData = {};
    rows.forEach(row => {
      const key = `${row.Khoa}_${row.HeDaoTao || 'null'}`;
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(row);
    });

    let currentNumber = parseInt(startingNumber || 1);

    // Xử lý từng nhóm khoa-hệ đào tạo
    for (const groupKey in groupedData) {
      const group = groupedData[groupKey];

      for (const row of group) {
        preview.push({
          ...row,
          newSoHopDong: `${String(currentNumber).padStart(3, '0')}/HĐ-ĐT`,
          groupInfo: `${row.Khoa} - ${row.HeDaoTao || 'Không xác định'}`
        });
        currentNumber++;
      }
    }

    res.json({ success: true, data: preview, total: preview.length });

  } catch (error) {
    console.error('Error previewing setup:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xem trước setup' });
  } finally {
    if (connection) connection.release();
  }
};

// Setup số thanh lý hợp đồng tự động tăng dần cho toàn bộ
const setupSoThanhLyToanBo = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa, heDaoTao, startingNumber } = req.body;

    // Validate input
    if (!dot || !ki || !nam || !startingNumber) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: đợt, kì, năm học, số bắt đầu'
      });
    }

    // Build query để lấy danh sách hợp đồng cần cập nhật, nhóm theo khoa và hệ đào tạo
    let query = `
      SELECT MaHopDong, id_Gvm, HoTen, MaPhongBan, he_dao_tao
      FROM hopdonggvmoi 
      WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?
    `;
    let params = [dot, ki, nam];

    if (khoa && khoa !== 'ALL') {
      query += ` AND MaPhongBan = ?`;
      params.push(khoa);
    }
    if (heDaoTao) {
      query += ` AND he_dao_tao = ?`;
      params.push(heDaoTao);
    }

    // Sắp xếp theo khoa, hệ đào tạo, rồi mới đến tên để đảm bảo số tăng dần theo từng nhóm
    query += ` ORDER BY MaPhongBan, he_dao_tao, HoTen`;

    const [rows] = await connection.execute(query, params);

    if (rows.length === 0) {
      return res.json({ success: false, message: 'Không tìm thấy hợp đồng nào phù hợp điều kiện' });
    }

    // Bắt đầu transaction
    await connection.beginTransaction();

    // Nhóm dữ liệu theo khoa và hệ đào tạo
    const groupedData = {};
    rows.forEach(row => {
      const key = `${row.MaPhongBan}_${row.he_dao_tao || 'null'}`;
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(row);
    });

    let currentNumber = parseInt(startingNumber);
    let updatedCount = 0;

    // Xử lý từng nhóm khoa-hệ đào tạo
    for (const groupKey in groupedData) {
      const group = groupedData[groupKey];

      for (const row of group) {
        // Validate row has required fields
        if (!row.MaHopDong) {
          console.error('Row missing MaHopDong field:', row);
          throw new Error('Database row missing required MaHopDong field');
        }

        const soThanhLy = `${String(currentNumber).padStart(3, '0')}/TLHĐ-ĐT`;

        const updateQuery = `UPDATE hopdonggvmoi SET SoThanhLyHopDong = ? WHERE MaHopDong = ?`;
        await connection.execute(updateQuery, [soThanhLy, row.MaHopDong]);

        currentNumber++;
        updatedCount++;
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Đã cập nhật số thanh lý hợp đồng cho ${updatedCount} hợp đồng thành công (nhóm theo khoa và hệ đào tạo)`,
      updatedCount
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error setting up so thanh ly hop dong:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi setup số thanh lý hợp đồng: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

// Lấy tổng quan số thanh lý hợp đồng theo khoa và hệ đào tạo
const getTerminationSummary = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa, heDaoTao } = req.query;

    let query = `
      SELECT 
        MaPhongBan as khoa,
        he_dao_tao as heDaoTao,
        COUNT(*) as count,
        MIN(SoThanhLyHopDong) as firstTermination,
        MAX(SoThanhLyHopDong) as lastTermination
      FROM hopdonggvmoi 
      WHERE SoThanhLyHopDong IS NOT NULL AND SoThanhLyHopDong != ''
    `;
    let params = [];

    if (dot) {
      query += ` AND Dot = ?`;
      params.push(dot);
    }
    if (ki) {
      query += ` AND KiHoc = ?`;
      params.push(ki);
    }
    if (nam) {
      query += ` AND NamHoc = ?`;
      params.push(nam);
    }
    if (khoa && khoa !== 'ALL' && khoa !== '') {
      query += ` AND MaPhongBan = ?`;
      params.push(khoa);
    }
    if (heDaoTao && heDaoTao !== '') {
      query += ` AND he_dao_tao = ?`;
      params.push(heDaoTao);
    }

    query += ` GROUP BY MaPhongBan, he_dao_tao ORDER BY MaPhongBan, he_dao_tao`;

    const [rows] = await connection.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching termination summary:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy tổng quan số thanh lý hợp đồng' });
  } finally {
    if (connection) connection.release();
  }
};

// Xem trước kết quả setup số thanh lý
const previewTerminationSetup = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa, heDaoTao, mode, startingNumber } = req.body;

    let query = `
      SELECT MaHopDong, id_Gvm, HoTen, MaPhongBan as Khoa, he_dao_tao as HeDaoTao, SoThanhLyHopDong
      FROM hopdonggvmoi 
      WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?
    `;
    let params = [dot, ki, nam];

    if (khoa && khoa !== 'ALL' && khoa !== '') {
      query += ` AND MaPhongBan = ?`;
      params.push(khoa);
    }
    if (heDaoTao && heDaoTao !== '') {
      query += ` AND he_dao_tao = ?`;
      params.push(heDaoTao);
    }

    // Sắp xếp theo khoa, hệ đào tạo, rồi mới đến tên
    query += ` ORDER BY MaPhongBan, he_dao_tao, HoTen`;

    const [rows] = await connection.execute(query, params);

    let preview = [];

    // Nhóm dữ liệu theo khoa và hệ đào tạo
    const groupedData = {};
    rows.forEach(row => {
      const key = `${row.Khoa}_${row.HeDaoTao || 'null'}`;
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(row);
    });

    let currentNumber = parseInt(startingNumber || 1);

    // Xử lý từng nhóm khoa-hệ đào tạo
    for (const groupKey in groupedData) {
      const group = groupedData[groupKey];

      for (const row of group) {
        preview.push({
          ...row,
          newSoThanhLy: `${String(currentNumber).padStart(3, '0')}/TLHĐ-ĐT`,
          groupInfo: `${row.Khoa} - ${row.HeDaoTao || 'Không xác định'}`
        });
        currentNumber++;
      }
    }

    res.json({ success: true, data: preview, total: preview.length });

  } catch (error) {
    console.error('Error previewing termination setup:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xem trước setup số thanh lý' });
  } finally {
    if (connection) connection.release();
  }
};

// Synchronized setup functions for both contract and termination numbers
const previewSynchronizedSetup = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa, heDaoTao, startingNumber } = req.body;

    let query = `
      SELECT 
        MaHopDong,
        HoTen,
        SoHopDong,
        SoThanhLyHopDong,
        Dot,
        KiHoc,
        NamHoc,
        MaPhongBan as Khoa,
        he_dao_tao as HeDaoTao
      FROM hopdonggvmoi 
      WHERE 1=1
    `;
    let params = [];

    if (dot) {
      query += ` AND Dot = ?`;
      params.push(dot);
    }
    if (ki) {
      query += ` AND KiHoc = ?`;
      params.push(ki);
    }
    if (nam) {
      query += ` AND NamHoc = ?`;
      params.push(nam);
    }
    if (khoa && khoa !== 'ALL') {
      query += ` AND MaPhongBan = ?`;
      params.push(khoa);
    }
    if (heDaoTao) {
      query += ` AND he_dao_tao = ?`;
      params.push(heDaoTao);
    }

    // Sắp xếp theo khoa, hệ đào tạo, rồi mới đến tên
    query += ` ORDER BY MaPhongBan, he_dao_tao, HoTen`;

    const [rows] = await connection.execute(query, params);

    let preview = [];

    // Nhóm dữ liệu theo khoa và hệ đào tạo
    const groupedData = {};
    rows.forEach(row => {
      const key = `${row.Khoa}_${row.HeDaoTao || 'null'}`;
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(row);
    });

    let currentNumber = parseInt(startingNumber || 1);

    // Xử lý từng nhóm khoa-hệ đào tạo
    for (const groupKey in groupedData) {
      const group = groupedData[groupKey];

      for (const row of group) {
        const numberStr = String(currentNumber).padStart(3, '0');
        preview.push({
          ...row,
          newSoHopDong: `${numberStr}/HĐ-ĐT`,
          newSoThanhLy: `${numberStr}/TLHĐ-ĐT`,
          groupInfo: `${row.Khoa} - ${row.HeDaoTao || 'Không xác định'}`
        });
        currentNumber++;
      }
    }

    res.json({ success: true, data: preview, total: preview.length });

  } catch (error) {
    console.error('Error previewing synchronized setup:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xem trước setup đồng bộ' });
  } finally {
    if (connection) connection.release();
  }
};

const setupSynchronizedNumbers = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa, heDaoTao, startingNumber } = req.body;

    await connection.beginTransaction();

    let query = `
      SELECT 
        MaHopDong,
        HoTen,
        MaPhongBan,
        he_dao_tao
      FROM hopdonggvmoi 
      WHERE 1=1
    `;
    let params = [];

    if (dot) {
      query += ` AND Dot = ?`;
      params.push(dot);
    }
    if (ki) {
      query += ` AND KiHoc = ?`;
      params.push(ki);
    }
    if (nam) {
      query += ` AND NamHoc = ?`;
      params.push(nam);
    }
    if (khoa && khoa !== 'ALL') {
      query += ` AND MaPhongBan = ?`;
      params.push(khoa);
    }
    if (heDaoTao) {
      query += ` AND he_dao_tao = ?`;
      params.push(heDaoTao);
    }

    // Sắp xếp theo khoa, hệ đào tạo, rồi mới đến tên
    query += ` ORDER BY MaPhongBan, he_dao_tao, HoTen`;

    const [rows] = await connection.execute(query, params);

    // Nhóm dữ liệu theo khoa và hệ đào tạo
    const groupedData = {};
    rows.forEach(row => {
      const key = `${row.MaPhongBan}_${row.he_dao_tao || 'null'}`;
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(row);
    });

    let currentNumber = parseInt(startingNumber || 1);
    let updatedCount = 0;

    // Xử lý từng nhóm khoa-hệ đào tạo
    for (const groupKey in groupedData) {
      const group = groupedData[groupKey];

      for (const row of group) {
        const numberStr = String(currentNumber).padStart(3, '0');
        const contractNumber = `${numberStr}/HĐ-ĐT`;
        const terminationNumber = `${numberStr}/TLHĐ-ĐT`;

        await connection.execute(
          `UPDATE hopdonggvmoi 
           SET SoHopDong = ?, SoThanhLyHopDong = ? 
           WHERE MaHopDong = ?`,
          [contractNumber, terminationNumber, row.MaHopDong]
        );

        currentNumber++;
        updatedCount++;
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Cài đặt đồng bộ thành công cho ${updatedCount} hợp đồng (nhóm theo khoa và hệ đào tạo)`,
      updatedCount: updatedCount
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error setting up synchronized numbers:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cài đặt đồng bộ số hợp đồng và thanh lý' });
  } finally {
    if (connection) connection.release();
  }
};

// Lấy tổng quan hợp nhất số hợp đồng và thanh lý theo khoa và hệ đào tạo
const getUnifiedSummary = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa, heDaoTao } = req.query;

    let query = `
      SELECT 
        MaPhongBan as khoa,
        he_dao_tao as heDaoTao,
        COUNT(*) as count,
        MIN(CASE WHEN SoHopDong IS NOT NULL AND SoHopDong != '' 
            THEN CAST(SUBSTRING_INDEX(SoHopDong, '/', 1) AS UNSIGNED) END) as firstIndex,
        MAX(CASE WHEN SoHopDong IS NOT NULL AND SoHopDong != '' 
            THEN CAST(SUBSTRING_INDEX(SoHopDong, '/', 1) AS UNSIGNED) END) as lastIndex,
        MIN(SoHopDong) as firstContract,
        MAX(SoHopDong) as lastContract,
        MIN(SoThanhLyHopDong) as firstTermination,
        MAX(SoThanhLyHopDong) as lastTermination
      FROM hopdonggvmoi 
      WHERE (SoHopDong IS NOT NULL AND SoHopDong != '') 
         OR (SoThanhLyHopDong IS NOT NULL AND SoThanhLyHopDong != '')
    `;
    let params = [];

    if (dot) {
      query += ` AND Dot = ?`;
      params.push(dot);
    }
    if (ki) {
      query += ` AND KiHoc = ?`;
      params.push(ki);
    }
    if (nam) {
      query += ` AND NamHoc = ?`;
      params.push(nam);
    }
    if (khoa && khoa !== 'ALL') {
      query += ` AND MaPhongBan = ?`;
      params.push(khoa);
    }
    if (heDaoTao) {
      query += ` AND he_dao_tao = ?`;
      params.push(heDaoTao);
    }

    query += ` GROUP BY MaPhongBan, he_dao_tao ORDER BY MaPhongBan, he_dao_tao`;

    const [rows] = await connection.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching unified summary:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy tổng quan hợp nhất' });
  } finally {
    if (connection) connection.release();
  }
};

// ===== THESIS PROJECT (ĐỒ ÁN) FUNCTIONS =====

// Lấy trang quản lý số quyết định đồ án
const getDoAnPage = async (req, res) => {
  try {
    // Render the thesis project numbers page
    res.render('hopdong.soHopDongDoAn.ejs', {
      title: 'Quản lý Số Quyết Định Đồ Án',
      user: req.user || {}
    });
  } catch (error) {
    console.error('Error rendering so do an page:', error);
    res.status(500).send('Internal Server Error');
  }
};

// Lấy danh sách đồ án theo điều kiện
const getDoAnList = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa } = req.query;
    
    let query = `
SELECT 
  ed.CCCD,
  ed.DienThoai,
  ed.Email,
  ed.MaSoThue,
  ed.GiangVien as 'HoTen',
  ed.NgaySinh,
  ed.NgayCapCCCD,
  ed.GioiTinh,
  ed.STK,
  ed.HocVi,
  ed.ChucVu,
  ed.HSL,
  ed.NoiCapCCCD,
  ed.DiaChi,
  ed.NganHang,
  ed.NoiCongTac,
  ed.Dot,
  ed.KhoaDaoTao,
  MIN(ed.NgayBatDau) AS NgayBatDau,
  MAX(ed.NgayKetThuc) AS NgayKetThuc,
  SUM(ed.SoTiet) AS SoTiet,
  ed.NamHoc,
  gv.MaPhongBan,
  MAX(ed.SoHopDong) as SoHopDong,
  MAX(ed.SoThanhLyHopDong) as SoThanhLyHopDong
FROM
  gvmoi gv
JOIN 
  exportdoantotnghiep ed ON gv.CCCD = ed.CCCD
WHERE 
  ed.Dot = ? AND ed.Ki = ? AND ed.NamHoc = ?
`;

    let params = [dot, ki, nam];

    // Xử lý trường hợp có khoa
    if (khoa && khoa !== "ALL") {
      query += ` AND gv.MaPhongBan LIKE ?`;
      params.push(`%${khoa}%`);
    }

    query += `
GROUP BY 
  ed.CCCD, ed.DienThoai, ed.Email, ed.MaSoThue, ed.GiangVien, ed.NgaySinh, ed.HocVi, ed.ChucVu, 
  ed.HSL, ed.NoiCapCCCD, ed.DiaChi, ed.NganHang, ed.NoiCongTac, ed.STK, ed.GioiTinh,
  ed.Dot, ed.KhoaDaoTao, ed.NamHoc, gv.MaPhongBan, ed.NgayCapCCCD, ed.Ki
ORDER BY gv.MaPhongBan, ed.GiangVien
`;
    
    const [rows] = await connection.execute(query, params);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching do an list:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách đồ án' });
  } finally {
    if (connection) connection.release();
  }
};

// Setup số quyết định đồ án tự động tăng dần cho toàn bộ
const setupSoQDDoAnToanBo = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa, startingNumber } = req.body;

    // Validate input
    if (!dot || !ki || !nam || !startingNumber) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: đợt, kì, năm học, số bắt đầu'
      });
    }

    // Build query để lấy danh sách đồ án cần cập nhật, nhóm theo khoa
    let query = `
      SELECT ID, SinhVien, GiangVien, MaPhongBan, TenDeTai
      FROM exportdoantotnghiep 
      WHERE Dot = ? AND ki = ? AND NamHoc = ?
    `;
    let params = [dot, ki, nam];

    if (khoa && khoa !== 'ALL') {
      query += ` AND MaPhongBan = ?`;
      params.push(khoa);
    }

    // Sắp xếp theo khoa, rồi mới đến tên để đảm bảo số tăng dần theo từng nhóm
    query += ` ORDER BY MaPhongBan, GiangVien, SinhVien`;

    const [rows] = await connection.execute(query, params);

    if (rows.length === 0) {
      return res.json({ success: false, message: 'Không tìm thấy đồ án nào phù hợp điều kiện' });
    }

    // Bắt đầu transaction
    await connection.beginTransaction();

    // Nhóm dữ liệu theo khoa
    const groupedData = {};
    rows.forEach(row => {
      const key = row.MaPhongBan;
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(row);
    });

    let currentNumber = parseInt(startingNumber);
    let updatedCount = 0;

    // Xử lý từng nhóm khoa
    for (const groupKey in groupedData) {
      const group = groupedData[groupKey];

      for (const row of group) {
        // Validate row has required fields
        if (!row.ID) {
          console.error('Row missing ID field:', row);
          throw new Error('Database row missing required ID field');
        }
        const soHopDong = `${String(currentNumber).padStart(3, '0')}/HĐ-ĐA`;
        const soThanhLyHopDong = `${String(currentNumber).padStart(3, '0')}/TLHĐ-ĐA`;

        const updateQuery = `UPDATE exportdoantotnghiep SET SoHopDong = ?, SoThanhLyHopDong = ? WHERE ID = ?`;
        await connection.execute(updateQuery, [soHopDong, soThanhLyHopDong, row.ID]);

        currentNumber++;
        updatedCount++;
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Đã cập nhật số quyết định đồ án cho ${updatedCount} đồ án thành công (nhóm theo khoa)`,
      updatedCount
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error setting up so qd do an toan bo:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi setup số quyết định đồ án: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
};

// Lấy tổng quan số quyết định đồ án theo khoa
const getDoAnSummary = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa } = req.query; let query = `
      SELECT 
        MaPhongBan as khoa,
        COUNT(*) as count,
        MIN(SoHopDong) as firstContract,
        MAX(SoHopDong) as lastContract,
        MIN(SoThanhLyHopDong) as firstTermination,
        MAX(SoThanhLyHopDong) as lastTermination
      FROM exportdoantotnghiep 
      WHERE SoHopDong IS NOT NULL AND SoHopDong != ''
    `;
    let params = [];

    if (dot) {
      query += ` AND Dot = ?`;
      params.push(dot);
    }
    if (ki) {
      query += ` AND ki = ?`;
      params.push(ki);
    }
    if (nam) {
      query += ` AND NamHoc = ?`;
      params.push(nam);
    }
    if (khoa && khoa !== 'ALL' && khoa !== '') {
      query += ` AND MaPhongBan = ?`;
      params.push(khoa);
    }

    query += ` GROUP BY MaPhongBan ORDER BY MaPhongBan`;

    const [rows] = await connection.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching do an summary:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy tổng quan số hợp đồng & thanh lý đồ án' });
  } finally {
    if (connection) connection.release();
  }
};

// Xem trước kết quả setup đồ án
const previewDoAnSetup = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa, startingNumber } = req.body;

    let query = `
SELECT 
  ed.CCCD,
  ed.DienThoai,
  ed.Email,
  ed.MaSoThue,
  ed.GiangVien as 'HoTen',
  ed.NgaySinh,
  ed.NgayCapCCCD,
  ed.GioiTinh,
  ed.STK,
  ed.HocVi,
  ed.ChucVu,
  ed.HSL,
  ed.NoiCapCCCD,
  ed.DiaChi,
  ed.NganHang,
  ed.NoiCongTac,
  ed.Dot,
  ed.KhoaDaoTao,
  MIN(ed.NgayBatDau) AS NgayBatDau,
  MAX(ed.NgayKetThuc) AS NgayKetThuc,
  SUM(ed.SoTiet) AS SoTiet,
  ed.NamHoc,
  gv.MaPhongBan as Khoa,
  MAX(ed.SoHopDong) as SoHopDong,
  MAX(ed.SoThanhLyHopDong) as SoThanhLyHopDong
FROM
  gvmoi gv
JOIN 
  exportdoantotnghiep ed ON gv.CCCD = ed.CCCD
WHERE 
  ed.Dot = ? AND ed.Ki = ? AND ed.NamHoc = ?
`;
    let params = [dot, ki, nam];

    // Xử lý trường hợp có khoa
    if (khoa && khoa !== "ALL") {
      query += ` AND gv.MaPhongBan LIKE ?`;
      params.push(`%${khoa}%`);
    }

    query += `
GROUP BY 
  ed.CCCD, ed.DienThoai, ed.Email, ed.MaSoThue, ed.GiangVien, ed.NgaySinh, ed.HocVi, ed.ChucVu, 
  ed.HSL, ed.NoiCapCCCD, ed.DiaChi, ed.NganHang, ed.NoiCongTac, ed.STK, ed.GioiTinh,
  ed.Dot, ed.KhoaDaoTao, ed.NamHoc, gv.MaPhongBan, ed.NgayCapCCCD, ed.Ki
ORDER BY gv.MaPhongBan, ed.GiangVien
`;

    const [rows] = await connection.execute(query, params);

    let preview = [];

    // Nhóm dữ liệu theo khoa
    const groupedData = {};
    rows.forEach(row => {
      const key = row.Khoa;
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(row);
    });

    let currentNumber = parseInt(startingNumber || 1);

    // Xử lý từng nhóm khoa
    for (const groupKey in groupedData) {
      const group = groupedData[groupKey];

      for (const row of group) {
        preview.push({
          ...row,
          newSoHopDong: `${String(currentNumber).padStart(3, '0')}/HĐ-ĐA`,
          newSoThanhLyHopDong: `${String(currentNumber).padStart(3, '0')}/TLHĐ-ĐA`,
          groupInfo: `${row.Khoa}`
        });
        currentNumber++;
      }
    }

    res.json({ success: true, data: preview, total: preview.length });

  } catch (error) {
    console.error('Error previewing do an setup:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xem trước setup đồ án' });
  } finally {
    if (connection) connection.release();
  }
};

// Synchronized setup functions for thesis projects
const previewDoAnSynchronizedSetup = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa, startingNumber } = req.body;

    let query = `
SELECT 
  ed.CCCD,
  ed.DienThoai,
  ed.Email,
  ed.MaSoThue,
  ed.GiangVien as 'HoTen',
  ed.NgaySinh,
  ed.NgayCapCCCD,
  ed.GioiTinh,
  ed.STK,
  ed.HocVi,
  ed.ChucVu,
  ed.HSL,
  ed.NoiCapCCCD,
  ed.DiaChi,
  ed.NganHang,
  ed.NoiCongTac,
  ed.Dot,
  ed.KhoaDaoTao,
  MIN(ed.NgayBatDau) AS NgayBatDau,
  MAX(ed.NgayKetThuc) AS NgayKetThuc,
  SUM(ed.SoTiet) AS SoTiet,
  ed.NamHoc,
  gv.MaPhongBan as Khoa,
  MAX(ed.SoHopDong) as SoHopDong,
  MAX(ed.SoThanhLyHopDong) as SoThanhLyHopDong
FROM
  gvmoi gv
JOIN 
  exportdoantotnghiep ed ON gv.CCCD = ed.CCCD
WHERE 
  ed.Dot = ? AND ed.Ki = ? AND ed.NamHoc = ?
`;
    let params = [dot, ki, nam];

    // Xử lý trường hợp có khoa
    if (khoa && khoa !== "ALL") {
      query += ` AND gv.MaPhongBan LIKE ?`;
      params.push(`%${khoa}%`);
    }

    query += `
GROUP BY 
  ed.CCCD, ed.DienThoai, ed.Email, ed.MaSoThue, ed.GiangVien, ed.NgaySinh, ed.HocVi, ed.ChucVu, 
  ed.HSL, ed.NoiCapCCCD, ed.DiaChi, ed.NganHang, ed.NoiCongTac, ed.STK, ed.GioiTinh,
  ed.Dot, ed.KhoaDaoTao, ed.NamHoc, gv.MaPhongBan, ed.NgayCapCCCD, ed.Ki
ORDER BY gv.MaPhongBan, ed.GiangVien
`;

    const [rows] = await connection.execute(query, params);

    let preview = [];

    // Nhóm dữ liệu theo khoa (similar to contract grouping)
    const groupedData = {};
    rows.forEach(row => {
      const key = row.Khoa || 'Không xác định';
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(row);
    });

    let currentNumber = parseInt(startingNumber || 1);

    // Xử lý từng nhóm khoa
    for (const groupKey in groupedData) {
      const group = groupedData[groupKey];

      for (const row of group) {
        const numberStr = String(currentNumber).padStart(3, '0');
        preview.push({
          ...row,
          newSoHopDong: `${numberStr}/HĐ-ĐA`,
          newSoThanhLy: `${numberStr}/TLHĐ-ĐA`,
          groupInfo: `${row.Khoa} - Đồ án tốt nghiệp`
        });
        currentNumber++;
      }
    }

    res.json({ success: true, data: preview, total: preview.length });

  } catch (error) {
    console.error('Error previewing do an synchronized setup:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi xem trước setup đồng bộ đồ án' });
  } finally {
    if (connection) connection.release();
  }
};

const setupDoAnSynchronizedNumbers = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa, startingNumber } = req.body;

    await connection.beginTransaction();

    // Use the same query structure as getDoAnList for consistency
    let query = `
SELECT 
  ed.CCCD,
  ed.GiangVien as 'HoTen',
  gv.MaPhongBan as Khoa
FROM
  gvmoi gv
JOIN 
  exportdoantotnghiep ed ON gv.CCCD = ed.CCCD
WHERE 
  ed.Dot = ? AND ed.Ki = ? AND ed.NamHoc = ?
`;
    let params = [dot, ki, nam];

    if (khoa && khoa !== 'ALL') {
      query += ` AND gv.MaPhongBan LIKE ?`;
      params.push(`%${khoa}%`);
    }

    query += `
GROUP BY 
  ed.CCCD, ed.GiangVien, gv.MaPhongBan
ORDER BY gv.MaPhongBan, ed.GiangVien
`;

    const [rows] = await connection.execute(query, params);

    // Nhóm dữ liệu theo khoa
    const groupedData = {};
    rows.forEach(row => {
      const key = row.Khoa;
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(row);
    });

    let currentNumber = parseInt(startingNumber || 1);
    let updatedCount = 0;

    // Xử lý từng nhóm khoa
    for (const groupKey in groupedData) {
      const group = groupedData[groupKey];

      for (const row of group) {
        const numberStr = String(currentNumber).padStart(3, '0');
        const contractNumber = `${numberStr}/HĐ-ĐA`;
        const terminationNumber = `${numberStr}/TLHĐ-ĐA`;

        // Update all records for this lecturer (CCCD)
        await connection.execute(
          `UPDATE exportdoantotnghiep 
           SET SoHopDong = ?, SoThanhLyHopDong = ? 
           WHERE CCCD = ? AND Dot = ? AND Ki = ? AND NamHoc = ?`,
          [contractNumber, terminationNumber, row.CCCD, dot, ki, nam]
        );

        currentNumber++;
        updatedCount++;
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Cài đặt đồng bộ thành công cho ${updatedCount} giảng viên (số hợp đồng & thanh lý theo khoa)`,
      updatedCount: updatedCount
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error setting up do an synchronized numbers:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi cài đặt đồng bộ số hợp đồng và thanh lý đồ án' });
  } finally {
    if (connection) connection.release();
  }
};

// Lấy tổng quan hợp nhất số quyết định đồ án theo khoa
const getDoAnUnifiedSummary = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const { dot, ki, nam, khoa } = req.query; let query = `
      SELECT 
        MaPhongBan as khoa,
        COUNT(*) as count,
        MIN(CASE WHEN SoHopDong IS NOT NULL AND SoHopDong != '' 
            THEN CAST(SUBSTRING_INDEX(SoHopDong, '/', 1) AS UNSIGNED) END) as firstIndex,
        MAX(CASE WHEN SoHopDong IS NOT NULL AND SoHopDong != '' 
            THEN CAST(SUBSTRING_INDEX(SoHopDong, '/', 1) AS UNSIGNED) END) as lastIndex,
        MIN(SoHopDong) as firstContract,
        MAX(SoHopDong) as lastContract,
        MIN(SoThanhLyHopDong) as firstTermination,
        MAX(SoThanhLyHopDong) as lastTermination
      FROM exportdoantotnghiep 
      WHERE (SoHopDong IS NOT NULL AND SoHopDong != '') 
         OR (SoThanhLyHopDong IS NOT NULL AND SoThanhLyHopDong != '')
    `;
    let params = [];

    if (dot) {
      query += ` AND Dot = ?`;
      params.push(dot);
    }
    if (ki) {
      query += ` AND ki = ?`;
      params.push(ki);
    }
    if (nam) {
      query += ` AND NamHoc = ?`;
      params.push(nam);
    }
    if (khoa && khoa !== 'ALL') {
      query += ` AND MaPhongBan = ?`;
      params.push(khoa);
    }

    query += ` GROUP BY MaPhongBan ORDER BY MaPhongBan`;

    const [rows] = await connection.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching do an unified summary:', error);
    res.status(500).json({ success: false, message: 'Lỗi khi lấy tổng quan hợp nhất đồ án' });
  } finally {
    if (connection) connection.release();
  }
};



module.exports = {
  getSoHopDongPage,
  getHopDongList,
  setupSoHopDongToanBo,
  getContractSummary,
  previewSetup,
  setupSoThanhLyToanBo,
  getTerminationSummary, previewTerminationSetup,
  previewSynchronizedSetup,
  setupSynchronizedNumbers,
  getUnifiedSummary,

  // New functions for thesis projects (đồ án)
  getDoAnPage,
  getDoAnList,
  setupSoHDDoAnToanBo: setupSoQDDoAnToanBo,
  getDoAnSummary,
  previewDoAnSetup,
  previewDoAnSynchronizedSetup,
  setupDoAnSynchronizedNumbers,
  getDoAnUnifiedSummary
};
