/**
 * Canonical QC calculator for the Quy chuẩn thời khóa biểu domain.
 *
 * This factory intentionally does not handle generic hour/number values. It is
 * the single policy boundary for QC calculated from LL and the TKB factors.
 * Values are handled as decimal strings/BigInt so truncation is not affected
 * by JavaScript binary floating-point rounding.
 */
class QcTkbFactory {
  static calculate({ ll, heSoLopDong, heSoT7CN } = {}) {
    const parts = [
      this._toDecimalParts(ll, "ll"),
      this._toDecimalParts(heSoLopDong, "heSoLopDong"),
      this._toDecimalParts(heSoT7CN, "heSoT7CN"),
    ];

    const rawInteger = parts.reduce((result, part) => result * part.integer, 1n);
    const rawScale = parts.reduce((result, part) => result + part.scale, 0);
    const raw = this._formatScaledInteger(rawInteger, rawScale);

    return {
      raw,
      canonical: this.normalize(raw),
    };
  }

  static normalize(value) {
    const { integer, scale } = this._toDecimalParts(value, "value");
    return this._formatTruncated(integer, scale, 2);
  }

  static _toDecimalParts(value, fieldName) {
    if (value === null || value === undefined || value === "") {
      throw new TypeError(`${fieldName} is required`);
    }

    if (typeof value === "boolean" || typeof value === "object") {
      throw new TypeError(`${fieldName} must be a decimal number`);
    }

    let text = String(value).trim().replace(",", ".");
    if (!text) {
      throw new TypeError(`${fieldName} is required`);
    }

    if (/e/i.test(text)) {
      text = this._expandScientificNotation(text, fieldName);
    }

    const match = text.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
    if (!match) {
      throw new TypeError(`${fieldName} must be a decimal number`);
    }

    if (match[1] === "-") {
      throw new RangeError(`${fieldName} must be non-negative`);
    }

    const integerDigits = `${match[2]}${match[3] || ""}`.replace(/^0+(?=\d)/, "");
    return {
      integer: BigInt(integerDigits || "0"),
      scale: (match[3] || "").length,
    };
  }

  static _expandScientificNotation(text, fieldName) {
    const match = text.match(/^([+-]?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/);
    if (!match) {
      throw new TypeError(`${fieldName} must be a decimal number`);
    }

    const sign = match[1] || "";
    const whole = match[2];
    const fraction = match[3] || "";
    const exponent = Number(match[4]);
    const digits = `${whole}${fraction}`;
    const decimalPosition = whole.length + exponent;

    if (decimalPosition <= 0) {
      return `${sign}0.${"0".repeat(Math.abs(decimalPosition))}${digits}`;
    }

    if (decimalPosition >= digits.length) {
      return `${sign}${digits}${"0".repeat(decimalPosition - digits.length)}`;
    }

    return `${sign}${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}`;
  }

  static _formatTruncated(integer, scale, targetScale) {
    if (scale <= targetScale) {
      return this._formatScaledInteger(integer * 10n ** BigInt(targetScale - scale), targetScale);
    }

    const divisor = 10n ** BigInt(scale - targetScale);
    return this._formatScaledInteger(integer / divisor, targetScale);
  }

  static _formatScaledInteger(integer, scale) {
    const negative = integer < 0n;
    const absolute = negative ? -integer : integer;
    const digits = absolute.toString().padStart(scale + 1, "0");

    if (scale === 0) {
      return `${negative ? "-" : ""}${digits}`;
    }

    const splitAt = digits.length - scale;
    const whole = digits.slice(0, splitAt) || "0";
    const fraction = digits.slice(splitAt).padStart(scale, "0");
    return `${negative ? "-" : ""}${whole}.${fraction}`;
  }
}

module.exports = QcTkbFactory;
