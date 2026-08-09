'use strict';

const {
    canModifyRecord,
    canChangeApproval,
} = require('../../../src/services/vuotgio_v2/kthpPermission.service');

const record = (overrides = {}) => ({
    khoa: 'CNTT',
    khoa_duyet: 0,
    khao_thi_duyet: 0,
    ...overrides,
});

describe('KTHP approval transition permissions', () => {
    const facultySession = (role) => ({
        role,
        MaPhongBan: 'CNTT',
        isKhoa: 1,
    });
    const examSession = (role) => ({
        role,
        MaPhongBan: process.env.KHAO_THI || 'KT&ĐBCL',
        isKhoa: 0,
    });

    it('allows GV_CNBM to approve only their own faculty stage', () => {
        const session = facultySession(process.env.ROLE_KHOA_GV_CNBM || 'GV_CNBM');
        expect(canChangeApproval(session, record(), {
            khoa_duyet: 1,
            khao_thi_duyet: 0,
        })).toBe(true);
        expect(canChangeApproval(session, record({ khoa_duyet: 1 }), {
            khoa_duyet: 0,
            khao_thi_duyet: 0,
        })).toBe(false);
        expect(canChangeApproval(session, record({ khoa: 'ATTT' }), {
            khoa_duyet: 1,
            khao_thi_duyet: 0,
        })).toBe(false);
    });

    it('allows faculty leadership to revoke but not grant faculty approval', () => {
        const session = facultySession(
            process.env.ROLE_KHOA_LANHDAO || 'Lãnh đạo khoa'
        );
        expect(canChangeApproval(session, record({ khoa_duyet: 1 }), {
            khoa_duyet: 0,
            khao_thi_duyet: 0,
        })).toBe(true);
        expect(canChangeApproval(session, record(), {
            khoa_duyet: 1,
            khao_thi_duyet: 0,
        })).toBe(false);
    });

    it('requires faculty approval before examination staff can approve', () => {
        const session = examSession(process.env.ROLE_PHONGBAN_TROLY || 'Trợ lý');
        expect(canChangeApproval(session, record({ khoa_duyet: 1 }), {
            khoa_duyet: 1,
            khao_thi_duyet: 1,
        })).toBe(true);
        expect(canChangeApproval(session, record(), {
            khoa_duyet: 0,
            khao_thi_duyet: 1,
        })).toBe(false);
    });

    it('never permits examination staff to change faculty approval', () => {
        const session = examSession(process.env.ROLE_PHONGBAN_LANHDAO || 'Lãnh đạo phòng');
        expect(canChangeApproval(session, record({
            khoa_duyet: 1,
            khao_thi_duyet: 1,
        }), {
            khoa_duyet: 0,
            khao_thi_duyet: 0,
        })).toBe(false);
    });
});

describe('KTHP edit/delete permissions', () => {
    it('allows a faculty approver to modify only an unapproved record from their faculty', () => {
        const session = {
            role: process.env.ROLE_KHOA_GV_CNBM || 'GV_CNBM',
            MaPhongBan: 'CNTT',
            isKhoa: 1,
        };

        expect(canModifyRecord(session, record())).toBe(true);
        expect(canModifyRecord(session, record({ khoa: 'ATTT' }))).toBe(false);
        expect(canModifyRecord(session, record({ khoa_duyet: 1 }))).toBe(false);
        expect(canModifyRecord(session, record({ khao_thi_duyet: 1 }))).toBe(false);
    });

    it('does not treat a department user with a faculty role label as a faculty user', () => {
        const session = {
            role: process.env.ROLE_KHOA_GV_CNBM || 'GV_CNBM',
            MaPhongBan: 'CNTT',
            isKhoa: 0,
        };

        expect(canModifyRecord(session, record())).toBe(false);
    });

    it('allows Examination Department staff until Examination approval', () => {
        const session = {
            role: process.env.ROLE_PHONGBAN_TROLY || 'Trợ lý',
            MaPhongBan: process.env.KHAO_THI || 'KT&ĐBCL',
            isKhoa: 0,
        };

        expect(canModifyRecord(session, record({ khoa_duyet: 1 }))).toBe(true);
        expect(canModifyRecord(session, record({ khao_thi_duyet: 1 }))).toBe(false);
    });

    it('rejects the same department role outside the Examination Department', () => {
        const session = {
            role: process.env.ROLE_PHONGBAN_LANHDAO || 'Lãnh đạo phòng',
            MaPhongBan: 'DAOTAO',
            isKhoa: 0,
        };

        expect(canModifyRecord(session, record())).toBe(false);
    });

    it('allows the Board of Directors regardless of approval state', () => {
        const session = {
            role: 'Lãnh đạo',
            MaPhongBan: process.env.BAN_GIAM_DOC || 'BGĐ',
            isKhoa: 0,
        };

        expect(canModifyRecord(session, record({
            khoa_duyet: 1,
            khao_thi_duyet: 1,
        }))).toBe(true);
    });

    it('rejects missing actors and records', () => {
        expect(canModifyRecord({}, record())).toBe(false);
        expect(canModifyRecord({}, null)).toBe(false);
    });
});
