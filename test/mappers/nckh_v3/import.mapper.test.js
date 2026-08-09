const { mapRow } = require('../../../src/mappers/nckh_v3/import.mapper');

describe('NCKH Import Mapper', () => {
  
  describe('Error handling', () => {
    it('should throw an error for unsupported NCKH type', () => {
      expect(() => {
        mapRow('unsupported-type', {});
      }).toThrow('Loại NCKH "unsupported-type" không được hỗ trợ import.');
    });
  });

  describe('bai-bao-khoa-hoc mapper', () => {
    it('should correctly parse authors, corresponding authors and dates', () => {
      const rawRow = {
        "Tên bài": "Nghiên cứu AI",
        "Phân loại": "Tạp chí quốc tế",
        "Tác giả chính": "Nguyễn Văn A, Trần Văn B",
        "Thành viên ": "Lê Văn C; Phạm Thị D\nHoàng Văn E",
        "Tác giả liên hệ": "Trần Văn B",
        "Năm công bố": "2024",
        "Ngày nghiệm thu": "25/12/2023",
        "Tổng số tiết": "150.5"
      };

      const result = mapRow('bai-bao-khoa-hoc', rawRow);

      // Check chung properties
      expect(result.chung.tenCongTrinh).toBe("Nghiên cứu AI");
      expect(result.chung.loaiNckh).toBe("BAIBAO");
      expect(result.chung.phanLoai).toBe("Tạp chí quốc tế");
      expect(result.chung.tongSoTiet).toBe(150.5);
      expect(result.chung.ngayNghiemThu).toBe("2023-12-25");
      expect(result.namThucHien).toBe(2024);

      // Check participants logic (Tác giả liên hệ should be extracted and removed from others)
      expect(result.participants.tacGiaLienHeNames).toEqual(["Trần Văn B"]);
      
      // Tác giả chính "Nguyễn Văn A, Trần Văn B" -> Trần Văn B is Corresponding, so A is the only main author left
      expect(result.participants.tacGiaNames).toEqual(["Nguyễn Văn A"]);
      
      // Thành viên "Lê Văn C; Phạm Thị D\nHoàng Văn E" -> 3 members split by semicolon and newline
      expect(result.participants.thanhVienNames).toEqual(["Lê Văn C", "Phạm Thị D", "Hoàng Văn E"]);
    });

    it('should gracefully handle empty or missing fields', () => {
      const rawRow = {};
      const result = mapRow('bai-bao-khoa-hoc', rawRow);
      
      expect(result.chung.tenCongTrinh).toBe("");
      expect(result.chung.tongSoTiet).toBe(0);
      expect(result.participants.tacGiaNames).toEqual([]);
      expect(result.participants.thanhVienNames).toEqual([]);
      expect(result.participants.tacGiaLienHeNames).toEqual([]);
      expect(result.namThucHien).toBe(1);
    });
  });

  describe('huong-dan-sv-nckh mapper', () => {
    it('should correctly parse internal and external (student) participants', () => {
      const rawRow = {
        "Tên đề tài": "Hệ thống quản lý",
        "Lớp": "D19CQCN01-N",
        "Trưởng nhóm thực hiện": "Sinh Viên A",
        "Các thành viên khác": "Sinh Viên B; Sinh Viên C",
        "Cán bộ hướng dẫn": "Giảng Viên X, Giảng Viên Y, Giảng Viên Z",
        "Ngày quyết định": "2023-10-15"
      };

      const result = mapRow('huong-dan-sv-nckh', rawRow);

      // Check chung
      expect(result.chung.tenCongTrinh).toBe("Hệ thống quản lý");
      expect(result.chung.ngayQuyetDinh).toBe("2023-10-15");

      // Check students (ngoaiList)
      expect(result.participants.ngoaiList).toHaveLength(3);
      expect(result.participants.ngoaiList[0]).toEqual({ ten: "Sinh Viên A", donVi: "D19CQCN01-N", vaiTro: "thanh_vien" });
      expect(result.participants.ngoaiList[1]).toEqual({ ten: "Sinh Viên B", donVi: "D19CQCN01-N", vaiTro: "thanh_vien" });
      expect(result.participants.ngoaiList[2]).toEqual({ ten: "Sinh Viên C", donVi: "D19CQCN01-N", vaiTro: "thanh_vien" });

      // Check teachers (first is tacGia, rest are thanhVien)
      expect(result.participants.tacGiaNames).toEqual(["Giảng Viên X"]);
      expect(result.participants.thanhVienNames).toEqual(["Giảng Viên Y", "Giảng Viên Z"]);
    });
  });

  describe('Date parsing scenarios', () => {
    it('should parse Excel serial dates', () => {
      const result = mapRow('de-tai-du-an', { "Ngày quyết định": "45291" }); // Approx Jan 2024
      expect(result.chung.ngayQuyetDinh).toMatch(/^\d{4}-\d{2}-\d{2}$/); 
    });

    it('should parse DD/MM/YYYY', () => {
      const result = mapRow('de-tai-du-an', { "Ngày quyết định": "05/09/2023" });
      expect(result.chung.ngayQuyetDinh).toBe("2023-09-05");
    });

    it('should parse MM/YYYY', () => {
      const result = mapRow('de-tai-du-an', { "Ngày quyết định": "11/2024" });
      expect(result.chung.ngayQuyetDinh).toBe("2024-11-01"); // defaults to 1st of month
    });

    it('should parse YYYY', () => {
      const result = mapRow('de-tai-du-an', { "Ngày quyết định": "2025" });
      expect(result.chung.ngayQuyetDinh).toBe("2025-01-01"); 
    });
  });

});
