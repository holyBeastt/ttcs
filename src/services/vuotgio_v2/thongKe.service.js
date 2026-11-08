/**
 * VUOT GIO V2 - Thống Kê Service
 * Thống kê từ snapshot chính thức hoặc dữ liệu SDO dự kiến.
 */

const snapshotDataService = require("./snapshotData.service");
const tongHopService = require("./tongHop.service");
const { NON_KHOA_GROUP_CODE } = require("../../repositories/vuotgio_v2/tongHop.repo");

const NON_KHOA_GROUP_NAME = "Ban giám đốc & các phòng";

const sumField = (rows, field) =>
    rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);

const getThongKeKhoa = async (namHoc, khoaId, isDuKien = false) => {
    let sdoList;
    let warnings = null;

    if (isDuKien) {
        const result = await tongHopService.getCollectionSDO(namHoc, khoaId, true);
        sdoList = result.data || [];
        warnings = result.warnings || null;
    } else {
        // Thống kê chính thức tiếp tục đọc snapshot và yêu cầu năm đã khóa.
        sdoList = await snapshotDataService.getSnapshotSDOList(namHoc, khoaId);
    }

    const isAll = !khoaId || khoaId === "ALL";
    let data;

    if (isAll) {
        const groupMap = new Map();

        sdoList.forEach((row) => {
            const isNonKhoa = Number(row.isKhoa) === 0;
            const unitCode = isNonKhoa
                ? NON_KHOA_GROUP_CODE
                : (row.maKhoa || row.MaPhongBan || "KHAC");

            if (!groupMap.has(unitCode)) {
                groupMap.set(unitCode, {
                    maKhoa: unitCode,
                    tenKhoa: isNonKhoa ? NON_KHOA_GROUP_NAME : (row.khoa || "Khác/Chưa xác định"),
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
                    thieuNCKH: 0
                });
            }

            const group = groupMap.get(unitCode);
            group.tongSoGV++;
            [
                "soTietGiangDay", "soTietNgoaiQC", "soTietKTHP", "soTietDoAn",
                "soTietHDTQ", "soTietNCKH", "tongThucHien", "tongVuot",
                "thanhToan", "thieuTietGiangDay", "thieuNCKH"
            ].forEach((field) => {
                group[field] += Number(row[field]) || 0;
            });
        });

        data = Array.from(groupMap.values()).sort((a, b) => b.tongThucHien - a.tongThucHien);
    } else {
        data = sdoList;
    }

    const summary = {
        tongSoGV: sdoList.length,
        tongThucHien: sumField(sdoList, "tongThucHien"),
        tongVuot: sumField(sdoList, "tongVuot"),
        tongThanhToan: sumField(sdoList, "thanhToan")
    };

    if (isAll) summary.tongSoKhoa = data.length;

    if (!isDuKien) {
        summary.ngayChot = sdoList.metadata?.ngay_chot;
        summary.nguoiChotId = sdoList.metadata?.nguoi_chot_id;
        summary.nguoiChotName = sdoList.metadata?.nguoi_chot_name;
    }

    return { data, summary, ...(warnings ? { warnings } : {}) };
};

module.exports = {
    getThongKeKhoa
};
