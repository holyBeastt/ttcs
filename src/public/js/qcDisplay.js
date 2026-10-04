/*
 * QC display helpers.
 *
 * Individual QC cells are rendered from the canonical value already returned
 * by the backend. The only operation here is exact addition for filtered UI
 * totals; it does not round or re-calculate any source QC value.
 */
(function registerQcDisplay(global) {
  function toCanonicalHundredths(value) {
    const text = String(value ?? "").trim().replace(",", ".");
    const match = text.match(/^(\d+)(?:\.(\d+))?$/);
    if (!match) return 0n;

    const fraction = (match[2] || "").padEnd(2, "0").slice(0, 2);
    return BigInt(match[1]) * 100n + BigInt(fraction || "0");
  }

  function sumCanonicalQc(values) {
    const total = Array.from(values || []).reduce(
      (sum, value) => sum + toCanonicalHundredths(value),
      0n
    );
    return `${total / 100n}.${String(total % 100n).padStart(2, "0")}`;
  }

  global.qcDisplay = {
    value(value) {
      return value === null || value === undefined ? "" : String(value);
    },
    sum(values) {
      return sumCanonicalQc(values);
    },
  };
})(window);
