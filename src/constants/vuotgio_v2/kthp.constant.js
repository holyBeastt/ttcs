"use strict";

const KTHP_TYPES = Object.freeze({
    RA_DE: "RA_DE",
    NGAN_HANG_CAU_HOI: "NGAN_HANG_CAU_HOI",
    COI_THI: "COI_THI",
    CHAM_THI: "CHAM_THI",
});

const KTHP_DETAIL_KINDS = Object.freeze({
    RA_DE: "RA_DE",
    COI_THI: "COI_THI",
    CHAM_THI: "CHAM_THI",
});

const TYPE_LABELS = Object.freeze({
    [KTHP_TYPES.RA_DE]: "Ra đề",
    [KTHP_TYPES.NGAN_HANG_CAU_HOI]: "Ngân hàng câu hỏi",
    [KTHP_TYPES.COI_THI]: "Coi thi",
    [KTHP_TYPES.CHAM_THI]: "Chấm thi",
});

const detailKindForType = (type) => {
    if (type === KTHP_TYPES.RA_DE || type === KTHP_TYPES.NGAN_HANG_CAU_HOI) {
        return KTHP_DETAIL_KINDS.RA_DE;
    }
    if (type === KTHP_TYPES.COI_THI) return KTHP_DETAIL_KINDS.COI_THI;
    if (type === KTHP_TYPES.CHAM_THI) return KTHP_DETAIL_KINDS.CHAM_THI;
    throw new Error(`Unsupported KTHP type: ${type}`);
};

const labelForType = (type) => {
    const label = TYPE_LABELS[type];
    if (!label) throw new Error(`Unsupported KTHP type: ${type}`);
    return label;
};

module.exports = {
    KTHP_TYPES,
    KTHP_DETAIL_KINDS,
    TYPE_LABELS,
    detailKindForType,
    labelForType,
};
