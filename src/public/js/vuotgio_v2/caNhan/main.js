/**
 * Frontend script cho trang Vượt giờ cá nhân
 */

const getInitParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        idUser: urlParams.get('idUser') || document.getElementById('initIdUser').value,
        namHoc: urlParams.get('namHoc') || document.getElementById('initNamHoc').value,
        mode: document.getElementById('initMode')?.value || 'du-kien' // Fallback to du-kien
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
    const { idUser, mode } = getInitParams();
    const namHoc = document.getElementById('namHocFilter').value;
    
    if (!idUser || !namHoc) return;
    
    hideError();
    document.getElementById('loading').style.display = 'block';
    document.getElementById('contentWrapper').style.display = 'none';
    
    try {
        let apiPath;
        let sourceMode;
        if (mode === 'sau-luu') {
            sourceMode = 'snapshot';
            apiPath = `/v2/vuotgio/tong-hop/data-snapshot/${encodeURIComponent(idUser)}?namHoc=${encodeURIComponent(namHoc)}`;
        } else {
            const isDuKien = mode === 'du-kien';
            sourceMode = isDuKien ? 'du-kien' : 'chinh-thuc';
            apiPath = `/v2/vuotgio/tong-hop/data-chuan/${encodeURIComponent(idUser)}?namHoc=${encodeURIComponent(namHoc)}&isDuKien=${isDuKien}`;
        }
        
        console.info('[caNhan.loadData]', { idUser, namHoc, mode, sourceMode, apiPath });
            
        const response = await fetch(apiPath);
        const result = await response.json();
        
        if (!result.success) {
            showError(result.message || 'Lỗi khi tải dữ liệu');
            return;
        }
        
        // ========== LOG CHI TIẾT DỮ LIỆU TRẢ VỀ ==========
        logDetailedData(result.data, mode);
        
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

// ========== FUNCTION LOG CHI TIẾT DỮ LIỆU ==========
function logDetailedData(data, mode) {
    console.group(`%c📊 DỮ LIỆU TRẢ VỀ - MODE: ${mode.toUpperCase()}`, 'color: #3b82f6; font-weight: bold; font-size: 14px;');
    
    // 1. Thông tin chung
    console.log('%c🎯 Thông tin giảng viên:', 'color: #10b981; font-weight: bold;');
    console.table({
        'ID User': data.id_User,
        'Họ tên': data.giangVien,
        'Khoa': data.khoa,
        'Chức vụ': data.chucVu
    });
    
    // 2. Giảng dạy - PHÂN TÁCH KÌ 1 VÀ KÌ 2
    if (data.raw?.giangDay) {
        console.group('%c📚 A.1. GIẢNG DẠY (từ quychuan/giangday)', 'color: #f59e0b; font-weight: bold;');
        
        const giangDay = data.raw.giangDay;
        const gdKy1 = giangDay.filter(r => Number(r.HocKy ?? r.hoc_ky) === 1);
        const gdKy2 = giangDay.filter(r => Number(r.HocKy ?? r.hoc_ky) === 2);
        
        console.log(`%c📌 Tổng số bản ghi: ${giangDay.length}`, 'color: #64748b; font-weight: bold;');
        console.log(`   ├─ Kì 1: ${gdKy1.length} bản ghi`);
        console.log(`   └─ Kì 2: ${gdKy2.length} bản ghi`);
        
        // Chi tiết kì 1
        if (gdKy1.length > 0) {
            console.group('%c🔵 KÌ 1 - Chi tiết:', 'color: #3b82f6;');
            const sumKy1 = gdKy1.reduce((sum, r) => sum + (Number(r.QuyChuan || 0)), 0);
            console.log(`Tổng quy chuẩn: ${sumKy1.toFixed(2)} tiết`);
            console.table(gdKy1.map(r => ({
                'Học phần': r.TenHocPhan || r.ten_hoc_phan || '',
                'Lớp': r.Lop || r.lop || r.ten_lop || '',
                'Hệ đào tạo': r.ten_he_dao_tao || r.he_dao_tao || '',
                'Học kỳ': r.HocKy || r.hoc_ky,
                'Quy chuẩn': Number(r.QuyChuan || 0).toFixed(2)
            })));
            console.groupEnd();
        } else {
            console.log('%c⚠️ KÌ 1: KHÔNG CÓ DỮ LIỆU', 'color: #ef4444; font-weight: bold;');
        }
        
        // Chi tiết kì 2
        if (gdKy2.length > 0) {
            console.group('%c🟢 KÌ 2 - Chi tiết:', 'color: #10b981;');
            const sumKy2 = gdKy2.reduce((sum, r) => sum + (Number(r.QuyChuan || 0)), 0);
            console.log(`Tổng quy chuẩn: ${sumKy2.toFixed(2)} tiết`);
            console.table(gdKy2.map(r => ({
                'Học phần': r.TenHocPhan || r.ten_hoc_phan || '',
                'Lớp': r.Lop || r.lop || r.ten_lop || '',
                'Hệ đào tạo': r.ten_he_dao_tao || r.he_dao_tao || '',
                'Học kỳ': r.HocKy || r.hoc_ky,
                'Quy chuẩn': Number(r.QuyChuan || 0).toFixed(2)
            })));
            console.groupEnd();
        } else {
            console.log('%c⚠️ KÌ 2: KHÔNG CÓ DỮ LIỆU', 'color: #ef4444; font-weight: bold;');
        }
        
        console.groupEnd();
    }
    
    // 3. Lớp ngoài quy chuẩn - PHÂN TÁCH KÌ 1 VÀ KÌ 2
    if (data.raw?.lopNgoaiQC) {
        console.group('%c📝 Lớp Ngoài Quy Chuẩn', 'color: #f59e0b; font-weight: bold;');
        
        const lopNgoaiQC = data.raw.lopNgoaiQC;
        const lnqcKy1 = lopNgoaiQC.filter(r => Number(r.hoc_ky ?? r.HocKy) === 1);
        const lnqcKy2 = lopNgoaiQC.filter(r => Number(r.hoc_ky ?? r.HocKy) === 2);
        
        console.log(`%c📌 Tổng số bản ghi: ${lopNgoaiQC.length}`, 'color: #64748b; font-weight: bold;');
        console.log(`   ├─ Kì 1: ${lnqcKy1.length} bản ghi`);
        console.log(`   └─ Kì 2: ${lnqcKy2.length} bản ghi`);
        
        if (lnqcKy1.length > 0) {
            const sumKy1 = lnqcKy1.reduce((sum, r) => sum + (Number(r.quy_chuan || 0)), 0);
            console.log(`   Kì 1 tổng: ${sumKy1.toFixed(2)} tiết`);
        }
        if (lnqcKy2.length > 0) {
            const sumKy2 = lnqcKy2.reduce((sum, r) => sum + (Number(r.quy_chuan || 0)), 0);
            console.log(`   Kì 2 tổng: ${sumKy2.toFixed(2)} tiết`);
        }
        
        console.groupEnd();
    }
    
    // 4. KTHP (Coi thi, chấm thi) - PHÂN TÁCH KÌ 1 VÀ KÌ 2
    if (data.raw?.kthp) {
        console.group('%c✍️ A.2. COI THI - CHẤM THI - RA ĐỀ', 'color: #f59e0b; font-weight: bold;');
        
        const kthp = data.raw.kthp;
        const kthpKy1 = kthp.filter(r => Number(r.hoc_ky ?? r.HocKy) === 1);
        const kthpKy2 = kthp.filter(r => Number(r.hoc_ky ?? r.HocKy) === 2);
        
        console.log(`%c📌 Tổng số bản ghi: ${kthp.length}`, 'color: #64748b; font-weight: bold;');
        console.log(`   ├─ Kì 1: ${kthpKy1.length} bản ghi`);
        console.log(`   └─ Kì 2: ${kthpKy2.length} bản ghi`);
        
        if (kthpKy1.length > 0) {
            const sumKy1 = kthpKy1.reduce((sum, r) => sum + (Number(r.quy_chuan || r.QuyChuan || 0)), 0);
            console.log(`   Kì 1 tổng: ${sumKy1.toFixed(2)} tiết`);
        }
        if (kthpKy2.length > 0) {
            const sumKy2 = kthpKy2.reduce((sum, r) => sum + (Number(r.quy_chuan || r.QuyChuan || 0)), 0);
            console.log(`   Kì 2 tổng: ${sumKy2.toFixed(2)} tiết`);
        }
        
        console.groupEnd();
    }
    
    // 5. Đồ án tốt nghiệp
    if (data.raw?.doAn && data.raw.doAn.length > 0) {
        console.group('%c🎓 B. ĐỒ ÁN TỐT NGHIỆP', 'color: #8b5cf6; font-weight: bold;');
        console.log(`Tổng số: ${data.raw.doAn.length} bản ghi`);
        const sumDoAn = data.raw.doAn.reduce((sum, r) => sum + (Number(r.SoTiet || r.so_tiet || 0)), 0);
        console.log(`Tổng quy chuẩn: ${sumDoAn.toFixed(2)} tiết`);
        console.groupEnd();
    }
    
    // 6. Hướng dẫn tham quan
    if (data.raw?.huongDanThamQuan && data.raw.huongDanThamQuan.length > 0) {
        console.group('%c🚌 C. HƯỚNG DẪN THAM QUAN', 'color: #06b6d4; font-weight: bold;');
        console.log(`Tổng số: ${data.raw.huongDanThamQuan.length} bản ghi`);
        const sumHdtq = data.raw.huongDanThamQuan.reduce((sum, r) => sum + (Number(r.so_tiet_quy_doi || 0)), 0);
        console.log(`Tổng quy chuẩn: ${sumHdtq.toFixed(2)} tiết`);
        console.groupEnd();
    }
    
    // 7. NCKH
    if (data.raw?.nckhRecords && data.raw.nckhRecords.length > 0) {
        console.group('%c🔬 D. NGHIÊN CỨU KHOA HỌC', 'color: #ec4899; font-weight: bold;');
        console.log(`Tổng số: ${data.raw.nckhRecords.length} bản ghi`);
        const sumNckh = data.raw.nckhRecords.reduce((sum, r) => sum + (Number(r.soTietGiangVien || 0)), 0);
        console.log(`Tổng số tiết: ${sumNckh.toFixed(2)} tiết`);
        console.groupEnd();
    }
    
    // 8. Tổng kết
    console.group('%c📊 TỔNG KẾT', 'color: #dc2626; font-weight: bold; font-size: 14px;');
    if (data.tableE) {
        console.table({
            'I. Tổng số tiết thực hiện (A+B+C)': formatNumber(data.tableE.i),
            'II. Định mức phải giảng': formatNumber(data.tableE.ii),
            'III. Chưa hoàn thành NCKH': formatNumber(data.tableE.iii),
            'IV. Được giảm trừ': formatNumber(data.tableE.iv),
            'V. Tổng vượt giờ': formatNumber(data.tableE.v),
            'VI. Đề nghị thanh toán': formatNumber(data.tableE.vi || 0)
        });
    }
    console.groupEnd();
    
    // 9. Cảnh báo nếu không có dữ liệu kì 2 trong chế độ dự kiến
    if (mode === 'du-kien') {
        const hasKy2GiangDay = data.raw?.giangDay?.some(r => Number(r.HocKy ?? r.hoc_ky) === 2);
        const hasKy2Kthp = data.raw?.kthp?.some(r => Number(r.hoc_ky ?? r.HocKy) === 2);
        const hasKy2LopNgoaiQC = data.raw?.lopNgoaiQC?.some(r => Number(r.hoc_ky ?? r.HocKy) === 2);
        
        if (!hasKy2GiangDay && !hasKy2Kthp && !hasKy2LopNgoaiQC) {
            console.warn('%c⚠️ CẢNH BÁO: Không có dữ liệu KÌ 2 trong chế độ DỰ KIẾN!', 'background: #fbbf24; color: #000; font-weight: bold; padding: 5px;');
            console.warn('Kiểm tra:');
            console.warn('  1. Dữ liệu kì 2 có tồn tại trong bảng quychuan không?');
            console.warn('  2. Hàm getVirtualGiangDay có lấy đúng dữ liệu không?');
            console.warn('  3. Tham số isDuKien có được truyền đúng không?');
        } else {
            console.log('%c✅ CÓ DỮ LIỆU KÌ 2', 'background: #10b981; color: #fff; font-weight: bold; padding: 5px;');
        }
    }
    
    console.groupEnd();
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
                <p class="mb-1"><strong>Miễn giảm:</strong> <strong class="text-info">${formatNumber(data.phanTramMienGiam)}%</strong> (${data.lyDoMienGiam || 'Chưa có lý do miễn giảm'})</p>
                <p class="mb-1"><strong>Định mức thực tế:</strong> <strong class="text-success">${formatNumber(data.dinhMucSauMienGiam)}</strong> tiết</p>
            </div>
        </div>
    `;
    
    // 1.5. Render Data Summary Box (Kì 1 và Kì 2)
    renderDataSummaryBox(data);

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
            <h5 class="fw-bold mb-3" style="color: #1e293b;"><i class="fas fa-file-invoice-dollar me-2"></i> E. TỔNG HỢP KHỐI LƯỢNG ĐÃ THỰC HIỆN VÀ ĐỀ NGHỊ THANH TOÁN VƯỢT GIỜ</h5>
            <div class="table-responsive">
                <table class="table table-hover table-bordered table-custom">
                    <thead style="background-color: #334155; color: #f1f5f9;">
                        <tr><th style="width:80%; text-align: left; padding-left: 10px;">Nội dung công việc</th><th style="text-align: center;">Số tiết</th></tr>
                    </thead>
                    <tbody>
                        <tr><td style="text-align: left; padding-left: 10px;">I. Tổng số tiết thực hiện (A+B+C)</td><td class="text-end fw-bold">${formatNumber(data.tableE.i)}</td></tr>
                        <tr><td style="text-align: left; padding-left: 10px;">II. Số tiết định mức phải giảng</td><td class="text-end fw-bold">${formatNumber(data.tableE.ii)}</td></tr>
                        <tr><td style="text-align: left; padding-left: 10px;">III. Số tiết chưa hoàn thành NCKH</td><td class="text-end fw-bold text-danger">${formatNumber(data.tableE.iii)}</td></tr>
                        <tr><td style="text-align: left; padding-left: 10px;">IV. Số tiết được giảm trừ (theo lý do giảm trừ)</td><td class="text-end fw-bold">${formatNumber(data.tableE.iv)}</td></tr>
                        <tr><td style="text-align: left; padding-left: 10px;"><strong>Tổng số tiết vượt giờ (I - II - III + IV)</strong></td><td class="text-end fw-bold" style="color: #1d4ed8;">${formatNumber(data.tableE.v)}</td></tr>
                        <tr style="background-color: #f1f5f9;"><td style="text-align: left; padding-left: 10px;"><strong>Tổng số tiết vượt giờ đề nghị thanh toán (II - IV)</strong></td><td class="text-end fw-bold" style="color: #1d4ed8;">${formatNumber(data.tableE.vi ?? 0)}</td></tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    // 4. Render Table F
    renderTableF(data);
}

// ==================== DATA SUMMARY BOX RENDERING ====================
function renderDataSummaryBox(data) {
    const summaryBox = document.getElementById('dataSummaryBox');
    
    if (!summaryBox) return;

    if (!data.raw) {
        summaryBox.style.display = 'none';
        return;
    }
    
    // Tính toán dữ liệu kì 1 và kì 2
    const giangDay = data.raw.giangDay || [];
    const lopNgoaiQC = data.raw.lopNgoaiQC || [];
    const kthp = data.raw.kthp || [];
    
    // Kì 1
    const ky1GiangDay = giangDay.filter(r => Number(r.HocKy ?? r.hoc_ky) === 1);
    const ky1LopNgoaiQC = lopNgoaiQC.filter(r => Number(r.hoc_ky ?? r.HocKy) === 1);
    const ky1Kthp = kthp.filter(r => Number(r.hoc_ky ?? r.HocKy) === 1);
    
    const ky1GiangDaySum = ky1GiangDay.reduce((sum, r) => sum + Number(r.QuyChuan || 0), 0);
    const ky1LopNgoaiQCSum = ky1LopNgoaiQC.reduce((sum, r) => sum + Number(r.quy_chuan || 0), 0);
    const ky1KthpSum = ky1Kthp.reduce((sum, r) => sum + Number(r.quy_chuan || r.QuyChuan || 0), 0);
    const ky1Total = ky1GiangDaySum + ky1LopNgoaiQCSum + ky1KthpSum;
    
    // Kì 2
    const ky2GiangDay = giangDay.filter(r => Number(r.HocKy ?? r.hoc_ky) === 2);
    const ky2LopNgoaiQC = lopNgoaiQC.filter(r => Number(r.hoc_ky ?? r.HocKy) === 2);
    const ky2Kthp = kthp.filter(r => Number(r.hoc_ky ?? r.HocKy) === 2);
    
    const ky2GiangDaySum = ky2GiangDay.reduce((sum, r) => sum + Number(r.QuyChuan || 0), 0);
    const ky2LopNgoaiQCSum = ky2LopNgoaiQC.reduce((sum, r) => sum + Number(r.quy_chuan || 0), 0);
    const ky2KthpSum = ky2Kthp.reduce((sum, r) => sum + Number(r.quy_chuan || r.QuyChuan || 0), 0);
    const ky2Total = ky2GiangDaySum + ky2LopNgoaiQCSum + ky2KthpSum;
    
    // Cập nhật UI
    document.getElementById('ky1GiangDay').textContent = `${ky1GiangDay.length} lớp (${formatNumber(ky1GiangDaySum)} tiết)`;
    document.getElementById('ky1LopNgoaiQC').textContent = `${ky1LopNgoaiQC.length} lớp (${formatNumber(ky1LopNgoaiQCSum)} tiết)`;
    document.getElementById('ky1Kthp').textContent = `${ky1Kthp.length} lần (${formatNumber(ky1KthpSum)} tiết)`;
    document.getElementById('ky1Total').textContent = formatNumber(ky1Total) + ' tiết';
    
    document.getElementById('ky2GiangDay').textContent = `${ky2GiangDay.length} lớp (${formatNumber(ky2GiangDaySum)} tiết)`;
    document.getElementById('ky2LopNgoaiQC').textContent = `${ky2LopNgoaiQC.length} lớp (${formatNumber(ky2LopNgoaiQCSum)} tiết)`;
    document.getElementById('ky2Kthp').textContent = `${ky2Kthp.length} lần (${formatNumber(ky2KthpSum)} tiết)`;
    document.getElementById('ky2Total').textContent = formatNumber(ky2Total) + ' tiết';
    
    // Cảnh báo nếu thiếu dữ liệu kì 2 trong chế độ dự kiến
    const { mode } = getInitParams();
    const warningBox = document.getElementById('dataWarningBox');
    const warningText = document.getElementById('dataWarningText');
    
    if (mode === 'du-kien' && ky2Total === 0) {
        warningBox.style.display = 'block';
        warningText.innerHTML = '<strong>CẢNH BÁO:</strong> Không có dữ liệu Học kỳ 2 trong chế độ Dự Kiến. Hãy kiểm tra dữ liệu trong bảng <code>quychuan</code>.';
    } else if (mode === 'chinh-thuc' && ky2Total > 0) {
        warningBox.style.display = 'block';
        warningText.innerHTML = '<strong>LƯU Ý:</strong> Học kỳ 2 đã được lưu vào hệ thống chính thức.';
    } else {
        warningBox.style.display = 'none';
    }
    
    summaryBox.style.display = 'block';
}

// ==================== TABLE F RENDERING ====================
function renderTableF(data) {
    const tableFContainer = document.getElementById('tableFContainer');
    const tableFBody = document.getElementById('tableFBody');
    const tableFFoot = document.getElementById('tableFFoot');

    if (!tableFBody || !tableFFoot || !data || !data.tableF || !Array.isArray(data.tableF.rows)) {
        if (tableFContainer) tableFContainer.style.display = 'none';
        return;
    }

    const { rows, totals } = data.tableF;

    const categories = [
        { key: 'vn', label: 'Việt Nam' },
        { key: 'lao', label: 'Lào' },
        { key: 'cuba', label: 'Cuba' },
        { key: 'cpc', label: 'Campuchia' },
        { key: 'dongHP', label: 'Hệ đóng học phí' }
    ];

    tableFBody.innerHTML = rows.map((r, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td style="text-align: left; padding-left: 10px;">${categories[idx] ? categories[idx].label : ''}</td>
            <td>${formatNumber(r.hk1)}</td>
            <td>${formatNumber(r.hk2)}</td>
            <td>${formatNumber(r.do_an)}</td>
            <td>${formatNumber(r.tham_quan)}</td>
            <td style="font-weight: bold; color: #1d4ed8;">${formatNumber(r.tong)}</td>
        </tr>
    `).join('');

    tableFFoot.innerHTML = `
        <tr>
            <td colspan="2" style="text-align: center; font-weight: bold;">Tổng:</td>
            <td style="font-weight: bold;">${formatNumber(totals.hk1)}</td>
            <td style="font-weight: bold;">${formatNumber(totals.hk2)}</td>
            <td style="font-weight: bold;">${formatNumber(totals.do_an)}</td>
            <td style="font-weight: bold;">${formatNumber(totals.tham_quan)}</td>
            <td style="font-weight: bold; color: #1d4ed8;">${formatNumber(totals.tong)}</td>
        </tr>
    `;

    if (tableFContainer) tableFContainer.style.display = 'block';
}
