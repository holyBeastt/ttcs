const createPoolConnection = require("../config/databasePool");
const ExcelJS = require("exceljs");

const updateQuyChuan = async (req, res) => {
  const { updates } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();

    // Bắt đầu transaction
    await connection.beginTransaction();

    // Cập nhật từng bản ghi
    for (const update of updates) {
      const { data, colName, newValue } = update;
      
      // Tạo câu query cập nhật
      const query = `
        UPDATE quychuan 
        SET ${colName} = ? 
        WHERE Khoa = ? 
        AND Dot = ? 
        AND KiHoc = ? 
        AND NamHoc = ? 
        AND LopHocPhan = ?
      `;

      // Thực thi câu query với các tham số
      await connection.query(query, [
        newValue,
        data.Khoa,
        data.Dot,
        data.KiHoc,
        data.NamHoc,
        data.LopHocPhan
      ]);
    }

    // Commit transaction nếu tất cả cập nhật thành công
    await connection.commit();

    res.json({
      success: true,
      message: "Cập nhật dữ liệu thành công!"
    });

  } catch (error) {
    // Rollback nếu có lỗi
    if (connection) {
      await connection.rollback();
    }
    
    console.error("Lỗi khi cập nhật dữ liệu:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật dữ liệu!"
    });
  } finally {
    // Đóng kết nối
    if (connection) {
      connection.release();
    }
  }
};

const requestQuyChuanEdit = async (req, res) => {
  const { updates } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();

    // Bắt đầu transaction
    await connection.beginTransaction();

    // Lưu từng yêu cầu chỉnh sửa
    for (const update of updates) {
      const { data, colName, newValue, originalValue } = update;
      
      // Kiểm tra xem có yêu cầu chỉnh sửa nào đang chờ duyệt cho cùng một lớp học phần không
      const checkQuery = `
        SELECT id FROM quy_chuan_edit_requests 
        WHERE khoa = ? 
        AND dot = ? 
        AND ki_hoc = ? 
        AND nam_hoc = ? 
        AND lop_hoc_phan = ? 
        AND status IS NULL
      `;
      
      const [existingRequests] = await connection.query(checkQuery, [
        data.Khoa,
        data.Dot,
        data.KiHoc,
        data.NamHoc,
        data.LopHocPhan
      ]);

      // Nếu giá trị chỉnh sửa là rỗng, xóa request khỏi bảng quy_chuan_edit_requests
      if (!newValue || newValue.trim() === "") {
        await connection.query(
          `DELETE FROM quy_chuan_edit_requests WHERE khoa = ? AND dot = ? AND ki_hoc = ? AND nam_hoc = ? AND lop_hoc_phan = ? AND status IS NULL`,
          [
            data.Khoa,
            data.Dot,
            data.KiHoc,
            data.NamHoc,
            data.LopHocPhan
          ]
        );
        continue;
      }

      // Nếu có yêu cầu đang chờ duyệt, cập nhật yêu cầu đó
      if (existingRequests.length > 0) {
        const updateQuery = `
          UPDATE quy_chuan_edit_requests 
          SET old_value = ?, 
              new_value = ?,
              created_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        
        await connection.query(updateQuery, [
          originalValue,
          newValue,
          existingRequests[0].id
        ]);
      } else {
        // Nếu không có yêu cầu đang chờ duyệt, tạo yêu cầu mới
        // Lấy ten_lop từ bảng quychuan
        const [rows] = await connection.query(
          `SELECT TenLop FROM quychuan WHERE Khoa = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ? AND LopHocPhan = ? LIMIT 1`,
          [
            data.Khoa,
            data.Dot,
            data.KiHoc,
            data.NamHoc,
            data.LopHocPhan
          ]
        );
        const tenLop = rows[0]?.TenLop || '';
        const insertQuery = `
          INSERT INTO quy_chuan_edit_requests 
          (khoa, dot, ki_hoc, nam_hoc, lop_hoc_phan, ten_lop, column_name, old_value, new_value)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await connection.query(insertQuery, [
          data.Khoa,
          data.Dot,
          data.KiHoc,
          data.NamHoc,
          data.LopHocPhan,
          tenLop,
          colName,
          originalValue,
          newValue
        ]);
      }
    }

    // Commit transaction
    await connection.commit();

    res.json({
      success: true,
      message: "Yêu cầu chỉnh sửa đã được gửi thành công!"
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    
    console.error("Lỗi khi gửi yêu cầu chỉnh sửa:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi gửi yêu cầu chỉnh sửa!"
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const getQuyChuanEditRequests = async (req, res) => {
  // Lấy params từ body
  const { dot, ki_hoc, nam_hoc, khoa } = req.body;
  
  let connection;

  try {
    connection = await createPoolConnection();

    let query = `
      SELECT 
        id,
        khoa,
        dot,
        ki_hoc,
        nam_hoc,
        lop_hoc_phan,
        ten_lop,
        column_name,
        old_value,
        new_value,
        khoa_duyet,
        daotao_duyet,
        bgd_duyet,
        status,
        created_at
      FROM quy_chuan_edit_requests 
      WHERE 1=1
    `;
    const queryParams = [];

    if (dot) {
      query += " AND dot = ?";
      queryParams.push(dot);
    }
    if (ki_hoc) {
      query += " AND ki_hoc = ?";
      queryParams.push(ki_hoc);
    }
    if (nam_hoc) {
      query += " AND nam_hoc = ?";
      queryParams.push(nam_hoc);
    }
    if (khoa && khoa !== "ALL") {
      query += " AND khoa = ?";
      queryParams.push(khoa);
    }

    query += " ORDER BY created_at DESC";

    console.log("Executing query:", query);
    console.log("With params:", queryParams);

    const [requests] = await connection.query(query, queryParams);
    console.log("Query result:", requests);

    // Trả về response với format chuẩn
    res.json({
      success: true,
      data: requests
    });

  } catch (error) {
    console.error("Lỗi khi lấy danh sách yêu cầu chỉnh sửa:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi lấy danh sách yêu cầu chỉnh sửa!",
      error: error.message
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const updateQuyChuanApproval = async (req, res) => {
  const { requestId, approvalType, isApproved } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    // Update the approval status
    const updateQuery = `
      UPDATE quy_chuan_edit_requests 
      SET ${approvalType}_duyet = ? 
      WHERE id = ?
    `;
    await connection.query(updateQuery, [isApproved, requestId]);

    // Check if all approvals are granted
    const checkQuery = `
      SELECT khoa_duyet, daotao_duyet, bgd_duyet 
      FROM quy_chuan_edit_requests 
      WHERE id = ?
    `;
    const [approvals] = await connection.query(checkQuery, [requestId]);
    
    const allApproved = approvals[0].khoa_duyet && 
                       approvals[0].daotao_duyet && 
                       approvals[0].bgd_duyet;

    await connection.commit();

    res.json({
      success: true,
      allApproved,
      requestId
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Lỗi khi cập nhật trạng thái duyệt:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật trạng thái duyệt!"
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const applyQuyChuanEdit = async (req, res) => {
  const { requestId } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    // Get the edit request
    const [request] = await connection.query(
      "SELECT * FROM quy_chuan_edit_requests WHERE id = ?",
      [requestId]
    );

    if (!request[0]) {
      throw new Error("Không tìm thấy yêu cầu chỉnh sửa");
    }

    // Update the actual data in quychuan table
    const updateQuery = `
      UPDATE quychuan 
      SET ${request[0].column_name} = ? 
      WHERE Khoa = ? 
      AND Dot = ? 
      AND KiHoc = ? 
      AND NamHoc = ? 
      AND LopHocPhan = ?
    `;

    await connection.query(updateQuery, [
      request[0].new_value,
      request[0].khoa,
      request[0].dot,
      request[0].ki_hoc,
      request[0].nam_hoc,
      request[0].lop_hoc_phan
    ]);

    // Update the status instead of deleting
    await connection.query(
      "UPDATE quy_chuan_edit_requests SET status = 'Cập nhật thành công' WHERE id = ?",
      [requestId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Chỉnh sửa đã được cập nhật thành công!"
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Lỗi khi cập nhật chỉnh sửa:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật chỉnh sửa!"
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const exportAdjustedQuyChuan = async (req, res) => {
  const connection = await createPoolConnection();
  try {
    const { khoa, dot, ki_hoc, nam_hoc } = req.body;

    // Lấy dữ liệu từ database
    const [rows] = await connection.query(
      `SELECT * FROM quy_chuan_edit_requests 
       WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ? 
       ${khoa && khoa !== 'ALL' ? 'AND khoa = ?' : ''}
       AND status = 'Cập nhật thành công'`,
      khoa && khoa !== 'ALL' ? [dot, ki_hoc, nam_hoc, khoa] : [dot, ki_hoc, nam_hoc]
    );

    // Tạo workbook mới
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // Cấu hình trang
    worksheet.pageSetup.paperSize = 9; // A4
    worksheet.pageSetup.orientation = 'landscape';
    worksheet.pageSetup.fitToPage = true;
    worksheet.pageSetup.fitToWidth = 1;
    worksheet.pageSetup.fitToHeight = 0;
    worksheet.pageSetup.margins = {
      left: 0.3149,
      right: 0.3149,
      top: 0.3149,
      bottom: 0.3149,
      header: 0.3149,
      footer: 0.3149
    };

    // Cấu hình mặc định cho toàn bộ worksheet
    worksheet.properties.defaultRowHeight = 30;
    worksheet.properties.defaultColWidth = 25;

    // Thêm header
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A1').font = { bold: true, size: 14, name: 'Times New Roman' };

    worksheet.mergeCells('A2:D2');
    worksheet.getCell('A2').value = 'Độc lập – Tự do – Hạnh phúc';
    worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A2').font = { bold: true, size: 14, name: 'Times New Roman' };

    // Thêm tiêu đề đơn
    worksheet.mergeCells('A4:D4');
    worksheet.getCell('A4').value = 'ĐƠN ĐỀ NGHỊ';
    worksheet.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A4').font = { bold: true, size: 14, name: 'Times New Roman' };

    worksheet.mergeCells('A5:D5');
    worksheet.getCell('A5').value = '(V/v: thay đổi tên giáo viên mời giảng trên TKB học kỳ ' + ki_hoc + ' năm học ' + nam_hoc + ')';
    worksheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A5').font = { italic: true, size: 14, name: 'Times New Roman' };

    // Thêm phần kính gửi
    worksheet.mergeCells('A7:D7');
    worksheet.getCell('A7').value = 'Kính gửi: Phòng Đào Tạo';
    worksheet.getCell('A7').font = {  size: 14, name: 'Times New Roman' };
    worksheet.getCell('A7').alignment = { horizontal: 'center', vertical: 'middle' };


    // Thêm nội dung đơn
    worksheet.mergeCells('A9:D9');
    worksheet.getCell('A9').value = 'Theo kế hoạch giảng dạy học kỳ ' + ki_hoc + ' năm học ' + nam_hoc + 
      ', Khoa ' + khoa + ' có mời một số giảng viên thỉnh giảng tham gia công tác giảng dạy cho Khoa và đã có thời khóa biểu phát hành.';
    worksheet.getCell('A9').alignment = { wrapText: true, vertical: 'middle' };
    worksheet.getCell('A9').font = { size: 14, name: 'Times New Roman' };
    worksheet.getRow(9).height = 50;  // Set height for row 9

    worksheet.mergeCells('A10:D10');
    worksheet.getCell('A10').value = 'Tuy nhiên, trong quá trình thực hiện giảng dạy, một số giáo viên vì lí do riêng không thể thực hiện đúng theo thời khóa biểu nên khoa xin phép được điều chỉnh lại tên các giáo viên mời giảng trên thời khóa biếu như sau:';
    worksheet.getCell('A10').alignment = { wrapText: true, vertical: 'middle' };
    worksheet.getCell('A10').font = { size: 14, name: 'Times New Roman' };
    worksheet.getRow(10).height = 50;  // Set height for row 10

    // Thêm khoảng trống
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Thêm header cho bảng dữ liệu
    const headerRow = worksheet.addRow(['STT', 'Tên môn (Lớp học phần)', 'Giảng viên theo TKB', 'Giảng viên điều chỉnh']);
    headerRow.height = 40; // Tăng chiều cao cho dòng header

    // Định dạng header
    headerRow.eachCell(cell => {
      cell.alignment = { 
        horizontal: 'center', 
        vertical: 'middle',
        wrapText: true
      };
      cell.font = { 
        bold: true, 
        size: 12,
        name: 'Times New Roman'
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Thêm dữ liệu
    rows.forEach((row, index) => {
      const dataRow = worksheet.addRow([
        index + 1,
        row.lop_hoc_phan,
        row.old_value,
        row.new_value
      ]);

      // Định dạng từng ô trong hàng dữ liệu
      dataRow.eachCell(cell => {
        cell.alignment = { 
          horizontal: 'center', 
          vertical: 'middle',
          wrapText: true
        };
        cell.font = { 
          size: 12,
          name: 'Times New Roman'
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Tính toán chiều cao hàng dựa trên nội dung
      const maxLines = Math.max(
        Math.ceil((row.lop_hoc_phan?.length || 0) / 40), // Cột Tên môn
        Math.ceil((row.old_value?.length || 0) / 30),    // Cột Giảng viên theo TKB
        Math.ceil((row.new_value?.length || 0) / 30)     // Cột Giảng viên điều chỉnh
      );
      
      // Đặt chiều cao hàng tối thiểu là 40, và tăng thêm nếu nội dung dài
      dataRow.height = Math.max(40, maxLines * 20);
    });

    // Định dạng độ rộng cột
    worksheet.columns.forEach((column, index) => {
      if (index === 0) { // Cột STT
        column.width = 8;
      } else if (index === 1) { // Cột Tên môn
        column.width = 50; // Tăng độ rộng cho cột tên môn
      } else { // Các cột còn lại
        column.width = 35; // Tăng độ rộng cho các cột giảng viên
      }
    });

    // Thêm viền cho toàn bộ bảng
    const lastRow = worksheet.lastRow;
    const lastCol = worksheet.lastColumn;
    
    for (let i = 13; i <= lastRow.number; i++) {
      for (let j = 1; j <= lastCol.number; j++) {
        const cell = worksheet.getCell(i, j);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        // Đảm bảo wrapText được bật cho tất cả các ô
        cell.alignment = {
          ...cell.alignment,
          wrapText: true
        };
      }
    }
    worksheet.addRow([]);
    
    // Thêm phần kết thúc
    worksheet.mergeCells('A' + (lastRow.number + 2) + ':D' + (lastRow.number + 2));
    worksheet.getCell('A' + (lastRow.number + 2)).value = 'Kính đề nghị Phòng Đào tạo xem xét.';
    worksheet.getCell('A' + (lastRow.number + 2)).alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getCell('A' + (lastRow.number + 2)).font = { size: 14, name: 'Times New Roman' };
    worksheet.getRow(lastRow.number + 2).height = 20;

    worksheet.mergeCells('A' + (lastRow.number + 3) + ':D' + (lastRow.number + 3));
    worksheet.getCell('A' + (lastRow.number + 3)).value = 'Trân trọng cảm ơn!';
    worksheet.getCell('A' + (lastRow.number + 3)).alignment = { horizontal: 'left', vertical: 'middle' };
    worksheet.getCell('A' + (lastRow.number + 3)).font = { size: 14, name: 'Times New Roman' };
    worksheet.getRow(lastRow.number + 3).height = 20;

    worksheet.mergeCells('A' + (lastRow.number + 4) + ':D' + (lastRow.number + 4));
    worksheet.getCell('A' + (lastRow.number + 4)).value = 'Hà Nội , ngày    tháng    năm   ';
    worksheet.getCell('A' + (lastRow.number + 4)).alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getCell('A' + (lastRow.number + 4)).font = { size: 14, name: 'Times New Roman' };
    worksheet.getRow(lastRow.number + 4).height = 20;

    // Thêm dòng chữ ký
    const signatureRow = worksheet.getRow(lastRow.number + 6);
    signatureRow.height = 40;

    // Tạo buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set headers cho response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=quy_chuan_dieu_chinh.xlsx');

    // Gửi file
    res.send(buffer);

  } catch (error) {
    console.error('Error in exportAdjustedQuyChuan:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi xuất file Excel' 
    });
  } finally {
    connection.release();
  }
};

// API lấy danh sách giảng viên cho suggest autocomplete
const getGiangVienList = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const query = `SELECT TenNhanVien, MaPhongBan 
                    FROM nhanvien 
                    WHERE MaPhongBan IN (
                      SELECT DISTINCT MaPhongBan 
                      FROM role 
                      WHERE isKhoa = 1
                    );`;
    const [results] = await connection.query(query);
    res.json(results);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  updateQuyChuan,
  requestQuyChuanEdit,
  getQuyChuanEditRequests,
  updateQuyChuanApproval,
  applyQuyChuanEdit,
  exportAdjustedQuyChuan,
  getGiangVienList,
};
