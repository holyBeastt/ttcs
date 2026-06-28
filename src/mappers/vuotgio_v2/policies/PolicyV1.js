const base = require("../base.mapper");

class OvertimePolicyV1 {
    calculate(params) {
        const {
            soTietGiangDay = 0,
            soTietNgoaiQC = 0,
            soTietKTHP = 0,
            soTietDoAn = 0,
            soTietHDTQ = 0,
            soTietNCKH = 0,
            phanTramMienGiam = 0,
            dinhMucChuan = 280,
            dinhMucNCKH = 200
        } = params;

        // 1. Tổng số tiết thực hiện
        const tongThucHien = soTietGiangDay + soTietNgoaiQC + soTietKTHP + soTietDoAn + soTietHDTQ;

        // 4. Số tiết được giảm trừ (giữ exact, KHÔNG toFixed ở đây)
        const mienGiam = dinhMucChuan * (Number(phanTramMienGiam) / 100);

        // 6. Số tiết sau giảm trừ (Mục 2 - Mục 4)
        const dinhMucSauMienGiam = dinhMucChuan - mienGiam;

        // 3. Số tiết chưa hoàn thành NCKH (NCKH KHÔNG có miễn giảm)
        const thieuNCKH = Math.max(0, dinhMucNCKH - soTietNCKH);

        // 5. Tổng số tiết vượt giờ được thanh toán
        let tongVuot = (tongThucHien - thieuNCKH) - dinhMucSauMienGiam;
        tongVuot = Math.max(0, tongVuot);

        // Giới hạn thanh toán chỉ được phép <= Mục 6
        const thanhToan = Math.min(tongVuot, dinhMucSauMienGiam);

        // --- CHỈ làm tròn ở output cuối cùng ---
        const round2 = (v) => base.toDecimal(Math.round((Number(v) + Number.EPSILON) * 100) / 100);

        return {
            tongThucHien: round2(tongThucHien),
            mienGiam: round2(mienGiam),
            dinhMucSauMienGiam: round2(dinhMucSauMienGiam),
            thieuTietGiangDay: round2(Math.max(0, dinhMucSauMienGiam - tongThucHien + thieuNCKH)),
            thieuNCKH: round2(thieuNCKH),
            tongVuot: round2(tongVuot),
            thanhToan: round2(thanhToan),
            dinhMucChuan
        };
    }
}

module.exports = new OvertimePolicyV1();
