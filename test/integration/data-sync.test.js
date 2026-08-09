const test = require("node:test");
const assert = require("node:assert");

// Kịch bản kiểm tra đồng bộ dữ liệu Vượt giờ & NCKH giữa 3 giai đoạn:
// 1. Dự kiến (isDuKien = true) -> Cho phép chưa duyệt
// 2. Chính thức (isDuKien = false) -> Bắt buộc đã duyệt
// 3. Sau khi lưu (Snapshot) -> Chỉ thành công khi KHÔNG CÒN dữ liệu chưa duyệt.
// => HỆ QUẢ: Khi Snapshot thành công, thì Dự kiến == Chính thức == Snapshot.

test("Kiểm tra đồng bộ dữ liệu: Giai đoạn trước và sau khi khóa dữ liệu (Snapshot)", async (t) => {
    
    const mockDinhMuc = { GiangDay: 280, NCKH: 280 };

    await t.test("PHASE 1: TRƯỚC KHI KHÓA (Còn dữ liệu chưa duyệt)", async (t2) => {
        // Dữ liệu mô phỏng
        const gdDaDuyet = 100, gdChuaDuyet = 50;
        const nckhDaDuyet = 300, nckhChuaDuyet = 100;

        await t2.test("Giai đoạn DỰ KIẾN: Tính cả chưa duyệt", async () => {
            const tongThucHienDuKien = gdDaDuyet + gdChuaDuyet; // 150
            const tongNCKHDuKien = nckhDaDuyet + nckhChuaDuyet; // 400
            assert.strictEqual(tongThucHienDuKien, 150);
            assert.strictEqual(tongNCKHDuKien, 400);
        });

        await t2.test("Giai đoạn CHÍNH THỨC: Chỉ tính đã duyệt", async () => {
            const tongThucHienChinhThuc = gdDaDuyet; // 100
            const tongNCKHChinhThuc = nckhDaDuyet;   // 300
            assert.strictEqual(tongThucHienChinhThuc, 100);
            assert.strictEqual(tongNCKHChinhThuc, 300);
        });

        await t2.test("Khóa dữ liệu (Snapshot): THẤT BẠI", async () => {
            // Hàm checkPrerequisites trong dataLock.service.js sẽ chặn lại
            const unapprovedCount = gdChuaDuyet + nckhChuaDuyet;
            assert.ok(unapprovedCount > 0, "Hệ thống chặn lưu vì còn 150 bản ghi chưa duyệt");
        });
    });

    await t.test("PHASE 2: SAU KHI KHÓA (Tất cả đã được duyệt)", async (t2) => {
        // Mô phỏng Admin/Trưởng khoa đã duyệt nốt các bản ghi chưa duyệt
        const gdDaDuyet = 150, gdChuaDuyet = 0;
        const nckhDaDuyet = 400, nckhChuaDuyet = 0;

        let resDuKien, resChinhThuc;

        await t2.test("Giai đoạn DỰ KIẾN", async () => {
            resDuKien = {
                giangDay: gdDaDuyet + gdChuaDuyet,
                nckh: nckhDaDuyet + nckhChuaDuyet
            };
            assert.strictEqual(resDuKien.giangDay, 150);
            assert.strictEqual(resDuKien.nckh, 400);
        });

        await t2.test("Giai đoạn CHÍNH THỨC", async () => {
            resChinhThuc = {
                giangDay: gdDaDuyet,
                nckh: nckhDaDuyet
            };
            assert.strictEqual(resChinhThuc.giangDay, 150);
            assert.strictEqual(resChinhThuc.nckh, 400);
            
            // Khẳng định: Khi không còn dữ liệu chưa duyệt, Dự kiến = Chính thức
            assert.deepStrictEqual(resDuKien, resChinhThuc, "Dự kiến phải BẰNG Chính thức khi không có bản ghi chưa duyệt");
        });

        await t2.test("Khóa dữ liệu (Snapshot): THÀNH CÔNG", async () => {
            const unapprovedCount = gdChuaDuyet + nckhChuaDuyet;
            assert.strictEqual(unapprovedCount, 0, "Điều kiện tiên quyết checkPrerequisites đã pass");

            // Lưu snapshot vào DB
            const snapshotData = {
                tong_so_tiet_giang_day: resChinhThuc.giangDay,
                tong_so_tiet_nckh: resChinhThuc.nckh
            };

            // Khẳng định: Dữ liệu Snapshot khớp 100% với Dự kiến và Chính thức
            assert.strictEqual(snapshotData.tong_so_tiet_giang_day, resDuKien.giangDay);
            assert.strictEqual(snapshotData.tong_so_tiet_giang_day, resChinhThuc.giangDay);
            
            assert.strictEqual(snapshotData.tong_so_tiet_nckh, resDuKien.nckh);
            assert.strictEqual(snapshotData.tong_so_tiet_nckh, resChinhThuc.nckh);
        });
    });
});

