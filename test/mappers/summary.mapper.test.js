const test = require('node:test');
const assert = require('node:assert');
const OvertimePolicyFactory = require('../../src/mappers/vuotgio_v2/policies/OvertimePolicyFactory');

test('OvertimePolicyFactory and Policies tests', async (t) => {
    
    await t.test('1. PolicyV1 - Normal teaching without shortfall or reductions', () => {
        const calculator = OvertimePolicyFactory.getCalculator("2024 - 2025");
        const result = calculator.calculate({
            soTietGiangDay: 200,
            soTietNgoaiQC: 50,
            soTietKTHP: 30,
            soTietDoAn: 20,
            soTietHDTQ: 10,
            soTietNCKH: 200,
            phanTramMienGiam: 0,
            dinhMucChuan: 280,
            dinhMucNCKH: 200
        });

        // tongThucHien = 200 + 50 + 30 + 20 + 10 = 310
        // mienGiam = 280 * 0% = 0
        // dinhMucSauMienGiam = 280
        // thieuNCKH = max(0, 200 - 200) = 0
        // tongVuot = max(0, 310 - 0 - 280) = 30
        // thanhToan = min(30, 280) = 30
        assert.strictEqual(Number(result.tongThucHien), 310);
        assert.strictEqual(Number(result.dinhMucSauMienGiam), 280);
        assert.strictEqual(Number(result.thieuNCKH), 0);
        assert.strictEqual(Number(result.thieuTietGiangDay), 0);
        assert.strictEqual(Number(result.tongVuot), 30);
        assert.strictEqual(Number(result.thanhToan), 30);
    });

    await t.test('2. PolicyV1 - Teaching with NCKH shortfall (dinhMucNCKH = 200, actual NCKH = 100)', () => {
        const calculator = OvertimePolicyFactory.getCalculator("2024 - 2025");
        const result = calculator.calculate({
            soTietGiangDay: 200,
            soTietNgoaiQC: 50,
            soTietKTHP: 30,
            soTietDoAn: 20,
            soTietHDTQ: 10,
            soTietNCKH: 100,
            phanTramMienGiam: 0,
            dinhMucChuan: 280,
            dinhMucNCKH: 200
        });

        // tongThucHien = 310
        // thieuNCKH = 200 - 100 = 100
        // tongVuot = max(0, 310 - 100 - 280) = 0
        // thieuTietGiangDay = max(0, 280 - 310 + 100) = 70
        assert.strictEqual(Number(result.thieuNCKH), 100);
        assert.strictEqual(Number(result.thieuTietGiangDay), 70);
        assert.strictEqual(Number(result.tongVuot), 0);
        assert.strictEqual(Number(result.thanhToan), 0);
    });

    await t.test('3. PolicyV1 - Teaching with 50% workload reduction (no NCKH reduction)', () => {
        const calculator = OvertimePolicyFactory.getCalculator("2024 - 2025");
        const result = calculator.calculate({
            soTietGiangDay: 150,
            soTietNgoaiQC: 10,
            soTietKTHP: 10,
            soTietDoAn: 10,
            soTietHDTQ: 10,
            soTietNCKH: 100,
            phanTramMienGiam: 50,
            dinhMucChuan: 280,
            dinhMucNCKH: 200
        });

        // tongThucHien = 190
        // mienGiam = 280 * 50% = 140
        // dinhMucSauMienGiam = 140
        // thieuNCKH = max(0, 200 - 100) = 100
        // tongVuot = max(0, 190 - 100 - 140) = 0
        // thieuTietGiangDay = max(0, 140 - 190 + 100) = 50
        assert.strictEqual(Number(result.tongThucHien), 190);
        assert.strictEqual(Number(result.dinhMucSauMienGiam), 140);
        assert.strictEqual(Number(result.thieuNCKH), 100);
        assert.strictEqual(Number(result.tongVuot), 0);
        assert.strictEqual(Number(result.thieuTietGiangDay), 50);
        assert.strictEqual(Number(result.thanhToan), 0);
    });

    await t.test('4. PolicyV2 - Teaching with 50% exemption, becomes 80% of 280', () => {
        const calculator = OvertimePolicyFactory.getCalculator("2026 - 2027");
        const result = calculator.calculate({
            soTietGiangDay: 150,
            soTietNgoaiQC: 10,
            soTietKTHP: 10,
            soTietDoAn: 10,
            soTietHDTQ: 10,
            soTietNCKH: 100,
            phanTramMienGiam: 50, // triggers V2 rule (80% of 280 = 224)
            dinhMucChuan: 280,
            dinhMucNCKH: 200
        });

        // tongThucHien = 190
        // mienGiam = 280 - 224 = 56
        // dinhMucSauMienGiam = 224
        // thieuNCKH = max(0, 200 - 100) = 100
        // tongVuot = max(0, 190 - 100 - 224) = 0
        // thieuTietGiangDay = max(0, 224 - 190 + 100) = 134
        assert.strictEqual(Number(result.tongThucHien), 190);
        assert.strictEqual(Number(result.dinhMucSauMienGiam), 224);
        assert.strictEqual(Number(result.mienGiam), 56);
        assert.strictEqual(Number(result.thieuNCKH), 100);
        assert.strictEqual(Number(result.tongVuot), 0);
        assert.strictEqual(Number(result.thieuTietGiangDay), 134);
        assert.strictEqual(Number(result.thanhToan), 0);
    });

    await t.test('5. Floating-point precision check', () => {
        const calculator = OvertimePolicyFactory.getCalculator("2024 - 2025");
        const result = calculator.calculate({
            soTietGiangDay: 100.15,
            soTietNgoaiQC: 50.22,
            soTietKTHP: 20.33,
            soTietDoAn: 10.11,
            soTietHDTQ: 5.05,
            soTietNCKH: 200.5,
            phanTramMienGiam: 33.33, // 33.33% reduction
            dinhMucChuan: 280,
            dinhMucNCKH: 200
        });

        assert.ok(typeof result.tongThucHien === 'string' || typeof result.tongThucHien === 'number');
        assert.strictEqual(Number(result.tongThucHien), 185.86);
    });
});
