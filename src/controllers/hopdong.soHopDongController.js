const express = require("express");
const multer = require("multer");
const createPoolConnection = require("../config/databasePool");

const getSoHopDongPage = async (req, res) => {
  try {
    // Render the contract numbers page
    res.render('hopdong.soHopDong.ejs', {
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
    const { dot, ki, nam, khoa, heDaoTao } = req.query;    let query = `
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

    query += ` ORDER BY HoTen`;

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
    }    // Build query để lấy danh sách hợp đồng cần cập nhật
    let query = `
      SELECT MaHopDong, id_Gvm, HoTen 
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

    query += ` ORDER BY HoTen`;

    const [rows] = await connection.execute(query, params);

    if (rows.length === 0) {
      return res.json({ success: false, message: 'Không tìm thấy hợp đồng nào phù hợp điều kiện' });
    }    // Bắt đầu transaction
    await connection.beginTransaction();

    let currentNumber = parseInt(startingNumber);
    let updatedCount = 0;    for (const row of rows) {
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

    await connection.commit();

    res.json({ 
      success: true, 
      message: `Đã cập nhật số hợp đồng cho ${updatedCount} hợp đồng thành công`,
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
    const { dot, ki, nam, khoa, heDaoTao, mode, startingNumber } = req.body;    let query = `
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
    }    if (mode === 'toan_bo') {
      query += ` ORDER BY HoTen`;
    } else {
      query += ` ORDER BY HoTen`;
    }

    const [rows] = await connection.execute(query, params);    let preview = [];

    // Only support 'toan_bo' mode now
    let currentNumber = parseInt(startingNumber || 1);
    preview = rows.map(row => ({
      ...row,
      newSoHopDong: `${String(currentNumber++).padStart(3, '0')}/HĐ-ĐT`
    }));

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

    // Build query để lấy danh sách hợp đồng cần cập nhật
    let query = `
      SELECT MaHopDong, id_Gvm, HoTen 
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

    query += ` ORDER BY HoTen`;

    const [rows] = await connection.execute(query, params);

    if (rows.length === 0) {
      return res.json({ success: false, message: 'Không tìm thấy hợp đồng nào phù hợp điều kiện' });
    }

    // Bắt đầu transaction
    await connection.beginTransaction();

    let currentNumber = parseInt(startingNumber);
    let updatedCount = 0;

    for (const row of rows) {
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

    await connection.commit();

    res.json({ 
      success: true, 
      message: `Đã cập nhật số thanh lý hợp đồng cho ${updatedCount} hợp đồng thành công`,
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

    query += ` ORDER BY HoTen`;

    const [rows] = await connection.execute(query, params);

    let preview = [];

    // Only support 'toan_bo' mode now
    let currentNumber = parseInt(startingNumber || 1);
    preview = rows.map(row => ({
      ...row,
      newSoThanhLy: `${String(currentNumber++).padStart(3, '0')}/TLHĐ-ĐT`
    }));

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

    query += ` ORDER BY HoTen`;

    const [rows] = await connection.execute(query, params);

    let preview = [];
    let currentNumber = parseInt(startingNumber || 1);
    
    // Generate synchronized preview with same number for both contract and termination
    preview = rows.map(row => {
      const numberStr = String(currentNumber).padStart(3, '0');
      const result = {
        ...row,
        newSoHopDong: `${numberStr}/HĐ-ĐT`,
        newSoThanhLy: `${numberStr}/TLHĐ-ĐT`
      };
      currentNumber++;
      return result;
    });

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
        HoTen
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

    query += ` ORDER BY HoTen`;

    const [rows] = await connection.execute(query, params);

    let currentNumber = parseInt(startingNumber || 1);
    let updatedCount = 0;

    // Update both contract and termination numbers synchronously
    for (const row of rows) {
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

    await connection.commit();

    res.json({
      success: true,
      message: `Cài đặt đồng bộ thành công cho ${updatedCount} hợp đồng`,
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

module.exports = {
  getSoHopDongPage,
  getHopDongList,
  setupSoHopDongToanBo,
  getContractSummary,
  previewSetup,
  setupSoThanhLyToanBo,
  getTerminationSummary,
  previewTerminationSetup,
  previewSynchronizedSetup,
  setupSynchronizedNumbers,
  getUnifiedSummary
};
