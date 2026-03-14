const assertRequired = (value, message) => {
  if (value === undefined || value === null || value === "") {
    throw new Error(message);
  }
};

const validateMainPayload = (data) => {
  assertRequired(data.tenCongTrinh, "Thiếu tên công trình");
  assertRequired(data.phanLoai, "Thiếu phân loại");
  assertRequired(data.namHoc, "Thiếu năm học");
  assertRequired(data.khoaId, "Thiếu khoa");
  assertRequired(data.tongSoTiet, "Thiếu tổng số tiết");

  const tongSoTiet = Number(data.tongSoTiet);
  if (Number.isNaN(tongSoTiet) || tongSoTiet <= 0) {
    throw new Error("Tổng số tiết phải là số dương");
  }

  if (data.soNamThucHien !== undefined && data.soNamThucHien !== null && data.soNamThucHien !== "") {
    const soNamThucHien = Number(data.soNamThucHien);
    if (!Number.isInteger(soNamThucHien) || soNamThucHien <= 0) {
      throw new Error("Số năm thực hiện phải là số nguyên dương");
    }
  }
};

const validatePeopleInput = (tacGiaIds = [], thanhVienIds = [], tacGiaNgoai = [], thanhVienNgoai = []) => {
  const totalTacGia = (Array.isArray(tacGiaIds) ? tacGiaIds.length : 0)
    + (Array.isArray(tacGiaNgoai) ? tacGiaNgoai.length : 0);

  if (totalTacGia === 0) {
    throw new Error("Cần ít nhất một người vai trò chính");
  }

  if (!Array.isArray(thanhVienIds)) {
    throw new Error("Danh sách thành viên không hợp lệ");
  }

  const allIds = [
    ...(Array.isArray(tacGiaIds) ? tacGiaIds : []),
    ...(Array.isArray(thanhVienIds) ? thanhVienIds : []),
  ].map(Number);

  if (allIds.some((id) => Number.isNaN(id) || id <= 0)) {
    throw new Error("Danh sách giảng viên không hợp lệ");
  }

  if (Array.isArray(tacGiaNgoai)) {
    tacGiaNgoai.forEach((item, i) => {
      if (!item.ten || !String(item.ten).trim()) {
        throw new Error(`Người ngoài vai trò chính thứ ${i + 1} thiếu tên`);
      }
      if (!item.donVi || !String(item.donVi).trim()) {
        throw new Error(`Người ngoài vai trò chính thứ ${i + 1} thiếu đơn vị công tác`);
      }
    });
  }

  if (Array.isArray(thanhVienNgoai)) {
    thanhVienNgoai.forEach((item, i) => {
      if (!item.ten || !String(item.ten).trim()) {
        throw new Error(`Thành viên ngoài thứ ${i + 1} thiếu tên`);
      }
      if (!item.donVi || !String(item.donVi).trim()) {
        throw new Error(`Thành viên ngoài thứ ${i + 1} thiếu đơn vị công tác`);
      }
    });
  }
};

module.exports = {
  validateMainPayload,
  validatePeopleInput,
};
