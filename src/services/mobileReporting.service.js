const tongHopService = require("./vuotgio_v2/tongHop.service");
const { STATS_SCOPE } = require("../config/nckh_v3/statsScope");
const { NON_KHOA_GROUP_CODE } = require("../repositories/vuotgio_v2/tongHop.repo");

const NON_KHOA_GROUP_NAME = "Ban giám đốc & các phòng";

const getNckhScope = (isDuKien) =>
  isDuKien ? STATS_SCOPE.PREVIEW : STATS_SCOPE.OFFICIAL;

const addWorkload = (target, sdo) => {
  target.tongSoGV += 1;
  target.soTietGiangDay += sdo.soTietGiangDay || 0;
  target.soTietNgoaiQC += sdo.soTietNgoaiQC || 0;
  target.soTietKTHP += sdo.soTietKTHP || 0;
  target.soTietDoAn += sdo.soTietDoAn || 0;
  target.soTietHDTQ += sdo.soTietHDTQ || 0;
  target.soTietNCKH += sdo.soTietNCKH || 0;
  target.tongThucHien += sdo.tongThucHien || 0;
  target.tongVuot += sdo.tongVuot || 0;
  target.thanhToan += sdo.thanhToan || 0;
  target.thieuTietGiangDay += sdo.thieuTietGiangDay || 0;
  target.thieuNCKH += sdo.thieuNCKH || 0;
};

const newFacultyRow = (sdo, code) => ({
  maKhoa: code,
  tenKhoa: Number(sdo.isKhoa) === 0
    ? NON_KHOA_GROUP_NAME
    : (sdo.khoa || "Khác/Chưa xác định"),
  tongSoGV: 0,
  soTietGiangDay: 0,
  soTietNgoaiQC: 0,
  soTietKTHP: 0,
  soTietDoAn: 0,
  soTietHDTQ: 0,
  soTietNCKH: 0,
  tongThucHien: 0,
  tongVuot: 0,
  thanhToan: 0,
  thieuTietGiangDay: 0,
  thieuNCKH: 0,
});

const aggregateFacultyWorkload = (sdoList) => {
  const groups = new Map();
  for (const sdo of sdoList) {
    const code = Number(sdo.isKhoa) === 0
      ? NON_KHOA_GROUP_CODE
      : (sdo.maKhoa || sdo.MaPhongBan || "KHAC");
    if (!groups.has(code)) groups.set(code, newFacultyRow(sdo, code));
    addWorkload(groups.get(code), sdo);
  }

  const data = Array.from(groups.values()).sort((a, b) => b.tongThucHien - a.tongThucHien);
  return {
    data,
    summary: {
      tongSoGV: sdoList.length,
      tongSoKhoa: data.length,
      tongThucHien: sdoList.reduce((total, item) => total + (item.tongThucHien || 0), 0),
      tongVuot: sdoList.reduce((total, item) => total + (item.tongVuot || 0), 0),
      tongThanhToan: sdoList.reduce((total, item) => total + (item.thanhToan || 0), 0),
    },
  };
};

const getMobileWorkloadOptions = (isDuKien) => ({
  nckhScope: getNckhScope(isDuKien),
});

const getFacultyWorkload = async (namHoc, khoa, isDuKien) => {
  const sdoList = await tongHopService.getCollectionSDODetail(
    namHoc,
    khoa,
    isDuKien,
    getMobileWorkloadOptions(isDuKien),
  );
  return { sdoList, aggregate: aggregateFacultyWorkload(sdoList) };
};

module.exports = {
  aggregateFacultyWorkload,
  getFacultyWorkload,
  getMobileWorkloadOptions,
};
