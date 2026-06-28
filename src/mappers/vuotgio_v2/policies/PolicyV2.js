const base = require("../base.mapper");

class OvertimePolicyV2 {
    calculate(params) {
        let {
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

        const tongThucHien = soTietGiangDay + soTietNgoaiQC + soTietKTHP + soTietDoAn + soTietHDTQ;
        
        let mienGiam = 0;
        let dinhMucSauMienGiam = dinhMucChuan;

        // V2 Rule: If there is any % exemption (>0), standard quota becomes 80% of 280
        if (Number(phanTramMienGiam) > 0) {
            dinhMucChuan = 280 * 0.8; // 224
            dinhMucSauMienGiam = dinhMucChuan;
            // Record mienGiam for reporting purposes (280 - 224)
            mienGiam = 280 - dinhMucChuan; 
        } else {
            // Normal fallback if 0%
            mienGiam = dinhMucChuan * (Number(phanTramMienGiam) / 100);
            dinhMucSauMienGiam = dinhMucChuan - mienGiam;
        }

        const thieuNCKH = Math.max(0, dinhMucNCKH - soTietNCKH);

        let tongVuot = (tongThucHien - thieuNCKH) - dinhMucSauMienGiam;
        tongVuot = Math.max(0, tongVuot);

        const thanhToan = Math.min(tongVuot, dinhMucSauMienGiam);

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

module.exports = new OvertimePolicyV2();
