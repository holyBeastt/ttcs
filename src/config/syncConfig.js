/**
 * Sync Configuration
 * Defines sync rules for each table including natural keys and export strategies
 * 
 * Table Types:
 * - 'master': Danh mục chính (phongban, bomon, namhoc, etc.)
 * - 'business': Bảng nghiệp vụ chính (giangday, quychuan, doantotnghiep, etc.)
 * - 'employee': Liên quan tài khoản nhân viên
 * - 'teacher': Giảng viên mời
 * - 'research': Nghiên cứu khoa học (NCKH)
 * - 'salary': Tiền lương, miễn giảm
 */

module.exports = {
    // ============================================
    // MASTER DATA - Danh mục cơ bản
    // ============================================

    phongban: {
        type: 'master',
        description: 'Phòng ban/Khoa',
        uniqueKey: ['MaPhongBan'],
    },

    bomon: {
        type: 'master',
        description: 'Bộ môn',
        uniqueKey: ['MaPhongBan', 'MaBoMon'],
    },

    namhoc: {
        type: 'master',
        description: 'Năm học',
        uniqueKey: ['NamHoc'],
    },

    kitubatdau: {
        type: 'master',
        description: 'Ký tự bắt đầu hệ đào tạo',
        uniqueKey: ['viet_tat'],
    },

    kitubatdau_khoa: {
        type: 'master',
        description: 'Ký tự bắt đầu khoa',
        uniqueKey: ['viet_tat'],
    },

    chuc_danh_nghe_nghiep: {
        type: 'master',
        description: 'Danh mục chức danh nghề nghiệp',
        uniqueKey: ['chuc_danh'],
    },

    he_dao_tao: {
        type: 'master',
        description: 'Hệ đào tạo',
        uniqueKey: ['he_dao_tao', 'loai_hinh'],
    },

    he_so_lop_dong: {
        type: 'master',
        description: 'Hệ số lớp đông',
        uniqueKey: ['student_quantity'],
    },

    khoa_sinh_vien: {
        type: 'master',
        description: 'Khóa sinh viên',
        uniqueKey: ['phongban_id'],
    },

    sotietdoan: {
        type: 'master',
        description: 'Số tiết đồ án theo hệ',
        uniqueKey: ['he_dao_tao'],
    },

    // ============================================
    // ACCOUNT & EMPLOYEE - Tài khoản và nhân viên
    // ============================================

    nhanvien: {
        type: 'employee',
        description: 'Nhân viên - synced với taikhoannguoidung',
        exportQuery: `
            SELECT n.*, 
                   t.TenDangNhap as tendangnhap,
                   t.MatKhau as matkhau
            FROM nhanvien n
            LEFT JOIN taikhoannguoidung t ON n.id_User = t.id_User
            WHERE n.id_User IS NOT NULL
        `,
        uniqueKey: ['id_User'],
        secondaryKey: ['TenDangNhap'],
    },

    taikhoannguoidung: {
        type: 'employee',
        description: 'Tài khoản người dùng',
        uniqueKey: ['TenDangNhap'],
    },

    role: {
        type: 'employee',
        description: 'Phân quyền người dùng',
        uniqueKey: ['TenDangNhap'],
    },

    // ============================================
    // TEACHER - Giảng viên mời
    // ============================================

    gvmoi: {
        type: 'teacher',
        description: 'Giảng viên mời',
        uniqueKey: ['CCCD'],
    },

    // ============================================
    // BUSINESS - Nghiệp vụ giảng dạy chính
    // ============================================

    // course_schedule_details: {
    //     type: 'business',
    //     description: 'Thời khóa biểu chi tiết',
    //     uniqueKey: ['dot', 'ki_hoc', 'nam_hoc', 'tt', 'course_name'],
    // },

    giangday: {
        type: 'business',
        description: 'Phân công giảng dạy',
        uniqueKey: ['Dot', 'HocKy', 'NamHoc', 'TenHocPhan', 'Lop'],
    },

    quychuan: {
        type: 'business',
        description: 'Quy chuẩn giảng dạy',
        uniqueKey: ['Dot', 'KiHoc', 'NamHoc', 'LopHocPhan', 'TenLop'],
    },

    quy_chuan_edit_requests: {
        type: 'business',
        description: 'Yêu cầu sửa quy chuẩn',
        uniqueKey: ['dot', 'ki_hoc', 'nam_hoc', 'lop_hoc_phan', 'ten_lop'],
    },

    ketthuchocphan: {
        type: 'business',
        description: 'Kết thúc học phần',
        uniqueKey: ['ki', 'namhoc', 'tenhocphan', 'lophocphan'],
    },

    giuaky: {
        type: 'business',
        description: 'Thi giữa kỳ',
        uniqueKey: ['HocKy', 'NamHoc', 'TenHocPhan', 'Lop'],
    },

    doantotnghiep: {
        type: 'business',
        description: 'Đồ án tốt nghiệp',
        uniqueKey: ['Dot', 'Ki', 'NamHoc', 'TenDeTai', 'KhoaDaoTao', 'SinhVien'],
    },

    phonghoc: {
        type: 'business',
        description: 'Phòng học',
        uniqueKey: ['phong', 'toanha'],
    },

    toanha: {
        type: 'business',
        description: 'Tòa nhà',
        uniqueKey: ['TenToaNha'],
    },

    // ============================================
    // RESEARCH - Nghiên cứu khoa học (NCKH)
    // ============================================

    // baibaokhoahoc: {
    //     type: 'research',
    //     description: 'Bài báo khoa học',
    //     uniqueKey: ['NamHoc', 'TenBaiBao'],
    // },

    // bangsangchevagiaithuong: {
    //     type: 'research',
    //     description: 'Bằng sáng chế và giải thưởng',
    //     uniqueKey: ['NamHoc', 'TenBangSangCheVaGiaiThuong'],
    // },

    // biensoangiaotrinhbaigiang: {
    //     type: 'research',
    //     description: 'Biên soạn giáo trình bài giảng',
    //     uniqueKey: ['NamHoc', 'TenGiaoTrinhVaBaiGiang'],
    // },

    // detaiduan: {
    //     type: 'research',
    //     description: 'Đề tài dự án nghiên cứu',
    //     uniqueKey: ['NamHoc', 'TenDeTai', 'MaSoDeTai'],
    // },

    // dexuatnghiencuu: {
    //     type: 'research',
    //     description: 'Đề xuất nghiên cứu',
    //     uniqueKey: ['NamHoc', 'TenDeXuat', 'MaSoDeXuat'],
    // },

    // huongdansvnckh: {
    //     type: 'research',
    //     description: 'Hướng dẫn sinh viên NCKH',
    //     uniqueKey: ['NamHoc', 'LoaiHuongDan', 'TenDeTai', 'MaSoDeTai'],
    // },

    // nckhvahuanluyendoituyen: {
    //     type: 'research',
    //     description: 'NCKH và huấn luyện đội tuyển',
    //     uniqueKey: ['NamHoc', 'TenDeTai'],
    // },

    // nhiemvukhoahoccongnghe: {
    //     type: 'research',
    //     description: 'Nhiệm vụ khoa học công nghệ',
    //     uniqueKey: ['NamHoc', 'TenNhiemVu', 'MaNhiemVu'],
    // },

    // sachvagiaotrinh: {
    //     type: 'research',
    //     description: 'Sách và giáo trình',
    //     uniqueKey: ['NamHoc', 'TenSachVaGiaoTrinh', 'TacGia'],
    // },

    // sangkien: {
    //     type: 'research',
    //     description: 'Sáng kiến cải tiến',
    //     uniqueKey: ['NamHoc', 'TenSangKien', 'MaSoSangKien'],
    // },

    // thanhvienhoidong: {
    //     type: 'research',
    //     description: 'Thành viên hội đồng',
    //     uniqueKey: ['NamHoc', 'TenDeTai', 'ThanhVien'],
    // },

    // uncngoai: {
    //     type: 'research',
    //     description: 'Ủy nhiệm chi ngoài',
    //     uniqueKey: ['stk'],
    // },

    // xaydungctdt: {
    //     type: 'research',
    //     description: 'Xây dựng chương trình đào tạo',
    //     uniqueKey: ['NamHoc', 'TenChuongTrinh'],
    // },

    // sotietnckhbaoluusangnam: {
    //     type: 'research',
    //     description: 'Số tiết NCKH bảo lưu sang năm',
    //     uniqueKey: ['NamHoc', 'Khoa', 'GiangVien'],
    // },

    // ============================================
    // SALARY - Tiền lương và miễn giảm
    // ============================================

    tienluong: {
        type: 'salary',
        description: 'Tiền lương giảng viên',
        uniqueKey: ['he_dao_tao', 'HocVi', 'SoTien', 'Khoa', 'HSL', 'chuc_danh_id', 'loai_hinh'],
    },

    phantrammiengiam: {
        type: 'salary',
        description: 'Phần trăm miễn giảm',
        uniqueKey: ['LyDo', 'PhanTramMienGiam'],
    },

    // ============================================
    // TEMPORARY - Bảng tạm thời
    // ============================================

    tam: {
        type: 'temporary',
        description: 'Bảng dữ liệu tạm',
        uniqueKey: ['Dot', 'Ki', 'Nam', 'LopHocPhan'],
    },
};

