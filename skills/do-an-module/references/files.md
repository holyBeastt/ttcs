# Files

## File: src/controllers/chinhSuaDoAnController.js
```javascript
const createPoolConnection = require("../config/databasePool");
const ExcelJS = require("exceljs");

// Hàm ghi log thay đổi thông tin đồ án
const logDoAnChanges = async (connection, oldData, newData, req) => {
  try {
    let changeMessage = '';
    const loaiThongTin = 'Thay đổi thông tin đồ án';
    const userId = req.session?.userId || req.session?.userInfo?.ID || req.user?.id || 1;
    const tenNhanVien = req.session?.TenNhanVien || req.session?.userInfo?.TenNhanVien || req.user?.TenNhanVien || 'Unknown';
    const khoa = req.session?.MaPhongBan || req.session?.userInfo?.MaPhongBan || req.user?.MaPhongBan || req.session?.Khoa || req.user?.Khoa || 'Unknown';
    // Kiểm tra cột GiangVien1
    if (String(oldData.GiangVien1 || '') !== String(newData.GiangVien1 || '')) {
      changeMessage = changeMessage + `Giảng Viên 1 cho đồ án "${newData.TenDeTai}": từ "${oldData.GiangVien1 || ''}" thành "${newData.GiangVien1 || ''}". `;
    }

    // Kiểm tra cột GiangVien2
    if (String(oldData.GiangVien2 || '') !== String(newData.GiangVien2 || '')) {
      changeMessage = changeMessage + `Giảng Viên 2 cho đồ án "${newData.TenDeTai}": từ "${oldData.GiangVien2 || ''}" thành "${newData.GiangVien2 || ''}". `;
    }

    // Kiểm tra trạng thái duyệt khoa
    console.log(`🔍 Checking KhoaDuyet: old=${oldData.KhoaDuyet} (${typeof oldData.KhoaDuyet}) vs new=${newData.KhoaDuyet} (${typeof newData.KhoaDuyet})`);
    if (Number(oldData.KhoaDuyet) !== Number(newData.KhoaDuyet)) {
      console.log(`✅ KhoaDuyet changed!`);
      if (Number(oldData.KhoaDuyet) === 0 && Number(newData.KhoaDuyet) === 1) {
        changeMessage = changeMessage + `Khoa thay đổi duyệt đồ án "${newData.TenDeTai}": Đã duyệt. `;
      } else if (Number(oldData.KhoaDuyet) === 1 && Number(newData.KhoaDuyet) === 0) {
        changeMessage = changeMessage + `Khoa thay đổi duyệt đồ án "${newData.TenDeTai}": Hủy duyệt. `;
      }
    }

    // Kiểm tra trạng thái duyệt đào tạo
    console.log(`🔍 Checking DaoTaoDuyet: old=${oldData.DaoTaoDuyet} (${typeof oldData.DaoTaoDuyet}) vs new=${newData.DaoTaoDuyet} (${typeof newData.DaoTaoDuyet})`);
    if (Number(oldData.DaoTaoDuyet) !== Number(newData.DaoTaoDuyet)) {
      console.log(`✅ DaoTaoDuyet changed!`);
      if (Number(oldData.DaoTaoDuyet) === 0 && Number(newData.DaoTaoDuyet) === 1) {
        changeMessage = changeMessage + `Đào tạo thay đổi duyệt đồ án "${newData.TenDeTai}": Đã duyệt. `;
      } else if (Number(oldData.DaoTaoDuyet) === 1 && Number(newData.DaoTaoDuyet) === 0) {
        changeMessage = changeMessage + `Đào tạo thay đổi duyệt đồ án "${newData.TenDeTai}": Hủy duyệt. `;
      }
    }

    // Kiểm tra trạng thái duyệt tài chính
    console.log(`🔍 Checking TaiChinhDuyet: old=${oldData.TaiChinhDuyet} (${typeof oldData.TaiChinhDuyet}) vs new=${newData.TaiChinhDuyet} (${typeof newData.TaiChinhDuyet})`);
    if (Number(oldData.TaiChinhDuyet) !== Number(newData.TaiChinhDuyet)) {
      console.log(`✅ TaiChinhDuyet changed!`);
      if (Number(oldData.TaiChinhDuyet) === 0 && Number(newData.TaiChinhDuyet) === 1) {
        changeMessage = changeMessage + `Tài chính thay đổi duyệt đồ án "${newData.TenDeTai}": Đã duyệt. `;
      } else if (Number(oldData.TaiChinhDuyet) === 1 && Number(newData.TaiChinhDuyet) === 0) {
        changeMessage = changeMessage + `Tài chính thay đổi duyệt đồ án "${newData.TenDeTai}": Hủy duyệt. `;
      }
    }
    
    // Kiểm tra ngày bắt đầu - xử lý chuẩn hóa định dạng trước khi so sánh
    let oldStartDate = '';
    let newStartDate = '';
    
    if (oldData.NgayBatDau) {
      const oldStartDateObj = new Date(oldData.NgayBatDau);
      if (!isNaN(oldStartDateObj.getTime())) {
        // Cộng thêm 1 ngày để bù trừ sự khác biệt múi giờ
        oldStartDateObj.setDate(oldStartDateObj.getDate() + 1);
        oldStartDate = oldStartDateObj.toISOString().split('T')[0];
      }
    }
    
    if (newData.NgayBatDau) {
      // Kiểm tra nếu newData.NgayBatDau đã là chuỗi ngày 'YYYY-MM-DD'
      if (typeof newData.NgayBatDau === 'string' && newData.NgayBatDau.match(/^\d{4}-\d{2}-\d{2}$/)) {
        newStartDate = newData.NgayBatDau;
      } else {
        const newStartDateObj = new Date(newData.NgayBatDau);
        if (!isNaN(newStartDateObj.getTime())) {
          // Cộng thêm 1 ngày để bù trừ sự khác biệt múi giờ
          newStartDateObj.setDate(newStartDateObj.getDate() + 1);
          newStartDate = newStartDateObj.toISOString().split('T')[0];
        }
      }
    }
    if (oldStartDate !== newStartDate) {
      changeMessage = changeMessage + `Thay đổi ngày bắt đầu cho đồ án "${newData.TenDeTai}": từ "${oldStartDate}" thành "${newStartDate}". `;
    }
    
    // Kiểm tra ngày kết thúc - xử lý chuẩn hóa định dạng trước khi so sánh
    let oldEndDate = '';
    let newEndDate = '';
    
    if (oldData.NgayKetThuc) {
      const oldEndDateObj = new Date(oldData.NgayKetThuc);
      if (!isNaN(oldEndDateObj.getTime())) {
        // Cộng thêm 1 ngày để bù trừ sự khác biệt múi giờ
        oldEndDateObj.setDate(oldEndDateObj.getDate() + 1);
        oldEndDate = oldEndDateObj.toISOString().split('T')[0];
      }
    }
    
    if (newData.NgayKetThuc) {
      // Kiểm tra nếu newData.NgayKetThuc đã là chuỗi ngày 'YYYY-MM-DD'
      if (typeof newData.NgayKetThuc === 'string' && newData.NgayKetThuc.match(/^\d{4}-\d{2}-\d{2}$/)) {
        newEndDate = newData.NgayKetThuc;
      } else {
        const newEndDateObj = new Date(newData.NgayKetThuc);
        if (!isNaN(newEndDateObj.getTime())) {
          // Cộng thêm 1 ngày để bù trừ sự khác biệt múi giờ
          newEndDateObj.setDate(newEndDateObj.getDate() + 1);
          newEndDate = newEndDateObj.toISOString().split('T')[0];
        }
      }
    }
    
    if (oldEndDate !== newEndDate) {
      changeMessage = changeMessage + `Thay đổi ngày kết thúc cho đồ án "${newData.TenDeTai}": từ "${oldEndDate}" thành "${newEndDate}". `;
    }

    // Nếu có thay đổi, ghi lại thông tin vào bảng lichsunhaplieu
    console.log(`📝 Final changeMessage: "${changeMessage}"`);
    if (changeMessage !== '') {
      console.log(`💾 Writing log to database...`);
      const insertQuery = `
        INSERT INTO lichsunhaplieu 
        (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;

      await connection.query(insertQuery, [
        userId,
        tenNhanVien,
        khoa,
        loaiThongTin,
        changeMessage
      ]);

      console.log(`✅ Log written successfully!`);
      return true;
    } else {
      console.log(`❌ No changes detected, no log written.`);
    }

    return false;
  } catch (error) {
    console.error("Lỗi khi ghi log thay đổi:", error);
    return false;
  }
};

const updateDoAn = async (req, res) => {
  const { updates } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    for (const update of updates) {
      const { data, colName, newValue } = update;
      
      // Lấy dữ liệu hiện tại trước khi cập nhật để so sánh
      const [currentDataRows] = await connection.query(
        `SELECT * FROM doantotnghiep WHERE MaPhongBan = ? AND Dot = ? AND ki = ? AND NamHoc = ? AND TenDeTai = ? AND he_dao_tao = ? LIMIT 1`,
        [
          data.Khoa,
          data.Dot,
          data.KiHoc,
          data.NamHoc,
          data.LopHocPhan,
          data.he_dao_tao
        ]
      );
      
      if (currentDataRows.length === 0) {
        continue; // Bỏ qua nếu không tìm thấy bản ghi
      }
      
      const oldData = currentDataRows[0];
      
      // Tạo bản sao của dữ liệu cũ để cập nhật giá trị mới
      const newData = {...oldData};
      newData[colName] = newValue;
      
      // Cập nhật dữ liệu
      const query = `
        UPDATE doantotnghiep 
        SET ${colName} = ? 
        WHERE MaPhongBan = ? 
        AND Dot = ? 
        AND ki = ? 
        AND NamHoc = ? 
        AND TenDeTai = ?
        AND he_dao_tao = ?
      `;

      await connection.query(query, [
        newValue,
        data.Khoa,
        data.Dot,
        data.KiHoc,
        data.NamHoc,
        data.LopHocPhan,
        data.he_dao_tao
      ]);
      
      // Ghi log thay đổi
      await logDoAnChanges(connection, oldData, newData, req);
    }

    await connection.commit();
    res.json({
      success: true,
      message: "Cập nhật dữ liệu thành công!"
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Lỗi khi cập nhật dữ liệu:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật dữ liệu!"
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const requestDoAnEdit = async (req, res) => {
  const { updates } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    for (const update of updates) {
      const { data, colName, newValue, originalValue } = update;
      
      // Kiểm tra xem có yêu cầu chỉnh sửa nào đang chờ duyệt cho cùng một lớp học phần không
      const checkQuery = `
        SELECT id, new_value 
        FROM do_an_edit_requests 
        WHERE khoa = ? 
        AND dot = ? 
        AND ki_hoc = ? 
        AND nam_hoc = ? 
        AND lop_hoc_phan = ?
        AND he_dao_tao = ?
        AND status IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `;
      
      const [existingRequests] = await connection.query(checkQuery, [
        data.Khoa,
        data.Dot,
        data.KiHoc,
        data.NamHoc,
        data.LopHocPhan,
        data.he_dao_tao
      ]);

      // Nếu có yêu cầu đang chờ duyệt, cập nhật yêu cầu đó
      if (existingRequests.length > 0) {
        // Kiểm tra xem giá trị mới có khác với giá trị đã yêu cầu trước đó không
        if (existingRequests[0].new_value !== newValue) {
          const updateQuery = `
            UPDATE do_an_edit_requests 
            SET old_value = ?, 
                new_value = ?,
                created_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `;
          
          await connection.query(updateQuery, [
            existingRequests[0].new_value, // Lấy giá trị mới của lần chỉnh sửa trước làm giá trị cũ
            newValue,
            existingRequests[0].id
          ]);
        }
      } else {
        // Nếu không có yêu cầu đang chờ duyệt, tạo yêu cầu mới
        const insertQuery = `
          INSERT INTO do_an_edit_requests 
          (khoa, dot, ki_hoc, nam_hoc, lop_hoc_phan, he_dao_tao, column_name, old_value, new_value)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await connection.query(insertQuery, [
          data.Khoa,
          data.Dot,
          data.KiHoc,
          data.NamHoc,
          data.LopHocPhan,
          data.he_dao_tao,
          colName,
          originalValue,
          newValue
        ]);
      }
    }

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

const getDoAnEditRequests = async (req, res) => {
  const { dot, ki_hoc, nam_hoc, khoa, he_dao_tao } = req.body;
  
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
        he_dao_tao,
        column_name,
        old_value,
        new_value,
        khoa_duyet,
        daotao_duyet,
        bgd_duyet,
        status,
        created_at
      FROM do_an_edit_requests 
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
    if (he_dao_tao) {
      query += " AND he_dao_tao = ?";
      queryParams.push(he_dao_tao);
    }

    query += " ORDER BY created_at DESC";

    const [requests] = await connection.query(query, queryParams);

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

const updateDoAnApproval = async (req, res) => {
  const { requestId, type, approved } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    // Chuyển đổi type thành tên cột trong database
    const approvalColumn = `${type}_duyet`;

    // Lấy thông tin yêu cầu chỉnh sửa
    const [requestInfo] = await connection.query(
      "SELECT * FROM do_an_edit_requests WHERE id = ?",
      [requestId]
    );
    
    if (!requestInfo || requestInfo.length === 0) {
      throw new Error("Không tìm thấy yêu cầu chỉnh sửa");
    }
    
    // Update the approval status
    const updateQuery = `
      UPDATE do_an_edit_requests 
      SET ${approvalColumn} = ? 
      WHERE id = ?
    `;
    
    await connection.query(updateQuery, [approved, requestId]);

    // Check if all approvals are granted
    const checkQuery = `
      SELECT khoa_duyet, daotao_duyet, bgd_duyet 
      FROM do_an_edit_requests 
      WHERE id = ?
    `;
    
    const [approvals] = await connection.query(checkQuery, [requestId]);
    
    if (!approvals || approvals.length === 0) {
      throw new Error("Không tìm thấy yêu cầu chỉnh sửa");
    }

    const allApproved = approvals[0].khoa_duyet && 
                       approvals[0].daotao_duyet && 
                       approvals[0].bgd_duyet;
    
    // Lấy thông tin đồ án từ database để ghi log
    const [doAnInfo] = await connection.query(
      `SELECT * FROM doantotnghiep 
       WHERE MaPhongBan = ? AND Dot = ? AND ki = ? AND NamHoc = ? AND TenDeTai = ? AND he_dao_tao = ? LIMIT 1`,
      [
        requestInfo[0].khoa,
        requestInfo[0].dot,
        requestInfo[0].ki_hoc,
        requestInfo[0].nam_hoc,
        requestInfo[0].lop_hoc_phan,
        requestInfo[0].he_dao_tao
      ]
    );
    
    if (doAnInfo && doAnInfo.length > 0) {
      // Tạo dữ liệu cũ và mới cho việc ghi log
      const oldData = {...doAnInfo[0]};
      const newData = {...doAnInfo[0]};
      
      // Đặt giá trị duyệt theo loại
      if (type === 'khoa') {
        oldData.KhoaDuyet = approved ? 0 : 1;
        newData.KhoaDuyet = approved ? 1 : 0;
      } else if (type === 'daotao') {
        oldData.DaoTaoDuyet = approved ? 0 : 1;
        newData.DaoTaoDuyet = approved ? 1 : 0;
      } else if (type === 'bgd') {
        // Thay thế tên cột nếu cần
        oldData.TaiChinhDuyet = approved ? 0 : 1;
        newData.TaiChinhDuyet = approved ? 1 : 0;
      }
      
      // Ghi log thay đổi
      await logDoAnChanges(connection, oldData, newData, req);
    }

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

const applyDoAnEdit = async (req, res) => {
  const { requestId } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    // Sử dụng hàm updateRequest để cập nhật dữ liệu và ghi log
    await updateRequest(requestId, req);

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

const exportAdjustedDoAn = async (req, res) => {
  const connection = await createPoolConnection();
  try {
    const { khoa, dot, ki_hoc, nam_hoc, he_dao_tao } = req.body;

    const [rows] = await connection.query(
      `SELECT * FROM do_an_edit_requests 
       WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ? 
       ${khoa && khoa !== 'ALL' ? 'AND khoa = ?' : ''}
       ${he_dao_tao ? 'AND he_dao_tao = ?' : ''}`,
      khoa && khoa !== 'ALL' ? [dot, ki_hoc, nam_hoc, khoa, he_dao_tao] : [dot, ki_hoc, nam_hoc, he_dao_tao]
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // Cấu hình trang
    worksheet.pageSetup.paperSize = 9;
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
    worksheet.getCell('A5').value = '(V/v: thay đổi tên giáo viên hướng dẫn đồ án học kỳ ' + ki_hoc + ' năm học ' + nam_hoc + ')';
    worksheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell('A5').font = { italic: true, size: 14, name: 'Times New Roman' };

    // Thêm phần kính gửi
    worksheet.mergeCells('A7:D7');
    worksheet.getCell('A7').value = 'Kính gửi: Phòng Đào Tạo';
    worksheet.getCell('A7').font = { size: 14, name: 'Times New Roman' };
    worksheet.getCell('A7').alignment = { horizontal: 'center', vertical: 'middle' };

    // Thêm nội dung đơn
    worksheet.mergeCells('A9:D9');
    worksheet.getCell('A9').value = 'Theo kế hoạch giảng dạy học kỳ ' + ki_hoc + ' năm học ' + nam_hoc + 
      ', Khoa ' + khoa + ' có mời một số giảng viên tham gia hướng dẫn đồ án cho Khoa và đã có thời khóa biểu phát hành.';
    worksheet.getCell('A9').alignment = { wrapText: true, vertical: 'middle' };
    worksheet.getCell('A9').font = { size: 14, name: 'Times New Roman' };
    worksheet.getRow(9).height = 50;

    worksheet.mergeCells('A10:D10');
    worksheet.getCell('A10').value = 'Tuy nhiên, trong quá trình thực hiện hướng dẫn, một số giáo viên vì lí do riêng không thể thực hiện đúng theo thời khóa biểu nên khoa xin phép được điều chỉnh lại tên các giáo viên hướng dẫn trên thời khóa biếu như sau:';
    worksheet.getCell('A10').alignment = { wrapText: true, vertical: 'middle' };
    worksheet.getCell('A10').font = { size: 14, name: 'Times New Roman' };
    worksheet.getRow(10).height = 50;

    // Thêm khoảng trống
    worksheet.addRow([]);
    worksheet.addRow([]);

    // Thêm header cho bảng dữ liệu
    const headerRow = worksheet.addRow(['STT', 'Tên đề tài', 'Giảng viên theo TKB', 'Giảng viên điều chỉnh']);
    headerRow.height = 40;

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
        Math.ceil((row.lop_hoc_phan?.length || 0) / 40),
        Math.ceil((row.old_value?.length || 0) / 30),
        Math.ceil((row.new_value?.length || 0) / 30)
      );
      
      dataRow.height = Math.max(40, maxLines * 20);
    });

    // Định dạng độ rộng cột
    worksheet.columns.forEach((column, index) => {
      if (index === 0) {
        column.width = 8;
      } else if (index === 1) {
        column.width = 50;
      } else {
        column.width = 35;
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
    worksheet.getCell('A' + (lastRow.number + 4)).value = 'Hà Nội, ngày    tháng    năm   ';
    worksheet.getCell('A' + (lastRow.number + 4)).alignment = { horizontal: 'right', vertical: 'middle' };
    worksheet.getCell('A' + (lastRow.number + 4)).font = { size: 14, name: 'Times New Roman' };
    worksheet.getRow(lastRow.number + 4).height = 20;

    // Tạo buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set headers cho response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=do_an_dieu_chinh.xlsx');

    // Gửi file
    res.send(buffer);

  } catch (error) {
    console.error('Error in exportAdjustedDoAn:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi xuất file Excel' 
    });
  } finally {
    connection.release();
  }
};

const getDoAnChinhThuc = async (req, res) => {
  const { Khoa, Dot, Ki, Nam, he_dao_tao } = req.body;
  let connection;

  try {
    connection = await createPoolConnection();

    let query = `
      SELECT 
        ID,
        SinhVien,
        MaSV,
        MaPhongBan,
        TenDeTai,
        GiangVien1,
        GiangVien2,
        NgayBatDau,
        NgayKetThuc,
        NamHoc,
        Dot,
        ki,
        GiangVienDefault,
        he_dao_tao
        
     FROM doantotnghiep 
      WHERE 1=1
    `;
    const queryParams = [];

    if (Khoa && Khoa !== "ALL") {
      query += " AND MaPhongBan = ?";
      queryParams.push(Khoa);
    }
    if (Dot) {
      query += " AND Dot = ?";
      queryParams.push(Dot);
    }
    if (Ki) {
      query += " AND ki = ?";
      queryParams.push(Ki);
    }
    if (Nam) {
      query += " AND NamHoc = ?";
      queryParams.push(Nam);
    }
    if (he_dao_tao) {
      query += " AND he_dao_tao = ?";
      queryParams.push(he_dao_tao);
    }

    const [rows] = await connection.query(query, queryParams);
    const data = rows.map(row => ({
      ...row,
      GiangVienDefault: [row.GiangVien1, row.GiangVien2].filter(Boolean).join(', ')
    }));
    res.json(data);

  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu đồ án:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi lấy dữ liệu đồ án!"
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const updateRequest = async (requestId, req) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy thông tin của request từ bảng do_an_edit_requests
    const [request] = await connection.query(
      "SELECT * FROM do_an_edit_requests WHERE id = ?",
      [requestId]
    );

    if (!request[0]) {
      throw new Error("Không tìm thấy yêu cầu chỉnh sửa");
    }

    // Lấy dữ liệu hiện tại của đồ án từ bảng doantotnghiep
    const [currentDoAn] = await connection.query(
      `SELECT * FROM doantotnghiep 
       WHERE MaPhongBan = ? 
       AND Dot = ? 
       AND ki = ? 
       AND NamHoc = ? 
       AND TenDeTai = ?
       AND he_dao_tao = ?
       LIMIT 1`,
      [
        request[0].khoa,
        request[0].dot,
        request[0].ki_hoc,
        request[0].nam_hoc,
        request[0].lop_hoc_phan,
        request[0].he_dao_tao
      ]
    );

    if (!currentDoAn || currentDoAn.length === 0) {
      throw new Error("Không tìm thấy đồ án tương ứng");
    }

    // Tạo bản sao của dữ liệu cũ và mới để ghi log
    const oldData = { ...currentDoAn[0] };
    const newData = { ...currentDoAn[0] };
    
    // Cập nhật giá trị mới cho trường cần thay đổi
    if (request[0].column_name === 'GiangVien1') {
      newData.GiangVien1 = request[0].new_value;
    } else if (request[0].column_name === 'GiangVien2') {
      newData.GiangVien2 = request[0].new_value;
    }

    // Cập nhật thực tế vào bảng doantotnghiep
    const updateQuery = `
      UPDATE doantotnghiep 
      SET ${request[0].column_name} = ? 
      WHERE MaPhongBan = ? 
      AND Dot = ? 
      AND ki = ? 
      AND NamHoc = ? 
      AND TenDeTai = ?
      AND he_dao_tao = ?
    `;

    await connection.query(updateQuery, [
      request[0].new_value,
      request[0].khoa,
      request[0].dot,
      request[0].ki_hoc,
      request[0].nam_hoc,
      request[0].lop_hoc_phan,
      request[0].he_dao_tao
    ]);

    // Ghi log thay đổi vào bảng lichsunhaplieu
    const changeMessage = `Giảng viên hướng dẫn cho đồ án "${request[0].lop_hoc_phan}": từ "${request[0].old_value}" thành "${request[0].new_value}".`;
    
    const userId = req?.session?.userId || req?.session?.userInfo?.ID || req?.user?.id || 1;
    const tenNhanVien = req?.session?.TenNhanVien || req?.session?.userInfo?.TenNhanVien || req?.user?.TenNhanVien || 'Unknown';
    const khoa = req?.session?.MaPhongBan || req?.session?.userInfo?.MaPhongBan || req?.user?.MaPhongBan || req?.session?.Khoa || req?.user?.Khoa || 'Unknown';
    
    const logQuery = `
      INSERT INTO lichsunhaplieu 
      (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    
    await connection.query(logQuery, [
      userId,
      tenNhanVien,
      khoa,
      'Thay đổi thông tin đồ án',
      changeMessage
    ]);

    // Cập nhật trạng thái trong bảng do_an_edit_requests
    await connection.query(
      "UPDATE do_an_edit_requests SET status = 'Cập nhật thành công' WHERE id = ?",
      [requestId]
    );

    return true;
  } catch (error) {
    console.error("Lỗi khi cập nhật yêu cầu:", error);
    return false;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

module.exports = {
  updateDoAn,
  requestDoAnEdit,
  getDoAnEditRequests,
  updateDoAnApproval,
  applyDoAnEdit,
  exportAdjustedDoAn,
  getDoAnChinhThuc,
  updateRequest,
  logDoAnChanges
};
```

## File: src/controllers/doanExportController.js
```javascript
const ExcelJS = require('exceljs');

// Hàm xuất dữ liệu đồ án tốt nghiệp ra Excel
const exportDoanToExcel = async (req, res) => {
  try {
    const { renderData } = req.body;

    if (!renderData || renderData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có dữ liệu để xuất file"
      });
    }

    // Định nghĩa header cho đồ án tốt nghiệp
    const headers = [
      "TT",
      "Sinh Viên", 
      "Mã SV",
      "Khóa",
      "Ngành",
      "Khoa",
      "Tên đề tài",
      "Giảng Viên Hướng Dẫn",
      "Giảng Viên Hướng Dẫn 1",
      "Giảng Viên Hướng Dẫn 2",
      "Ngày bắt đầu",
      "Ngày kết thúc"
    ];

    // Tạo workbook & worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Đồ án tốt nghiệp", {
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9, // A4
      },
    });

    // Header bảng
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11 };
      cell.alignment = {
        horizontal: "center",
        vertical: "center",
        wrapText: true,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE6E6FA" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Thiết lập độ rộng cột
    const colWidths = [5, 25, 15, 10, 20, 10, 50, 30, 30, 30, 15, 15];
    worksheet.columns = headers.map((header, index) => ({
      header,
      key: header,
      width: colWidths[index]
    }));

    // Thêm dữ liệu từ renderData
    renderData.forEach((item, index) => {
      const row = worksheet.addRow([
        index + 1, // TT
        item.SinhVien || "", // Sinh Viên
        item.MaSV || "", // Mã SV
        item.khoa_sinh_vien || "", // Khóa
        item.nganh || "", // Ngành
        item.MaPhongBan || "", // Khoa
        item.TenDeTai || "", // Tên đề tài
        item.GiangVienDefault || "", // Giảng Viên Hướng Dẫn
        item.GiangVien1 || "", // Giảng Viên Hướng Dẫn 1
        item.GiangVien2 || "", // Giảng Viên Hướng Dẫn 2
        item.NgayBatDau ? new Date(item.NgayBatDau).toLocaleDateString("vi-VN") : "", // Ngày bắt đầu
        item.NgayKetThuc ? new Date(item.NgayKetThuc).toLocaleDateString("vi-VN") : "" // Ngày kết thúc
      ]);
      
      // Thêm border cho từng ô
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          vertical: "top",
          wrapText: true,
        };
        cell.font = { size: 11 };
      });
    });

    // Thiết lập chiều cao hàng
    worksheet.getRow(1).height = 30; // Header row
    worksheet.properties.defaultRowHeight = 25; // Data rows

    // Thiết lập header response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="do_an_tot_nghiep.xlsx"');

    // Ghi file và gửi response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Error exporting doan data:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi xuất file"
    });
  }
};

module.exports = {
  exportDoanToExcel
};
```

## File: src/controllers/doAnHopDongDuKienController.js
```javascript
const express = require("express");
const pool = require("../config/Pool");
const createPoolConnection = require("../config/databasePool");
require("dotenv").config();
const doanServices = require("../services/doanServices");

const getDoAnHopDongDuKienSite = (req, res) => {
  res.render("doAnHopDongDuKien.ejs");
};

const { CTE_DO_AN, CTE_DAI_HOC, CTE_SAU_DAI_HOC, CTE_TABLE_ALL } = require('../queries/hopdongQueries');

const getInfoDoAnHopDongDuKien = async (req, res) => {
  const Dot = req.body.Dot;
  const ki = req.body.ki;
  const NamHoc = req.body.Nam;
  let MaPhongBan = req.body.Khoa;
  const heDaoTaoValue = req.body.heDaoTaoValue;

  let connection;
  try {
    const isKhoa = req.session.isKhoa;

    if (isKhoa == 1) {
      MaPhongBan = req.session.MaPhongBan;
    }

    connection = await createPoolConnection();

    let query, values;
    query = `
WITH 
      ${CTE_DO_AN},
      ${CTE_DAI_HOC},
      ${CTE_SAU_DAI_HOC},
      ${CTE_TABLE_ALL},
gv1 AS (
    SELECT 
        SUBSTRING_INDEX(GiangVien1, ' -', 1) AS GiangVien, 
        TenDeTai, 
        SinhVien, 
        MaSV,
        NgayBatDau,
        NgayKetThuc,
        Dot,
        ki,
        NamHoc,
        MaPhongBan,
        he_dao_tao,
        'GV1' AS Nguon
    FROM doantotnghiep
  WHERE GiangVien1 IS NOT NULL
      AND LOWER(TRIM(GiangVien1)) != 'không'
      AND LOWER(TRIM(GiangVien2)) != 'không'
),
gv2 AS (
    SELECT 
        SUBSTRING_INDEX(GiangVien2, ' -', 1) AS GiangVien, 
        TenDeTai, 
        SinhVien,
        MaSV,
        NgayBatDau,
        NgayKetThuc,
        Dot,
        ki,
        NamHoc,
        MaPhongBan,
        he_dao_tao,
        'GV2' AS Nguon
    FROM doantotnghiep
    WHERE GiangVien2 IS NOT NULL
      AND LOWER(TRIM(GiangVien2)) != 'không'
      AND TRIM(GiangVien2) != ''
),
two_gv AS (
    SELECT * FROM gv1 
    UNION ALL
    SELECT * FROM gv2
),
one_gv AS (
    SELECT         
        SUBSTRING_INDEX(GiangVien1, ' -', 1) AS GiangVien, 
        TenDeTai, 
        SinhVien,
        MaSV,
        NgayBatDau,
        NgayKetThuc,
        Dot,
        ki,
        NamHoc,
        MaPhongBan,
        he_dao_tao,
        'ONE' AS Nguon
    FROM doantotnghiep 
    WHERE TRIM(GiangVien2) = 'không' AND GiangVien1 != ''
), 
gv_doan AS (
    SELECT * FROM one_gv
    UNION ALL
    SELECT * FROM two_gv
),
gv_with_tiet AS (
    SELECT 
        gvd.*,
        CASE 
            WHEN gvd.Nguon = 'ONE' THEN std.tong_tiet
            WHEN gvd.Nguon = 'GV1' THEN std.so_tiet_1
            ELSE std.so_tiet_2
        END AS SoTiet
    FROM gv_doan gvd
    JOIN sotietdoan std ON gvd.he_dao_tao = std.he_dao_tao
),
final AS (
    SELECT 
        gv_with_tiet.GiangVien,
        gv_with_tiet.TenDeTai,
        gv_with_tiet.SinhVien,
        gv_with_tiet.MaSV,
        gv_with_tiet.SoTiet,
        gv_with_tiet.NgayBatDau,
        gv_with_tiet.NgayKetThuc,
        gv_with_tiet.Dot,
        gv_with_tiet.ki,
        gv_with_tiet.NamHoc,
        gv_with_tiet.MaPhongBan AS MaKhoa,
        gv_with_tiet.he_dao_tao,
        gvmoi.*,
        tsgv.TongSoTiet AS TongSoTietCaNam
    FROM gv_with_tiet
    JOIN gvmoi ON gv_with_tiet.GiangVien = gvmoi.HoTen
    LEFT JOIN TongSoTietGV tsgv ON gv_with_tiet.GiangVien = tsgv.GiangVien
)

SELECT 
    id_Gvm, HoTen, TenDeTai, SinhVien, MaSV, NoiCongTac, HocVi, SoTiet, HSL, 
    NgayBatDau, NgayKetThuc, Dot, ki, NamHoc, MaPhongBan, TongSoTietCaNam, isQuanDoi
FROM final
WHERE Dot = ? AND ki = ? AND NamHoc = ? AND he_dao_tao = ?
    `;
    values = [NamHoc, NamHoc, NamHoc, Dot, ki, NamHoc, heDaoTaoValue];

    let SoQDList;
    if (MaPhongBan != "ALL") {
      query += ` AND MaKhoa = ? `;
      values.push(MaPhongBan);

      // Lấy số quyết định
      const SoQDquery = `SELECT DISTINCT SoQD from doantotnghiep where SoQD != 'NULL' AND Dot = ? AND ki = ? AND NamHoc = ? AND he_dao_tao = ? AND MaPhongBan = ?`;
      [SoQDList] = await connection.query(SoQDquery, [
        Dot,
        ki,
        NamHoc,
        heDaoTaoValue,
        MaPhongBan,
      ]);
    }

    query += `ORDER BY TongSoTietCaNam DESC`;

    const [result] = await connection.query(query, values); // Dùng destructuring để lấy dữ liệu

    // Nhóm các môn học theo giảng viên
    const groupedByTeacher = result.reduce((acc, current) => {
      const teacher = current.HoTen;
      if (!acc[teacher]) {
        acc[teacher] = [];
      }
      acc[teacher].push(current);
      return acc;
    }, {});

    // Lấy số tiết định mức
    query = `select GiangDay from sotietdinhmuc`;
    const [SoTietDinhMucRow] = await connection.query(query);

    const SoTietDinhMuc = SoTietDinhMucRow[0]?.GiangDay || 0;

    // Trả dữ liệu về client dưới dạng JSON
    res
      .status(200)
      .json({ groupedByTeacher: groupedByTeacher, SoTietDinhMuc, SoQDList });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu từ database:", error);

    // Trả lỗi về client
    res.status(500).json({ message: "Đã xảy ra lỗi khi lấy dữ liệu" });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const KhoaCheckAll = async (req, Dot, NamHoc) => {
  let kq = ""; // Biến để lưu kết quả
  let connection;

  try {
    const query = `SELECT MaPhongBan FROM phongban where isKhoa = 1`;
    connection = await createPoolConnection();
    const [results, fields] = await connection.query(query);

    // Chọn theo từng phòng ban
    for (let i = 0; i < results.length; i++) {
      const MaPhongBan = results[i].MaPhongBan;

      const innerQuery = `SELECT KhoaDuyet FROM doantotnghiep WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ?`;
      const [check, innerFields] = await connection.query(innerQuery, [
        MaPhongBan,
        NamHoc,
        Dot,
      ]);

      let checkAll = true;
      for (let j = 0; j < check.length; j++) {
        if (check[j].KhoaDuyet == 0) {
          checkAll = false;
          break;
        }
      }
      if (checkAll) {
        kq += MaPhongBan + ",";
      }
    }
  } catch (error) {
    console.error("Error in KhoaCheckAll:", error);
    throw error; // Throw lại lỗi để xử lý ở nơi gọi hàm này
  } finally {
    if (connection) connection.release();
  }

  // Trả về kết quả có dấu phẩy cuối cùng
  return kq;
};

const DaoTaoCheckAll = async (req, Dot, NamHoc) => {
  let kq = ""; // Biến để lưu kết quả

  const queryPhongBan = `SELECT MaPhongBan FROM phongban WHERE isKhoa = 1`;
  const connection1 = await createPoolConnection();

  try {
    const [results] = await connection1.query(queryPhongBan);

    // Chọn theo từng phòng ban
    for (let i = 0; i < results.length; i++) {
      const MaPhongBan = results[i].MaPhongBan;

      const queryDuyet = `
        SELECT DaoTaoDuyet 
        FROM doantotnghiep 
        WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ?
      `;
      const connection = await createPoolConnection();

      try {
        const [check] = await connection.query(queryDuyet, [
          MaPhongBan,
          NamHoc,
          Dot,
        ]);

        let checkAll = true;
        for (let j = 0; j < check.length; j++) {
          if (check[j].DaoTaoDuyet == 0) {
            checkAll = false;
            break;
          }
        }
        if (checkAll) {
          kq += MaPhongBan + ",";
        }
      } finally {
        connection.release(); // Giải phóng kết nối sau khi truy vấn xong
      }
    }
  } finally {
    connection1.release(); // Giải phóng kết nối sau khi lấy danh sách phòng ban
  }

  return kq;
};

// Mới
const TaiChinhCheckAll = async (req, Dot, NamHoc) => {
  let kq = ""; // Biến để lưu kết quả

  const connection = await createPoolConnection();

  try {
    const query = `SELECT MaPhongBan FROM phongban WHERE isKhoa = 1`;
    const [results, fields] = await connection.query(query);

    // Chọn theo từng phòng ban
    for (let i = 0; i < results.length; i++) {
      const MaPhongBan = results[i].MaPhongBan;

      const checkQuery = `
        SELECT TaiChinhDuyet FROM doantotnghiep 
        WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ?`;
      const [check, checkFields] = await connection.query(checkQuery, [
        MaPhongBan,
        NamHoc,
        Dot,
      ]);

      let checkAll = true;
      for (let j = 0; j < check.length; j++) {
        if (check[j].TaiChinhDuyet == 0) {
          checkAll = false;
          break;
        }
      }
      if (checkAll === true) {
        kq += MaPhongBan + ",";
      }
    }
  } finally {
    if (connection) connection.release();
  }

  return kq;
};

const getCheckAllDoantotnghiep = async (req, res) => {
  const NamHoc = req.body.NamHoc;
  const Dot = req.body.Dot;
  const KhoaCheck = await KhoaCheckAll(req, Dot, NamHoc);
  const DaoTaoCheck = await DaoTaoCheckAll(req, Dot, NamHoc);
  const TaiChinhCheck = await TaiChinhCheckAll(req, Dot, NamHoc);

  return res.status(200).json({
    KhoaCheck: KhoaCheck,
    DaoTaoCheck: DaoTaoCheck,
    VPCheck: TaiChinhCheck,
  });
};

const getDuplicateUniqueGV = async () => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Hàm chuẩn hóa tên
    const normalizeName = (name) => name.replace(/\s*\(.*?\)\s*/g, "").trim();

    // Lấy dữ liệu giảng viên mời và cơ hữu
    const [gvms] = await connection.query(`SELECT HoTen, CCCD FROM GVMOI`);
    const [nvs] = await connection.query(
      `SELECT TenNhanVien, CCCD FROM NHANVIEN`
    );

    // Gộp và chuẩn hóa danh sách
    const combinedList = [
      ...gvms.map((item) => ({
        HoTen: item.HoTen,
        CCCD: item.CCCD,
        BienChe: "Giảng viên mời",
        HoTenReal: normalizeName(item.HoTen),
      })),
      ...nvs.map((item) => ({
        HoTen: item.TenNhanVien,
        CCCD: item.CCCD,
        BienChe: "Cơ hữu",
        HoTenReal: normalizeName(item.TenNhanVien),
      })),
    ];

    // Đếm số lần xuất hiện của mỗi tên chuẩn hóa
    const nameCount = {};
    combinedList.forEach((item) => {
      const normalizedName = item.HoTenReal;

      if (!nameCount[normalizedName]) {
        nameCount[normalizedName] = { count: 0, items: [] };
      }

      nameCount[normalizedName].count += 1;
      nameCount[normalizedName].items.push(item);
    });

    // Phân loại giảng viên
    const allGV = [];
    const duplicateGV = [];
    const uniqueGV = [];

    Object.values(nameCount).forEach((entry) => {
      allGV.push(...entry.items);
      if (entry.count > 1) {
        duplicateGV.push(...entry.items);
      } else {
        uniqueGV.push(...entry.items);
      }
    });

    // Trả về dữ liệu
    return {
      duplicateGV,
      uniqueGV,
      allGV,
    };
  } catch (error) {
    console.error("Error in getDuplicateUniqueGV:", error);
    throw new Error("Có lỗi xảy ra khi xử lý dữ liệu: " + error.message);
  } finally {
    if (connection) connection.release();
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getInfoDoAnHopDongDuKien,
  getCheckAllDoantotnghiep,
  getDoAnHopDongDuKienSite,
};
```

## File: src/controllers/exportPhuLucDAController.js
```javascript
const express = require("express");
const ExcelJS = require("exceljs");
const createPoolConnection = require("../config/databasePool");
const fs = require("fs");
const path = require("path");

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-z0-9]/gi, "_");
}

function convertToRoman(num) {
  const romanNumerals = [
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 8, numeral: "VIII" },
    { value: 7, numeral: "VII" },
    { value: 6, numeral: "VI" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 3, numeral: "III" },
    { value: 2, numeral: "II" },
    { value: 1, numeral: "I" },
  ];

  return romanNumerals
    .filter((r) => num >= r.value)
    .map((r) => {
      const times = Math.floor(num / r.value);
      num -= times * r.value;
      return r.numeral.repeat(times);
    })
    .join("");
}
// Hàm chuyển đổi số thành chữ
const numberToWords = (num) => {
  if (num === 0) return "Không đồng"; // Xử lý riêng trường hợp 0

  const ones = [
    "",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];
  const teens = [
    "mười",
    "mười một",
    "mười hai",
    "mười ba",
    "mười bốn",
    "mười lăm",
    "mười sáu",
    "mười bảy",
    "mười tám",
    "mười chín",
  ];
  const tens = [
    "",
    "",
    "hai mươi",
    "ba mươi",
    "bốn mươi",
    "năm mươi",
    "sáu mươi",
    "bảy mươi",
    "tám mươi",
    "chín mươi",
  ];
  const thousands = ["", "nghìn", "triệu", "tỷ"];

  let words = "";
  let unitIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk) {
      let chunkWords = [];
      const hundreds = Math.floor(chunk / 100);
      const remainder = chunk % 100;

      // Xử lý hàng trăm
      if (hundreds) {
        chunkWords.push(ones[hundreds]);
        chunkWords.push("trăm");
      }

      // Xử lý phần dư (tens và ones)
      if (remainder < 10) {
        if (remainder > 0) {
          if (hundreds) chunkWords.push("lẻ");
          chunkWords.push(ones[remainder]);
        }
      } else if (remainder < 20) {
        chunkWords.push(teens[remainder - 10]);
      } else {
        const tenPlace = Math.floor(remainder / 10);
        const onePlace = remainder % 10;

        chunkWords.push(tens[tenPlace]);
        if (onePlace === 1 && tenPlace > 1) {
          chunkWords.push("mốt");
        } else if (onePlace === 5 && tenPlace > 0) {
          chunkWords.push("lăm");
        } else if (onePlace) {
          chunkWords.push(ones[onePlace]);
        }
      }

      // Thêm đơn vị nghìn, triệu, tỷ
      if (unitIndex > 0) {
        chunkWords.push(thousands[unitIndex]);
      }

      words = chunkWords.join(" ") + " " + words;
    }
    num = Math.floor(num / 1000);
    unitIndex++;
  }

  // Hàm viết hoa chữ cái đầu tiên
  const capitalizeFirstLetter = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  return capitalizeFirstLetter(words.trim() + " đồng");
};

function formatVietnameseDate(date) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `ngày ${day} tháng ${month} năm ${year}`;
}
function formatDateDMY(date) {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

const getExportPhuLucDAPath = async (
  req,
  res,
  connection,
  dot,
  ki,
  namHoc,
  khoa,
  he_dao_tao,
  teacherName,
  data
) => {
  try {
    const isKhoa = req.session.isKhoa;

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    // Tạo workbook mới
    const workbook = new ExcelJS.Workbook();

    // Nhóm dữ liệu theo giảng viên
    const groupedData = data.reduce((acc, cur) => {
      (acc[cur.GiangVien] = acc[cur.GiangVien] || []).push(cur);
      return acc;
    }, {});

    // Tạo một sheet cho mỗi giảng viên
    for (const [giangVien, giangVienData] of Object.entries(groupedData)) {
      const cccds = [...new Set(giangVienData.map((item) => item.CCCD))];
      // const last4CCCDs = cccds.map((cccd) => cccd.slice(-4)).join(", ");
      const last4CCCDs = cccds
        .map((cccd) => cccd?.slice?.(-4) || "")
        .join(", ");

      const worksheet = workbook.addWorksheet(
        `${giangVien.replace(/\s*\(.*?\)\s*/g, "").trim()} - ${last4CCCDs}`
      );

      worksheet.addRow([]);

      // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
      const titleRow0 = worksheet.addRow(["Ban Cơ yếu Chính phủ"]);
      titleRow0.font = { name: "Times New Roman", size: 16, bold: true };
      titleRow0.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow0.number}:C${titleRow0.number}`);

      // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
      const titleRow1 = worksheet.addRow(["Học Viện Kỹ thuật Mật Mã"]);
      titleRow1.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow1.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow1.number}:C${titleRow1.number}`);

      const titleRow2 = worksheet.addRow(["Phụ lục"]);
      titleRow2.font = { name: "Times New Roman", bold: true, size: 20 };
      titleRow2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow2.number}:L${titleRow2.number}`);

      // Tìm ngày bắt đầu sớm nhất từ dữ liệu giảng viên (cho tiêu đề "Hợp đồng số:")
      const earliestDate = giangVienData.reduce((minDate, item) => {
        const currentStartDate = new Date(item.NgayBatDau);
        return currentStartDate < minDate ? currentStartDate : minDate;
      }, new Date(giangVienData[0].NgayBatDau));
      const formattedEarliestDate = formatVietnameseDate(earliestDate);

      // Tìm ngày kết thúc muộn nhất từ dữ liệu giảng viên (cho tiêu đề "Kèm theo biên bản nghiệm thu")
      const latestDate = giangVienData.reduce((maxDate, item) => {
        const currentEndDate = new Date(item.NgayKetThuc);
        return currentEndDate > maxDate ? currentEndDate : maxDate;
      }, new Date(giangVienData[0].NgayKetThuc));
      const formattedLatestDate = formatVietnameseDate(latestDate);

      const soHopDong = giangVienData[0]?.SoHopDong || "";

      // Xử lý soHopDong: nếu null, undefined, hoặc rỗng thì để trống, ngược lại giữ nguyên
      // Tab 1: Dùng ngày bắt đầu sớm nhất (formattedEarliestDate)
      const contractNumber =
        soHopDong && soHopDong.trim() !== ""
          ? `Hợp đồng số: ${soHopDong} ${formattedEarliestDate}`
          : `Hợp đồng số:      /HĐ-ĐT ${formattedEarliestDate}`;

      const titleRow3 = worksheet.addRow([contractNumber]);
      titleRow3.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow3.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`A${titleRow3.number}:L${titleRow3.number}`);

      // const titleRow4 = worksheet.addRow([
      //   `Kèm theo biên bản nghiệm thu Hợp đồng số:     /HĐ-ĐT ${formattedEarliestDate}`,
      // ]);
      // titleRow4.font = { name: "Times New Roman", bold: true, size: 16 };
      // titleRow4.alignment = { horizontal: "center", vertical: "middle" };
      // worksheet.mergeCells(`A${titleRow4.number}:M${titleRow4.number}`);

      // Đặt vị trí cho tiêu đề "Đơn vị tính: Đồng" vào cột K đến M
      const titleRow5 = worksheet.addRow([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Đơn vị tính: Đồng",
        "",
        "",
      ]);
      titleRow5.font = { name: "Times New Roman", size: 13, italic: true };
      titleRow5.alignment = { horizontal: "center", vertical: "middle" };
      worksheet.mergeCells(`K${titleRow5.number}:M${titleRow5.number}`);

      // Định nghĩa tiêu đề cột
      const header = [
        "STT", // Thêm tiêu đề STT
        "Họ tên giảng viên",
        "Tên đồ án",
        "Sinh viên thực hiện",
        "Số tiết",
        "Thời gian thực hiện",
        "Địa Chỉ",
        "Học vị",
        "HS lương",
        "Mức thanh toán",
        "Thành tiền",
        "Trừ thuế TNCN 10%",
        "Còn lại",
      ];

      // Thêm tiêu đề cột
      const headerRow = worksheet.addRow(header);
      headerRow.font = { name: "Times New Roman", bold: true };
      // worksheet.getColumn(10).numFmt = "#,##0"; // Thành tiền

      // worksheet.getColumn(11).numFmt = "#,##0"; // Thành tiền
      // worksheet.getColumn(12).numFmt = "#,##0"; // Trừ thuế TNCN 10%
      // worksheet.getColumn(13).numFmt = "#,##0"; // Còn lại

      worksheet.pageSetup = {
        paperSize: 9, // Kích thước giấy A4
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.3149,
          right: 0.3149,
          top: 0,
          bottom: 0,
          header: 0.3149,
          footer: 0.3149,
        },
      };

      // Căn chỉnh độ rộng cột
      // Định dạng cột
      worksheet.getColumn(1).width = 5; // STT
      worksheet.getColumn(2).width = 18; // Họ tên giảng viên
      worksheet.getColumn(3).width = 29; // Tên đồ án
      worksheet.getColumn(4).width = 14; // Sinh viên thực hiện
      worksheet.getColumn(5).width = 10; // Số tiết
      worksheet.getColumn(6).width = 18; // Thời gian thực hiện
      worksheet.getColumn(7).width = 28; // Địa chỉ
      worksheet.getColumn(8).width = 6; // Học vị
      worksheet.getColumn(9).width = 6; // Hệ số lương
      worksheet.getColumn(10).width = 12; // Mức thanh toán
      worksheet.getColumn(11).width = 13; // Thành tiền
      worksheet.getColumn(12).width = 13; // Trừ thuế TNCN 10%
      worksheet.getColumn(13).width = 13; // Còn lại

      // Bật wrapText cho tiêu đề
      headerRow.eachCell((cell) => {
        cell.font = { name: "Times New Roman", bold: true, size: 11 }; // Chỉnh cỡ chữ và kiểu chữ

        cell.fill = {
          type: "pattern",
          pattern: "none", // Không màu nền
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      });

      let totalSoTiet = 0;
      let totalSoTien = 0;
      let totalTruThue = 0;
      let totalThucNhan = 0;

      giangVienData.forEach((item, index) => {
        let hoTenTrim = item.GiangVien.replace(/\s*\(.*?\)\s*/g, "").trim();
        const mucThanhToan = Number(item.TienMoiGiang || 0);
        const soTien = Number(item.ThanhTien || 0);
        const truThue = Number(item.TruThue || 0);
        const thucNhan = Number(item.ThucNhan || 0);

        const thoiGianThucHien = `${formatDateDMY(
          item.NgayBatDau
        )} - ${formatDateDMY(item.NgayKetThuc)}`;

        // Chuyển đổi Học kỳ sang số La Mã
        // const hocKyLaMa = convertToRoman(item.HocKy);
        // Viết tắt Học vị
        const hocViVietTat =
          item.HocVi === "Tiến sĩ"
            ? "TS"
            : item.HocVi === "Thạc sĩ"
              ? "ThS"
              : item.HocVi;
        const row = worksheet.addRow([
          index + 1, // STT
          hoTenTrim,
          item.TenDeTai,
          item.SinhVien,
          item.SoTiet.toLocaleString("vi-VN").replace(/\./g, ","),
          thoiGianThucHien,
          item.DiaChi,
          hocViVietTat, // Sử dụng viết tắt cho Học vị
          item.HSL.toLocaleString("vi-VN").replace(/\./g, ","),
          mucThanhToan.toLocaleString("vi-VN"), // Mức thanh toán
          soTien.toLocaleString("vi-VN"), // Thành tiền
          truThue.toLocaleString("vi-VN"), // Trừ thuế TNCN 10%
          thucNhan.toLocaleString("vi-VN"), // Còn lại
        ]);
        row.font = { name: "Times New Roman", size: 13 };
        // row.getCell(11).numFmt = "#,##0"; // Còn lại

        // row.getCell(12).numFmt = "#,##0"; // Trừ thuế TNCN 10%
        // row.getCell(13).numFmt = "#,##0"; // Còn lại

        // Bật wrapText cho các ô dữ liệu và căn giữa
        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };

          // Chỉnh cỡ chữ cho từng cột
          switch (colNumber) {
            case 1: // STT
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 2: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 3: // Tên học phần
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 4: // Tên lớp
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 5: // Số tiết
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 6: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            // case 7: // Học kỳ
            //   cell.font = { name: "Times New Roman", size: 13 };
            //   break;
            case 7: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 8: // Học vị
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 9: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 10: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 11: // Thành tiền
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 12: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 13: // Còn lại
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            default:
              cell.font = { name: "Times New Roman", size: 13 };
              break;
          }
        });

        totalSoTiet += parseFloat(item.SoTiet);
        totalSoTien += soTien;
        totalTruThue += truThue;
        totalThucNhan += thucNhan;
      });

      // Thêm hàng tổng cộng
      const totalRow = worksheet.addRow([
        "Tổng cộng",
        "",
        "",
        "",
        totalSoTiet.toLocaleString("vi-VN").replace(/\./g, ","),
        "",
        // "",
        "",
        "",
        "",
        "",
        totalSoTien.toLocaleString("vi-VN"),
        totalTruThue.toLocaleString("vi-VN"),
        totalThucNhan.toLocaleString("vi-VN"),
      ]);
      totalRow.font = { name: "Times New Roman", bold: true, size: 13 };
      totalRow.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // Gộp ô cho hàng tổng cộng
      worksheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);
      // Thêm hai dòng trống
      worksheet.addRow([]);

      // Thêm dòng "Bằng chữ" không có viền và tăng cỡ chữ
      // Thêm dòng "Bằng chữ" không có viền và tăng cỡ chữ
      const bangChuRow = worksheet.addRow([
        `Bằng chữ: ${numberToWords(totalSoTien)}`,
      ]);
      bangChuRow.font = { name: "Times New Roman", italic: true, size: 15 };
      worksheet.mergeCells(`A${bangChuRow.number}:${bangChuRow.number}`);
      bangChuRow.alignment = { horizontal: "left", vertical: "middle" };

      // Định dạng viền cho các hàng từ dòng thứ 6 trở đi
      const firstRowOfTable = 8; // Giả sử bảng bắt đầu từ hàng 7
      const lastRowOfTable = totalRow.number; // Hàng tổng cộng

      for (let i = firstRowOfTable; i <= lastRowOfTable; i++) {
        const row = worksheet.getRow(i);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      }

      const sheetName2 = `${giangVien
        .replace(/\s*\(.*?\)\s*/g, "")
        .trim()} - ${last4CCCDs} (2)`;
      const worksheet2 = workbook.addWorksheet(sheetName2);

      // Thêm tiêu đề cho sheet 2
      worksheet2.addRow([]);

      // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
      const titleRow0_2 = worksheet2.addRow(["Ban Cơ yếu Chính phủ"]);
      titleRow0_2.font = { name: "Times New Roman", size: 16, bold: true };
      titleRow0_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`A${titleRow0_2.number}:C${titleRow0_2.number}`);

      // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
      const titleRow1_2 = worksheet2.addRow(["Học Viện Kỹ thuật Mật Mã"]);
      titleRow1_2.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow1_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`A${titleRow1_2.number}:C${titleRow1_2.number}`);

      const titleRow2_2 = worksheet2.addRow(["Phụ lục "]);
      titleRow2_2.font = { name: "Times New Roman", bold: true, size: 20 };
      titleRow2_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`A${titleRow2_2.number}:L${titleRow2_2.number}`); // const titleRow3_2 = worksheet2.addRow([
      //   `Hợp đồng số:    /HĐ-ĐT (Bản sao)`,
      // ]);
      // titleRow3_2.font = { name: "Times New Roman", bold: true, size: 16 };
      // titleRow3_2.alignment = { horizontal: "center", vertical: "middle" };
      // worksheet2.mergeCells(`A${titleRow3_2.number}:L${titleRow3_2.number}`);      // Lấy SoThanhLyHopDong từ dữ liệu giảng viên
      const soThanhLyHopDong = giangVienData[0]?.SoThanhLyHopDong || "";

      // Xử lý soThanhLyHopDong: nếu null, undefined, hoặc rỗng thì để trống, ngược lại giữ nguyên
      const verificationContractNumber =
        soThanhLyHopDong && soThanhLyHopDong.trim() !== ""
          ? `Kèm theo biên bản nghiệm thu Hợp đồng số: ${soThanhLyHopDong} ${formattedLatestDate}`
          : `Kèm theo biên bản nghiệm thu Hợp đồng số:             /HĐNT-ĐT ${formattedLatestDate}`;

      const titleRow4_2 = worksheet2.addRow([verificationContractNumber]);
      titleRow4_2.font = { name: "Times New Roman", bold: true, size: 16 };
      titleRow4_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`A${titleRow4_2.number}:M${titleRow4_2.number}`);

      // Đặt vị trí cho tiêu đề "Đơn vị tính: Đồng" vào cột K đến M
      const titleRow5_2 = worksheet2.addRow([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "Đơn vị tính: Đồng",
        "",
        "",
      ]);
      titleRow5_2.font = { name: "Times New Roman", size: 13, italic: true };
      titleRow5_2.alignment = { horizontal: "center", vertical: "middle" };
      worksheet2.mergeCells(`K${titleRow5_2.number}:M${titleRow5_2.number}`);

      worksheet2.pageSetup = {
        paperSize: 9, // Kích thước giấy A4
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: {
          left: 0.3149,
          right: 0.3149,
          top: 0,
          bottom: 0,
          header: 0.3149,
          footer: 0.3149,
        },
      };
      // Định nghĩa tiêu đề cột cho sheet 2
      const header2 = [
        "STT",
        "Họ tên giảng viên",
        "Tên đồ án",
        "Sinh viên thực hiện",
        "Số tiết",
        "Thời gian thực hiện",
        "Địa Chỉ",
        "Học vị",
        "HS lương",
        "Mức thanh toán",
        "Thành tiền",
        "Trừ thuế TNCN 10%",
        "Còn lại",
      ];

      // Thêm tiêu đề cột
      const headerRow2 = worksheet2.addRow(header2);
      headerRow2.font = { name: "Times New Roman", bold: true, size: 11 };
      headerRow2.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "none",
        };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      });

      // Định dạng cột giống sheet 1
      worksheet2.getColumn(1).width = 5; // STT
      worksheet2.getColumn(2).width = 18; // Họ tên giảng viên
      worksheet2.getColumn(3).width = 29; // Tên đồ án
      worksheet2.getColumn(4).width = 14; // Sinh viên thực hiện
      worksheet2.getColumn(5).width = 10; // Số tiết
      worksheet2.getColumn(6).width = 18; // Thời gian thực hiện
      worksheet2.getColumn(7).width = 28; // Địa chỉ
      worksheet2.getColumn(8).width = 6; // Học vị
      worksheet2.getColumn(9).width = 6; // Hệ số lương
      worksheet2.getColumn(10).width = 12; // Mức thanh toán
      worksheet2.getColumn(11).width = 13; // Thành tiền
      worksheet2.getColumn(12).width = 13; // Trừ thuế TNCN 10%
      worksheet2.getColumn(13).width = 13; // Còn lại

      // Định dạng page setup giống sheet 1
      worksheet2.pageSetup = { ...worksheet.pageSetup };

      // Thêm dữ liệu cho sheet 2 giống sheet 1
      let totalSoTiet2 = 0;
      let totalSoTien2 = 0;
      let totalTruThue2 = 0;
      let totalThucNhan2 = 0;

      giangVienData.forEach((item, index) => {
        let hoTenTrim = item.GiangVien.replace(/\s*\(.*?\)\s*/g, "").trim();
        const mucThanhToan = Number(item.TienMoiGiang || 0);
        const soTien = Number(item.ThanhTien || 0);
        const truThue = Number(item.TruThue || 0);
        const thucNhan = Number(item.ThucNhan || 0);
        const thoiGianThucHien = `${formatDateDMY(
          item.NgayBatDau
        )} - ${formatDateDMY(item.NgayKetThuc)}`;

        const hocViVietTat =
          item.HocVi === "Tiến sĩ"
            ? "TS"
            : item.HocVi === "Thạc sĩ"
              ? "ThS"
              : item.HocVi;

        const row = worksheet2.addRow([
          index + 1,
          hoTenTrim,
          item.TenDeTai,
          item.SinhVien,
          item.SoTiet.toLocaleString("vi-VN").replace(/\./g, ","),
          thoiGianThucHien,
          item.DiaChi,
          hocViVietTat,
          item.HSL.toLocaleString("vi-VN").replace(/\./g, ","),
          mucThanhToan.toLocaleString("vi-VN"),
          soTien.toLocaleString("vi-VN"),
          truThue.toLocaleString("vi-VN"),
          thucNhan.toLocaleString("vi-VN"),
        ]);
        row.font = { name: "Times New Roman", size: 13 };
        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          // Thêm định dạng font cho từng cột giống sheet 1
          switch (colNumber) {
            case 1: // STT
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 2: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 3: // Tên đồ án
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 4: // Sinh viên thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 5: // Số tiết
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 6: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 7: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 8: // Học vị
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 9: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 10: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 11: // Thành tiền
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 12: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 13: // Còn lại
              cell.font = { name: "Times New Roman", size: 13 };
              break;
          }
        });

        totalSoTiet2 += parseFloat(item.SoTiet);
        totalSoTien2 += soTien;
        totalTruThue2 += truThue;
        totalThucNhan2 += thucNhan;
      });

      // Thêm hàng tổng cộng cho sheet 2
      const totalRow2 = worksheet2.addRow([
        "Tổng cộng",
        "",
        "",
        "",
        totalSoTiet2.toLocaleString("vi-VN").replace(/\./g, ","),
        "",
        "",
        "",
        "",
        "",
        totalSoTien2.toLocaleString("vi-VN"),
        totalTruThue2.toLocaleString("vi-VN"),
        totalThucNhan2.toLocaleString("vi-VN"),
      ]);
      totalRow2.font = { name: "Times New Roman", bold: true, size: 13 };
      totalRow2.eachCell((cell) => {
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
      worksheet2.mergeCells(`A${totalRow2.number}:C${totalRow2.number}`);

      // Thêm hai dòng trống
      worksheet2.addRow([]);

      // Thêm dòng "Bằng chữ" cho sheet 2
      const bangChuRow2 = worksheet2.addRow([
        `Bằng chữ: ${numberToWords(totalSoTien2)}`,
      ]);
      bangChuRow2.font = { name: "Times New Roman", italic: true, size: 15 };
      worksheet2.mergeCells(`A${bangChuRow2.number}:${bangChuRow2.number}`);
      bangChuRow2.alignment = { horizontal: "left", vertical: "middle" };

      // Định dạng viền cho các hàng từ dòng thứ 8 đến hàng tổng cộng
      const firstRowOfTable2 = 8;
      const lastRowOfTable2 = totalRow2.number;
      for (let i = firstRowOfTable2; i <= lastRowOfTable2; i++) {
        const row = worksheet2.getRow(i);
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      }
    }

    // Sau khi tạo xong các sheet giảng viên, tạo sheet Tổng hợp
    const summarySheet = workbook.addWorksheet("Tổng hợp");

    // Thiết lập các thông số cho trang
    summarySheet.pageSetup = {
      paperSize: 9, // Kích thước giấy A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.3149,
        right: 0.3149,
        top: 0,
        bottom: 0,
        header: 0.3149,
        footer: 0.3149,
      },
    };

    // Thêm tiêu đề
    summarySheet.addRow([]);
    // Thêm tiêu đề "Ban Cơ yếu Chính phủ" phía trên
    const titleRow0 = summarySheet.addRow(["Ban Cơ yếu Chính phủ"]);
    titleRow0.font = { name: "Times New Roman", size: 16, bold: true };
    titleRow0.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow0.number}:C${titleRow0.number}`);

    // Cập nhật vị trí tiêu đề "Học Viện Kỹ thuật Mật Mã"
    const titleRow1 = summarySheet.addRow(["Học Viện Kỹ thuật Mật Mã"]);
    titleRow1.font = { name: "Times New Roman", bold: true, size: 16 };
    titleRow1.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow1.number}:C${titleRow1.number}`);
    const titleRow2 = summarySheet.addRow(["Phụ lục"]);
    titleRow2.font = { name: "Times New Roman", bold: true, size: 20 };
    titleRow2.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow2.number}:L${titleRow2.number}`); // Lấy SoHopDong từ dữ liệu đầu tiên để hiển thị trong tổng hợp
    const firstSoHopDong = data[0]?.SoHopDong || "";
    const firstSoThanhLyHopDong = data[0]?.SoThanhLyHopDong || "";

    // Xử lý firstSoHopDong: nếu null, undefined, hoặc rỗng thì để trống, ngược lại giữ nguyên
    const summaryContractNumber =
      firstSoHopDong && firstSoHopDong.trim() !== ""
        ? `Hợp đồng số: ${firstSoHopDong} `
        : `Hợp đồng số:             /HĐ-ĐT `;
    const titleRow3 = summarySheet.addRow([summaryContractNumber]);
    titleRow3.font = { name: "Times New Roman", bold: true, size: 16 };
    titleRow3.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow3.number}:L${titleRow3.number}`);

    // Xử lý firstSoThanhLyHopDong: nếu null, undefined, hoặc rỗng thì để trống, ngược lại giữ nguyên
    const summaryVerificationNumber =
      firstSoThanhLyHopDong && firstSoThanhLyHopDong.trim() !== ""
        ? `Kèm theo biên bản nghiệm thu Hợp đồng số: ${firstSoThanhLyHopDong} `
        : `Kèm theo biên bản nghiệm thu Hợp đồng số:             /HĐNT-ĐT `;

    const titleRow4 = summarySheet.addRow([summaryVerificationNumber]);
    titleRow4.font = { name: "Times New Roman", bold: true, size: 16 };
    titleRow4.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`A${titleRow4.number}:M${titleRow4.number}`);
    // Đặt vị trí cho tiêu đề "Đơn vị tính: Đồng" vào cột K đến M
    const titleRow5 = summarySheet.addRow([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "Đơn vị tính: Đồng",
      "",
      "",
    ]);
    titleRow5.font = { name: "Times New Roman", size: 13, italic: true };
    titleRow5.alignment = { horizontal: "center", vertical: "middle" };
    summarySheet.mergeCells(`K${titleRow5.number}:M${titleRow5.number}`);

    // Thiết lập tiêu đề cột
    const summaryHeader = [
      "STT",
      "Họ tên giảng viên",
      "Tên đồ án ",
      "Sinh viên thực hiện",
      "Số tiết",
      "Thời gian thực hiện",
      "Địa chỉ",
      "Học vị",
      "HS lương",
      "Mức thanh toán",
      "Thành tiền",
      "Trừ thuế TNCN 10%",
      "Còn lại",
    ];

    const headerRow = summarySheet.addRow(summaryHeader);
    headerRow.font = { name: "Times New Roman", bold: true };
    headerRow.font = { name: "Times New Roman", bold: true };
    // summarySheet.getColumn(10).numFmt = "#,##0"; // Thành tiền

    // summarySheet.getColumn(11).numFmt = "#,##0"; // Thành tiền
    // summarySheet.getColumn(12).numFmt = "#,##0"; // Trừ thuế TNCN 10%
    // summarySheet.getColumn(13).numFmt = "#,##0"; // Còn lại

    // Định dạng cột
    summarySheet.getColumn(1).width = 5; // STT
    summarySheet.getColumn(2).width = 18; // Họ tên giảng viên
    summarySheet.getColumn(3).width = 29; // Tên đồ án
    summarySheet.getColumn(4).width = 14; // Sinh viên thực hiệns
    summarySheet.getColumn(5).width = 10; // Số tiết
    summarySheet.getColumn(6).width = 18; // Thời gian thực hiện
    summarySheet.getColumn(7).width = 28; // Địa chỉ
    summarySheet.getColumn(8).width = 6; // Học vị
    summarySheet.getColumn(9).width = 6; // Hệ số lương
    summarySheet.getColumn(10).width = 12; // Mức thanh toán
    summarySheet.getColumn(11).width = 13; // Thành tiền
    summarySheet.getColumn(12).width = 13; // Trừ thuế TNCN 10%
    summarySheet.getColumn(13).width = 13; // Còn lại

    // Thêm dữ liệu vào sheet tổng hợp
    let stt = 1;
    let totalSoTiet = 0;
    let totalSoTien = 0;
    let totalTruThue = 0;
    let totalThucNhan = 0;

    for (const [giangVien, giangVienData] of Object.entries(groupedData)) {
      giangVienData.forEach((item) => {
        let hoTenTrim = item.GiangVien.replace(/\s*\(.*?\)\s*/g, "").trim();
        const mucThanhToan = Number(item.TienMoiGiang || 0);
        const soTien = Number(item.ThanhTien || 0);
        const truThue = Number(item.TruThue || 0);
        const conLai = Number(item.ThucNhan || 0);

        const hocViVietTat =
          item.HocVi === "Tiến sĩ"
            ? "TS"
            : item.HocVi === "Thạc sĩ"
              ? "ThS"
              : item.HocVi;

        // Thêm hàng dữ liệu vào sheet tổng hợp
        const summaryRow = summarySheet.addRow([
          stt,
          hoTenTrim,
          item.TenDeTai,
          item.SinhVien,
          item.SoTiet.toLocaleString("vi-VN").replace(/\./g, ","),
          `${formatDateDMY(item.NgayBatDau)} - ${formatDateDMY(
            item.NgayKetThuc
          )}`,
          //   convertToRoman(item.HocKy),
          item.DiaChi,
          hocViVietTat,
          item.HSL.toLocaleString("vi-VN").replace(/\./g, ","),
          (mucThanhToan).toLocaleString("vi-VN"), // Mức thanh toán
          soTien.toLocaleString("vi-VN"), // Định dạng số tiền
          truThue.toLocaleString("vi-VN"), // Định dạng số tiền
          conLai.toLocaleString("vi-VN"), // Định dạng số tiền
        ]);

        // Cập nhật các tổng cộng
        totalSoTiet += parseFloat(item.SoTiet);
        totalSoTien += soTien;
        totalTruThue += truThue;
        totalThucNhan += conLai;

        // Căn chỉnh cỡ chữ và kiểu chữ cho từng ô trong hàng dữ liệu
        summaryRow.eachCell((cell, colNumber) => {
          switch (colNumber) {
            case 1: // STT
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 2: // Họ tên giảng viên
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 3: // Tên học phần
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 4: // Tên lớp
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 5: // Số tiết
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 6: // Thời gian thực hiện
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 7: // Học kỳ
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 8: // Địa Chỉ
              cell.font = { name: "Times New Roman", size: 12 };
              break;
            case 9: // Học vị
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 10: // Hệ số lương
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 11: // Mức thanh toán
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 12: // Thành tiền
              cell.font = { name: "Times New Roman", size: 13 };
              break;
            case 13: // Trừ thuế TNCN 10%
              cell.font = { name: "Times New Roman", size: 13 };
              break;

            default:
              cell.font = { name: "Times New Roman", size: 13 };
              break;
          }
          cell.alignment = { horizontal: "center", vertical: "middle" }; // Căn giữa
          cell.alignment.wrapText = true; // Bật wrapText cho ô
        });

        stt++; // Tăng số thứ tự
      });
    }

    // Thêm hàng tổng cộng vào cuối bảng
    const totalRow = summarySheet.addRow([
      "Tổng cộng",
      "",
      "",
      "",
      totalSoTiet.toLocaleString("vi-VN").replace(/\./g, ","),
      "",
      "",
      "",
      "",
      "",
      totalSoTien.toLocaleString("vi-VN"),
      totalTruThue.toLocaleString("vi-VN"),
      totalThucNhan.toLocaleString("vi-VN"),
    ]);

    totalRow.font = { name: "Times New Roman", bold: true, size: 13 };
    totalRow.eachCell((cell) => {
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Gộp ô cho hàng tổng cộng
    summarySheet.mergeCells(`A${totalRow.number}:C${totalRow.number}`);

    // Định dạng các ô trong bảng
    const firstRowOfTable = 8; // Giả sử bảng bắt đầu từ hàng 8
    const lastRowOfTable = totalRow.number; // Hàng tổng cộng

    for (let i = firstRowOfTable; i <= lastRowOfTable; i++) {
      const row = summarySheet.getRow(i);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }

    // Định dạng cho tiêu đề cột
    headerRow.eachCell((cell) => {
      cell.font = { name: "Times New Roman", bold: true, size: 11 }; // Chỉnh cỡ chữ và kiểu chữ

      cell.fill = {
        type: "pattern",
        pattern: "none", // Không màu nền
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
    });

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Tạo tên file
    let fileName = `PhuLuc_DA${dot}_${ki}_${namHoc}`;
    if (khoa && khoa !== "ALL") {
      fileName += `_${sanitizeFileName(khoa)}`;
    }
    if (teacherName) {
      fileName += `_${sanitizeFileName(teacherName)}`;
    }
    fileName += ".xlsx";

    // Tạo đường dẫn đầy đủ tới file
    const filePath = path.join(tempDir, fileName);

    // Ghi workbook vào file
    await workbook.xlsx.writeFile(filePath);

    // Trả về đường dẫn file để dùng tiếp (nén, gửi,...)
    return filePath;
  } catch (error) {
    console.error("Error exporting data:", error);
    return res.status(500).json({
      success: false,
      message: "Error exporting data",
    });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const doanServices = require("../services/doanServices");

const exportPhuLucDA = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    let { dot, ki, namHoc, loaiHopDong, khoa, teacherName, he_dao_tao } =
      req.query;

    if (!dot || !ki || !namHoc) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin đợt, kỳ hoặc năm học",
      });
    }

    const data = await doanServices.getPhuLucDAData(dot, ki, namHoc, khoa, he_dao_tao, teacherName);

    // DEBUG: Kiểm tra dữ liệu ngày từ truy vấn
    // console.log("=== DEBUG PHỤ LỤC ĐỒ ÁN ===");
    // console.log("Query executed:", query);
    // console.log("Params:", params);
    // if (data.length > 0) {
    //   console.log("First record NgayBatDau:", data[0].NgayBatDau);
    //   console.log("First record NgayKetThuc:", data[0].NgayKetThuc);
    //   console.log("All records dates:");
    //   data.forEach((item, idx) => {
    //     console.log(`  [${idx}] ${item.GiangVien}: NgayBatDau=${item.NgayBatDau}, NgayKetThuc=${item.NgayKetThuc}`);
    //   });
    // }
    // console.log("=== END DEBUG ===");

    if (data.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/exportPhuLucDA';</script>"
      );
    }
    const filePaths = await getExportPhuLucDAPath(
      req,
      res,
      connection,
      dot,
      ki,
      namHoc,
      khoa,
      he_dao_tao,
      teacherName,
      data
    );

    // Kiểm tra filePaths
    if (!filePaths) {
      console.error("getExportPhuLucGiangVienMoiPath trả về undefined");
      return res.status(500).json({
        success: false,
        message: "Không thể tạo file export",
      });
    }

    // Lấy tên file từ đường dẫn
    const fileName = path.basename(filePaths);

    // Gửi file cho client
    res.download(filePaths, fileName, (err) => {
      if (err) {
        console.error("Lỗi khi gửi file:", err);
        if (!res.headersSent) {
          return res.status(500).send("Lỗi khi gửi file");
        }
      }

      // Xóa file và thư mục sau khi gửi
      setTimeout(() => {
        try {
          if (fs.existsSync(filePaths)) {
            fs.unlinkSync(filePaths); // Xóa file
            console.log("Đã xóa file:", filePaths);

            // Xóa thư mục tạm (nếu rỗng)
            const tempDir = path.dirname(filePaths);
            try {
              fs.rmdirSync(tempDir); // Chỉ xóa được thư mục rỗng
              console.log("Đã xóa thư mục:", tempDir);
            } catch (dirErr) {
              console.log(
                "Không thể xóa thư mục (có thể không rỗng):",
                tempDir
              );
            }
          }
        } catch (cleanupErr) {
          console.error("Lỗi khi xóa file:", cleanupErr);
        }
      }, 100);
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return res.status(500).json({
      success: false,
      message: "Error exporting data",
    });
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const getPhuLucDASite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("doan.phuLucDoAn.ejs", {
      gvmoiList: gvmoiList,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

module.exports = {
  exportPhuLucDA,
  getExportPhuLucDAPath,
  getPhuLucDASite,
};
```

## File: src/controllers/hopdong.duyetHopDongDoAnController.js
```javascript
const express = require("express");
const multer = require("multer");
const createPoolConnection = require("../config/databasePool");

const { DON_GIA_EXPR } = require('../queries/hopdongQueries');

/**
 * Tạo subquery chung cho dữ liệu đồ án tốt nghiệp
 * Trích xuất giảng viên 1 (12-20 tiết) và giảng viên 2 (8 tiết)
 * @param {string} namHoc - Năm học
 * @param {string} dot - Đợt
 * @param {string} ki - Kỳ
 * @param {string|null} maPhongBan - Mã phòng ban (null hoặc "ALL" = tất cả)
 * @param {string|null} heDaoTao - Hệ đào tạo (null = tất cả)
 * @returns {{ subquery: string, params: Array }} Subquery và params
 */
const buildDoAnBaseQuery = (namHoc, dot, ki, maPhongBan = null, heDaoTao = null) => {
    let params = [];

    // Điều kiện WHERE cho GiangVien1 và GiangVien2
    let whereConditions = `
        NamHoc = ?
        AND Dot = ?
        AND ki = ?
    `;

    // Subquery cho Giảng viên 1 (12 hoặc 20 tiết)
    let gv1Query = `
        SELECT
            NgayBatDau,
            NgayKetThuc,
            MaPhongBan,
            TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) AS GiangVien,
            Dot,
            NamHoc,
            ki,
            TenDeTai,
            SinhVien,
            MaSV,
            khoa_sinh_vien,
            nganh,
            he_dao_tao,
            CASE
                WHEN GiangVien2 = 'không' OR GiangVien2 = '' THEN 20
                ELSE 12
            END AS SoTiet,
            TaiChinhDuyet
        FROM doantotnghiep
        WHERE GiangVien1 IS NOT NULL
            AND GiangVien1 != ''
            AND (GiangVien1 NOT LIKE '%-%'
                OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien1, '-', 2), '-', -1)) = 'Giảng viên mời')
            AND ${whereConditions}
    `;
    params.push(namHoc, dot, ki);

    // Thêm filter phòng ban nếu có
    if (maPhongBan && maPhongBan !== "ALL") {
        gv1Query += ` AND MaPhongBan = ?`;
        params.push(maPhongBan);
    }

    // Thêm filter hệ đào tạo nếu có
    if (heDaoTao) {
        gv1Query += ` AND he_dao_tao = ?`;
        params.push(heDaoTao);
    }

    // Subquery cho Giảng viên 2 (8 tiết)
    let gv2Query = `
        SELECT
            NgayBatDau,
            NgayKetThuc,
            MaPhongBan,
            TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) AS GiangVien,
            Dot,
            NamHoc,
            ki,
            TenDeTai,
            SinhVien,
            MaSV,
            khoa_sinh_vien,
            nganh,
            he_dao_tao,
            8 AS SoTiet,
            TaiChinhDuyet
        FROM doantotnghiep
        WHERE GiangVien2 IS NOT NULL
            AND GiangVien2 != 'không'
            AND GiangVien2 != ''
            AND (GiangVien2 NOT LIKE '%-%'
                OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien2, '-', 2), '-', -1)) = 'Giảng viên mời')
            AND ${whereConditions}
    `;
    params.push(namHoc, dot, ki);

    // Thêm filter phòng ban nếu có
    if (maPhongBan && maPhongBan !== "ALL") {
        gv2Query += ` AND MaPhongBan = ?`;
        params.push(maPhongBan);
    }

    // Thêm filter hệ đào tạo nếu có
    if (heDaoTao) {
        gv2Query += ` AND he_dao_tao = ?`;
        params.push(heDaoTao);
    }

    // Kết hợp thành UNION ALL
    const subquery = `(${gv1Query} UNION ALL ${gv2Query}) da`;

    return { subquery, params };
};

/**
 * Lấy định mức số tiết giảng dạy
 * @param {Object} connection - Database connection
 * @returns {Promise<{SoTietDinhMuc, SoTietDinhMucChuaNghiHuu, SoTietDinhMucDaNghiHuu}>}
 */
const getSoTietDinhMuc = async (connection) => {
    const [sotietResult] = await connection.query(
        `SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu FROM sotietdinhmuc LIMIT 1`
    );
    return {
        SoTietDinhMuc: sotietResult[0]?.GiangDay || 0,
        SoTietDinhMucChuaNghiHuu: sotietResult[0]?.GiangDayChuaNghiHuu || sotietResult[0]?.GiangDay || 280,
        SoTietDinhMucDaNghiHuu: sotietResult[0]?.GiangDayDaNghiHuu || 560
    };
};

/**
 * Render site
 */
const getDuyetHopDongPage = (req, res) => {
    try {
        res.render('hopdong.duyetHopDongDoAn.ejs');
    } catch (error) {
        console.error("Error rendering duyet hop dong page:", error);
        res.status(500).send("Internal Server Error");
    }
};


/**
 * Xem theo giảng viên 
 */
const getDuyetHopDongData = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, namHoc, maPhongBan, loaiHopDong, ki } = req.body;
        if (!dot || !namHoc || !loaiHopDong || !ki) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Năm học, Kỳ, Loại hợp đồng"
            });
        }

        // Sử dụng shared base query
        const { subquery, params } = buildDoAnBaseQuery(namHoc, dot, ki, maPhongBan);

        // Build outer query với các SELECT fields và JOINs
        const query = `
            SELECT
                da.NgayBatDau,
                da.NgayKetThuc,
                gv.id_Gvm,
                gv.HoTen,
                gv.GioiTinh,
                gv.NgaySinh,
                gv.CCCD,
                gv.NoiCapCCCD,
                gv.Email,
                gv.MaSoThue,
                gv.HocVi,
                gv.ChucVu,
                gv.HSL,
                gv.DienThoai,
                gv.STK,
                gv.NganHang,
                gv.MaPhongBan,
                gv.isNghiHuu,
                da.MaPhongBan AS MaKhoaMonHoc,
                SUM(da.SoTiet) AS SoTiet,
                da.he_dao_tao,
                da.NamHoc,
                da.Dot,
                da.ki,
                gv.NgayCapCCCD,
                gv.DiaChi,
                gv.BangTotNghiep,
                gv.NoiCongTac,
                gv.BangTotNghiepLoai,
                gv.MonGiangDayChinh,
                GROUP_CONCAT(DISTINCT da.TenDeTai SEPARATOR ', ') AS MonHoc,
                GROUP_CONCAT(DISTINCT da.SinhVien  SEPARATOR ', ') AS Lop,
                GROUP_CONCAT(DISTINCT da.MaSV      SEPARATOR ', ') AS SiSo,
                GROUP_CONCAT(DISTINCT da.khoa_sinh_vien SEPARATOR ', ') AS KhoaSinhVien,
                GROUP_CONCAT(DISTINCT da.nganh SEPARATOR ', ') AS Nganh,
                ${DON_GIA_EXPR('da', 'MaPhongBan')}                       AS TienMoiGiang,
                SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')}         AS ThanhTien,
                SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')} * 0.1   AS Thue,
                SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')} * 0.9   AS ThucNhan,
                NULL                          AS SoHopDong,
                'Chưa có hợp đồng'            AS TrangThaiHopDong,
                pb.TenPhongBan,
                1                              AS DaoTaoDuyet,
                MAX(da.TaiChinhDuyet)          AS TaiChinhDuyet
            FROM ${subquery}
            JOIN gvmoi gv ON da.GiangVien = gv.HoTen AND gv.isQuanDoi = 0
            LEFT JOIN phongban pb ON da.MaPhongBan = pb.MaPhongBan
            GROUP BY
                gv.id_Gvm, gv.HoTen, da.MaPhongBan, pb.TenPhongBan,
                gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD,
                gv.Email, gv.MaSoThue, gv.HocVi, gv.ChucVu, gv.HSL,
                gv.DienThoai, gv.STK, gv.NganHang, gv.MaPhongBan, gv.isNghiHuu,
                da.NamHoc, da.Dot, da.ki, da.he_dao_tao,
                gv.NgayCapCCCD, gv.DiaChi, gv.BangTotNghiep,
                gv.NoiCongTac, gv.BangTotNghiepLoai, gv.MonGiangDayChinh,
                da.NgayBatDau, da.NgayKetThuc
        `;

        const [results] = await connection.query(query, params);

        // DEBUG: Log raw database results to check isNghiHuu field
        if (results.length > 0) {
            console.log('[DEBUG CONTROLLER] First result from DB:', {
                HoTen: results[0].HoTen,
                isNghiHuu: results[0].isNghiHuu,
                isNghiHuuType: typeof results[0].isNghiHuu,
                allKeys: Object.keys(results[0])
            });
        }

        // 1) Gom nhóm theo giảng viên với breakdown chương trình
        const groupedByTeacher = results.reduce((acc, cur) => {
            const t = cur.HoTen;
            if (!acc[t]) {
                acc[t] = {
                    teacherInfo: {
                        id_Gvm: cur.id_Gvm,
                        HoTen: cur.HoTen,
                        GioiTinh: cur.GioiTinh,
                        NgaySinh: cur.NgaySinh,
                        CCCD: cur.CCCD,
                        NoiCapCCCD: cur.NoiCapCCCD,
                        Email: cur.Email,
                        MaSoThue: cur.MaSoThue,
                        HocVi: cur.HocVi,
                        ChucVu: cur.ChucVu,
                        HSL: cur.HSL,
                        DienThoai: cur.DienThoai,
                        STK: cur.STK,
                        NganHang: cur.NganHang,
                        MaPhongBan: cur.MaPhongBan,
                        isNghiHuu: cur.isNghiHuu,
                        NgayCapCCCD: cur.NgayCapCCCD,
                        DiaChi: cur.DiaChi,
                        BangTotNghiep: cur.BangTotNghiep,
                        NoiCongTac: cur.NoiCongTac,
                        BangTotNghiepLoai: cur.BangTotNghiepLoai,
                        MonGiangDayChinh: cur.MonGiangDayChinh,
                        NgayBatDau: cur.NgayBatDau,
                        NgayKetThuc: cur.NgayKetThuc,
                        TenPhongBan: cur.TenPhongBan,
                        SoHopDong: cur.SoHopDong,
                        TrangThaiHopDong: cur.TrangThaiHopDong,
                        DaoTaoDuyet: cur.DaoTaoDuyet,
                        TaiChinhDuyet: cur.TaiChinhDuyet,
                        KhoaSinhVien: cur.KhoaSinhVien,
                        Nganh: cur.Nganh
                    },
                    trainingPrograms: [],
                    totalFinancials: {
                        totalSoTiet: 0,
                        totalThanhTien: 0,
                        totalThue: 0,
                        totalThucNhan: 0
                    }
                };
            }
            const prog = {
                id: cur.he_dao_tao,  // ID để preview page sử dụng
                he_dao_tao: cur.he_dao_tao,
                SoTiet: +cur.SoTiet,
                TienMoiGiang: +cur.TienMoiGiang,
                ThanhTien: +cur.ThanhTien,
                Thue: +cur.Thue,
                ThucNhan: +cur.ThucNhan,
                MaKhoaMonHoc: cur.MaKhoaMonHoc,
                MonHoc: cur.MonHoc,
                Lop: cur.Lop,
                SiSo: cur.SiSo
            };
            acc[t].trainingPrograms.push(prog);
            acc[t].totalFinancials.totalSoTiet += prog.SoTiet;
            acc[t].totalFinancials.totalThanhTien += prog.ThanhTien;
            acc[t].totalFinancials.totalThue += prog.Thue;
            acc[t].totalFinancials.totalThucNhan += prog.ThucNhan;
            return acc;
        }, {});

        // 2) Chuyển thành mảng để sort
        const teachersArr = Object.entries(groupedByTeacher).map(([name, data]) => ({
            name,
            ...data,
            totalSoTiet: data.totalFinancials.totalSoTiet,
            maPhongBan: data.teacherInfo.MaPhongBan
        }));

        // 3) MỚI: chỉ sort theo khoa
        teachersArr.sort((a, b) =>
            a.maPhongBan.localeCompare(b.maPhongBan)
        );

        // 4) Chuẩn bị output cho 2 UI
        const simplifiedGroupedByTeacher = {};
        const enhancedGroupedByTeacher = {};
        for (const t of teachersArr) {
            simplifiedGroupedByTeacher[t.name] = [{
                ...t.teacherInfo,
                SoTiet: t.totalFinancials.totalSoTiet,
                ThanhTien: t.totalFinancials.totalThanhTien,
                Thue: t.totalFinancials.totalThue,
                ThucNhan: t.totalFinancials.totalThucNhan,
                trainingPrograms: t.trainingPrograms,
                totalFinancials: t.totalFinancials
            }];
            enhancedGroupedByTeacher[t.name] = {
                teacherInfo: t.teacherInfo,
                trainingPrograms: t.trainingPrograms,
                totalFinancials: t.totalFinancials
            };
        }

        // 5) Lấy SoTietDinhMuc
        const [sotietResult] = await connection.query(`SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu FROM sotietdinhmuc LIMIT 1`);
        const SoTietDinhMuc = sotietResult[0]?.GiangDay || 0;
        const SoTietDinhMucChuaNghiHuu = sotietResult[0]?.GiangDayChuaNghiHuu || SoTietDinhMuc || 280;
        const SoTietDinhMucDaNghiHuu = sotietResult[0]?.GiangDayDaNghiHuu || 560;

        // console.log(enhancedGroupedByTeacher);
        return res.json({
            groupedByTeacher: simplifiedGroupedByTeacher,
            enhancedGroupedByTeacher,
            SoTietDinhMuc,
            SoTietDinhMucChuaNghiHuu,
            SoTietDinhMucDaNghiHuu,
        });

    } catch (error) {
        console.error("❌ Error in getDuyetHopDongData:", error);
        return res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi lấy dữ liệu",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
};



/**
 * Approve contracts based on criteria
 */
const approveContracts = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        if (!dot || !namHoc || !loaiHopDong || ki === undefined) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kì, Năm học, Loại hợp đồng"
            });
        }

        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'",
                receivedLoaiHopDong: loaiHopDong
            });
        }

        // Lấy danh sách khoa cần xử lý
        const faculties = [];
        if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
            faculties.push(maPhongBan);
        } else {
            const [rows] = await connection.query(`SELECT MaPhongBan FROM phongban`);
            faculties.push(...rows.map(f => f.MaPhongBan));
        }

        // Kiểm tra duyệt đào tạo cho từng khoa (không xét bản đã lưu DaLuu)
        const unapprovedFaculties = [];
        for (const facultyCode of faculties) {
            const [check] = await connection.query(
                `SELECT DaoTaoDuyet FROM doantotnghiep
                 WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ? AND Ki = ?
                   AND DaLuu = 0`,
                [facultyCode, namHoc, dot, ki]
            );
            if (check.some(r => r.DaoTaoDuyet != 1)) {
                unapprovedFaculties.push(facultyCode);
            }
        }

        if (unapprovedFaculties.length > 0) {
            return res.status(200).json({
                success: false,
                isNotification: true,
                message: `Các khoa chưa được Đào Tạo duyệt xong: ${unapprovedFaculties.join(', ')}. Vui lòng hoàn thành trước khi duyệt tài chính.`,
                unapprovedFaculties,
                affectedRows: 0
            });
        }

        // Cập nhật duyệt tài chính cho các bản ghi chưa lưu
        let affectedRows = 0;
        for (const facultyCode of faculties) {
            // Double-check bản ghi chưa lưu
            const [checkAll] = await connection.query(
                `SELECT DaoTaoDuyet FROM doantotnghiep
                 WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ? AND Ki = ?
                   AND DaoTaoDuyet = 1 AND DaLuu = 0`,
                [facultyCode, namHoc, dot, ki]
            );
            if (checkAll.length > 0) {
                // Update with JOIN to filter by isQuanDoi = 0
                // For thesis, need to check both GiangVien1 and GiangVien2
                const [updateResult] = await connection.query(
                    `UPDATE doantotnghiep dt
                     SET dt.TaiChinhDuyet = 1
                     WHERE dt.MaPhongBan = ? AND dt.NamHoc = ? AND dt.Dot = ? AND dt.Ki = ?
                       AND dt.DaoTaoDuyet = 1 AND dt.TaiChinhDuyet != 1
                       AND dt.DaLuu = 0 `,
                    [facultyCode, namHoc, dot, ki]
                );
                affectedRows += updateResult.affectedRows;
            }
        }

        res.json({
            success: true,
            message: `Duyệt thành công`,
            affectedRows
        });

    } catch (error) {
        console.error("Error approving contracts:", error);
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi duyệt hợp đồng"
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Unapprove contracts based on criteria (reverse of approval)
 */
const unapproveContracts = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        if (!dot || !namHoc || !loaiHopDong || ki === undefined) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kì, Năm học, Loại hợp đồng"
            });
        }

        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'",
                receivedLoaiHopDong: loaiHopDong
            });
        }

        const facultiesToUpdate = [];
        if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
            facultiesToUpdate.push(maPhongBan);
        } else {
            const [faculties] = await connection.query(
                `SELECT DISTINCT MaPhongBan
                 FROM doantotnghiep
                 WHERE NamHoc = ? AND Dot = ? AND Ki = ?
                   AND TaiChinhDuyet = 1 AND DaLuu = 0`,
                [namHoc, dot, ki]
            );
            facultiesToUpdate.push(...faculties.map(f => f.MaPhongBan));
        }

        let affectedRows = 0;
        for (const facultyCode of facultiesToUpdate) {
            // Update with JOIN to filter by isQuanDoi = 0
            const [updateResult] = await connection.query(
                `UPDATE doantotnghiep dt
                 SET dt.TaiChinhDuyet = 0
                 WHERE dt.MaPhongBan = ? AND dt.NamHoc = ? AND dt.Dot = ? AND dt.Ki = ?
                   AND dt.TaiChinhDuyet = 1 AND dt.DaLuu = 0
                   AND (
                     EXISTS (
                       SELECT 1 FROM gvmoi gv 
                       WHERE TRIM(SUBSTRING_INDEX(dt.GiangVien1, '-', 1)) = gv.HoTen 
                         AND gv.isQuanDoi = 0
                     )
                     OR EXISTS (
                       SELECT 1 FROM gvmoi gv 
                       WHERE TRIM(SUBSTRING_INDEX(dt.GiangVien2, '-', 1)) = gv.HoTen 
                         AND gv.isQuanDoi = 0
                     )
                   )`,
                [facultyCode, namHoc, dot, ki]
            );
            affectedRows += updateResult.affectedRows;
        }

        res.json({
            success: true,
            message: `Bỏ duyệt thành công`,
            affectedRows
        });
    } catch (error) {
        console.error("Error unapproving contracts:", error);
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi bỏ duyệt hợp đồng"
        });
    } finally {
        if (connection) connection.release();
    }
};


/**
 * Get contract approval data grouped by training program (he_dao_tao)
 */
const getDuyetHopDongTheoHeDaoTao = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, namHoc, maPhongBan, loaiHopDong, ki } = req.body;

        // Validate required parameters - thêm ki vào validation
        if (!dot || !namHoc || !loaiHopDong || !ki) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học, Loại hợp đồng"
            });
        }// Validate loaiHopDong - only support thesis contracts
        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'",
                receivedLoaiHopDong: loaiHopDong
            });
        }

        // Sử dụng shared base query cho main aggregate query
        const { subquery, params } = buildDoAnBaseQuery(namHoc, dot, ki, maPhongBan);

        // Query for "Đồ án" - chỉ lấy he_dao_tao (ID), frontend sẽ mapping lấy tên
        const query = `
            SELECT
                MIN(da.NgayBatDau) AS NgayBatDau,
                MAX(da.NgayKetThuc) AS NgayKetThuc,
                da.he_dao_tao,
                da.NamHoc,
                da.Dot,
                SUM(da.SoTiet) AS SoTiet,
                100000 AS TienMoiGiang,
                SUM(da.SoTiet) * 100000 AS ThanhTien,
                SUM(da.SoTiet) * 100000 * 0.1 AS Thue,
                SUM(da.SoTiet) * 100000 * 0.9 AS ThucNhan,
                1 AS DaoTaoDuyet,
                1 AS TaiChinhDuyet,
                COUNT(DISTINCT da.GiangVien) AS SoGiangVien
            FROM ${subquery}
            JOIN gvmoi gv ON da.GiangVien = gv.HoTen AND gv.isQuanDoi = 0
            LEFT JOIN phongban pb ON da.MaPhongBan = pb.MaPhongBan
            GROUP BY da.NamHoc, da.Dot, da.he_dao_tao
            ORDER BY da.he_dao_tao
        `;

        const [results] = await connection.query(query, params);

        // Debug
        console.log('[DEBUG getDuyetHopDongTheoHeDaoTao] Results count:', results.length);
        if (results.length > 0) {
            console.log('[DEBUG getDuyetHopDongTheoHeDaoTao] First result:', {
                he_dao_tao: results[0].he_dao_tao,
                allKeys: Object.keys(results[0])
            });
        }

        // Get detailed teacher information for the "Đại học" training program
        const enhancedResults = [];

        for (const heDaoTao of results) {
            // Sử dụng shared base query với filter heDaoTao
            const { subquery: teacherSubquery, params: baseTeacherParams } = buildDoAnBaseQuery(
                namHoc, dot, ki, maPhongBan, heDaoTao.he_dao_tao
            );

            // Query to get detailed teacher info for this training program
            // Sử dụng subquery thay vì LEFT JOIN để tránh nhân bản rows khi SUM SoTiet
            const teacherQuery = `
                SELECT
                    gv.id_Gvm,
                    da.GiangVien,
                    gv.HoTen,
                    gv.GioiTinh,
                    gv.NgaySinh,
                    gv.CCCD,
                    gv.NoiCapCCCD,
                    gv.Email,
                    gv.MaSoThue,
                    gv.HocVi,
                    gv.ChucVu,
                    gv.HSL,
                    gv.DienThoai,
                    gv.STK,
                    gv.NganHang,
                    gv.MaPhongBan,
                    gv.isNghiHuu,
                    pb.TenPhongBan,
                    da.he_dao_tao,
                    
                    SUM(da.SoTiet) AS SoTiet,
                    ${DON_GIA_EXPR('da', 'MaPhongBan')} AS TienMoiGiang,
                    SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')} AS ThanhTien,
                    SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')} * 0.1 AS Thue,
                    SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')} * 0.9 AS ThucNhan,
                    
                    1 AS DaoTaoDuyet,
                    1 AS TaiChinhDuyet,
                    
                    -- Lấy thông tin đồ án bằng subquery để tránh duplicate rows
                    (SELECT GROUP_CONCAT(DISTINCT TenDeTai SEPARATOR ', ') 
                     FROM doantotnghiep 
                     WHERE (TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) = gv.HoTen 
                            OR TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) = gv.HoTen)
                       AND NamHoc = ? AND Dot = ? AND ki = ? AND he_dao_tao = ?
                    ) as MonHoc,
                    (SELECT GROUP_CONCAT(DISTINCT SinhVien SEPARATOR ', ') 
                     FROM doantotnghiep 
                     WHERE (TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) = gv.HoTen 
                            OR TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) = gv.HoTen)
                       AND NamHoc = ? AND Dot = ? AND ki = ? AND he_dao_tao = ?
                    ) as Lop,
                    (SELECT GROUP_CONCAT(DISTINCT MaSV SEPARATOR ', ') 
                     FROM doantotnghiep 
                     WHERE (TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) = gv.HoTen 
                            OR TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) = gv.HoTen)
                       AND NamHoc = ? AND Dot = ? AND ki = ? AND he_dao_tao = ?
                    ) as SiSo,
                    (SELECT GROUP_CONCAT(DISTINCT khoa_sinh_vien SEPARATOR ', ') 
                     FROM doantotnghiep 
                     WHERE (TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) = gv.HoTen 
                            OR TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) = gv.HoTen)
                       AND NamHoc = ? AND Dot = ? AND ki = ? AND he_dao_tao = ?
                    ) as KhoaSinhVien,
                    (SELECT GROUP_CONCAT(DISTINCT nganh SEPARATOR ', ') 
                     FROM doantotnghiep 
                     WHERE (TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) = gv.HoTen 
                            OR TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) = gv.HoTen)
                       AND NamHoc = ? AND Dot = ? AND ki = ? AND he_dao_tao = ?
                    ) as Nganh

                FROM ${teacherSubquery}
                JOIN gvmoi gv ON da.GiangVien = gv.HoTen AND gv.isQuanDoi = 0
                LEFT JOIN phongban pb ON da.MaPhongBan = pb.MaPhongBan
                GROUP BY
                    gv.id_Gvm, da.GiangVien, gv.HoTen, gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, 
                    gv.Email, gv.MaSoThue, gv.HocVi, gv.ChucVu, gv.HSL, gv.DienThoai, 
                    gv.STK, gv.NganHang, gv.MaPhongBan, gv.isNghiHuu, pb.TenPhongBan, da.he_dao_tao
                ORDER BY SoTiet DESC, gv.HoTen
            `;

            // params cho subqueries: 5 subqueries x 4 params each = 20 params sau baseTeacherParams
            const hdt = heDaoTao.he_dao_tao;
            const teacherParams = [
                ...baseTeacherParams,
                // Subquery MonHoc
                namHoc, dot, ki, hdt,
                // Subquery Lop
                namHoc, dot, ki, hdt,
                // Subquery SiSo
                namHoc, dot, ki, hdt,
                // Subquery KhoaSinhVien
                namHoc, dot, ki, hdt,
                // Subquery Nganh
                namHoc, dot, ki, hdt
            ];
            const [teacherDetails] = await connection.query(teacherQuery, teacherParams);

            // // DEBUG: Check isNghiHuu and HSL in database results
            // if (teacherDetails.length > 0) {
            //     console.log('[DEBUG CONTROLLER HE DAO TAO] First teacher from DB:', {
            //         teacher: teacherDetails[0].HoTen,
            //         isNghiHuu: teacherDetails[0].isNghiHuu,
            //         isNghiHuuType: typeof teacherDetails[0].isNghiHuu,
            //         HSL: teacherDetails[0].HSL,
            //         HSLType: typeof teacherDetails[0].HSL,
            //         allKeys: Object.keys(teacherDetails[0])
            //     });
            // }

            // Original HSL debug
            if (teacherDetails.length > 0) {
                console.log('Database HSL Debug for first teacher:', {
                    teacher: teacherDetails[0].HoTen,
                    HSL: teacherDetails[0].HSL,
                    HSLType: typeof teacherDetails[0].HSL,
                    HSLNull: teacherDetails[0].HSL === null,
                    HSLUndefined: teacherDetails[0].HSL === undefined
                });
            }

            // Add teacher details to the training program data
            enhancedResults.push({
                ...heDaoTao,
                chiTietGiangVien: teacherDetails
            });
        }

        // Get SoTietDinhMuc
        const sotietQuery = `SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu FROM sotietdinhmuc LIMIT 1`;
        const [sotietResult] = await connection.query(sotietQuery);
        const SoTietDinhMuc = sotietResult[0]?.GiangDay || 0;
        const SoTietDinhMucChuaNghiHuu = sotietResult[0]?.GiangDayChuaNghiHuu || SoTietDinhMuc || 280;
        const SoTietDinhMucDaNghiHuu = sotietResult[0]?.GiangDayDaNghiHuu || 560; res.json({
            success: true,
            data: results,
            enhancedData: enhancedResults,  // Include detailed data with teacher information
            SoTietDinhMuc: SoTietDinhMuc,
            message: `Tải dữ liệu thành công. Tìm thấy ${results.length} hệ đào tạo cho đồ án (mặc định: Đại học)`
        });

    } catch (error) {
        console.error("❌ Error in getDuyetHopDongTheoHeDaoTao:");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi lấy dữ liệu theo hệ đào tạo",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Check contract save status based on filter conditions
 */
const checkContractSaveStatus = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, namHoc, maPhongBan, loaiHopDong } = req.body;

        // Validate required parameters
        if (!dot || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Năm học, Loại hợp đồng"
            });
        }// Validate loaiHopDong - only support thesis contracts
        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'"
            });
        }        // Check overall status for thesis contracts
        let statusQuery = "SELECT COUNT(*) as totalRecords, COUNT(DISTINCT DaLuu) as distinctValues, MIN(DaLuu) as minValue, MAX(DaLuu) as maxVal FROM doantotnghiep dt WHERE dt.NamHoc = ? AND dt.Dot = ?";
        let statusParams = [namHoc, dot];

        if (maPhongBan && maPhongBan !== "ALL") {
            statusQuery += " AND dt.MaPhongBan = ?";
            statusParams.push(maPhongBan);
        }

        const [statusResults] = await connection.query(statusQuery, statusParams);
        const statusData = statusResults[0];

        let message;
        let unmetRecords = [];

        if (statusData.totalRecords === 0) {
            message = "Không có dữ liệu";
        } else if (statusData.distinctValues === 1 && statusData.minValue === 1) {
            // Tất cả bản ghi đều có DaLuu = 1
            message = "Đã lưu HĐ";
        } else {
            // Có bản ghi chưa đạt điều kiện - lấy chi tiết
            message = "Chưa lưu HĐ";

            let detailQuery = `
                SELECT 
                    dt.ID,
                    dt.MaPhongBan as Khoa,
                    dt.TenDeTai,
                    dt.SinhVien,
                    dt.MaSV,
                    dt.GiangVien1,
                    dt.GiangVien2,
                    dt.DaLuu,
                    dt.NgayBatDau,
                    dt.NgayKetThuc,
                    pb.TenPhongBan as TenKhoa
                FROM doantotnghiep dt
                LEFT JOIN phongban pb ON dt.MaPhongBan = pb.MaPhongBan                WHERE dt.NamHoc = ? 
                  AND dt.Dot = ? 
                  AND (dt.DaLuu IS NULL OR dt.DaLuu <> 1)
            `;
            let detailParams = [namHoc, dot];

            if (maPhongBan && maPhongBan !== "ALL") {
                detailQuery += " AND dt.MaPhongBan = ?";
                detailParams.push(maPhongBan);
            }

            const [detailResults] = await connection.query(detailQuery, detailParams);
            unmetRecords = detailResults;
        } res.json({
            success: true,
            message: message,
            data: {
                totalRecords: statusData.totalRecords,
                unmetRecords: unmetRecords,
                unmetCount: unmetRecords.length
            }
        });

    } catch (error) {
        console.error("❌ Error in checkContractSaveStatus:");
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi kiểm tra trạng thái lưu hợp đồng",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Check contract financial approval status based on filter conditions
 */
const checkContractFinancialApprovalStatus = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, namHoc, maPhongBan, loaiHopDong } = req.body;

        // Validate required parameters
        if (!dot || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Năm học, Loại hợp đồng"
            });
        }

        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'",
                receivedLoaiHopDong: loaiHopDong
            });
        }

        let statusQuery = "SELECT COUNT(*) as totalRecords, COUNT(DISTINCT TaiChinhDuyet) as distinctValues, MIN(TaiChinhDuyet) as minValue, MAX(TaiChinhDuyet) as maxVal FROM doantotnghiep dt WHERE dt.NamHoc = ? AND dt.Dot = ?";
        let statusParams = [namHoc, dot];

        if (maPhongBan && maPhongBan !== "ALL") {
            statusQuery += " AND dt.MaPhongBan = ?";
            statusParams.push(maPhongBan);
        }

        const [statusResults] = await connection.query(statusQuery, statusParams);
        const statusData = statusResults[0];

        let message;
        let unmetRecords = [];

        if (statusData.totalRecords === 0) {
            message = "Không tìm thấy dữ liệu nào phù hợp với điều kiện lọc";
        } else if (statusData.distinctValues === 1 && statusData.minValue === 1) {
            message = `Đã duyệt`;
        } else if (statusData.distinctValues === 1 && statusData.minValue === 0) {
            message = `Chưa duyệt`;
        } else {
            // Trường hợp có nhiều giá trị distinct (cả 0 và 1)
            message = `Chưa duyệt`;
        }

        console.log("debug tc duyet do an : " + message);
        res.json({
            success: true,
            message: message,
            data: {
                totalRecords: statusData.totalRecords,
                unmetRecords: unmetRecords,
                unmetCount: unmetRecords.length
            }
        });

    } catch (error) {
        console.error("❌ Error in checkContractFinancialApprovalStatus:");
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi kiểm tra trạng thái duyệt tài chính hợp đồng",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    getDuyetHopDongPage,
    getDuyetHopDongData,
    getDuyetHopDongTheoHeDaoTao,
    approveContracts,
    unapproveContracts,
    checkContractSaveStatus,
    checkContractFinancialApprovalStatus
};
```

## File: src/controllers/hopDongDAController.js
```javascript
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const createPoolConnection = require("../config/databasePool");
const archiver = require("archiver");
require("dotenv").config(); // Load biến môi trường
const exportPhuLucDAController = require("../controllers/exportPhuLucDAController");
const gvmServices = require("../services/gvmServices");

// Import các thư viện cần thiết để tạo file Word
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  VerticalAlign,
  WidthType,
  BorderStyle,
  PageOrientation,
} = require("docx");

function deleteFolderRecursive(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Đệ quy xóa thư mục con
        deleteFolderRecursive(curPath);
      } else {
        // Xóa file
        fs.unlinkSync(curPath);
      }
    });
    // Xóa thư mục rỗng
    fs.rmdirSync(folderPath);
  }
}
const convertToRoman = (num) => {
  const romanNumerals = [
    { value: 1000, numeral: "M" },
    { value: 900, numeral: "CM" },
    { value: 500, numeral: "D" },
    { value: 400, numeral: "CD" },
    { value: 100, numeral: "C" },
    { value: 90, numeral: "XC" },
    { value: 50, numeral: "L" },
    { value: 40, numeral: "XL" },
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 1, numeral: "I" },
  ];

  let result = "";
  for (const { value, numeral } of romanNumerals) {
    while (num >= value) {
      result += numeral;
      num -= value;
    }
  }
  return result;
};

// Hàm chuyển đổi số thành chữ
const numberToWords = (num) => {
  if (num === 0) return "Không đồng"; // Xử lý riêng trường hợp 0

  const ones = [
    "",
    "một",
    "hai",
    "ba",
    "bốn",
    "năm",
    "sáu",
    "bảy",
    "tám",
    "chín",
  ];
  const teens = [
    "mười",
    "mười một",
    "mười hai",
    "mười ba",
    "mười bốn",
    "mười lăm",
    "mười sáu",
    "mười bảy",
    "mười tám",
    "mười chín",
  ];
  const tens = [
    "",
    "",
    "hai mươi",
    "ba mươi",
    "bốn mươi",
    "năm mươi",
    "sáu mươi",
    "bảy mươi",
    "tám mươi",
    "chín mươi",
  ];
  const thousands = ["", "nghìn", "triệu", "tỷ"];

  let words = "";
  let unitIndex = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk) {
      let chunkWords = [];
      const hundreds = Math.floor(chunk / 100);
      const remainder = chunk % 100;

      // Xử lý hàng trăm
      if (hundreds) {
        chunkWords.push(ones[hundreds]);
        chunkWords.push("trăm");
      }

      // Xử lý phần dư (tens và ones)
      if (remainder < 10) {
        if (remainder > 0) {
          if (hundreds) chunkWords.push("lẻ");
          chunkWords.push(ones[remainder]);
        }
      } else if (remainder < 20) {
        chunkWords.push(teens[remainder - 10]);
      } else {
        const tenPlace = Math.floor(remainder / 10);
        const onePlace = remainder % 10;

        chunkWords.push(tens[tenPlace]);
        if (onePlace === 1 && tenPlace > 1) {
          chunkWords.push("mốt");
        } else if (onePlace === 5 && tenPlace > 0) {
          chunkWords.push("lăm");
        } else if (onePlace) {
          chunkWords.push(ones[onePlace]);
        }
      }

      // Thêm đơn vị nghìn, triệu, tỷ
      if (unitIndex > 0) {
        chunkWords.push(thousands[unitIndex]);
      }

      words = chunkWords.join(" ") + " " + words;
    }
    num = Math.floor(num / 1000);
    unitIndex++;
  }

  // Hàm viết hoa chữ cái đầu tiên
  const capitalizeFirstLetter = (str) =>
    str.charAt(0).toUpperCase() + str.slice(1);

  return capitalizeFirstLetter(words.trim() + " đồng");
};

// Hàm chuyển đổi số thập phân thành chữ
const numberWithDecimalToWords = (num) => {
  const [integerPart, decimalPart] = num.toString().split(".");
  const integerWords = numberToWords(parseInt(integerPart, 10));
  let decimalWords = "";

  if (decimalPart) {
    decimalWords =
      "phẩy " +
      decimalPart
        .split("")
        .map((digit) => ones[parseInt(digit)])
        .join(" ");
  }

  return `${integerWords}${decimalWords ? " " + decimalWords : ""}`.trim();
};

// Hàm định dạng ngày/tháng/năm
const formatDate1 = (date) => {
  try {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();

    return `${day}/${month}/${year}`; // Định dạng ngày/tháng/năm
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

// Hàm định dạng ngày tháng năm
const formatDate = (date) => {
  try {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";

    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();

    return `ngày ${day} tháng ${month} năm ${year}`; // Định dạng ngày tháng năm
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};
// Tính toán khoảng thời gian thực hiện
const formatDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Định dạng ngày bắt đầu
  const startDay = start.getDate().toString().padStart(2, "0");
  const startMonth = (start.getMonth() + 1).toString().padStart(2, "0");
  const startYear = start.getFullYear();

  // Định dạng ngày kết thúc
  const endDay = end.getDate().toString().padStart(2, "0");
  const endMonth = (end.getMonth() + 1).toString().padStart(2, "0");
  const endYear = end.getFullYear();

  return `Từ ngày ${startDay}/${startMonth}/${startYear} đến ngày ${endDay}/${endMonth}/${endYear}`;
};

/**
 * Hàm chuyển đổi date cho Excel
 * Excel lưu trữ date dưới dạng serial number (số ngày kể từ 1/1/1900)
 * Nhưng ExcelJS có thể nhận Date object hoặc string ISO
 * @param {*} dateValue - Giá trị date từ database (có thể là Date, string YYYY-MM-DD, null, undefined)
 * @returns {string|null} - String định dạng DD/MM/YYYY hoặc null
 */
const formatDateForExcel = (dateValue) => {
  try {
    // Nếu null, undefined hoặc chuỗi rỗng
    if (!dateValue || dateValue === '') {
      return null;
    }

    // Nếu đã là Date object hợp lệ
    if (dateValue instanceof Date) {
      if (isNaN(dateValue.getTime())) return null;
      const day = String(dateValue.getDate()).padStart(2, '0');
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const year = dateValue.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Nếu là string
    if (typeof dateValue === 'string') {
      // Loại bỏ khoảng trắng
      const trimmed = dateValue.trim();
      if (trimmed === '' || trimmed === '0000-00-00') {
        return null;
      }

      // Xử lý định dạng YYYY-MM-DD từ database
      if (trimmed.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const parts = trimmed.split('-');
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];

        // Kiểm tra giá trị hợp lệ
        if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
          return null;
        }

        // Trả về string định dạng DD/MM/YYYY
        return `${day}/${month}/${year}`;
      }

      // Fallback cho các định dạng khác
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) return null;

      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Nếu là number (timestamp)
    if (typeof dateValue === 'number') {
      const parsed = new Date(dateValue);
      if (isNaN(parsed.getTime())) return null;
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }

    // Các trường hợp khác
    return null;
  } catch (error) {
    console.error('Error in formatDateForExcel:', error);
    return null;
  }
};

// Controller xuất nhiều hợp đồng
const exportMultipleContracts = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;
    let { dot, ki, namHoc, khoa, he_dao_tao, teacherName } = req.query;

    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt hoặc năm học");
    }

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    connection = await createPoolConnection();

    const teachers = await getExportData(
      connection,
      dot,
      ki,
      namHoc,
      khoa,
      he_dao_tao,
      teacherName
    );

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/hopDongDA';</script>"
      );
    }

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Dữ liệu để tạo file thống kê chuyển khoản
    const summaryData = [];
    const summaryData2 = [];

    // Lấy dữ liệu phòng ban
    const [phongBanList] = await connection.query("SELECT * FROM phongban");

    // const heDaoTaoData = await gvmServices.getHeDaoTaoData();

    // Lấy thông tin hệ đào tạo từ ID
    const [[heDaoTaoInfo]] = await connection.query(
      "SELECT he_dao_tao, loai_hinh FROM he_dao_tao WHERE id = ?",
      [he_dao_tao]
    );
    const tenHeDaoTao = heDaoTaoInfo?.he_dao_tao || "";
    const loaiHinh = heDaoTaoInfo?.loai_hinh || "";

    // Tạo hợp đồng cho từng giảng viên
    for (const teacher of teachers) {
      const tienText = teacher.ThanhTien || 0;
      const tienThueText = teacher.TruThue || 0;
      const tienThucNhanText = teacher.ThucNhan || 0;

      let hoTen = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();

      // Ghi dữ liệu cho thống kê chuyển khoản
      summaryData.push({
        HoTen: hoTen,
        DienThoai: teacher.DienThoai,
        MaSoThue: teacher.MaSoThue,
        STK: teacher.STK,
        NganHang: teacher.NganHang,
        ThucNhan: tienThucNhanText,
        TongTien: tienText,
        TruThue: tienThueText,
        SoHopDong: teacher.SoHopDong,
      });

      summaryData2.push({
        HoTen: hoTen,
        DienThoai: teacher.DienThoai,
        MaSoThue: teacher.MaSoThue,
        STK: teacher.STK,
        NganHang: teacher.NganHang,
        ThucNhan: tienText,
        SoHopDong: teacher.SoHopDong,
      });

      // ✅ REFACTORED: Sử dụng generateDoAnContract thay vì duplicate code
      try {
        const filePath = await generateDoAnContract(teacher, tempDir, phongBanList);
        if (!filePath) {
          console.error(`Failed to generate contract for ${hoTen}`);
        }
      } catch (error) {
        console.error(`Error generating contract for ${hoTen}:`, error);
      }
    }

    // Tạo file thống kê chuyển khoản
    const noiDung = `Đợt ${dot} - Kỳ ${ki} năm học ${namHoc} - ${tenHeDaoTao}`;
    const summaryDoc = createTransferDetailDocument(
      summaryData,
      noiDung,
      "sau thuế"
    );
    const summaryBuf = await Packer.toBuffer(summaryDoc);
    const summaryName = `ĐATN_${tenHeDaoTao}_Thongke_chuyenkhoan_sauthue.docx`;
    fs.writeFileSync(path.join(tempDir, summaryName), summaryBuf);

    console.log("Tạo file thống kê chuyển khoản sau thuế thành công");

    // Tạo file thống kê chuyển khoản trước thuế
    const summaryDoc2 = createTransferDetailDocument(
      summaryData2,
      noiDung,
      "trước thuế"
    );
    const summaryBuf2 = await Packer.toBuffer(summaryDoc2);
    const summaryName2 = `ĐATN_${tenHeDaoTao}_Thongke_chuyenkhoan_truocthue.docx`;
    fs.writeFileSync(path.join(tempDir, summaryName2), summaryBuf2);

    console.log("Tạo file thống kê chuyển khoản trước thuế thành công");

    // Tạo file Excel báo cáo thuế
    const taxReportData = summaryData.map((item, index) => {
      // Sử dụng TongTien nếu có, nếu không thì tính ngược từ ThucNhan
      const tienTruocThue = item.TongTien || 0;
      // Nếu số tiền <= 2 triệu thì không có thuế
      const thuePhaiTra = item.TruThue || 0;

      return {
        stt: index + 1,
        contractNumber: item.SoHopDong,
        executor: item.HoTen,
        expenseDescription: `Hợp đồng giao khoán công việc`,
        idNumber: teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.CCCD || '',
        issueDate: formatDateForExcel(teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.NgayCapCCCD),
        issuePlace: teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.NoiCapCCCD || '',
        idAddress: teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.DiaChi || '',
        phoneNumber: teachers.find(t => t.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim() === item.HoTen)?.DienThoai || '',
        taxCode: item.MaSoThue,
        amount: Number(tienTruocThue), // Tổng tiền trước thuế
        taxDeducted: Number(thuePhaiTra), // Thuế 10%
        netAmount: Number(item.ThucNhan) // Tiền sau thuế
      };
    });

    const taxReportWorkbook = createTaxReportWorkbook(taxReportData);
    const taxReportName = `ĐATN_Daihoc_BangKeTongHopThue.xlsx`;
    await taxReportWorkbook.xlsx.writeFile(path.join(tempDir, taxReportName));

    console.log("Tạo file bảng kê tổng hợp thuế thành công");

    // === Phần fix: lưu ZIP ra ngoài tempDir ===
    const zipOutputDir = path.join(__dirname, "..", "public", "tempZips");
    fs.mkdirSync(zipOutputDir, { recursive: true });

    const zipName = `HopDong_${tenHeDaoTao}_Dot${dot}_${namHoc}_${khoa || "all"
      }.zip`;
    const zipPath = path.join(zipOutputDir, zipName);

    const archive = archiver("zip", { zlib: { level: 9 } });
    const output = fs.createWriteStream(zipPath);
    archive.pipe(output);
    archive.directory(tempDir, false);

    await new Promise((resolve, reject) => {
      archive.on("error", reject);
      output.on("close", resolve);
      archive.finalize();
    });

    // Gửi file và XÓA sau khi tải
    res.download(zipPath, zipName, (err) => {
      if (err) {
        console.error("Error sending zip file:", err);
        return;
      }
      // Dọn dẹp tempDir và file ZIP
      setTimeout(() => {
        // Xóa các file trong tempDir
        if (fs.existsSync(tempDir)) {
          fs.readdirSync(tempDir).forEach((f) => {
            fs.unlinkSync(path.join(tempDir, f));
          });
          fs.rmdirSync(tempDir);
        }
        // Xóa file ZIP
        if (fs.existsSync(zipPath)) {
          fs.unlinkSync(zipPath);
        }
      }, 1000);
    });
  } catch (error) {
    console.error("Error in exportMultipleContracts:", error);
    res.status(500).send(`Lỗi khi tạo file hợp đồng: ${error.message}`);
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const gethopDongDASite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `SELECT HoTen, MaPhongBan FROM gvmoi`;

    const [gvmoiList] = await connection.query(query);

    res.render("hopDongDA.ejs", {
      gvmoiList: gvmoiList,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const getExportAdditionalDoAnGvmSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi`;
    const [gvmoiList] = await connection.query(query);

    res.render("doan.taiTongHopHopDong.ejs", {
      gvmoiList: gvmoiList, // Đảm bảo rằng biến này được truyền vào view
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const doanServices = require("../services/doanServices");

const exportAdditionalDoAnGvm = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;

    let { dot, ki, namHoc, khoa, he_dao_tao, teacherName } = req.query;

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    connection = await createPoolConnection();

    if (!dot || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt hoặc năm học");
    }

    // Lấy dữ liệu phòng ban
    const [phongBanList] = await connection.query("SELECT * FROM phongban");

    // Lấy dữ liệu tiền lương
    const tienLuongList = await getTienLuongList(connection);

    if (!tienLuongList || tienLuongList.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy tiền lương phù hợp với giảng viên'); window.location.href='/api/do-an/hd-gvm/additional-file-site';</script>"
      );
    }

    const teachers = await getExportData(
      connection,
      dot,
      ki,
      namHoc,
      khoa,
      he_dao_tao,
      teacherName,
    );

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/api/do-an/hd-gvm/additional-file-site';</script>"
      );
    }

    const phuLucData = await doanServices.getPhuLucDAData(dot, ki, namHoc, khoa, he_dao_tao, teacherName);

    if (phuLucData.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/api/do-an/hd-gvm/additional-file-site';</script>"
      );
    }

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const contractFiles = [];

    // Tạo hợp đồng cho từng giảng viên
    for (const teacher of teachers) {
      let hoTenTrim = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();
      const teacherZipName = `${hoTenTrim}_${teacher.CCCD}.zip`;
      const teacherZipPath = path.join(tempDir, teacherZipName);
      const teacherArchive = archiver("zip", { zlib: { level: 9 } });
      const output = fs.createWriteStream(teacherZipPath);
      teacherArchive.pipe(output);

      // Lưu các file cần xóa sau khi nén
      const filesToDelete = [];
      const dirsToDelete = [];

      // Tạo file hợp đồng
      const filePathContract = await generateDoAnContract(
        teacher,
        tempDir,
        phongBanList
      );

      // Lấy file tài liệu bổ sung
      const filePathAdditional = await generateAdditionalFile(teacher, tempDir);
      // Lấy file phụ lục
      const phuLucTeacher = phuLucData.filter(
        (item) => item.GiangVien.trim() == teacher.HoTen.trim()
      );

      const filePathAppendix =
        await exportPhuLucDAController.getExportPhuLucDAPath(
          req,
          res,
          connection,
          dot,
          ki,
          namHoc,
          khoa,
          he_dao_tao,
          teacherName,
          phuLucTeacher
        );

      if (
        !fs.existsSync(filePathContract) ||
        fs.statSync(filePathContract).size === 0
      ) {
        console.error(`File bị lỗi hoặc trống: ${filePathContract}`);
        continue; // Bỏ qua file bị lỗi
      }
      if (
        filePathAdditional &&
        (!fs.existsSync(filePathAdditional) ||
          fs.statSync(filePathAdditional).size === 0)
      ) {
        console.error(`File bị lỗi hoặc trống: ${filePathAdditional}`);
        continue; // Bỏ qua file bị lỗi
      }
      if (
        filePathAppendix &&
        (!fs.existsSync(filePathAppendix) ||
          fs.statSync(filePathAppendix).size === 0)
      ) {
        console.error(`File bị lỗi hoặc trống: ${filePathAppendix}`);
        continue; // Bỏ qua file bị lỗi
      }

      if (filePathContract) {
        teacherArchive.file(filePathContract, {
          name: path.basename(filePathContract),
        });
      }
      if (filePathAdditional) {
        teacherArchive.file(filePathAdditional, {
          name: path.basename(filePathAdditional),
        });
      }
      if (filePathAppendix) {
        teacherArchive.file(filePathAppendix, {
          name: path.basename(filePathAppendix),
        });

        filesToDelete.push(filePathAppendix);
        const appendixDir = path.dirname(filePathAppendix);
        dirsToDelete.push(appendixDir);
      }

      await teacherArchive.finalize();
      contractFiles.push(teacherZipPath);

      // Sau khi zip xong mới xóa file
      for (const filePath of filesToDelete) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log("Đã xóa file:", filePath);
        }
      }

      for (const dirPath of dirsToDelete) {
        try {
          if (fs.existsSync(dirPath) && fs.readdirSync(dirPath).length === 0) {
            fs.rmdirSync(dirPath);
            console.log("Đã xóa thư mục:", dirPath);
          }
        } catch (err) {
          console.log("Không thể xóa thư mục (có thể không rỗng):", dirPath);
        }
      }
    }

    // Tạo file ZIP tổng hợp chứa tất cả file ZIP của giảng viên
    let zipFileName = `TongHopHopDong_DoAn_Dot${dot}_Ki${ki}_${namHoc}_DoAn`;
    if (teacherName) {
      zipFileName += `_${teacherName}.zip`;
    } else {
      zipFileName += `_${khoa || "all"}.zip`;
    }
    const zipPath = path.join(tempDir, zipFileName);
    const archive = archiver("zip", { zlib: { level: 9 } });
    const output = fs.createWriteStream(zipPath);
    archive.pipe(output);

    // Thêm tất cả các file ZIP của giảng viên vào file ZIP tổng hợp
    contractFiles.forEach((file) => {
      archive.file(file, { name: path.basename(file) });
    });

    //await archive.finalize();

    await new Promise((resolve, reject) => {
      output.on("close", resolve);
      archive.on("error", reject);
      archive.finalize();
    });

    // Kiểm tra file ZIP trước khi gửi
    if (!fs.existsSync(zipPath) || fs.statSync(zipPath).size === 0) {
      console.error("Lỗi: File ZIP bị trống hoặc hỏng");
      return res.status(500).send("Lỗi: Không thể tạo file ZIP.");
    }

    // Gửi file ZIP cuối cùng về cho client
    res.download(zipPath, zipFileName, (err) => {
      if (!err) {
        setTimeout(() => {
          try {
            if (fs.existsSync(tempDir)) {
              fs.readdirSync(tempDir).forEach((file) =>
                fs.unlinkSync(path.join(tempDir, file))
              );
              fs.rmdirSync(tempDir);
            }
          } catch (error) {
            console.error("Error cleaning up temporary directory:", error);
          }
        }, 1000);
      }
    });
  } catch (error) {
    console.error("Error in exportMultipleContracts:", error);
    res.status(500).send(`Lỗi khi tạo file hợp đồng: ${error.message}`);
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const generateAdditionalFile = async (teacher, tempDir) => {
  const teacherFolderPath = path.resolve(
    __dirname,
    "..",
    "..",
    "Giang_Vien_Moi",
    teacher.MaPhongBan,
    teacher.MaBoMon,
    teacher.HoTen
  );

  if (!fs.existsSync(teacherFolderPath)) return null; // Không có thư mục

  const files = fs.readdirSync(teacherFolderPath);
  const allowedExtensions = process.env.ALLOWED_FILE_EXTENSIONS.split(",").map(
    (ext) => ext.toLowerCase()
  );

  // const documentFile = files.find((f) =>
  //   allowedExtensions.some((ext) => f.toLowerCase().endsWith("." + ext))
  // );

  const documentFile = files.find((f) => {
    const baseName = path.parse(f).name; // Lấy tên file không có phần mở rộng
    const ext = path.extname(f).toLowerCase().slice(1); // Lấy phần mở rộng không có dấu chấm
    return (
      baseName === `${teacher.MaPhongBan}_${teacher.HoTen}` &&
      allowedExtensions.includes(ext)
    );
  });

  if (!documentFile) return null; // Không tìm thấy file hợp lệ

  const oldFilePath = path.join(teacherFolderPath, documentFile);
  // const newFileName = `BoSung_${teacher.HoTen}${path.extname(documentFile)}`;
  // const newFilePath = path.join(teacherFolderPath, newFileName);

  // // Đổi tên file
  // fs.renameSync(oldFilePath, newFilePath);

  return oldFilePath;
};

const generateDoAnContract = async (teacher, tempDir, phongBanList) => {
  try {
    const soTiet = teacher.SoTiet || 0;

    const mucTien = teacher.TienMoiGiang || 0;
    const gioiTinh = teacher.GioiTinh; // Đảm bảo rằng bạn đang lấy giá trị đúng

    let danhXung;

    // Giả sử bạn có biến gioiTinh chứa giá trị giới tính
    if (gioiTinh === "Nam") {
      danhXung = "Ông";
    } else if (gioiTinh === "Nữ") {
      danhXung = "Bà";
    } else {
      danhXung = ""; // Hoặc có thể gán một giá trị mặc định khác
    }
    const maPhongBan = teacher.MaPhongBan; // Đảm bảo rằng bạn đang lấy giá trị đúng

    let tenNganh;

    const phongBan = phongBanList.find(
      (item) =>
        item.MaPhongBan.trim().toUpperCase() == maPhongBan.trim().toUpperCase()
    );

    if (phongBan) {
      tenNganh = phongBan.TenPhongBan; // Lấy từ object tìm được
    } else {
      tenNganh = "Không xác định";
    }

    const ThanhTien = teacher.ThanhTien || 0; // Tính tổng tiền
    // Nếu số tiền <= 2 triệu đồng thì không tính thuế
    const tienThueText = teacher.TruThue || 0;
    const tienThucNhanText = teacher.ThucNhan || 0;
    const thoiGianThucHien = formatDateRange(
      teacher.NgayBatDau,
      teacher.NgayKetThuc
    );

    let hoTen = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();

    const data = {
      Số_hợp_đồng: teacher.SoHopDong || "",
      Số_thanh_lý: teacher.SoThanhLyHopDong || "",
      Ngày_bắt_đầu: formatDate(teacher.NgayBatDau),
      Ngày_kết_thúc: formatDate(teacher.NgayKetThuc),
      Danh_xưng: danhXung,
      Họ_và_tên: hoTen,
      CCCD: teacher.CCCD,
      Ngày_cấp: formatDate1(teacher.NgayCapCCCD),
      Nơi_cấp: teacher.NoiCapCCCD,
      Chức_vụ: teacher.ChucVu,
      Cấp_bậc: teacher.HocVi,
      Hệ_số_lương: Number(teacher.HSL).toFixed(2).replace(".", ","),
      Địa_chỉ_theo_CCCD: teacher.DiaChi,
      Điện_thoại: teacher.DienThoai,
      Mã_số_thuế: teacher.MaSoThue,
      Số_tài_khoản: teacher.STK,
      Email: teacher.Email,
      Tại_ngân_hàng: teacher.NganHang,
      Số_tiết: teacher.SoTiet.toString().replace(".", ","),
      Ngày_kí_hợp_đồng: formatDate(teacher.NgayKi),
      // ✅ Sử dụng giá trị từ database
      Tiền_text: Number(ThanhTien).toLocaleString("vi-VN"),
      Bằng_chữ_số_tiền: numberToWords(ThanhTien),
      Tiền_thuế_Text: Number(tienThueText).toLocaleString("vi-VN"),
      Tiền_thực_nhận_Text: Number(tienThucNhanText).toLocaleString("vi-VN"),
      Bằng_chữ_của_thực_nhận: numberToWords(tienThucNhanText),
      Đợt: teacher.Dot,
      Năm_học: teacher.NamHoc,
      Thời_gian_thực_hiện: thoiGianThucHien,
      Mức_tiền: Number(mucTien).toLocaleString("vi-VN"),
      // ✅ Các field với suffix "1" cũng dùng giá trị từ DB
      Tiền_text1: Number(ThanhTien).toLocaleString("vi-VN"),
      Bằng_chữ_số_tiền1: numberToWords(ThanhTien),
      Tiền_thuế_Text1: Number(tienThueText).toLocaleString("vi-VN"),
      Tiền_thực_nhận_Text1: Number(tienThucNhanText).toLocaleString("vi-VN"),
      Bằng_chữ_của_thực_nhận1: numberToWords(tienThucNhanText),
      Nơi_công_tác: teacher.NoiCongTac,
      Khóa: teacher.KhoaSinhVien || teacher.KhoaDaoTao || "",
      Ngành: teacher.Nganh || tenNganh || "",
      Cơ_sở_đào_tạo: teacher.CoSoDaoTao || "Học viện Kỹ thuật mật mã",
    };
    // Chọn template dựa trên loại hợp đồng
    let templateFileName = "HopDongDA.docx";

    const templatePath = path.resolve(
      __dirname,
      "../templates",
      templateFileName
    );

    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: "«",
        end: "»",
      },
    });

    doc.render(data);

    const buf = doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE",
    });

    let hoTenTrim = teacher.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();

    const fileName = `HopDong_${hoTenTrim}_${teacher.CCCD}.docx`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, buf);

    return filePath; // Trả về đường dẫn file để dùng sau này

    // const fileName = `HopDong_${teacher.HoTen}.docx`;
    // fs.writeFileSync(path.join(tempDir, fileName), buf);
  } catch (error) {
    console.log(error);
  }
};

const getExportData = async (
  connection,
  dot,
  ki,
  namHoc,
  khoa,
  he_dao_tao,
  teacherName
) => {
  try {
    let query = `
      SELECT 
        ed.CCCD,
        gv.DienThoai,
        ed.Email,
        ed.MaSoThue,
        ed.GiangVien AS HoTen,
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
        ed.ki,
        GROUP_CONCAT(DISTINCT ed.khoa_sinh_vien SEPARATOR ', ') AS KhoaSinhVien,
        GROUP_CONCAT(DISTINCT ed.nganh SEPARATOR ', ') AS Nganh,
        MIN(ed.NgayBatDau) AS NgayBatDau,
        MAX(ed.NgayKetThuc) AS NgayKetThuc,
        SUM(ed.SoTiet) AS SoTiet,
        MAX(ed.TienMoiGiang) AS TienMoiGiang,
        SUM(ed.ThanhTien) AS ThanhTien,
        SUM(ed.TruThue) AS TruThue,
        SUM(ed.ThucNhan) AS ThucNhan,
        ed.NamHoc,
        gv.MaPhongBan,
        gv.MonGiangDayChinh AS MaBoMon,
        ed.SoHopDong,
        ed.SoThanhLyHopDong,
        ed.CoSoDaoTao
      FROM gvmoi gv
      JOIN exportdoantotnghiep ed ON gv.CCCD = ed.CCCD
      WHERE 
        ed.Dot = ?
        AND ed.ki = ?
        AND ed.NamHoc = ?
        AND ed.he_dao_tao = ?
        AND gv.isQuanDoi != 1
    `;

    const params = [dot, ki, namHoc, he_dao_tao];

    // 👉 nối theo khoa
    if (khoa && khoa !== "ALL") {
      query += ` AND gv.MaPhongBan LIKE ?`;
      params.push(`%${khoa}%`);
    }

    // 👉 nối theo tên giảng viên
    if (teacherName) {
      query += ` AND gv.HoTen LIKE ?`;
      params.push(`%${teacherName}%`);
    }

    // GROUP BY cố định
    query += `
      GROUP BY 
        ed.CCCD,
        gv.DienThoai,
        ed.Email,
        ed.MaSoThue,
        ed.GiangVien,
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
        ed.ki,
        ed.NamHoc,
        gv.MaPhongBan,
        gv.MonGiangDayChinh,
        ed.SoHopDong,
        ed.SoThanhLyHopDong,
        ed.CoSoDaoTao
    `;

    const [rows] = await connection.execute(query, params);
    return rows;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const getTienLuongList = async (connection) => {
  const query = `SELECT he_dao_tao, HocVi, SoTien FROM tienluong`;
  const [tienLuongList] = await connection.execute(query);
  return tienLuongList;
};

const getBosungDownloadSite = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const query = `select HoTen, MaPhongBan from gvmoi where id_Gvm != 1`;
    const [gvmoiList] = await connection.query(query);

    res.render("doan.phuLucMinhChungGvm.ejs", {
      gvmoiList: gvmoiList, // Đảm bảo rằng biến này được truyền vào view
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const exportBoSungDownloadData = async (req, res) => {
  let connection;
  try {
    const isKhoa = req.session.isKhoa;

    let { dot, ki, namHoc, khoa, he_dao_tao, teacherName } = req.query;

    if (isKhoa == 1) {
      khoa = req.session.MaPhongBan;
    }

    connection = await createPoolConnection();

    if (!dot || !ki || !namHoc) {
      return res.status(400).send("Thiếu thông tin đợt hoặc năm học");
    }

    // Lấy dữ liệu phòng ban
    const [phongBanList] = await connection.query("SELECT * FROM phongban");

    // Lấy dữ liệu tiền lương
    const tienLuongList = await getTienLuongList(connection);

    if (!tienLuongList || tienLuongList.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy tiền lương phù hợp với giảng viên'); window.location.href='/api/do-an/hd-gvm/bosung-download-file';</script>"
      );
    }

    const teachers = await getExportData(
      connection,
      dot,
      ki,
      namHoc,
      khoa,
      he_dao_tao,
      teacherName,
    );

    if (!teachers || teachers.length === 0) {
      return res.send(
        "<script>alert('Không tìm thấy giảng viên phù hợp điều kiện'); window.location.href='/api/do-an/hd-gvm/bosung-download-file';</script>"
      );
    }

    // Tạo thư mục tạm để lưu các file hợp đồng
    const tempDir = path.join(
      __dirname,
      "..",
      "public",
      "temp",
      Date.now().toString()
    );

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileList = [];

    // Tạo hợp đồng cho từng giảng viên
    for (const teacher of teachers) {
      // Lấy file tài liệu bổ sung
      const filePathAdditional = await generateAdditionalFile(teacher, tempDir);

      if (filePathAdditional) {
        fileList.push(filePathAdditional);
      }
    }

    if (fileList.length === 0) {
      return res
        .status(400)
        .send(
          `<script>alert('Không có tài liệu bổ sung nào.'); window.location.href='/api/do-an/hd-gvm/bosung-download-file';</script>`
        );
    }

    const zipPath = path.resolve(__dirname, "TaiLieuBoSung.zip");
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      let fileName = `file_bo_sung_dot${dot}_${ki}_${namHoc}`;

      if (teacherName) {
        fileName += "_" + teacherName + ".zip";
      } else if (khoa != "ALL") {
        fileName += "_" + khoa + ".zip";
      } else {
        fileName += "_ALL" + ".zip";
      }
      // Gửi file zip về client
      res.download(zipPath, `${fileName}`, (err) => {
        if (err) {
          console.error("Lỗi gửi file:", err.message);
          res.status(500).send("Không thể tải file zip.");
        }

        // Xoá file zip sau khi tải nếu muốn
        fs.unlinkSync(zipPath);
      });
    });

    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(output);

    fileList.forEach((filePath) => {
      archive.file(filePath, { name: path.basename(filePath) });
    });

    await archive.finalize();
  } catch (error) {
    console.error("Error in exportMultipleContracts:", error);
    res.status(500).send(`Lỗi khi tạo file hợp đồng: ${error.message}`);
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// Hàm tạo file thống kê chuyển khoản
function createTransferDetailDocument(
  data = [],
  noiDung = "",
  truocthue_or_sauthue
) {
  // Hàm phụ trợ: tạo ô header
  function createHeaderCell(text, isBold, width = null) {
    // Xử lý xuống dòng bằng cách tách text theo \n
    const textLines = (text || "").split("\n");
    const textRuns = [];

    textLines.forEach((line, index) => {
      if (index > 0) {
        // Thêm line break trước mỗi dòng (trừ dòng đầu tiên)
        textRuns.push(new TextRun({ break: 1 }));
      }
      textRuns.push(
        new TextRun({
          text: line,
          bold: isBold,
          font: "Times New Roman",
          size: 22,
          color: "000000",
        })
      );
    });

    const cellConfig = {
      children: [
        new Paragraph({
          children: textRuns,
          alignment: AlignmentType.CENTER,
        }),
      ],
      verticalAlign: VerticalAlign.CENTER,
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
    };

    // Nếu có width được chỉ định, thêm width vào cell
    if (width) {
      cellConfig.width = { size: width, type: WidthType.DXA };
    }

    return new TableCell(cellConfig);
  } // Hàm phụ trợ: tạo ô bình thường
  function createCell(text, isBold = false, width = null) {
    // Xử lý xuống dòng bằng cách tách text theo \n
    const textLines = (text || "").split("\n");
    const textRuns = [];

    textLines.forEach((line, index) => {
      if (index > 0) {
        // Thêm line break trước mỗi dòng (trừ dòng đầu tiên)
        textRuns.push(new TextRun({ break: 1 }));
      }
      textRuns.push(
        new TextRun({
          text: line,
          bold: isBold,
          font: "Times New Roman",
          size: 22,
          color: "000000",
        })
      );
    });

    const cellConfig = {
      children: [
        new Paragraph({
          children: textRuns,
          alignment: AlignmentType.CENTER,
        }),
      ],
      verticalAlign: VerticalAlign.CENTER,
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
    };

    // Nếu có width được chỉ định, thêm width vào cell
    if (width) {
      cellConfig.width = { size: width, type: WidthType.DXA };
    }

    return new TableCell(cellConfig);
  }

  // Hàm tính tổng tiền
  // function calculateTotal(data) {
  //   return data.reduce((sum, row) => sum + (row.ThucNhan || 0), 0);
  // }

  function calculateTotal(data) {
    return data.reduce((sum, row) => {
      const value = Number(row.ThucNhan || 0);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
  }

  // Hàm định dạng số tiền theo VNĐ
  function formatVND(amount) {
    return Number(amount).toLocaleString("vi-VN");
  }

  // Hàm tạo bảng chi tiết
  function createDetailTable(data) {
    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        createHeaderCell("STT", true),
        createHeaderCell("Số HĐ", true, 1950), // Đặt width cố định 1950 twips cho cột Số HĐ (tăng 50px)
        createHeaderCell("Đơn vị thụ hưởng\n(hoặc cá nhân)", true),
        createHeaderCell("SĐT", true),
        createHeaderCell("Mã số thuế", true),
        createHeaderCell("Số tài khoản", true),
        createHeaderCell("Tại ngân hàng", true, 4800), // Đặt width cố định 4800 twips cho cột Tại ngân hàng
        createHeaderCell("Số tiền (VNĐ)", true),
      ],
    });
    const dataRows = data.length
      ? data.map(
        (row, idx) =>
          new TableRow({
            children: [
              createCell((idx + 1).toString()),
              createCell((row.SoHopDong || "") + "  /HĐ-ĐT", false, 1950), // Ô Số HĐ với width cố định (tăng 50px)
              createCell(row.HoTen || ""),
              createCell(row.DienThoai || ""),
              createCell(row.MaSoThue || ""),
              createCell(row.STK || ""),
              createCell(row.NganHang || "", false, 4800), // Ô Tại ngân hàng với width cố định
              createCell(row.ThucNhan ? formatVND(row.ThucNhan) : ""),
            ],
          })
      )
      : Array.from({ length: 4 }).map(
        () =>
          new TableRow({
            children: [
              createCell(""), // STT
              createCell("", false, 1950), // Số HĐ với width cố định (tăng 50px)
              createCell(""), // Đơn vị thụ hưởng
              createCell(""), // SĐT
              createCell(""), // Mã số thuế
              createCell(""), // Số tài khoản
              createCell("", false, 4800), // Tại ngân hàng với width cố định
              createCell(""), // Số tiền
            ],
          })
      );

    const totalAmount = calculateTotal(data);
    const formattedTotalAmount = formatVND(totalAmount);

    const totalRow = new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Tổng cộng",
                  bold: true,
                  font: "Times New Roman",
                  size: 22,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
          columnSpan: 7,
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: formattedTotalAmount || "", // Thay thế null/undefined bằng chuỗi rỗng
                  font: "Times New Roman",
                  size: 22,
                  color: "000000",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        }),
      ],
    });

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 },
      },
      rows: [headerRow, ...dataRows, totalRow],
    });
  }

  return new Document({
    styles: {
      default: {
        document: {
          font: "Times New Roman",
          size: 22,
          color: "000000",
        },
        paragraph: {
          color: "000000",
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            orientation: PageOrientation.LANDSCAPE, // Đặt orientation là landscape
            margin: {
              top: 567, // 1 cm = 567 twips
              right: 567, // 1 cm
              bottom: 567, // 1 cm
              left: 567, // 1 cm
            },
            size: {
              width: 15840, // A4 landscape width (11 inches = 15840 twips)
              height: 12240, // A4 landscape height (8.5 inches = 12240 twips)
            },
          },
        },
        children: [
          // Header
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE, size: 0 },
              bottom: { style: BorderStyle.NONE, size: 0 },
              left: { style: BorderStyle.NONE, size: 0 },
              right: { style: BorderStyle.NONE, size: 0 },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "BAN CƠ YẾU CHÍNH PHỦ",
                            bold: true,
                            font: "Times New Roman",
                            size: 24,
                            color: "000000",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: "HỌC VIỆN KỸ THUẬT MẬT MÃ",
                            bold: true,
                            font: "Times New Roman",
                            size: 24,
                            color: "000000",
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                      top: { style: BorderStyle.NONE, size: 0 },
                      bottom: { style: BorderStyle.NONE, size: 0 },
                      left: { style: BorderStyle.NONE, size: 0 },
                      right: { style: BorderStyle.NONE, size: 0 },
                    },
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 200 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "BẢNG KÊ CHI TIẾT THÔNG TIN CHUYỂN KHOẢN",
                font: "Times New Roman",
                size: 26,
                color: "000000",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Nội dung: `,
                font: "Times New Roman",
                size: 22,
                color: "000000",
              }),
              new TextRun({
                text: `${noiDung || ""}`, // Thay thế null/undefined bằng chuỗi rỗng
                font: "Times New Roman",
                size: 22,
                color: "000000",
              }),
            ],
            spacing: { after: 200 },
          }),
          createDetailTable(data),
          new Paragraph({
            italics: true,
            spacing: { before: 200 },
            children: [
              new TextRun({
                text: `Ghi chú: Số tiền chuyển khoản là số tiền ${truocthue_or_sauthue}`,
                font: "Times New Roman",
                size: 22,
                color: "000000",
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });
}

/**
 * Tạo và trả về Workbook cho bảng kê trừ thuế
 * @param {Array<Object>} records Mảng đối tượng chứa dữ liệu dòng (stt, contractNumber, executor, expenseDescription, idNumber, issueDate, issuePlace, idAddress, taxCode, amount, taxDeducted, netAmount)
 * @returns {ExcelJS.Workbook}
 */
function createTaxReportWorkbook(records) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Bảng kê tổng hợp thuế');

  // Banner & tiêu đề
  worksheet.addRow(['BAN CƠ YẾU CHÍNH PHỦ']);
  worksheet.addRow(['HỌC VIỆN KỸ THUẬT MẬT MÃ']);
  worksheet.addRow([]);
  worksheet.addRow(['BẢNG KÊ TỔNG HỢP THUẾ']);
  worksheet.addRow(['Hợp đồng hướng dẫn đồ án tốt nghiệp']);
  worksheet.addRow([]);

  [1, 2, 4, 5].forEach(rowNum => {
    worksheet.mergeCells(`A${rowNum}:M${rowNum}`);
    worksheet.getRow(rowNum).font = { bold: true, size: rowNum === 4 ? 13 : 11 };
    worksheet.getRow(rowNum).alignment = { horizontal: 'center' };
  });

  // Cột header
  worksheet.addRow(['STT', 'Số HĐ', 'Người thực hiện', 'Nội dung chi tiêu', 'Số CCCD', 'Ngày cấp', 'Nơi cấp', 'Địa chỉ CCCD', 'SĐT', 'Mã số thuế', 'Số tiền', 'Trừ thuế', 'Còn lại']);

  // Cài đặt độ rộng cột vừa đủ với nội dung
  worksheet.columns = [
    { key: 'stt', width: 5 },                    // STT - chỉ cần vừa số
    { key: 'contractNumber', width: 6 },        // Số hợp đồng - vừa với format "123/HĐ-ĐT"
    { key: 'executor', width: 22 },              // Người thực hiện - tên đầy đủ
    { key: 'expenseDescription', width: 28 },    // Nội dung chi tiêu - mô tả dài
    { key: 'idNumber', width: 14 },              // Số CCCD - 12 chữ số + buffer
    { key: 'issueDate', width: 12 },             // Ngày cấp - DD/MM/YYYY
    { key: 'issuePlace', width: 25 },            // Nơi cấp - tên cơ quan
    { key: 'idAddress', width: 40 },             // Địa chỉ CCCD - địa chỉ đầy đủ
    { key: 'phoneNumber', width: 14 },           // SĐT - số điện thoại
    { key: 'taxCode', width: 14 },               // Mã số thuế - 10-13 chữ số
    { key: 'amount', width: 16 },                // Số tiền - định dạng #,##0
    { key: 'taxDeducted', width: 16 },           // Trừ thuế - định dạng #,##0
    { key: 'netAmount', width: 16 }              // Còn lại - định dạng #,##0
  ];

  worksheet.getRow(7).font = { bold: true, size: 11 };
  worksheet.autoFilter = 'A7:M7';
  worksheet.views = [{ state: 'frozen', ySplit: 7 }];

  // Chèn dữ liệu bắt đầu từ hàng 8
  // Đảm bảo dữ liệu được chèn đúng thứ tự cột bằng cách chuyển đổi object thành array
  const dataRows = records.map(record => [
    record.stt,
    record.contractNumber,
    record.executor,
    record.expenseDescription,
    record.idNumber,
    record.issueDate,
    record.issuePlace,
    record.idAddress,
    record.phoneNumber,
    record.taxCode,
    record.amount,
    record.taxDeducted,
    record.netAmount
  ]);

  dataRows.forEach(row => {
    worksheet.addRow(row);
  });

  // Áp dụng định dạng số có dấu phẩy cho các cột tiền tệ
  const dataStartRow = 8;
  const dataEndRow = worksheet.lastRow.number; // Dòng cuối của dữ liệu (không bao gồm tổng cộng)

  // Định dạng cột F (Ngày cấp CCCD) - định dạng ngày DD/MM/YYYY
  for (let row = dataStartRow; row <= dataEndRow; row++) {
    const cell = worksheet.getCell(`F${row}`);
    if (cell.value && cell.value instanceof Date) {
      cell.numFmt = 'dd/mm/yyyy';
    }
  }

  // Định dạng cột K (Số tiền), L (Trừ thuế), M (Còn lại)
  for (let row = dataStartRow; row <= dataEndRow; row++) {
    ['K', 'L', 'M'].forEach(col => {
      const cell = worksheet.getCell(`${col}${row}`);
      if (cell.value && typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
      }
    });
  }

  // Footer: Tổng cộng - sử dụng dataEndRow đã được tính chính xác ở trên
  worksheet.addRow([
    'Tổng cộng:', '', '', '', '', '', '', '', '', '',
    { formula: `SUM(K${dataStartRow}:K${dataEndRow})` },
    { formula: `SUM(L${dataStartRow}:L${dataEndRow})` },
    { formula: `SUM(M${dataStartRow}:M${dataEndRow})` }
  ]);
  const totalRow = worksheet.lastRow.number;
  worksheet.mergeCells(`A${totalRow}:J${totalRow}`);
  worksheet.getRow(totalRow).font = { bold: true };
  worksheet.getRow(totalRow).alignment = { horizontal: 'right' };

  // Áp dụng định dạng số có dấu phẩy cho dòng tổng cộng
  ['K', 'L', 'M'].forEach(col => {
    worksheet.getCell(`${col}${totalRow}`).numFmt = '#,##0';
  });

  // Tính tổng số tiền để chuyển thành chữ
  let totalAmount = 0;
  if (records && records.length > 0) {
    totalAmount = records.reduce((sum, record) => {
      const amount = typeof record.amount === 'number' ? record.amount : 0;
      return sum + amount;
    }, 0);
  }

  // Bằng chữ
  const textRowVal = `Bằng chữ: ${numberToWords(totalAmount)} đồng chẵn.`;
  worksheet.addRow([textRowVal]);
  const textRow = worksheet.lastRow.number;
  worksheet.mergeCells(`A${textRow}:M${textRow}`);
  worksheet.getRow(textRow).font = { italic: true, size: 10 };

  // Ngày tháng năm
  worksheet.addRow([]);
  worksheet.addRow(['', '', '', '', '', '', '', '', `Ngày ... tháng ... năm 2025`, '', '', '', '']);
  const dateRow = worksheet.lastRow.number;
  worksheet.mergeCells(`J${dateRow}:M${dateRow}`);
  worksheet.getRow(dateRow).font = { size: 10 };
  worksheet.getRow(dateRow).alignment = { horizontal: 'center' };

  // Ký tên
  worksheet.addRow([]);
  worksheet.addRow(['', '', '', 'Người lập bảng', '', '', '', 'Trưởng phòng Đào tạo', '', '', '', '']);
  const signRow = worksheet.lastRow.number;
  worksheet.getRow(signRow).font = { bold: true, size: 10 };
  worksheet.getRow(signRow).alignment = { horizontal: 'center' };

  return workbook;
}

module.exports = {
  exportMultipleContracts,
  gethopDongDASite,
  getExportAdditionalDoAnGvmSite,
  exportAdditionalDoAnGvm,
  getBosungDownloadSite,
  exportBoSungDownloadData,
};
```

## File: src/controllers/thongkedoanController.js
```javascript
const createConnection = require("../config/databasePool");

const thongkedoanController = {
  getData: async (req, res) => {
    const { namhoc, khoa, dot, ki, isQuanDoi } = req.query;
    let connection;
    let query;
    const params = [];

    try {
      connection = await createConnection();
      if (khoa === "ALL") {
        // Params cho từng truy vấn
        const paramsCoHuu = [];
        const paramsMoiGiang = [];
        let whereCoHuu = "WHERE ed.isMoiGiang = 0";
        let whereMoiGiang = "WHERE ed.isMoiGiang = 1";
        let joinClause = "LEFT JOIN gvmoi gm ON ed.CCCD = gm.CCCD";

        if (namhoc && namhoc !== "ALL") {
          whereCoHuu += " AND ed.NamHoc = ?";
          paramsCoHuu.push(namhoc);
          whereMoiGiang += " AND ed.NamHoc = ?";
          paramsMoiGiang.push(namhoc);
        }
        if (dot && dot !== "ALL") {
          whereCoHuu += " AND ed.Dot = ?";
          paramsCoHuu.push(dot);
          whereMoiGiang += " AND ed.Dot = ?";
          paramsMoiGiang.push(dot);
        }
        if (ki && ki !== "ALL") {
          whereCoHuu += " AND ed.Ki = ?";
          paramsCoHuu.push(ki);
          whereMoiGiang += " AND ed.Ki = ?";
          paramsMoiGiang.push(ki);
        }
        if (isQuanDoi === "1") {
          whereCoHuu += " AND gm.isQuanDoi = 1";
          whereMoiGiang += " AND gm.isQuanDoi = 1";
        }

        // Tổng hợp theo khoa cho cơ hữu
        const [cohuuKhoa] = await connection.query(`
          SELECT 
            ed.MaPhongBan AS MaPhongBan,
            COUNT(DISTINCT ed.GiangVien) AS soGiangVien,
            SUM(ed.SoTiet) AS soTiet,
            COUNT(ed.ID) AS soDoAn
          FROM exportdoantotnghiep ed
          ${joinClause}
          ${whereCoHuu}
          GROUP BY ed.MaPhongBan
          ORDER BY soDoAn DESC
        `, paramsCoHuu);
      
        // Tổng hợp theo khoa cho mời giảng
        const [moigiangKhoa] = await connection.query(`
          SELECT 
            ed.MaPhongBan,
            COUNT(DISTINCT ed.GiangVien) AS soGiangVien,
            SUM(ed.SoTiet) AS soTiet,
            COUNT(ed.ID) AS soDoAn
          FROM exportdoantotnghiep ed
          ${joinClause}
          ${whereMoiGiang}
          GROUP BY ed.MaPhongBan
          ORDER BY soDoAn DESC
        `, paramsMoiGiang);
      
        // Trả về dữ liệu tổng hợp
        res.json({
          success: true,
          cohuuKhoa,
          moigiangKhoa,
          isAllKhoa: true
        });
        return;
      }
      // Truy vấn dữ liệu cho cả cơ hữu và mời giảng
      query = `
            SELECT 
                ed.GiangVien, 
                SUM(ed.SoTiet) AS soTiet, 
                COUNT(ed.ID) AS soDoAn, 
                ed.MaPhongBan,
                ed.isMoiGiang
            FROM exportdoantotnghiep ed
            LEFT JOIN gvmoi gm ON ed.CCCD = gm.CCCD
            WHERE 1=1
        `;

      if (khoa && khoa !== "ALL") {
        query += " AND ed.MaPhongBan = ?";
        params.push(khoa);
      }

      if (namhoc && namhoc !== "ALL") {
        query += " AND ed.NamHoc = ?";
        params.push(namhoc);
      }

      if (dot && dot !== "ALL") {
        query += " AND ed.Dot = ?";
        params.push(dot);
      }

      if (ki && ki !== "ALL") {
        query += " AND ed.ki = ?";
        params.push(ki);
      }

      if (isQuanDoi === "1") {
        query += " AND gm.isQuanDoi = 1";
      }

      query += `
            GROUP BY ed.GiangVien, ed.isMoiGiang, ed.MaPhongBan
            ORDER BY soDoAn DESC
        `;

      const [result] = await connection.query(query, params);

      // Phân loại dữ liệu theo Cơ hữu và Mời giảng
      const coHuu = result.filter((item) => item.isMoiGiang === 0);
      const moiGiang = result.filter((item) => item.isMoiGiang === 1);

      // Tính tổng số tiết
      const totalCoHuu = coHuu.reduce(
        (sum, item) => sum + parseFloat(item.soTiet || 0),
        0
      );
      const totalMoiGiang = moiGiang.reduce(
        (sum, item) => sum + parseFloat(item.soTiet || 0),
        0
      );
      const totalSoTiet = totalCoHuu + totalMoiGiang;

      // Trả về dữ liệu
      res.json({
        success: true,
        coHuu,
        moiGiang,
        totalCoHuu,
        totalMoiGiang,
        totalSoTiet,
      });
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    } finally {
      if (connection) connection.release();
    }
  },

  getNamHocOptions: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [namHoc] = await connection.query(`
            SELECT DISTINCT namhoc AS NamHoc 
            FROM exportdoantotnghiep 
            ORDER BY namhoc DESC
        `);

      const maxNamHoc = namHoc.length > 0 ? namHoc[0].NamHoc : "ALL"; // Lấy năm học lớn nhất

      // Chỉ thêm "Tất cả năm" một lần
      namHoc.unshift({ NamHoc: "ALL" });

      res.json({
        success: true,
        NamHoc: namHoc,
        MaxNamHoc: maxNamHoc,
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu filter:", error);
      res.status(500).json({ success: false, message: "Lỗi server" });
    } finally {
      if (connection) connection.release();
    }
  },

  getPhongBanOptions: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [phongBan] = await connection.query(`
        SELECT DISTINCT MaPhongBan 
        FROM exportdoantotnghiep 
        ORDER BY MaPhongBan
      `);

      const uniquePhongBan = Array.from(
        new Set(phongBan.map((item) => item.MaPhongBan))
      ).map((maPB) => ({ MaPhongBan: maPB }));

      res.json({ success: true, MaPhongBan: uniquePhongBan });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu phòng ban:", error);
      res.status(500).json({ success: false, message: "Lỗi server" });
    } finally {
      if (connection) connection.release();
    }
  },

  getDotOptions: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [dot] = await connection.query(`
        SELECT DISTINCT Dot 
        FROM exportdoantotnghiep 
        ORDER BY Dot
      `);

      res.json({
        success: true,
        Dot: dot,
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu đợt:", error);
      res.status(500).json({ success: false, message: "Lỗi server" });
    } finally {
      if (connection) connection.release();
    }
  },

  getKiOptions: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [ki] = await connection.query(`
            SELECT DISTINCT Ki 
            FROM exportdoantotnghiep 
            WHERE Ki IS NOT NULL
            ORDER BY Ki
        `);

      res.json({
        success: true,
        Ki: ki,
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu Kì:", error);
      res.status(500).json({ success: false, message: "Lỗi server" });
    } finally {
      if (connection) connection.release();
    }
  },
};

module.exports = thongkedoanController;
```
## File: src/queries/hopdongQueries.js
```javascript
const DON_GIA_EXPR = (tableAlias, khoaCol) => `
COALESCE(
  (
    SELECT cfg.SoTien
    FROM tienluong cfg
    WHERE 
      (cfg.he_dao_tao IS NULL OR cfg.he_dao_tao = ${tableAlias}.he_dao_tao)
      AND (cfg.HocVi IS NULL OR cfg.HocVi = gv.HocVi)
      -- ✅ CHỨC DANH
      AND (
        cfg.chuc_danh_id = 1
        OR cfg.chuc_danh_id = gv.chuc_danh
      )

      -- ✅ HSL
      AND (
        CAST(REPLACE(gv.HSL, ',', '.') AS DECIMAL(4,2)) >= cfg.HSL
      )
    ORDER BY 
      cfg.do_uu_tien DESC,
      cfg.SoTien DESC,
      cfg.HSL DESC
    LIMIT 1
  ),
  0
)
`;


const COL_DON_GIA = `COALESCE(bang_gia.don_gia, 0)`;

const CTE_DO_AN = `
DoAnHopDongDuKien AS (
  SELECT
    gv.id_Gvm,
    gv.HoTen AS GiangVien,
    gv.GioiTinh,
    gv.Email,
    gv.NgaySinh,
    gv.CCCD,
    gv.NoiCapCCCD,
    gv.MaSoThue,
    gv.HocVi,
    gv.ChucVu,
    gv.HSL,
    gv.DienThoai,
    gv.STK,
    gv.NganHang,
    gv.MaPhongBan,
    Combined.MaPhongBan AS MaKhoaMonHoc,
    Combined.he_dao_tao,
    gv.isQuanDoi,
    gv.isNghiHuu,
    NgayBatDau,
    NgayKetThuc,

    /* ================== SỐ TIẾT ================== */
    CASE 
      WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
      WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
      ELSE std.so_tiet_2
    END AS SoTiet,

    Dot,
    ki AS KiHoc,
    NamHoc,
    gv.NgayCapCCCD,
    gv.DiaChi,
    gv.BangTotNghiep, 
    gv.NoiCongTac,
    gv.BangTotNghiepLoai,
    gv.MonGiangDayChinh,
    Combined.DaoTaoDuyet,
    Combined.TaiChinhDuyet,

    /* ================== ĐƠN GIÁ ================== */
    \${DON_GIA_EXPR('Combined', 'MaPhongBan')} AS TienMoiGiang,

    /* ================== THÀNH TIỀN ================== */
    (
      CASE 
        WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
        WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
        ELSE std.so_tiet_2
      END
    ) * \${DON_GIA_EXPR('Combined', 'MaPhongBan')} AS ThanhTien,

    (
      CASE 
        WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
        WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
        ELSE std.so_tiet_2
      END
    ) * \${DON_GIA_EXPR('Combined', 'MaPhongBan')} * 0.1 AS Thue,

    (
      CASE 
        WHEN Combined.Nguon = 'GV1' AND Combined.GiangVien2 = 'không' THEN std.tong_tiet
        WHEN Combined.Nguon = 'GV1' THEN std.so_tiet_1
        ELSE std.so_tiet_2
      END
    ) * \${DON_GIA_EXPR('Combined', 'MaPhongBan')} * 0.9 AS ThucNhan

  FROM (
    SELECT
      NgayBatDau,
      NgayKetThuc,
      MaPhongBan,
      he_dao_tao,
      TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) AS GiangVien,
      GiangVien2,
      'GV1' AS Nguon,
      DaoTaoDuyet,
      TaiChinhDuyet,
      Dot,
      ki,
      NamHoc
    FROM doantotnghiep
    WHERE 
      GiangVien1 IS NOT NULL
      AND (GiangVien1 NOT LIKE '%-%' 
           OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien1, '-', 2), '-', -1)) = 'Giảng viên mời')

    UNION ALL

    SELECT
      NgayBatDau,
      NgayKetThuc,
      MaPhongBan,
      he_dao_tao,
      TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) AS GiangVien,
      GiangVien2,
      'GV2' AS Nguon,
      DaoTaoDuyet,
      TaiChinhDuyet,
      Dot,
      ki,
      NamHoc
    FROM doantotnghiep
    WHERE 
      GiangVien2 IS NOT NULL 
      AND GiangVien2 != 'không'
      AND (GiangVien2 NOT LIKE '%-%' 
           OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien2, '-', 2), '-', -1)) = 'Giảng viên mời')
  ) AS Combined
  JOIN gvmoi gv ON Combined.GiangVien = gv.HoTen
  JOIN sotietdoan std ON Combined.he_dao_tao = std.he_dao_tao
  WHERE Combined.NamHoc = ?
)
\`;


const CTE_DAI_HOC = \`
DaiHocHopDongDuKien AS (
    SELECT
        NgayBatDau,
        NgayKetThuc,
        gv.id_Gvm,
        gv.GioiTinh,
        gv.HoTen,
        gv.NgaySinh,
        gv.CCCD,
        gv.NoiCapCCCD,
        gv.Email,
        gv.MaSoThue,
        gv.HocVi,
        gv.ChucVu,
        gv.HSL,
        gv.DienThoai,
        gv.STK,
        gv.NganHang,
        gv.MaPhongBan,
        qc.Khoa AS MaKhoaMonHoc,
        qc.QuyChuan AS SoTiet,
        qc.he_dao_tao,
        gv.isQuanDoi,
        gv.isNghiHuu,
        qc.NamHoc,
        qc.KiHoc,
        qc.Dot,
        gv.NgayCapCCCD,
        gv.DiaChi,
        gv.BangTotNghiep, 
        gv.NoiCongTac,
        gv.BangTotNghiepLoai,
        gv.MonGiangDayChinh,
        qc.DaoTaoDuyet,
        qc.TaiChinhDuyet,
        \${DON_GIA_EXPR('qc', 'Khoa')} AS TienMoiGiang,

        \${DON_GIA_EXPR('qc', 'Khoa')} * qc.QuyChuan AS ThanhTien,
        \${DON_GIA_EXPR('qc', 'Khoa')} * qc.QuyChuan * 0.1 AS Thue,
        \${DON_GIA_EXPR('qc', 'Khoa')} * qc.QuyChuan * 0.9 AS ThucNhan
    FROM 
        quychuan qc
    JOIN 
        gvmoi gv ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen
    WHERE
        qc.MoiGiang = 1 AND qc.NamHoc = ? AND qc.he_dao_tao in (select id from he_dao_tao where cap_do <= 2)
    )
\`;

const CTE_SAU_DAI_HOC = \`
SoTietSauDaiHoc AS (
        SELECT
            qc.NgayBatDau,
            qc.NgayKetThuc,
            gv.id_Gvm,
            gv.GioiTinh,
            gv.HoTen,
            gv.NgaySinh,
            gv.CCCD,
            gv.NoiCapCCCD,
            gv.Email,
            gv.MaSoThue,
            gv.HocVi,
            gv.ChucVu,
            gv.HSL,
            gv.DienThoai,
            gv.STK,
            gv.NganHang,
            gv.MaPhongBan,
            qc.Khoa AS MaKhoaMonHoc,
            ROUND(
                qc.QuyChuan * CASE 
                    WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 
                    ELSE 1 
                END, 2
            ) AS SoTiet,
            qc.he_dao_tao,
            gv.isQuanDoi,
            gv.isNghiHuu,
            qc.NamHoc,
            qc.KiHoc,
            qc.Dot,
            gv.NgayCapCCCD,
            gv.DiaChi,
            gv.BangTotNghiep, 
            gv.NoiCongTac,
            gv.BangTotNghiepLoai,
            gv.MonGiangDayChinh,
            qc.DaoTaoDuyet,
            qc.TaiChinhDuyet,
            \${DON_GIA_EXPR('qc', 'Khoa')} AS TienMoiGiang
        FROM 
            quychuan qc
        JOIN 
            gvmoi gv ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen
        WHERE
            qc.NamHoc = ? AND qc.he_dao_tao not in (select id from he_dao_tao where cap_do <= 2)
    ),
    SauDaiHocHopDongDuKien AS (
        SELECT
            *,
            TienMoiGiang * SoTiet AS ThanhTien,
            TienMoiGiang * SoTiet * 0.1 AS Thue,
            TienMoiGiang * SoTiet * 0.9 AS ThucNhan
        FROM SoTietSauDaiHoc
    )
\`;

// Union tất cả lại
const CTE_TABLE_ALL = \`
tableALL AS (SELECT
        Dot,
        KiHoc,
        NamHoc,
        'DoAn' AS LoaiHopDong,
        id_Gvm,
        GiangVien,
        he_dao_tao,
        isQuanDoi,
        isNghiHuu,
        NgayBatDau,
        NgayKetThuc,
        SoTiet,
        GioiTinh,
        NgaySinh,
        CCCD,
        NoiCapCCCD,
        Email,
        MaSoThue,
        HocVi,
        ChucVu,
        HSL,
        DienThoai,
        STK,
        NganHang,
        MaPhongBan,
        MaKhoaMonHoc,
        NgayCapCCCD,
        DiaChi,
        BangTotNghiep, 
        NoiCongTac,
        BangTotNghiepLoai,
        MonGiangDayChinh,
        DaoTaoDuyet,
        TaiChinhDuyet,
        TienMoiGiang,
        ThanhTien,
        Thue,
        ThucNhan
    FROM 
        DoAnHopDongDuKien
    UNION ALL
    SELECT 
        Dot,
        KiHoc,
        NamHoc,
        'DaiHoc' AS LoaiHopDong,
        id_Gvm,
        HoTen AS GiangVien,
        he_dao_tao,
        isQuanDoi,
        isNghiHuu,
        NgayBatDau,
        NgayKetThuc,
        SoTiet,
        GioiTinh,
        NgaySinh,
        CCCD,
        NoiCapCCCD,
        Email,
        MaSoThue,
        HocVi,
        ChucVu,
        HSL,
        DienThoai,
        STK,
        NganHang,
        MaPhongBan,
        MaKhoaMonHoc,
        NgayCapCCCD,
        DiaChi,
        BangTotNghiep, 
        NoiCongTac,
        BangTotNghiepLoai,
        MonGiangDayChinh,
        DaoTaoDuyet,
        TaiChinhDuyet,
        TienMoiGiang,
        ThanhTien,
        Thue,
        ThucNhan
    FROM 
        DaiHocHopDongDuKien
    UNION ALL
    SELECT 
        Dot,
        KiHoc,
        NamHoc,
        'SauDaiHoc' AS LoaiHopDong,
        id_Gvm,
        HoTen AS GiangVien,
        he_dao_tao,
        isQuanDoi,
        isNghiHuu,
        NgayBatDau,
        NgayKetThuc,
        SoTiet,
        GioiTinh,
        NgaySinh,
        CCCD,
        NoiCapCCCD,
        Email,
        MaSoThue,
        HocVi,
        ChucVu,
        HSL,
        DienThoai,
        STK,
        NganHang,
        MaPhongBan,
        MaKhoaMonHoc,
        NgayCapCCCD,
        DiaChi,
        BangTotNghiep, 
        NoiCongTac,
        BangTotNghiepLoai,
        MonGiangDayChinh,
        DaoTaoDuyet,
        TaiChinhDuyet,
        TienMoiGiang,
        ThanhTien,
        Thue,
        ThucNhan
    FROM 
        SauDaiHocHopDongDuKien),
    TongSoTietGV AS (
        SELECT 
            GiangVien, 
            SUM(SoTiet) AS TongSoTiet
        FROM 
            tableALL
        GROUP BY 
            GiangVien
    )
\`;

module.exports = { CTE_DO_AN, CTE_DAI_HOC, CTE_SAU_DAI_HOC, CTE_TABLE_ALL, DON_GIA_EXPR };
```
