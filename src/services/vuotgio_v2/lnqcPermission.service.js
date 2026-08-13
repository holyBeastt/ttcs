"use strict";

const getRoleConfig = () => ({
    gvCnbm: process.env.ROLE_KHOA_GV_CNBM || "GV_CNBM",
    lanhDaoKhoa: process.env.ROLE_KHOA_LANHDAO || "Lãnh đạo khoa",
    troLyPhong: process.env.ROLE_PHONGBAN_TROLY || "Trợ lý",
    lanhDaoPhong: process.env.ROLE_PHONGBAN_LANHDAO || "Lãnh đạo phòng",
    daoTao: process.env.DAO_TAO || "DAOTAO",
    banGiamDoc: process.env.BAN_GIAM_DOC || "BGĐ",
});

const getActor = (session = {}) => ({
    role: session.role || session.Quyen || "",
    maPhongBan: session.MaPhongBan || "",
    isKhoa: session.isKhoa === 1 || session.isKhoa === "1",
});

const recordKhoa = (record) => record?.major || record?.khoa || record?.Khoa || "";
const recordKhoaDuyet = (record) => Number(record?.khoa_duyet ?? record?.KhoaDuyet ?? 0);
const recordDaoTaoDuyet = (record) => Number(record?.dao_tao_duyet ?? record?.DaoTaoDuyet ?? 0);

const isOwnKhoa = (actor, record) => actor.isKhoa
    && Boolean(actor.maPhongBan)
    && recordKhoa(record) === actor.maPhongBan;

const canCreateRecord = (session, record) => {
    const actor = getActor(session);
    const { banGiamDoc } = getRoleConfig();
    if (actor.maPhongBan === banGiamDoc || !actor.isKhoa) return true;
    return isOwnKhoa(actor, record);
};

const canModifyRecord = (session, record) => {
    if (!record) return false;
    const actor = getActor(session);
    const { gvCnbm, lanhDaoKhoa, troLyPhong, lanhDaoPhong, daoTao, banGiamDoc } = getRoleConfig();

    if (actor.maPhongBan === banGiamDoc) return true;

    const isKhoaEditor = actor.isKhoa
        && (actor.role === gvCnbm || actor.role === lanhDaoKhoa);
    if (isKhoaEditor) {
        return isOwnKhoa(actor, record)
            && recordKhoaDuyet(record) === 0
            && recordDaoTaoDuyet(record) === 0;
    }

    const isDaoTaoEditor = actor.maPhongBan === daoTao
        && (actor.role === troLyPhong || actor.role === lanhDaoPhong);
    return isDaoTaoEditor
        && recordKhoaDuyet(record) === 0
        && recordDaoTaoDuyet(record) === 0;
};

const canChangeApproval = (session, record, requested) => {
    if (!record || !requested) return false;
    const actor = getActor(session);
    const { gvCnbm, lanhDaoKhoa, troLyPhong, lanhDaoPhong, daoTao, banGiamDoc } = getRoleConfig();
    const currentKhoa = recordKhoaDuyet(record);
    const currentDaoTao = recordDaoTaoDuyet(record);
    const nextKhoa = Number(requested.khoa_duyet ?? requested.KhoaDuyet);
    const nextDaoTao = Number(requested.dao_tao_duyet ?? requested.DaoTaoDuyet);

    if (![currentKhoa, currentDaoTao, nextKhoa, nextDaoTao]
        .every((value) => value === 0 || value === 1)) return false;
    if (nextDaoTao === 1 && nextKhoa !== 1) return false;
    if (actor.maPhongBan === banGiamDoc) return true;

    if (actor.isKhoa && (actor.role === gvCnbm || actor.role === lanhDaoKhoa)) {
        if (!isOwnKhoa(actor, record) || nextDaoTao !== currentDaoTao) return false;
        if (actor.role === gvCnbm) {
            return nextKhoa === currentKhoa
                || (currentKhoa === 0 && currentDaoTao === 0 && nextKhoa === 1);
        }
        // Lãnh đạo khoa được duyệt và bỏ duyệt cấp khoa, nhưng không hạ
        // trạng thái khoa sau khi cấp Đào tạo đã duyệt.
        return currentDaoTao === 0 ? true : nextKhoa === currentKhoa;
    }

    if (actor.maPhongBan === daoTao
        && (actor.role === troLyPhong || actor.role === lanhDaoPhong)) {
        if (nextKhoa !== currentKhoa) return false;
        if (actor.role === troLyPhong) {
            return nextDaoTao === currentDaoTao
                || (currentKhoa === 1 && currentDaoTao === 0 && nextDaoTao === 1);
        }
        // Lãnh đạo phòng được duyệt và bỏ duyệt cấp Đào tạo; chỉ duyệt khi
        // cấp khoa đã duyệt.
        return nextDaoTao === currentDaoTao
            || (currentKhoa === 1 && nextDaoTao === 1)
            || (currentDaoTao === 1 && nextDaoTao === 0);
    }

    return false;
};

module.exports = {
    canCreateRecord,
    canModifyRecord,
    canChangeApproval,
};
