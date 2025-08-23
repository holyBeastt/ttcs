const createPoolConnection = require("../config/databasePool");

/**
 * Ghi log thay đổi thông tin đồ án
 * @param {Object} connection - Kết nối MySQL
 * @param {Object} oldData - Dữ liệu cũ
 * @param {Object} newData - Dữ liệu mới
 * @param {Object} req - Request object để lấy thông tin session
 * @returns {Boolean} - Kết quả ghi log
 */
const logDoAnChanges = async (connection, oldData, newData, req) => {
  try {
    let changeMessage = '';
    const loaiThongTin = 'Thay đổi thông tin đồ án';

    // Kiểm tra cột GiangVien1
    if (String(oldData.GiangVien1 || '') !== String(newData.GiangVien1 || '')) {
      changeMessage = changeMessage + `Giảng Viên 1 cho đồ án "${newData.TenDeTai}": từ "${oldData.GiangVien1 || ''}" thành "${newData.GiangVien1 || ''}". `;
    }

    // Kiểm tra cột GiangVien2
    if (String(oldData.GiangVien2 || '') !== String(newData.GiangVien2 || '')) {
      changeMessage = changeMessage + `Giảng Viên 2 cho đồ án "${newData.TenDeTai}": từ "${oldData.GiangVien2 || ''}" thành "${newData.GiangVien2 || ''}". `;
    }

    // Kiểm tra trạng thái duyệt khoa
    if (Number(oldData.KhoaDuyet) !== Number(newData.KhoaDuyet)) {
      if (Number(oldData.KhoaDuyet) === 0 && Number(newData.KhoaDuyet) === 1) {
        changeMessage = changeMessage + `Khoa thay đổi duyệt đồ án "${newData.TenDeTai}": Đã duyệt. `;
      } else if (Number(oldData.KhoaDuyet) === 1 && Number(newData.KhoaDuyet) === 0) {
        changeMessage = changeMessage + `Khoa thay đổi duyệt đồ án "${newData.TenDeTai}": Hủy duyệt. `;
      }
    }

    // Kiểm tra trạng thái duyệt đào tạo
    if (Number(oldData.DaoTaoDuyet) !== Number(newData.DaoTaoDuyet)) {
      if (Number(oldData.DaoTaoDuyet) === 0 && Number(newData.DaoTaoDuyet) === 1) {
        changeMessage = changeMessage + `Đào tạo thay đổi duyệt đồ án "${newData.TenDeTai}": Đã duyệt. `;
      } else if (Number(oldData.DaoTaoDuyet) === 1 && Number(newData.DaoTaoDuyet) === 0) {
        changeMessage = changeMessage + `Đào tạo thay đổi duyệt đồ án "${newData.TenDeTai}": Hủy duyệt. `;
      }
    }

    // Kiểm tra trạng thái duyệt văn phòng (trước đây là tài chính)
    if (Number(oldData.TaiChinhDuyet) !== Number(newData.TaiChinhDuyet)) {
      if (Number(oldData.TaiChinhDuyet) === 0 && Number(newData.TaiChinhDuyet) === 1) {
        changeMessage = changeMessage + `Văn phòng thay đổi duyệt đồ án "${newData.TenDeTai}": Đã duyệt. `;
      } else if (Number(oldData.TaiChinhDuyet) === 1 && Number(newData.TaiChinhDuyet) === 0) {
        changeMessage = changeMessage + `Văn phòng thay đổi duyệt đồ án "${newData.TenDeTai}": Hủy duyệt. `;
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
    if (changeMessage !== '') {
      // Lấy thông tin user và khoa từ session
      const userId = req.session?.userId || req.session?.userInfo?.ID || 0;
      const tenNhanVien = req.session?.TenNhanVien || req.session?.username || 'Unknown User';
      const khoa = req.session?.MaPhongBan || 'Unknown Department';
      
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

      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Ghi log thay đổi thông tin quy chuẩn
 * @param {Object} connection - Kết nối MySQL
 * @param {Object} oldData - Dữ liệu cũ
 * @param {Object} newData - Dữ liệu mới
 * @param {Object} req - Request object để lấy thông tin session
 * @returns {Boolean} - Kết quả ghi log
 */
const logQuyChuanChanges = async (connection, oldData, newData, req) => {
  try {
    let changeMessage = '';
    const loaiThongTin = 'Thay đổi thông tin giảng dạy';
    
    // Debug logging để kiểm tra
    console.log('=== DEBUG LOGGING ===');
    console.log('Old KhoaDuyet:', oldData.KhoaDuyet, 'New KhoaDuyet:', newData.KhoaDuyet);
    console.log('Old DaoTaoDuyet:', oldData.DaoTaoDuyet, 'New DaoTaoDuyet:', newData.DaoTaoDuyet);
    console.log('Old TaiChinhDuyet:', oldData.TaiChinhDuyet, 'New TaiChinhDuyet:', newData.TaiChinhDuyet);
    
    // Kiểm tra cột GiaoVienGiangDay
    if (String(oldData.GiaoVienGiangDay || '') !== String(newData.GiaoVienGiangDay || '')) {
      changeMessage = changeMessage + `Giảng Viên giảng dạy cho môn "${newData.LopHocPhan} - ${newData.TenLop}": từ "${oldData.GiaoVienGiangDay || ''}" thành "${newData.GiaoVienGiangDay || ''}". `;
    }

    // Kiểm tra cột KhoaDuyet
    if (Number(oldData.KhoaDuyet) !== Number(newData.KhoaDuyet)) {
      console.log('>>> Khoa Duyet changed:', Number(oldData.KhoaDuyet), '=>', Number(newData.KhoaDuyet));
      if (Number(oldData.KhoaDuyet) === 0 && Number(newData.KhoaDuyet) === 1) {
        changeMessage = changeMessage + `Khoa thay đổi duyệt môn "${newData.LopHocPhan} - ${newData.TenLop}": Đã duyệt. `;
      } else if (Number(oldData.KhoaDuyet) === 1 && Number(newData.KhoaDuyet) === 0) {
        changeMessage = changeMessage + `Khoa thay đổi duyệt môn "${newData.LopHocPhan} - ${newData.TenLop}": Hủy duyệt. `;
      }
    }

    // Kiểm tra cột DaoTaoDuyet
    if (Number(oldData.DaoTaoDuyet) !== Number(newData.DaoTaoDuyet)) {
      console.log('>>> Dao Tao Duyet changed:', Number(oldData.DaoTaoDuyet), '=>', Number(newData.DaoTaoDuyet));
      if (Number(oldData.DaoTaoDuyet) === 0 && Number(newData.DaoTaoDuyet) === 1) {
        changeMessage = changeMessage + `Đào tạo thay đổi duyệt môn "${newData.LopHocPhan} - ${newData.TenLop}": Đã duyệt. `;
      } else if (Number(oldData.DaoTaoDuyet) === 1 && Number(newData.DaoTaoDuyet) === 0) {
        changeMessage = changeMessage + `Đào tạo thay đổi duyệt môn "${newData.LopHocPhan} - ${newData.TenLop}": Hủy duyệt. `;
      }
    }

    // Kiểm tra cột TaiChinhDuyet (Văn phòng)
    if (Number(oldData.TaiChinhDuyet) !== Number(newData.TaiChinhDuyet)) {
      console.log('>>> Tai Chinh Duyet changed:', Number(oldData.TaiChinhDuyet), '=>', Number(newData.TaiChinhDuyet));
      if (Number(oldData.TaiChinhDuyet) === 0 && Number(newData.TaiChinhDuyet) === 1) {
        changeMessage = changeMessage + `Văn phòng thay đổi duyệt môn "${newData.LopHocPhan} - ${newData.TenLop}": Đã duyệt. `;
      } else if (Number(oldData.TaiChinhDuyet) === 1 && Number(newData.TaiChinhDuyet) === 0) {
        changeMessage = changeMessage + `Văn phòng thay đổi duyệt môn "${newData.LopHocPhan} - ${newData.TenLop}": Hủy duyệt. `;
      }
    }

    // Kiểm tra cột GiaoVien
    if (String(oldData.GiaoVien || '') !== String(newData.GiaoVien || '')) {
      changeMessage = changeMessage + `Giảng viên cho môn "${newData.LopHocPhan} - ${newData.TenLop}": từ "${oldData.GiaoVien || ''}" thành "${newData.GiaoVien || ''}". `;
    }

    // Kiểm tra các trường bổ sung
    // Kiểm tra BoMon
    if (String(oldData.BoMon || '') !== String(newData.BoMon || '')) {
      changeMessage = changeMessage + `Bộ môn cho môn "${newData.LopHocPhan} - ${newData.TenLop}": từ "${oldData.BoMon || ''}" thành "${newData.BoMon || ''}". `;
    }

    // Kiểm tra MoiGiang
    if (Number(oldData.MoiGiang) !== Number(newData.MoiGiang)) {
      const oldValue = Number(oldData.MoiGiang) === 1 ? "Mời giảng" : "Cơ hữu";
      const newValue = Number(newData.MoiGiang) === 1 ? "Mời giảng" : "Cơ hữu";
      changeMessage = changeMessage + `Trạng thái môn "${newData.LopHocPhan} - ${newData.TenLop}": từ "${oldValue}" thành "${newValue}". `;
    }
    
    // Kiểm tra hệ đào tạo
    if (String(oldData.he_dao_tao || '') !== String(newData.he_dao_tao || '')) {
      changeMessage = changeMessage + `Hệ đào tạo cho môn "${newData.LopHocPhan} - ${newData.TenLop}": từ "${oldData.he_dao_tao || ''}" thành "${newData.he_dao_tao || ''}". `;
    }

    // Kiểm tra ngày bắt đầu và kết thúc tương tự như đồ án
    let oldStartDate = '';
    let newStartDate = '';
    
    if (oldData.NgayBatDau) {
      const oldStartDateObj = new Date(oldData.NgayBatDau);
      if (!isNaN(oldStartDateObj.getTime())) {
        oldStartDateObj.setDate(oldStartDateObj.getDate() + 1);
        oldStartDate = oldStartDateObj.toISOString().split('T')[0];
      }
    }
    
    if (newData.NgayBatDau) {
      if (typeof newData.NgayBatDau === 'string' && newData.NgayBatDau.match(/^\d{4}-\d{2}-\d{2}$/)) {
        newStartDate = newData.NgayBatDau;
      } else {
        const newStartDateObj = new Date(newData.NgayBatDau);
        if (!isNaN(newStartDateObj.getTime())) {
          newStartDateObj.setDate(newStartDateObj.getDate() + 1);
          newStartDate = newStartDateObj.toISOString().split('T')[0];
        }
      }
    }
    
    if (oldStartDate !== newStartDate) {
      changeMessage = changeMessage + `Thay đổi ngày bắt đầu cho môn "${newData.LopHocPhan} - ${newData.TenLop}": từ "${oldStartDate}" thành "${newStartDate}". `;
    }
    
    let oldEndDate = '';
    let newEndDate = '';
    
    if (oldData.NgayKetThuc) {
      const oldEndDateObj = new Date(oldData.NgayKetThuc);
      if (!isNaN(oldEndDateObj.getTime())) {
        oldEndDateObj.setDate(oldEndDateObj.getDate() + 1);
        oldEndDate = oldEndDateObj.toISOString().split('T')[0];
      }
    }
    
    if (newData.NgayKetThuc) {
      if (typeof newData.NgayKetThuc === 'string' && newData.NgayKetThuc.match(/^\d{4}-\d{2}-\d{2}$/)) {
        newEndDate = newData.NgayKetThuc;
      } else {
        const newEndDateObj = new Date(newData.NgayKetThuc);
        if (!isNaN(newEndDateObj.getTime())) {
          newEndDateObj.setDate(newEndDateObj.getDate() + 1);
          newEndDate = newEndDateObj.toISOString().split('T')[0];
        }
      }
    }
    
    if (oldEndDate !== newEndDate) {
      changeMessage = changeMessage + `Thay đổi ngày kết thúc cho môn "${newData.LopHocPhan} - ${newData.TenLop}": từ "${oldEndDate}" thành "${newEndDate}". `;
    }

    // Nếu có thay đổi, ghi lại thông tin vào bảng lichsunhaplieu
    if (changeMessage !== '') {
      console.log('>>> WRITING LOG:', changeMessage);
      // Lấy thông tin user và khoa từ session
      const userId = req.session?.userId || req.session?.userInfo?.ID || 0;
      const tenNhanVien = req.session?.TenNhanVien || req.session?.username || 'Unknown User';
      const khoa = req.session?.MaPhongBan || 'Unknown Department';
      
      console.log('>>> Session info - userId:', userId, 'tenNhanVien:', tenNhanVien, 'khoa:', khoa);
      
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

      console.log('>>> LOG WRITTEN SUCCESSFULLY');
      return true;
    } else {
      console.log('>>> NO CHANGES DETECTED - NO LOG WRITTEN');
    }

    return false;
  } catch (error) {
    return false;
  }
};

module.exports = {
  logDoAnChanges,
  logQuyChuanChanges
};
