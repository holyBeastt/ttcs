const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const quyDoiSoTietStandard = (T, tongSoNguoi, soDongTacGia = 1, soNamThucHien = 1) => {
  let tacGia = 0;
  let thanhVien = 0;

  if (tongSoNguoi === 1) {
    tacGia = T;
    thanhVien = 0;
  } else if (tongSoNguoi === 2) {
    tacGia = (2 * T) / 3;
    thanhVien = T / 3;
  } else if (tongSoNguoi === 3) {
    tacGia = T / 2;
    thanhVien = T / 4;
  } else {
    const phanChia = (2 * T / 3) / tongSoNguoi;
    tacGia = T / 3 + phanChia;
    thanhVien = phanChia;
  }

  tacGia = tacGia / soDongTacGia;
  tacGia = tacGia / soNamThucHien;
  thanhVien = thanhVien / soNamThucHien;

  return {
    tacGia: round2(tacGia),
    thanhVien: round2(thanhVien),
  };
};

const quyDoiSoTietChiaDeu = (T, tongSoNguoi, soNamThucHien = 1) => {
  if (tongSoNguoi <= 0) {
    throw new Error("Tổng số người phải lớn hơn 0");
  }

  return round2(Number(T) / Number(tongSoNguoi) / Number(soNamThucHien));
};

const quyDoiSoTietCoDinh = (T) => round2(Number(T));

const buildParticipantsWithHours = (
  tongSoTiet,
  tacGiaIds,
  thanhVienIds,
  tacGiaNgoai = [],
  thanhVienNgoai = [],
  soNamThucHien = 1
) => {
  const uniqueTacGia = [...new Set(tacGiaIds.map(Number))];
  const uniqueThanhVien = [...new Set(thanhVienIds.map(Number))]
    .filter((id) => !uniqueTacGia.includes(id));

  const ngoaiTacGia = Array.isArray(tacGiaNgoai) ? tacGiaNgoai : [];
  const ngoaiThanhVien = Array.isArray(thanhVienNgoai) ? thanhVienNgoai : [];

  const tongSoNguoi = uniqueTacGia.length + uniqueThanhVien.length + ngoaiTacGia.length + ngoaiThanhVien.length;
  if (tongSoNguoi === 0) {
    throw new Error("Danh sach nguoi tham gia khong duoc rong");
  }

  const totalTacGia = uniqueTacGia.length + ngoaiTacGia.length;
  if (totalTacGia === 0) {
    throw new Error("Phai co it nhat 1 tac gia");
  }

  const T = Number(tongSoTiet);
  const base = quyDoiSoTietStandard(T, tongSoNguoi, totalTacGia, soNamThucHien);

  const participants = [
    ...uniqueTacGia.map((id) => ({ nhanvienId: id, tenNgoai: null, donViNgoai: null, vaiTro: "tac_gia", soTiet: base.tacGia })),
    ...ngoaiTacGia.map((item) => ({ nhanvienId: null, tenNgoai: item.ten, donViNgoai: item.donVi || null, vaiTro: "tac_gia", soTiet: base.tacGia })),
    ...uniqueThanhVien.map((id) => ({ nhanvienId: id, tenNgoai: null, donViNgoai: null, vaiTro: "thanh_vien", soTiet: base.thanhVien })),
    ...ngoaiThanhVien.map((item) => ({ nhanvienId: null, tenNgoai: item.ten, donViNgoai: item.donVi || null, vaiTro: "thanh_vien", soTiet: base.thanhVien })),
  ];

  const sum = round2(participants.reduce((acc, item) => acc + Number(item.soTiet), 0));
  const delta = round2(T - sum);

  if (delta !== 0) {
    const lastThanhVienIndex = [...participants]
      .map((p, idx) => ({ p, idx }))
      .reverse()
      .find(({ p }) => p.vaiTro === "thanh_vien")?.idx;

    const targetIndex = lastThanhVienIndex !== undefined
      ? lastThanhVienIndex
      : participants.length - 1;

    participants[targetIndex].soTiet = round2(Number(participants[targetIndex].soTiet) + delta);
  }

  return participants;
};

const buildParticipantsWithEqualHours = (
  tongSoTiet,
  tacGiaIds,
  thanhVienIds,
  tacGiaNgoai = [],
  thanhVienNgoai = [],
  soNamThucHien = 1
) => {
  const uniqueTacGia = [...new Set((tacGiaIds || []).map(Number))];
  const uniqueThanhVien = [...new Set((thanhVienIds || []).map(Number))]
    .filter((id) => !uniqueTacGia.includes(id));

  const ngoaiTacGia = Array.isArray(tacGiaNgoai) ? tacGiaNgoai : [];
  const ngoaiThanhVien = Array.isArray(thanhVienNgoai) ? thanhVienNgoai : [];

  const tongSoNguoi = uniqueTacGia.length + uniqueThanhVien.length + ngoaiTacGia.length + ngoaiThanhVien.length;
  if (tongSoNguoi === 0) {
    throw new Error("Danh sách người tham gia không được rỗng");
  }

  const soTietMoiNguoi = quyDoiSoTietChiaDeu(Number(tongSoTiet), tongSoNguoi, soNamThucHien);

  const participants = [
    ...uniqueTacGia.map((id) => ({ nhanvienId: id, tenNgoai: null, donViNgoai: null, vaiTro: "tac_gia", soTiet: soTietMoiNguoi })),
    ...ngoaiTacGia.map((item) => ({ nhanvienId: null, tenNgoai: item.ten, donViNgoai: item.donVi || null, vaiTro: "tac_gia", soTiet: soTietMoiNguoi })),
    ...uniqueThanhVien.map((id) => ({ nhanvienId: id, tenNgoai: null, donViNgoai: null, vaiTro: "thanh_vien", soTiet: soTietMoiNguoi })),
    ...ngoaiThanhVien.map((item) => ({ nhanvienId: null, tenNgoai: item.ten, donViNgoai: item.donVi || null, vaiTro: "thanh_vien", soTiet: soTietMoiNguoi })),
  ];

  const sum = round2(participants.reduce((acc, item) => acc + Number(item.soTiet), 0));
  const delta = round2(Number(tongSoTiet) - sum);

  if (delta !== 0) {
    participants[participants.length - 1].soTiet = round2(Number(participants[participants.length - 1].soTiet) + delta);
  }

  return participants;
};

const buildParticipantsWithFixedHours = (tongSoTiet, tacGiaIds, tacGiaNgoai = []) => {
  const uniqueTacGia = [...new Set((tacGiaIds || []).map(Number))];
  const ngoaiTacGia = Array.isArray(tacGiaNgoai) ? tacGiaNgoai : [];
  const tongSoNguoi = uniqueTacGia.length + ngoaiTacGia.length;

  if (tongSoNguoi !== 1) {
    throw new Error("Loại này chỉ cho phép đúng 1 thành viên hội đồng mỗi bản ghi");
  }

  const fixedHours = quyDoiSoTietCoDinh(Number(tongSoTiet));

  return [
    ...uniqueTacGia.map((id) => ({ nhanvienId: id, tenNgoai: null, donViNgoai: null, vaiTro: "tac_gia", soTiet: fixedHours })),
    ...ngoaiTacGia.map((item) => ({ nhanvienId: null, tenNgoai: item.ten, donViNgoai: item.donVi || null, vaiTro: "tac_gia", soTiet: fixedHours })),
  ];
};

const buildParticipantsByMode = (
  mode,
  tongSoTiet,
  tacGiaIds,
  thanhVienIds,
  tacGiaNgoai = [],
  thanhVienNgoai = [],
  soNamThucHien = 1
) => {
  if (mode === "equal") {
    return buildParticipantsWithEqualHours(
      tongSoTiet,
      tacGiaIds,
      thanhVienIds,
      tacGiaNgoai,
      thanhVienNgoai,
      soNamThucHien
    );
  }

  if (mode === "fixed") {
    return buildParticipantsWithFixedHours(tongSoTiet, tacGiaIds, tacGiaNgoai);
  }

  return buildParticipantsWithHours(
    tongSoTiet,
    tacGiaIds,
    thanhVienIds,
    tacGiaNgoai,
    thanhVienNgoai,
    soNamThucHien
  );
};

module.exports = {
  round2,
  quyDoiSoTietStandard,
  quyDoiSoTietChiaDeu,
  quyDoiSoTietCoDinh,
  buildParticipantsWithHours,
  buildParticipantsWithEqualHours,
  buildParticipantsWithFixedHours,
  buildParticipantsByMode,
};
