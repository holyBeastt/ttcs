const test = require('node:test');
const assert = require('node:assert');
const {
  round2,
  quyDoiSoTietStandard,
  quyDoiSoTietChiaDeu,
  quyDoiSoTietCoDinh,
  buildParticipantsWithHours,
  buildParticipantsWithEqualHours,
  buildParticipantsWithFixedHours,
  buildParticipantsByMode,
} = require('../../src/services/nckh_v3/formula.service');

test('NCKH formula.service.js tests', async (t) => {
  await t.test('1. round2 basic tests', () => {
    assert.strictEqual(round2(1.234), 1.23);
    assert.strictEqual(round2(1.236), 1.24);
    assert.strictEqual(round2(1.235), 1.24);
    assert.strictEqual(round2(1.2), 1.2);
  });

  await t.test('2. quyDoiSoTietStandard calculations and error validation', async (t) => {
    await t.test('Should throw error when parameters are invalid', () => {
      assert.throws(() => quyDoiSoTietStandard(10, 0, 1, 1), /Tổng số người phải lớn hơn 0/);
      assert.throws(() => quyDoiSoTietStandard(10, 2, 0, 1), /Số tác giả chính phải lớn hơn 0/);
      assert.throws(() => quyDoiSoTietStandard(10, 2, 1, 0), /Số năm thực hiện phải lớn hơn 0/);
    });

    await t.test('Standard calculation: Single author, single participant', () => {
      const result = quyDoiSoTietStandard(300, 1, 1, 1);
      assert.strictEqual(result.tacGia, 300);
      assert.strictEqual(result.thanhVien, 0);
    });

    await t.test('Standard calculation: Single author, 2 participants', () => {
      const result = quyDoiSoTietStandard(300, 2, 1, 1);
      assert.strictEqual(result.tacGia, 200);
      assert.strictEqual(result.thanhVien, 100);
    });

    await t.test('Standard calculation: Single author, 3 participants', () => {
      const result = quyDoiSoTietStandard(300, 3, 1, 1);
      assert.strictEqual(result.tacGia, 150);
      assert.strictEqual(result.thanhVien, 75);
    });

    await t.test('Standard calculation: Single author, 4 participants', () => {
      const result = quyDoiSoTietStandard(300, 4, 1, 1);
      assert.strictEqual(result.tacGia, 150);
      assert.strictEqual(result.thanhVien, 50);
    });

    await t.test('Standard calculation: Co-authors (multiple main authors)', () => {
      // T = 300, participants = 3, authors = 2, duration = 1
      const result = quyDoiSoTietStandard(300, 3, 2, 1);
      assert.strictEqual(result.tacGia, 116.67);
      assert.strictEqual(result.thanhVien, 66.67);
    });

    await t.test('Standard calculation: Multi-year implementation', () => {
      const result = quyDoiSoTietStandard(300, 2, 1, 2);
      assert.strictEqual(result.tacGia, 100); // 200 / 2
      assert.strictEqual(result.thanhVien, 50); // 100 / 2
    });

    await t.test('Standard calculation: Literal year parameter (>1900)', () => {
      const result = quyDoiSoTietStandard(300, 2, 1, 2025);
      assert.strictEqual(result.tacGia, 200);
      assert.strictEqual(result.thanhVien, 100);
    });
  });

  await t.test('3. quyDoiSoTietChiaDeu calculations and error validation', async (t) => {
    await t.test('Should throw error when participants is 0 or negative', () => {
      assert.throws(() => quyDoiSoTietChiaDeu(100, 0, 1), /Tổng số người phải lớn hơn 0/);
    });

    await t.test('Should divide evenly', () => {
      assert.strictEqual(quyDoiSoTietChiaDeu(300, 3, 1), 100);
      assert.strictEqual(quyDoiSoTietChiaDeu(100, 3, 1), 33.33);
    });

    await t.test('Should handle multi-year and literal year', () => {
      assert.strictEqual(quyDoiSoTietChiaDeu(300, 3, 2), 50); // 100 / 2
      assert.strictEqual(quyDoiSoTietChiaDeu(300, 3, 2025), 100); // literal year
    });
  });

  await t.test('4. quyDoiSoTietCoDinh calculation', () => {
    assert.strictEqual(quyDoiSoTietCoDinh(123.456), 123.46);
  });

  await t.test('5. buildParticipantsWithHours tests', async (t) => {
    await t.test('Should throw error on empty participants or no authors', () => {
      assert.throws(() => buildParticipantsWithHours(100, [], []), /Danh sach nguoi tham gia khong duoc rong/);
      assert.throws(() => buildParticipantsWithHours(100, [], [2]), /Phai co it nhat 1 tac gia/);
    });

    await t.test('Should handle duplicates and assign correct hours', () => {
      // 1 author (id 1, who is also mistakenly in member ids), 1 member (id 2)
      // total = 2. T = 300.
      const result = buildParticipantsWithHours(300, [1], [1, 2]);
      assert.strictEqual(result.length, 2);
      
      const author = result.find(p => p.nhanvienId === 1);
      const member = result.find(p => p.nhanvienId === 2);
      
      assert.strictEqual(author.vaiTro, 'tac_gia');
      assert.strictEqual(author.soTiet, 200);
      assert.strictEqual(member.vaiTro, 'thanh_vien');
      assert.strictEqual(member.soTiet, 100);
    });

    await t.test('Should adjust delta for rounding errors', () => {
      // T = 100, 3 participants (1 author, 2 members). Standard conversion:
      // tacGia = 50, thanhVien = 25.
      // Sum = 50 + 25 + 25 = 100, delta = 0.
      const result1 = buildParticipantsWithHours(100, [1], [2, 3]);
      assert.strictEqual(result1.find(p => p.nhanvienId === 1).soTiet, 50);
      assert.strictEqual(result1.find(p => p.nhanvienId === 2).soTiet, 25);
      assert.strictEqual(result1.find(p => p.nhanvienId === 3).soTiet, 25);

      // Now force a rounding scenario where sum doesn't equal T exactly:
      // T = 100, 4 participants (1 author, 3 members).
      // base = 200 / 12 = 16.6666...
      // tacGia = 100/3 + 16.6666... = 50.
      // thanhVien = 16.67.
      // Sum = 50 + 16.67 + 16.67 + 16.67 = 100.01. Delta = -0.01.
      // Last member should be adjusted.
      const result2 = buildParticipantsWithHours(100, [1], [2, 3, 4]);
      assert.strictEqual(result2.find(p => p.nhanvienId === 1).soTiet, 50);
      assert.strictEqual(result2.find(p => p.nhanvienId === 2).soTiet, 16.67);
      assert.strictEqual(result2.find(p => p.nhanvienId === 3).soTiet, 16.67);
      assert.strictEqual(result2.find(p => p.nhanvienId === 4).soTiet, 16.66); // Adjusted from 16.67 by delta -0.01
    });

    await t.test('Should handle external participants', () => {
      const result = buildParticipantsWithHours(
        300,
        [1],
        [],
        [{ ten: 'External Author', donVi: 'Uni A' }],
        [{ ten: 'External Member', donVi: 'Uni B' }]
      );
      // total = 3 (1 internal author, 1 external author, 1 external member)
      // T = 300, 2 authors, 1 member.
      // base = (2 * 300) / (3 * 3) = 66.67. bonusEachMainAuthor = 300 / (3 * 2) = 50.
      // tacGia = 50 + 66.67 = 116.67.
      // thanhVien = 66.67.
      // Sum = 116.67 + 116.67 + 66.67 = 300.01. Delta = -0.01.
      // Adjustment is applied to the member since it's the last member.
      assert.strictEqual(result.length, 3);
      
      const intAuthor = result.find(p => p.nhanvienId === 1);
      const extAuthor = result.find(p => p.tenNgoai === 'External Author');
      const extMember = result.find(p => p.tenNgoai === 'External Member');
      
      assert.strictEqual(intAuthor.soTiet, 116.67);
      assert.strictEqual(extAuthor.soTiet, 116.67);
      assert.strictEqual(extMember.soTiet, 66.66); // adjusted from 66.67 by -0.01
    });
  });

  await t.test('6. buildParticipantsWithEqualHours tests', async (t) => {
    await t.test('Should throw error on empty list', () => {
      assert.throws(() => buildParticipantsWithEqualHours(100, [], []), /Danh sách người tham gia không được rỗng/);
    });

    await t.test('Should divide and adjust delta', () => {
      // T = 100, 3 participants. 100 / 3 = 33.33. Sum = 99.99. Delta = 0.01.
      // Last participant gets adjusted to 33.34.
      const result = buildParticipantsWithEqualHours(100, [1, 2], [3]);
      assert.strictEqual(result.length, 3);
      assert.strictEqual(result[0].soTiet, 33.33);
      assert.strictEqual(result[1].soTiet, 33.33);
      assert.strictEqual(result[2].soTiet, 33.34); // Adjusted
    });
  });

  await t.test('7. buildParticipantsWithFixedHours tests', async (t) => {
    await t.test('Should throw error if not exactly 1 participant', () => {
      assert.throws(() => buildParticipantsWithFixedHours(100, [1, 2]), /Loại này chỉ cho phép đúng 1 thành viên hội đồng mỗi bản ghi/);
      assert.throws(() => buildParticipantsWithFixedHours(100, []), /Loại này chỉ cho phép đúng 1 thành viên hội đồng mỗi bản ghi/);
    });

    await t.test('Should return single participant with fixed hours', () => {
      const result = buildParticipantsWithFixedHours(100, [1]);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].nhanvienId, 1);
      assert.strictEqual(result[0].soTiet, 100);
    });
  });

  await t.test('8. buildParticipantsByMode dispatcher tests', () => {
    // Mode "equal"
    const equalRes = buildParticipantsByMode('equal', 100, [1, 2], [3]);
    assert.strictEqual(equalRes.length, 3);
    assert.strictEqual(equalRes[0].soTiet, 33.33);

    // Mode "fixed"
    const fixedRes = buildParticipantsByMode('fixed', 100, [1]);
    assert.strictEqual(fixedRes.length, 1);
    assert.strictEqual(fixedRes[0].soTiet, 100);

    // Mode default (standard)
    const stdRes = buildParticipantsByMode('standard', 300, [1], [2]);
    assert.strictEqual(stdRes.length, 2);
    assert.strictEqual(stdRes[0].soTiet, 200);
    assert.strictEqual(stdRes[1].soTiet, 100);
  });
});
