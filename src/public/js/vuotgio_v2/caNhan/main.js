/**
 * Frontend script cho trang Vượt giờ cá nhân
 */

const getInitParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        idUser: urlParams.get('idUser') || document.getElementById('initIdUser').value,
        namHoc: urlParams.get('namHoc') || document.getElementById('initNamHoc').value
    };
};

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[caNhan] DOMContentLoaded');
    const { idUser, namHoc } = getInitParams();
    
    await loadNamHocOptions(namHoc);

    if (idUser) {
        await loadData();
    } else {
        showError('Không tìm thấy thông tin giảng viên để hiển thị. Vui lòng đăng nhập lại.');
    }
});

async function loadNamHocOptions(selectedNamHoc) {
    try {
        const response = await fetch('/api/namhoc');
        const result = await response.json();
        const select = document.getElementById('namHocFilter');
        
        if (result && result.length > 0) {
            select.innerHTML = '';
            result.forEach((item, index) => {
                const option = document.createElement('option');
                option.value = item.NamHoc;
                option.textContent = item.NamHoc;
                
                if (selectedNamHoc && item.NamHoc === selectedNamHoc) {
                    option.selected = true;
                } else if (!selectedNamHoc && (item.trangthai === 1 || (index === 0 && !result.some(i => i.trangthai === 1)))) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">(Không có dữ liệu)</option>';
        }
    } catch (error) {
        console.error('Error loading nam hoc:', error);
    }
}

function showError(msg) {
    const errorBox = document.getElementById('errorBox');
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
    document.getElementById('contentWrapper').style.display = 'none';
}

function hideError() {
    document.getElementById('errorBox').style.display = 'none';
}

async function loadData() {
    const { idUser } = getInitParams();
    const namHoc = document.getElementById('namHocFilter').value;
    
    if (!idUser || !namHoc) return;
    
    hideError();
    document.getElementById('loading').style.display = 'block';
    document.getElementById('contentWrapper').style.display = 'none';
    
    try {
        const response = await fetch(`/v2/vuotgio/tong-hop/data-chuan/${encodeURIComponent(idUser)}?namHoc=${encodeURIComponent(namHoc)}`);
        const result = await response.json();
        
        if (!result.success) {
            showError(result.message || 'Lỗi khi tải dữ liệu');
            return;
        }
        
        renderData(result.data);
        
        document.getElementById('contentWrapper').style.display = 'block';
    } catch (error) {
        console.error('Load data error:', error);
        showError('Lỗi kết nối tới máy chủ');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function formatNumber(num) {
    return Number(num || 0).toFixed(2);
}

// ==============================
// LOGIC CLASSIFY HỆ ĐÀO TẠO
// ==============================
const classifyHeDaoTao = (tenHeDaoTao) => {
    const name = String(tenHeDaoTao || "").toLowerCase();
    const isMatMa = name.includes("mật mã");

    let vungMien = "viet_nam";
    if (name.includes("lào")) vungMien = "lao";
    else if (name.includes("campuchia")) vungMien = "campuchia";
    else if (name.includes("cuba")) vungMien = "cuba";

    return { isMatMa, vungMien };
};

const getCategoryKey = (tenHeDaoTao) => {
    const { isMatMa, vungMien } = classifyHeDaoTao(tenHeDaoTao);
    if (!isMatMa) return "dongHP";
    const map = { viet_nam: "vn", lao: "lao", cuba: "cuba", campuchia: "cpc" };
    return map[vungMien] || "vn";
};

const CATEGORY_LABELS = {
    vn: "Việt Nam",
    lao: "Lào",
    cuba: "Cuba",
    cpc: "Campuchia",
    dongHP: "Đóng học phí",
};

const normalizeDoiTuongLabel = (tenHeDaoTao) => CATEGORY_LABELS[getCategoryKey(tenHeDaoTao)] || tenHeDaoTao;

const toNum = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(typeof v === "string" ? v.replace(",", ".") : v);
  return Number.isFinite(n) ? n : 0;
};

const normDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// ==============================
// TABLE GENERATOR BUILDERS
// ==============================
function renderTableBlock(title, headers, rows, totalValue, totalLabel) {
    let theadHtml = headers.map(h => `<th class="text-center">${h}</th>`).join('');
    
    let tbodyHtml = '';
    if (!rows || rows.length === 0) {
        tbodyHtml = `<tr><td colspan="${headers.length}" class="text-center empty-state">Không có dữ liệu</td></tr>`;
    } else {
        rows.forEach((r, idx) => {
            let rowHtml = `<td class="text-center">${idx + 1}</td>`;
            r.cells.slice(1).forEach((val, cIdx) => {
                let isNum = typeof val === 'number' && headers[cIdx+1].toLowerCase().includes('số');
                if(headers[cIdx+1] === "Quy chuẩn" || headers[cIdx+1] === "Số tiết quy đổi" || headers[cIdx+1] === "Số giờ quy đổi" || headers[cIdx+1] === "Số tiết ra đề/ Coi thi/ Chấm thi" || headers[cIdx+1] === "Số tiết theo TKB") {
                     rowHtml += `<td class="text-end">${formatNumber(val)}</td>`;
                } else if(typeof val === 'number') {
                     rowHtml += `<td class="text-center">${val}</td>`;
                } else {
                     rowHtml += `<td>${val || ''}</td>`;
                }
            });
            tbodyHtml += `<tr>${rowHtml}</tr>`;
        });
    }

    let tfootHtml = '';
    if (totalLabel) {
        tfootHtml = `
            <tr>
                <td colspan="${headers.length - 1}" class="text-end">${totalLabel}</td>
                <td class="text-end">${formatNumber(totalValue)}</td>
            </tr>
        `;
    }

    return `
        <p class="table-block-title">${title}</p>
        <div class="table-responsive">
            <table class="table table-bordered table-sm table-custom table-hover">
                <thead><tr>${theadHtml}</tr></thead>
                <tbody>${tbodyHtml}</tbody>
                ${tfootHtml ? `<tfoot>${tfootHtml}</tfoot>` : ''}
            </table>
        </div>
    `;
}

// GROUP A
function buildGroupA(data) {
    const rawGiangDay = [...(data.raw?.giangDay || []), ...(data.raw?.lopNgoaiQC || [])];
    const rawKthp = data.raw?.kthp || [];

    const filterA1 = (hk, isMM) => rawGiangDay.filter(r => {
        const hkVal = Number(r.HocKy ?? r.hoc_ky ?? 1);
        const { isMatMa } = classifyHeDaoTao(r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || "");
        return hkVal === hk && isMatMa === isMM;
    });

    const mapA1 = (r) => ({
        cells: [
            0,
            r.TenHocPhan || r.ten_hoc_phan || "",
            toNum(r.SoTC ?? r.so_tc),
            r.Lop || r.lop || r.ten_lop || r.lop_hoc_phan || "",
            normalizeDoiTuongLabel(r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || ""),
            toNum(r.SoTietCTDT ?? r.so_tiet_ctdt ?? r.SoTiet ?? r.so_tiet ?? r.ll),
            toNum(r.QuyChuan ?? r.quy_chuan),
        ]
    });

    const filterA2 = (hk, isMM) => rawKthp.filter(r => {
        const hkVal = Number(r.hoc_ky ?? r.HocKy ?? 1);
        const { isMatMa } = classifyHeDaoTao(r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || "");
        return hkVal === hk && isMatMa === isMM;
    });

    const mapA2 = (r) => ({
        cells: [
            0,
            r.ten_hoc_phan || r.TenHocPhan || "",
            r.hinh_thuc || r.HinhThuc || "",
            r.lop_hoc_phan || r.Lop || r.ten_lop || "",
            normalizeDoiTuongLabel(r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || ""),
            toNum(r.so_sv ?? r.tong_so ?? r.SoSV),
            toNum(r.quy_chuan ?? r.QuyChuan),
        ]
    });

    const headersA1 = ["TT", "Tên học phần", "Số TC (HT)", "Lớp học phần", "Đối tượng", "Số tiết theo TKB", "Số tiết QC"];
    const headersA2 = ["TT", "Tên học phần", "Ra đề/ Coi thi/ Chấm thi kết thúc học phần", "Lớp học phần", "Đối tượng", "Số sinh viên của lớp", "Số tiết ra đề/ Coi thi/ Chấm thi"];

    let html = '<h5 class="section-title st-a"><i class="fas fa-chalkboard-teacher me-2"></i> A. GIẢNG DẠY VÀ ĐÁNH GIÁ HỌC PHẦN <small>(không thống kê số giờ đã được thanh toán)</small></h5>';
    let totalA1 = 0, totalA2 = 0;

    // A1
    html += '<h6 class="subsection-title">A.1. Giảng dạy</h6>';
    const a1Configs = [
        { title: "Học kỳ I - Đào tạo chuyên ngành Kỹ thuật mật mã (ghi rõ đối tượng cho từng lớp)", hk: 1, isMM: true, num: 1 },
        { title: "Học kỳ I - Đào tạo hệ đóng học phí (ghi rõ đối tượng cho từng lớp)", hk: 1, isMM: false, num: 2 },
        { title: "Học kỳ II - Đào tạo chuyên ngành Kỹ thuật mật mã (ghi rõ đối tượng cho từng lớp)", hk: 2, isMM: true, num: 3 },
        { title: "Học kỳ II - Đào tạo hệ đóng học phí (ghi rõ đối tượng cho từng lớp)", hk: 2, isMM: false, num: 4 },
    ];
    a1Configs.forEach(cfg => {
        const rows = filterA1(cfg.hk, cfg.isMM).map(mapA1);
        const subTotal = rows.reduce((sum, r) => sum + r.cells[6], 0);
        totalA1 += subTotal;
        html += renderTableBlock(cfg.title, headersA1, rows, subTotal, `Tổng cộng (${cfg.num}):`);
    });
    html += `<div class="group-total-banner ban-a">Tổng A.1 = (1) + (2) + (3) + (4) <span class="total-value">${formatNumber(totalA1)}</span></div>`;

    // A2
    html += '<h6 class="subsection-title">A.2. Đánh giá kết thúc học phần <small>(theo tổng hợp của phòng Khảo thí và đảm bảo chất lượng)</small></h6>';
    const a2Configs = [
        { title: "Học kỳ I - Đào tạo chuyên ngành Kỹ thuật mật mã (ghi rõ đối tượng cho từng lớp)", hk: 1, isMM: true, num: 5 },
        { title: "Học kỳ I - Đào tạo hệ đóng học phí (ghi rõ đối tượng cho từng lớp)", hk: 1, isMM: false, num: 6 },
        { title: "Học kỳ II - Đào tạo chuyên ngành Kỹ thuật mật mã (ghi rõ đối tượng cho từng lớp)", hk: 2, isMM: true, num: 7 },
        { title: "Học kỳ II - Đào tạo hệ đóng học phí (ghi rõ đối tượng cho từng lớp)", hk: 2, isMM: false, num: 8 },
    ];
    a2Configs.forEach(cfg => {
        const rows = filterA2(cfg.hk, cfg.isMM).map(mapA2);
        const subTotal = rows.reduce((sum, r) => sum + r.cells[6], 0);
        totalA2 += subTotal;
        html += renderTableBlock(cfg.title, headersA2, rows, subTotal, `Tổng cộng (${cfg.num}):`);
    });
    html += `<div class="group-total-banner ban-a">Tổng A.2 = (5) + (6) + (7) + (8) <span class="total-value">${formatNumber(totalA2)}</span></div>`;
    html += `<div class="group-total-banner ban-a ban-main">TỔNG A = A.1 + A.2 <span class="total-value">${formatNumber(totalA1 + totalA2)}</span></div>`;
    return html;
}

// GROUP B
function buildGroupB(data) {
    const rawDoAn = data.raw?.doAn || [];
    const bFilterMatMa = (vm) => (r) => {
        const c = classifyHeDaoTao(r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || r.doi_tuong || r.DoiTuong || "");
        return c.isMatMa && c.vungMien === vm;
    };
    const bFilterDongHP = (r) => !classifyHeDaoTao(r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || r.doi_tuong || r.DoiTuong || "").isMatMa;
    
    const mapB = (r) => ({
        cells: [
            0,
            r.TenSinhVien || r.SinhVien || r.ten_sinh_vien || "",
            r.Khoa || r.khoa_sinh_vien || "",
            r.SoQD || r.so_quyet_dinh || "",
            toNum(r.SoNguoi ?? r.so_nguoi),
            r.loai_huong_dan || (r.isHdChinh ? "HD Chính" : "HD Phụ"),
            toNum(r.SoTiet ?? r.so_tiet),
        ]
    });

    const headersB = ["TT", "Họ tên NCS, Học viên, Sinh viên", "Khóa đào tạo", "Số QĐ Giao Luận án, Luận văn, đồ án", "Số người HD", "HD chính/ HD hai", "Số tiết quy đổi"];
    let html = '<h5 class="section-title st-b"><i class="fas fa-user-graduate me-2"></i> B. HƯỚNG DẪN LUẬN ÁN, LUẬN VĂN, ĐỒ ÁN TỐT NGHIỆP</h5>';
    let totalB = 0;

    const bConfigs = [
        { title: "B.1. Hướng dẫn cho sinh viên Mật mã đối tượng Việt Nam", filterFn: bFilterMatMa("viet_nam"), label: "TỔNG B.1:" },
        { title: "B.2. Hướng dẫn cho sinh viên Mật mã đối tượng Lào", filterFn: bFilterMatMa("lao"), label: "TỔNG B.2:" },
        { title: "B.3. Hướng dẫn cho sinh viên Mật mã đối tượng Cuba", filterFn: bFilterMatMa("cuba"), label: "TỔNG B.3:" },
        { title: "B.4. Hướng dẫn cho sinh viên Mật mã đối tượng Campuchia", filterFn: bFilterMatMa("campuchia"), label: "TỔNG B.4:" },
        { title: "B.5. Hướng dẫn cho sinh viên hệ đóng học phí", filterFn: bFilterDongHP, label: "TỔNG B.5:" },
    ];

    bConfigs.forEach(cfg => {
        const rows = rawDoAn.filter(cfg.filterFn).map(mapB);
        const subTotal = rows.reduce((sum, r) => sum + r.cells[6], 0);
        totalB += subTotal;
        html += renderTableBlock(cfg.title, headersB, rows, subTotal, cfg.label);
    });

    html += `<div class="group-total-banner ban-b ban-main">TỔNG B = B.1 + B.2 + B.3 + B.4 + B.5 <span class="total-value">${formatNumber(totalB)}</span></div>`;
    return html;
}

// GROUP C
function buildGroupC(data) {
    const rawThamQuan = data.raw?.huongDanThamQuan || data.raw?.hdtq || [];
    const cFilterMatMa = (vm) => (r) => {
        const c = classifyHeDaoTao(r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || "");
        return c.isMatMa && c.vungMien === vm;
    };
    const cFilterDongHP = (r) => !classifyHeDaoTao(r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || "").isMatMa;
    
    const mapC = (r) => ({
        cells: [
            0,
            r.mo_ta_hoat_dong || "",
            r.nganh_hoc || "",
            r.theo_qd || "",
            toNum(r.so_ngay),
            toNum(r.so_ngay),
            toNum(r.so_tiet_quy_doi),
        ]
    });

    const headersC = ["TT", "Mô tả hoạt động", "Khóa đào tạo", "Theo QĐ", "Số ngày", "Số ngày", "Số tiết quy đổi"];
    let html = '<h5 class="section-title st-c"><i class="fas fa-bus me-2"></i> C. HƯỚNG DẪN THAM QUAN THỰC TẾ CỦA HỌC VIÊN, SINH VIÊN</h5>';
    let totalC = 0;

    const cConfigs = [
        { title: "C.1. Hướng dẫn cho sinh viên Mật mã đối tượng Việt Nam", filterFn: cFilterMatMa("viet_nam"), label: "TỔNG C.1:" },
        { title: "C.2. Hướng dẫn cho sinh viên Mật mã đối tượng Lào", filterFn: cFilterMatMa("lao"), label: "TỔNG C.2:" },
        { title: "C.3. Hướng dẫn cho sinh viên Mật mã đối tượng Cuba", filterFn: cFilterMatMa("cuba"), label: "TỔNG C.3:" },
        { title: "C.4. Hướng dẫn cho sinh viên Mật mã đối tượng Campuchia", filterFn: cFilterMatMa("campuchia"), label: "TỔNG C.4:" },
        { title: "C.5. Hướng dẫn cho sinh viên Đóng học phí", filterFn: cFilterDongHP, label: "TỔNG C.5:" },
    ];

    cConfigs.forEach(cfg => {
        const rows = rawThamQuan.filter(cfg.filterFn).map(mapC);
        const subTotal = rows.reduce((sum, r) => sum + r.cells[6], 0);
        totalC += subTotal;
        html += renderTableBlock(cfg.title, headersC, rows, subTotal, cfg.label);
    });

    html += `<div class="group-total-banner ban-c ban-main">TỔNG C = C.1 + C.2 + C.3 + C.4 + C.5 <span class="total-value">${formatNumber(totalC)}</span></div>`;
    return html;
}

// GROUP D
function buildGroupD(data) {
    const rawNCKH = data.raw?.nckhRecords || [];
    
    const NCKH_BUCKET_MAP = {
        "de-tai-du-an": "D1", "sang-kien": "D2", "giai-thuong": "D3", "de-xuat-nghien-cuu": "D4",
        "sach-giao-trinh": "D5", "bai-bao-khoa-hoc": "D6", "huong-dan-sv-nckh": "D7", "thanh-vien-hoi-dong": "D8",
    };

    const filterD = (bucketKey) => {
        if (bucketKey === "D9") return rawNCKH.filter(r => !NCKH_BUCKET_MAP[String(r.typeSlug || "").trim()]);
        const slugs = Object.entries(NCKH_BUCKET_MAP).filter(([, v]) => v === bucketKey).map(([k]) => k);
        return rawNCKH.filter(r => slugs.includes(String(r.typeSlug || "").trim()));
    };

    const countAuthors = (r) => {
        const c1 = r.tacGiaChinh ? r.tacGiaChinh.split(",").filter((s) => s.trim()).length : 0;
        const c2 = r.thanhVien ? r.thanhVien.split(",").filter((s) => s.trim()).length : 0;
        return c1 + c2;
    };

    const mapD = (bucketKey, r) => {
        const base = {
            ten: r.tenCongTrinh || "", vaiTro: r.vaiTroGiangVien || "", phanLoai: r.phanLoai || "",
            ngay: normDate(r.ngayNghiemThu || ""), xepLoai: r.xepLoai || "", maSo: r.maSo || "",
            soNguoi: countAuthors(r), soTiet: toNum(r.soTietGiangVien),
        };
        const cellsByBucket = {
            D1: [0, base.ten, base.vaiTro, base.phanLoai, base.ngay, base.xepLoai, base.soTiet],
            D2: [0, base.ten, base.vaiTro, base.phanLoai, base.ngay, base.xepLoai, base.soTiet],
            D3: [0, base.ten, base.ten, base.ngay, base.soNguoi, base.vaiTro, base.soTiet],
            D4: [0, base.ten, base.vaiTro, base.phanLoai, base.ngay, base.xepLoai, base.soTiet],
            D5: [0, base.ten, base.maSo, "", base.soNguoi, base.vaiTro, base.soTiet],
            D6: [0, base.ten, base.phanLoai, base.maSo, base.soNguoi, base.vaiTro, base.soTiet],
            D7: [0, base.ten, base.maSo, base.ngay, base.phanLoai, base.phanLoai, base.soTiet],
            D8: [0, base.ten, base.phanLoai, base.phanLoai, base.vaiTro, base.maSo, base.soTiet],
            D9: [0, base.ten, base.maSo, "", base.phanLoai, base.phanLoai, base.soTiet],
        };
        return { cells: cellsByBucket[bucketKey] || cellsByBucket.D9 };
    };

    const headersList = {
        D1: ["TT", "Tên đề tài, dự án (mã số đề tài, dự án)", "Chủ trì/ thành viên", "Cấp đề tài", "Ngày nghiệm thu", "Kết quả xếp loại", "Số giờ quy đổi"],
        D2: ["TT", "Tên sáng kiến (mã số sáng kiến nếu có)", "Chủ trì/ thành viên", "Sáng kiến", "Ngày nghiệm thu", "Kết quả xếp loại", "Số giờ quy đổi"],
        D3: ["TT", "Tên giải pháp khoa học, giải thưởng; Bằng sáng chế", "Số QĐ công nhận", "Ngày QĐ công nhận", "Số người", "Tác giả chính/ thành viên", "Số giờ quy đổi"],
        D4: ["TT", "Tên đề xuất (mã số nếu có)", "Chủ trì/ thành viên", "Cấp quốc gia, quốc tế; cấp Bộ và tương đương; cấp cơ sở", "Ngày nghiệm thu", "Kết quả xếp loại", "Số giờ quy đổi"],
        D5: ["TT", "Tên sách, giáo trình", "Số xuất bản", "Số trang", "Số người", "Tác giả chính/ thành viên", "Số giờ quy đổi"],
        D6: ["TT", "Tên bài báo", "Loại tạp chí/ hội nghị", "Chỉ số tạp chí/ hội nghị", "Số người", "Tác giả chính/ thành viên", "Số giờ quy đổi"],
        D7: ["TT", "Tên đề tài", "Số QĐ giao nhiệm vụ", "Ngày ký QĐ giao nhiệm vụ", "Kết quả bảo vệ cấp Khoa", "Kết quả bảo vệ cấp Học viện", "Số giờ quy đổi"],
        D8: ["TT", "Tên hội đồng khoa học", "Hội đồng cấp", "", "Chức danh (chủ tịch, phản biện, ủy viên)", "Số QĐ giao nhiệm vụ, ngày ký QĐ", "Số giờ quy đổi"],
        D9: ["TT", "Tên nhiệm vụ", "Số QĐ giao nhiệm vụ", "Ngày kí QĐ", "Nhiệm vụ được phân công theo quyết định", "", "Số giờ quy đổi"],
    };

    let html = '<h5 class="section-title st-d"><i class="fas fa-microscope me-2"></i> D. NGHIÊN CỨU KHOA HỌC</h5>';
    let totalD = 0;

    const dConfigs = [
        { title: "D.1 Đề tài, dự án", key: "D1" },
        { title: "D.2 Sáng kiến", key: "D2" },
        { title: "D.3 Giải thưởng khoa học và công nghệ; Bằng sáng chế, giải pháp hữu ích", key: "D3" },
        { title: "D.4 Đề xuất nghiên cứu (theo đúng mẫu đề xuất quy định)", key: "D4" },
        { title: "D.5 Sách, giáo trình, tài liệu dạy học, tài liệu huấn luyện, điều lệ, điều lệnh", key: "D5" },
        { title: "D.6 Bài báo, báo cáo khoa học", key: "D6" },
        { title: "D.7 Hướng dẫn học viên, sinh viên NCKH do GĐ Học viện phê duyệt", key: "D7" },
        { title: "D.8 Thành viên hội đồng khoa học các cấp", key: "D8" },
        { title: "D.9 Các nhiệm vụ khoa học và công nghệ khác", key: "D9" },
    ];

    dConfigs.forEach(cfg => {
        const rows = filterD(cfg.key).map(r => mapD(cfg.key, r));
        const subTotal = rows.reduce((sum, r) => sum + r.cells[6], 0);
        totalD += subTotal;
        html += renderTableBlock(cfg.title, headersList[cfg.key], rows, subTotal, `Tổng ${cfg.key}:`);
    });

    html += `<div class="group-total-banner ban-d ban-main">Tổng D = D.1+D.2+D.3+D.4+D.5+D.6+D.7+D.8+D.9 <span class="total-value">${formatNumber(totalD)}</span></div>`;
    return html;
}

// MAIN RENDER
function renderData(data) {
    // 1. Render Info
    document.getElementById('gvInfo').innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <p class="mb-1"><strong>Họ tên:</strong> ${data.giangVien || ''}</p>
                <p class="mb-1"><strong>Chức vụ:</strong> ${data.chucVu || ''}</p>
                <p class="mb-1"><strong>Khoa/Phòng:</strong> ${data.khoa || ''}</p>
            </div>
            <div class="col-md-6">
                <p class="mb-1"><strong>Định mức giảng dạy chuẩn:</strong> <strong class="text-primary">${formatNumber(data.dinhMucChuan)}</strong> tiết</p>
                <p class="mb-1"><strong>Miễn giảm:</strong> <strong class="text-info">${formatNumber(data.phanTramMienGiam)}%</strong> (${data.lyDoMienGiam || 'Không'})</p>
                <p class="mb-1"><strong>Định mức thực tế:</strong> <strong class="text-success">${formatNumber(data.dinhMucSauMienGiam)}</strong> tiết</p>
            </div>
        </div>
    `;

    // 2. Render Detailed Groups
    const container = document.getElementById('tablesContainer');
    container.innerHTML = '';
    
    if (data.raw) {
        container.innerHTML += buildGroupA(data);
        container.innerHTML += buildGroupB(data);
        container.innerHTML += buildGroupC(data);
        container.innerHTML += buildGroupD(data);
    }

    // 3. Render Summary (Table F equivalent)
    if (data.tableE) {
        document.getElementById('summaryBox').innerHTML = `
            <h5 class="section-title st-sum"><i class="fas fa-file-invoice-dollar me-2"></i> E. TỔNG HỢP KHỐI LƯỢNG ĐÃ THỰC HIỆN VÀ ĐỀ NGHỊ THANH TOÁN VƯỢT GIỜ</h5>
            <div class="table-responsive mt-2">
                <table class="table table-bordered table-sm table-custom">
                    <thead><tr><th style="width:80%">Nội dung công việc</th><th>Số tiết</th></tr></thead>
                    <tbody>
                        <tr><td>I. Tổng số tiết thực hiện (A+B+C)</td><td class="text-end fw-bold">${formatNumber(data.tableE.i)}</td></tr>
                        <tr><td>II. Số tiết định mức phải giảng</td><td class="text-end fw-bold">${formatNumber(data.tableE.ii)}</td></tr>
                        <tr><td>III. Số tiết chưa hoàn thành NCKH</td><td class="text-end fw-bold text-danger">${formatNumber(data.tableE.iii)}</td></tr>
                        <tr><td>IV. Số tiết được giảm trừ (theo lý do giảm trừ)</td><td class="text-end fw-bold">${formatNumber(data.tableE.iv)}</td></tr>
                        <tr><td><strong>Tổng số tiết vượt giờ (I - II - III + IV)</strong></td><td class="text-end fw-bold">${formatNumber(data.tableE.v)}</td></tr>
                        <tr><td><strong>Tổng số tiết vượt giờ đề nghị thanh toán (II - IV)</strong></td><td class="text-end fw-bold">${formatNumber(data.tableE.vi ?? 0)}</td></tr>
                    </tbody>
                </table>
            </div>
        `;
    }
}
