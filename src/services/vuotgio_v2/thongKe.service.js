/**
 * VUOT GIO V2 - Thống Kê Service
 * Projection mỏng từ Collection SDO của TongHopService
 */

const tongHopService = require("./tongHop.service");

const getThongKeKhoa = async (namHoc, khoaId) => {
    // Nếu khoaId là ALL hoặc không có, chúng ta sẽ lấy toàn trường và nhóm theo Khoa
    const isAll = !khoaId || khoaId === "ALL";
    
    // Gọi SDO gốc từ TongHopService
    const sdoList = await tongHopService.getCollectionSDO(namHoc, isAll ? "ALL" : khoaId);
    
    if (isAll) {
        // Nhóm theo Khoa/Phòng
        const groupMap = new Map();
        
        sdoList.forEach(r => {
            // Kiểm tra cả maKhoa (alias) và MaPhongBan (tên gốc trong DB)
            const unitCode = r.maKhoa || r.MaPhongBan || "KHAC";
            const key = unitCode;
            
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    maKhoa: unitCode,
                    tenKhoa: r.khoa || "Khác/Chưa xác định",
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
            
            const g = groupMap.get(key);
            g.tongSoGV++;
            g.soTietGiangDay += (r.soTietGiangDay || 0);
            g.soTietNgoaiQC += (r.soTietNgoaiQC || 0);
            g.soTietKTHP += (r.soTietKTHP || 0);
            g.soTietDoAn += (r.soTietDoAn || 0);
            g.soTietHDTQ += (r.soTietHDTQ || 0);
            g.soTietNCKH += (r.soTietNCKH || 0);
            g.tongThucHien += (r.tongThucHien || 0);
            g.tongVuot += (r.tongVuot || 0);
            g.thanhToan += (r.thanhToan || 0);
            g.thieuTietGiangDay += (r.thieuTietGiangDay || 0);
            g.thieuNCKH += (r.thieuNCKH || 0);
        });

        const dataByKhoa = Array.from(groupMap.values()).sort((a, b) => b.tongThucHien - a.tongThucHien);
        
        const summary = {
            tongSoGV: sdoList.length,
            tongSoKhoa: dataByKhoa.length,
            tongThucHien: sdoList.reduce((s, r) => s + (r.tongThucHien || 0), 0),
            tongVuot: sdoList.reduce((s, r) => s + (r.tongVuot || 0), 0),
            tongThanhToan: sdoList.reduce((s, r) => s + (r.thanhToan || 0), 0)
        };

        return {
            data: dataByKhoa,
            summary
        };
    } else {
        // Nếu đã chọn 1 khoa cụ thể, trả về danh sách GV của khoa đó (giữ logic cũ)
        const summary = {
            tongSoGV: sdoList.length,
            tongThucHien: sdoList.reduce((s, r) => s + (r.tongThucHien || 0), 0),
            tongVuot: sdoList.reduce((s, r) => s + (r.tongVuot || 0), 0),
            tongThanhToan: sdoList.reduce((s, r) => s + (r.thanhToan || 0), 0)
        };

        return {
            data: sdoList,
            summary
        };
    }
};

module.exports = {
    getThongKeKhoa
};
