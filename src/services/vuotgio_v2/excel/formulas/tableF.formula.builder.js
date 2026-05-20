const { TAGS } = require("../layouts/section-tags.constants");
const { getLabel } = require("../normalizers/training-system.normalizer");

const colLetter = (col) => {
  let n = col;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
};

const buildTableFFormulaRows = (abcResults, options = {}) => {
  const doiTuongCol = colLetter(options.doiTuongCol ?? 5);
  const valueCol = colLetter(options.valueCol ?? 7);

  const sectionMetaByTag = new Map();
  (abcResults || []).forEach((result) => {
    (result.sectionMetas || []).forEach((meta) => {
      if (meta?.tag) sectionMetaByTag.set(meta.tag, meta);
    });
  });

  const categories = [
    { key: "vn", label: getLabel("vn") },
    { key: "lao", label: getLabel("lao") },
    { key: "cuba", label: getLabel("cuba") },
    { key: "cpc", label: getLabel("cpc") },
    { key: "dongHP", label: getLabel("dongHP") },
  ];

  const sumIf = (meta, label) => {
    if (!meta?.dataStart || !meta?.dataEnd) return "0";
    return `SUMIF(${doiTuongCol}${meta.dataStart}:${doiTuongCol}${meta.dataEnd},"${label}",${valueCol}${meta.dataStart}:${valueCol}${meta.dataEnd})`;
  };

  const sumRange = (meta) => {
    if (!meta?.dataStart || !meta?.dataEnd) return "0";
    return `SUM(${valueCol}${meta.dataStart}:${valueCol}${meta.dataEnd})`;
  };

  const buildSumExpr = (parts) => {
    const active = parts.filter((p) => p && p !== "0");
    if (!active.length) return "0";
    if (active.length === 1) return active[0];
    return active.map((p) => `(${p})`).join("+");
  };

  const tagByCategory = {
    vn: { b: TAGS.B_VN, c: TAGS.C_VN },
    lao: { b: TAGS.B_LAO, c: TAGS.C_LAO },
    cuba: { b: TAGS.B_CUBA, c: TAGS.C_CUBA },
    cpc: { b: TAGS.B_CPC, c: TAGS.C_CPC },
    dongHP: { b: TAGS.B_DONG_HP, c: TAGS.C_DONG_HP },
  };

  return categories.map((category) => {
    const isDongHp = category.key === "dongHP";

    const hk1Parts = isDongHp
      ? [
          sumIf(sectionMetaByTag.get(TAGS.A1_HK1_DHP), category.label),
          sumIf(sectionMetaByTag.get(TAGS.A2_HK1_DHP), category.label),
        ]
      : [
          sumIf(sectionMetaByTag.get(TAGS.A1_HK1_MM), category.label),
          sumIf(sectionMetaByTag.get(TAGS.A2_HK1_MM), category.label),
        ];

    const hk2Parts = isDongHp
      ? [
          sumIf(sectionMetaByTag.get(TAGS.A1_HK2_DHP), category.label),
          sumIf(sectionMetaByTag.get(TAGS.A2_HK2_DHP), category.label),
        ]
      : [
          sumIf(sectionMetaByTag.get(TAGS.A1_HK2_MM), category.label),
          sumIf(sectionMetaByTag.get(TAGS.A2_HK2_MM), category.label),
        ];

    const tagGroup = tagByCategory[category.key];
    const doAn = sumRange(sectionMetaByTag.get(tagGroup?.b));
    const thamQuan = sumRange(sectionMetaByTag.get(tagGroup?.c));

    return {
      hk1: buildSumExpr(hk1Parts),
      hk2: buildSumExpr(hk2Parts),
      doAn,
      thamQuan,
    };
  });
};

module.exports = {
  buildTableFFormulaRows,
};
