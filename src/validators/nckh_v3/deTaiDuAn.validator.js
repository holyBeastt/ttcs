const ALLOWED_ROLES = new Set(["tac_gia", "thanh_vien"]);

const assertRequired = (value, message) => {
  if (value === undefined || value === null || value === "") {
    throw new Error(message);
  }
};

const validateMainPayload = (data) => {
  assertRequired(data.tenCongTrinh, "Thieu ten cong trinh");
  assertRequired(data.phanLoai, "Thieu phan loai");
  assertRequired(data.namHoc, "Thieu nam hoc");
  assertRequired(data.khoaId, "Thieu khoaId");
  assertRequired(data.tongSoTiet, "Thieu tong so tiet");

  const tongSoTiet = Number(data.tongSoTiet);
  if (Number.isNaN(tongSoTiet) || tongSoTiet <= 0) {
    throw new Error("Tong so tiet phai la so duong");
  }
};

const validatePeopleInput = (tacGiaIds = [], thanhVienIds = []) => {
  if (!Array.isArray(tacGiaIds) || tacGiaIds.length === 0) {
    throw new Error("Can it nhat 1 tac gia");
  }

  if (!Array.isArray(thanhVienIds)) {
    throw new Error("Danh sach thanh vien khong hop le");
  }

  const allIds = [...tacGiaIds, ...thanhVienIds].map(Number);
  if (allIds.some((id) => Number.isNaN(id) || id <= 0)) {
    throw new Error("Danh sach nhan vien khong hop le");
  }
};

const validateParticipants = (participants = [], tongSoTiet) => {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new Error("Danh sach participants khong hop le");
  }

  const unique = new Set();
  let total = 0;

  for (const item of participants) {
    const id = Number(item.nhanvienId);
    if (Number.isNaN(id) || id <= 0) {
      throw new Error("nhanvienId khong hop le");
    }

    if (!ALLOWED_ROLES.has(item.vaiTro)) {
      throw new Error("vaiTro khong hop le");
    }

    if (unique.has(id)) {
      throw new Error("1 nhan vien khong duoc xuat hien nhieu lan");
    }
    unique.add(id);

    const soTiet = Number(item.soTiet);
    if (Number.isNaN(soTiet) || soTiet < 0) {
      throw new Error("soTiet khong hop le");
    }

    total += soTiet;
  }

  const roundedTotal = Math.round((total + Number.EPSILON) * 100) / 100;
  const roundedExpected = Math.round((Number(tongSoTiet) + Number.EPSILON) * 100) / 100;

  if (roundedTotal !== roundedExpected) {
    throw new Error(`Tong so tiet participants (${roundedTotal}) phai bang tong_so_tiet (${roundedExpected})`);
  }
};

module.exports = {
  validateMainPayload,
  validatePeopleInput,
  validateParticipants,
};
