const trainingSystemMapper = require("../../../../mappers/vuotgio_v2/trainingSystem.mapper");

class PaymentCalculator {
  static PAYMENT_RATE = 100000;
  static STANDARD_HOURS = 176; // Định mức tiết chuẩn
  static MAX_PAYABLE_HOURS = 300; // Trần tiết thanh toán

  /**
   * Calculate payment amount from overtime hours
   */
  static calculatePaymentAmount(overtimeHours) {
    return this.truncDecimals((overtimeHours || 0) * this.PAYMENT_RATE, 2);
  }

  /**
   * Truncate number to specified decimal places (TRUNC equivalent)
   */
  static truncDecimals(value, digits = 2) {
    const factor = Math.pow(10, digits);
    return Math.trunc(value * factor) / factor;
  }

  /**
   * Format number to Excel number format
   */
  static excelNumber(value) {
    return Number(Number(value || 0).toFixed(2));
  }

  /**
   * Classify training system (hệ đào tạo)
   */
  static classifyHeDaoTao(tenHeDaoTao) {
    return trainingSystemMapper.classify(tenHeDaoTao);
  }

  /**
   * Get standardized category key (vn, lao, cuba, cpc, dongHP)
   */
  static getCategoryKey(tenHeDaoTao) {
    return trainingSystemMapper.getCategoryKey(tenHeDaoTao);
  }

  /**
   * Parse training system breakdown from tableF
   */
  static parseTrainingSystemBreakdown(tableF) {
    const breakdown = {
      hk1_vn: 0, hk1_lao: 0, hk1_cuba: 0, hk1_cpc: 0, hk1_dongHP: 0,
      hk2_vn: 0, hk2_lao: 0, hk2_cuba: 0, hk2_cpc: 0, hk2_dongHP: 0,
      year_vn: 0, year_lao: 0, year_cuba: 0, year_cpc: 0, year_dongHP: 0,
    };

    if (!tableF || !Array.isArray(tableF.rows)) {
      return breakdown;
    }

    tableF.rows.forEach((row) => {
      const category = this.getCategoryKey(
        row.doi_tuong || row.DoiTuong || row.ten_he_dao_tao || row.he_dao_tao
      );

      // Đồ án & tham quan không có thông tin HK → mặc định tính vào HK1
      breakdown[`hk1_${category}`] += Number(row.hk1 || 0) + Number(row.do_an || 0) + Number(row.tham_quan || 0);
      breakdown[`hk2_${category}`] += Number(row.hk2 || 0);
      breakdown[`year_${category}`] += Number(row.tong || 0);
    });

    return breakdown;
  }

  /**
   * Distribute overtime proportionally across training systems
   */
  static distributeOvertimeProportionally(breakdown, totalOvertime) {
    const yearTotal =
      breakdown.year_vn +
      breakdown.year_lao +
      breakdown.year_cuba +
      breakdown.year_cpc +
      breakdown.year_dongHP;

    if (yearTotal === 0) {
      return {
        vuot_vn: 0,
        vuot_lao: 0,
        vuot_cuba: 0,
        vuot_cpc: 0,
        vuot_dongHP: 0,
      };
    }

    return {
      vuot_vn: (breakdown.year_vn / yearTotal) * totalOvertime,
      vuot_lao: (breakdown.year_lao / yearTotal) * totalOvertime,
      vuot_cuba: (breakdown.year_cuba / yearTotal) * totalOvertime,
      vuot_cpc: (breakdown.year_cpc / yearTotal) * totalOvertime,
      vuot_dongHP: (breakdown.year_dongHP / yearTotal) * totalOvertime,
    };
  }

  /**
   * ============================================================
   * computeSdoBreakdown - SINGLE SOURCE OF TRUTH
   * ============================================================
   * Nhận vào tableF và totalOvertime (thanhToan) của 1 SDO,
   * trả về object breakdown đầy đủ, đã tính sẵn HK1 / HK2 /
   * cả năm / vượt giờ / thành tiền cho 5 nhóm + hàng tổng.
   *
   * Dùng chung cho:
   *   - API → Web UI (bảng tổng hợp giảng viên)
   *   - Preview Excel/PDF khoa/phòng (summary.component.js)
   *
   * Trả về cấu trúc:
   * {
   *   hk1:   { vn, lao, cuba, cpc, dongHP, total }
   *   hk2:   { vn, lao, cuba, cpc, dongHP, total }
   *   year:  { vn, lao, cuba, cpc, dongHP, total }
   *   vuot:  { vn, lao, cuba, cpc, dongHP, total }
   *   money: { vn, lao, cuba, cpc, dongHP, total }
   *   thucNhan: number   (= money.total hiện tại)
   *   mucTT: number      (đơn giá mỗi tiết)
   * }
   * ============================================================
   */
  static computeSdoBreakdown(tableF, totalOvertime) {
    const R = (v) => this.excelNumber(v);
    const GROUPS = ["vn", "lao", "cuba", "cpc", "dongHP"];
    const vuotTong = R(totalOvertime || 0);

    // Bước 1: Phân tích tableF
    const raw = this.parseTrainingSystemBreakdown(tableF);

    // Bước 2: Chia tỉ lệ vượt giờ vào từng nhóm
    const vuot = this.distributeOvertimeProportionally(raw, vuotTong);

    // Bước 3: Tính thành tiền từng nhóm
    const rate = this.PAYMENT_RATE;
    const moneyByGroup = {};
    let moneyTotal = 0;
    GROUPS.forEach(g => {
      moneyByGroup[g] = R(vuot[`vuot_${g}`] * rate);
      moneyTotal += moneyByGroup[g];
    });
    moneyTotal = R(moneyTotal);

    // Bước 4: Tính tổng cột từng hàng
    const sum = (prefix) => R(GROUPS.reduce((s, g) => s + (raw[`${prefix}_${g}`] || 0), 0));

    return {
      hk1: {
        vn: R(raw.hk1_vn), lao: R(raw.hk1_lao), cuba: R(raw.hk1_cuba),
        cpc: R(raw.hk1_cpc), dongHP: R(raw.hk1_dongHP), total: sum("hk1"),
      },
      hk2: {
        vn: R(raw.hk2_vn), lao: R(raw.hk2_lao), cuba: R(raw.hk2_cuba),
        cpc: R(raw.hk2_cpc), dongHP: R(raw.hk2_dongHP), total: sum("hk2"),
      },
      year: {
        vn: R(raw.year_vn), lao: R(raw.year_lao), cuba: R(raw.year_cuba),
        cpc: R(raw.year_cpc), dongHP: R(raw.year_dongHP), total: sum("year"),
      },
      vuot: {
        vn: R(vuot.vuot_vn), lao: R(vuot.vuot_lao), cuba: R(vuot.vuot_cuba),
        cpc: R(vuot.vuot_cpc), dongHP: R(vuot.vuot_dongHP), total: vuotTong,
      },
      money: {
        vn: moneyByGroup.vn, lao: moneyByGroup.lao, cuba: moneyByGroup.cuba,
        cpc: moneyByGroup.cpc, dongHP: moneyByGroup.dongHP, total: moneyTotal,
      },
      thucNhan: moneyTotal,
      mucTT: rate,
    };
  }
}

module.exports = PaymentCalculator;