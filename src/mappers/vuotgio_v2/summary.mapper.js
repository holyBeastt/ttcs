/**
 * VUOT GIO V2 - Summary Mapper
 * Xử lý ánh xạ và tính toán số tiết tổng hợp cho SDO (Standardized Data Object)
 */

const base = require("./base.mapper");

/**
 * Công thức tính toán các chỉ số vượt giờ cốt lõi
 * @param {Object} params - Các thông số đầu vào
 */
const calculateOvertime = (params) => {
    const {
        soTietGiangDay = 0,
        soTietNgoaiQC = 0,
        soTietKTHP = 0,
        soTietDoAn = 0,
        soTietHDTQ = 0,
        soTietNCKH = 0,
        phanTramMienGiam = 0,
        dinhMucChuan = 280,
        dinhMucNCKH = 280
    } = params;

    // 1. Tổng số tiết thực hiện
    const tongThucHien = soTietGiangDay + soTietNgoaiQC + soTietKTHP + soTietDoAn + soTietHDTQ;
    
    // 4. Số tiết được giảm trừ
    const mienGiam = dinhMucChuan * (base.toDecimal(phanTramMienGiam) / 100);
    
    // 6. Số tiết sau giảm trừ (Mục 2 - Mục 4)
    const dinhMucSauMienGiam = dinhMucChuan - mienGiam;

    // 3. Số tiết chưa hoàn thành NCKH
    // Định mức NCKH cũng phải được hưởng giảm trừ tương ứng như định mức giảng dạy
    const mienGiamNCKH = dinhMucNCKH * (base.toDecimal(phanTramMienGiam) / 100);
    const dinhMucNCKHSauGiam = dinhMucNCKH - mienGiamNCKH;
    const thieuNCKH = Math.max(0, dinhMucNCKHSauGiam - soTietNCKH);
    
    // 5. Tổng số tiết vượt giờ được thanh toán
    // Công thức: (Mục 1 - Mục 3) - Mục 6
    let tongVuot = (tongThucHien - thieuNCKH) - dinhMucSauMienGiam;
    tongVuot = Math.max(0, tongVuot);
    
    // Giới hạn thanh toán chỉ được phép <= Mục 6
    const thanhToan = Math.min(tongVuot, dinhMucSauMienGiam);

    return {
        tongThucHien: base.toDecimal(tongThucHien.toFixed(2)),
        mienGiam: base.toDecimal(mienGiam.toFixed(2)),
        dinhMucSauMienGiam: base.toDecimal(dinhMucSauMienGiam.toFixed(2)),
        thieuTietGiangDay: base.toDecimal(Math.max(0, dinhMucSauMienGiam - tongThucHien).toFixed(2)),
        thieuNCKH: base.toDecimal(thieuNCKH.toFixed(2)),
        tongVuot: base.toDecimal(tongVuot.toFixed(2)),
        thanhToan: base.toDecimal(thanhToan.toFixed(2)),
        dinhMucChuan
    };
};

/**
 * Xây dựng bảng tổng hợp theo hệ đào tạo (Mục F)
 */
const buildTableF = (rawData) => {
    const { giangDay = [], lopNgoaiQC = [], kthp = [], doAn = [], hdtq = [] } = rawData;
    const groups = new Map();

    const getGroup = (name) => {
        const key = name || "Hệ đào tạo khác";
        if (!groups.has(key)) {
            groups.set(key, { 
                doi_tuong: key, 
                hk1: 0, 
                hk2: 0, 
                do_an: 0, 
                tham_quan: 0, 
                tong: 0 
            });
        }
        return groups.get(key);
    };

    // 1. Giang dạy
    giangDay.forEach(r => {
        const g = getGroup(r.ten_he_dao_tao);
        const val = base.toDecimal(r.QuyChuan);
        if (Number(r.HocKy) === 2) g.hk2 += val;
        else g.hk1 += val;
    });

    // 2. Lớp ngoài QC
    lopNgoaiQC.forEach(r => {
        const g = getGroup(r.ten_he_dao_tao);
        const val = base.toDecimal(r.quy_chuan);
        if (Number(r.hoc_ky) === 2) g.hk2 += val;
        else g.hk1 += val;
    });

    // 3. KTHP (Coi chấm thi)
    kthp.forEach(r => {
        const g = getGroup(r.ten_he_dao_tao);
        const val = base.toDecimal(r.quy_chuan);
        if (Number(r.hoc_ky) === 2) g.hk2 += val;
        else g.hk1 += val;
    });

    // 4. Đồ án
    doAn.forEach(r => {
        const g = getGroup(r.ten_he_dao_tao);
        g.do_an += base.toDecimal(r.SoTiet);
    });

    // 5. Tham quan
    hdtq.forEach(r => {
        const g = getGroup(r.ten_he_dao_tao);
        g.tham_quan += base.toDecimal(r.so_tiet_quy_doi);
    });

    // Chuyển Map sang Array và làm tròn
    const rows = Array.from(groups.values()).map((row, idx) => ({
        tt: idx + 1,
        doi_tuong: row.doi_tuong,
        hk1: base.toDecimal(row.hk1.toFixed(2)),
        hk2: base.toDecimal(row.hk2.toFixed(2)),
        do_an: base.toDecimal(row.do_an.toFixed(2)),
        tham_quan: base.toDecimal(row.tham_quan.toFixed(2)),
        tong: base.toDecimal((row.hk1 + row.hk2 + row.do_an + row.tham_quan).toFixed(2))
    }));

    // Tính tổng cộng footer
    const totals = {
        hk1: base.toDecimal(rows.reduce((s, r) => s + r.hk1, 0).toFixed(2)),
        hk2: base.toDecimal(rows.reduce((s, r) => s + r.hk2, 0).toFixed(2)),
        do_an: base.toDecimal(rows.reduce((s, r) => s + r.do_an, 0).toFixed(2)),
        tham_quan: base.toDecimal(rows.reduce((s, r) => s + r.tham_quan, 0).toFixed(2)),
        tong: base.toDecimal(rows.reduce((s, r) => s + r.tong, 0).toFixed(2))
    };

    return { rows, totals };
};

/**
 * Ánh xạ dữ liệu thô từ DB thành Atomic SDO cho 1 giảng viên
 */
const toAtomicSDO = (nv, rawData, namHoc, globalDinhMuc) => {
    if (!nv) return null;

    const dmChuan = base.toDecimal(globalDinhMuc?.GiangDay) || 280;
    const dmNCKH = base.toDecimal(globalDinhMuc?.NCKH) || 280;

    const stats = calculateOvertime({
        soTietGiangDay: rawData.giangDay.reduce((s, r) => s + (base.toDecimal(r.QuyChuan) || 0), 0),
        soTietNgoaiQC: rawData.lopNgoaiQC.reduce((s, r) => s + (base.toDecimal(r.quy_chuan) || 0), 0),
        soTietKTHP: rawData.kthp.reduce((s, r) => s + (base.toDecimal(r.quy_chuan) || 0), 0),
        soTietDoAn: rawData.doAn.reduce((s, r) => s + (base.toDecimal(r.SoTiet) || 0), 0),
        soTietHDTQ: rawData.hdtq.reduce((s, r) => s + (base.toDecimal(r.so_tiet_quy_doi) || 0), 0),
        soTietNCKH: rawData.nckhRecords.reduce((s, r) => s + (base.toDecimal(r.soTietGiangVien) || 0), 0),
        phanTramMienGiam: nv.phanTramMienGiam,
        dinhMucChuan: dmChuan,
        dinhMucNCKH: dmNCKH
    });

    return {
        id_User: nv.id_User,
        giangVien: nv.giangVien,
        ngaySinh: nv.ngaySinh,
        hocVi: nv.hocVi,
        hsl: nv.hsl,
        maKhoa: nv.maKhoa,
        khoa: nv.khoa,
        chucVu: nv.chucVu,
        phanTramMienGiam: nv.phanTramMienGiam,
        lyDoMienGiam: nv.lyDoMienGiam,
        ...stats,
        soTietNCKH: rawData.nckhRecords.reduce((s, r) => s + (base.toDecimal(r.soTietGiangVien) || 0), 0),
        soTietGiangDay: rawData.giangDay.reduce((s, r) => s + (base.toDecimal(r.QuyChuan) || 0), 0),
        soTietNgoaiQC: rawData.lopNgoaiQC.reduce((s, r) => s + (base.toDecimal(r.quy_chuan) || 0), 0),
        soTietKTHP: rawData.kthp.reduce((s, r) => s + (base.toDecimal(r.quy_chuan) || 0), 0),
        soTietDoAn: rawData.doAn.reduce((s, r) => s + (base.toDecimal(r.SoTiet) || 0), 0),
        soTietHDTQ: rawData.hdtq.reduce((s, r) => s + (base.toDecimal(r.so_tiet_quy_doi) || 0), 0),
        nam_hoc: namHoc,
        tableE: {
            i: stats.tongThucHien,
            ii: stats.dinhMucChuan,
            iii: stats.thieuNCKH,
            iv: stats.mienGiam,
            v: stats.tongVuot,
            vi: stats.thanhToan,
            ly_do: nv.lyDoMienGiam
        },
        tableF: buildTableF(rawData),
        raw: rawData
    };
};

/**
 * Ánh xạ dữ liệu thô từ DB thành Collection SDO cho danh sách giảng viên
 */
const toCollectionSDO = (rawDataList, nckhMap, namHoc, globalDinhMuc) => {
    const dmChuan = base.toDecimal(globalDinhMuc?.GiangDay) || 280;
    const dmNCKH = base.toDecimal(globalDinhMuc?.NCKH) || 280;

    return rawDataList.map(r => {
        const soTietNCKH = base.toDecimal(nckhMap.get(Number(r.id_User))) || 0;
        
        const stats = calculateOvertime({
            soTietGiangDay: r.soTietGiangDay,
            soTietNgoaiQC: r.soTietNgoaiQC,
            soTietKTHP: r.soTietKTHP,
            soTietDoAn: r.soTietDoAn,
            soTietHDTQ: r.soTietHDTQ,
            soTietNCKH,
            phanTramMienGiam: r.phanTramMienGiam,
            dinhMucChuan: dmChuan,
            dinhMucNCKH: dmNCKH
        });

        return {
            ...r,
            ...stats,
            soTietNCKH,
            nam_hoc: namHoc
        };
    });
};

module.exports = {
    calculateOvertime,
    toAtomicSDO,
    toCollectionSDO
};
