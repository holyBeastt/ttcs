const getRoleConfig = () => ({
    gvCnbm: process.env.ROLE_KHOA_GV_CNBM || "GV_CNBM",
    lanhDaoKhoa: process.env.ROLE_KHOA_LANHDAO || "Lãnh đạo khoa",
    troLyPhong: process.env.ROLE_PHONGBAN_TROLY || "Trợ lý",
    lanhDaoPhong: process.env.ROLE_PHONGBAN_LANHDAO || "Lãnh đạo phòng",
    khaoThi: process.env.KHAO_THI || "KT&ĐBCL",
    banGiamDoc: process.env.BAN_GIAM_DOC || "BGĐ",
});

const getActor = (session = {}) => ({
    role: session.role || session.Quyen || "",
    maPhongBan: session.MaPhongBan || "",
    isKhoa: session.isKhoa === 1 || session.isKhoa === "1",
});

const canModifyRecord = (session, record) => {
    if (!record) return false;

    const { role, maPhongBan, isKhoa } = getActor(session);
    const {
        gvCnbm,
        lanhDaoKhoa,
        troLyPhong,
        lanhDaoPhong,
        khaoThi,
        banGiamDoc,
    } = getRoleConfig();

    if (maPhongBan === banGiamDoc) return true;

    const isKhoaUser = isKhoa && (role === gvCnbm || role === lanhDaoKhoa);
    if (isKhoaUser) {
        const belongsToKhoa = Boolean(maPhongBan) && record.khoa === maPhongBan;
        return belongsToKhoa
            && Number(record.khoa_duyet) === 0
            && Number(record.khao_thi_duyet) === 0;
    }

    const isKhaoThiUser = maPhongBan === khaoThi
        && (role === troLyPhong || role === lanhDaoPhong);
    if (isKhaoThiUser) {
        return Number(record.khao_thi_duyet) === 0;
    }

    return false;
};

const canChangeApproval = (session, record, requested) => {
    if (!record || !requested) return false;

    const { role, maPhongBan, isKhoa } = getActor(session);
    const {
        gvCnbm,
        lanhDaoKhoa,
        troLyPhong,
        lanhDaoPhong,
        khaoThi,
        banGiamDoc,
    } = getRoleConfig();
    const currentKhoa = Number(record.khoa_duyet);
    const currentKhaoThi = Number(record.khao_thi_duyet);
    const nextKhoa = Number(requested.khoa_duyet);
    const nextKhaoThi = Number(requested.khao_thi_duyet);

    if (![currentKhoa, currentKhaoThi, nextKhoa, nextKhaoThi]
        .every((value) => value === 0 || value === 1)) {
        return false;
    }
    if (nextKhaoThi === 1 && nextKhoa !== 1) return false;
    if (maPhongBan === banGiamDoc) return true;

    if (isKhoa && (role === gvCnbm || role === lanhDaoKhoa)) {
        if (!maPhongBan || record.khoa !== maPhongBan) return false;
        if (nextKhaoThi !== currentKhaoThi) return false;
        if (nextKhoa === currentKhoa) return true;
        if (currentKhaoThi === 1) return false;
        return role === gvCnbm
            ? currentKhoa === 0 && nextKhoa === 1
            : currentKhoa === 1 && nextKhoa === 0;
    }

    if (maPhongBan === khaoThi && (role === troLyPhong || role === lanhDaoPhong)) {
        if (nextKhoa !== currentKhoa) return false;
        if (nextKhaoThi === currentKhaoThi) return true;
        return role === troLyPhong
            ? currentKhoa === 1 && currentKhaoThi === 0 && nextKhaoThi === 1
            : currentKhaoThi === 1 && nextKhaoThi === 0;
    }

    return false;
};

module.exports = {
    canModifyRecord,
    canChangeApproval,
};
