/**
 * Thêm Kết Thúc Học Phần - Frontend JS
 * VuotGio V2 - Calculator form theo mẫu bảng vượt giờ
 */

const sections = [
    {
        id: 1,
        title: "Ra đề thi",
        saveType: "Ra đề",
        items: [
            { id: "1a", label: "Đề thi trắc nghiệm kèm theo đáp án", dvt: "01 đề thi", gio: 2.0 },
            { id: "1b", label: "Đề thi tự luận kèm theo đáp án", dvt: "01 đề thi", gio: 1.5 },
            { id: "1c", label: "Đề thi thực hành kèm theo đáp án", dvt: "01 đề thi", gio: 1.0 },
            { id: "1d", label: "Đề thi vấn đáp kèm theo đáp án", dvt: "01 đề thi", gio: 0.75 },
            { id: "1e", label: "Đề hỗn hợp kèm đáp án (trắc nghiệm >= 50%)", dvt: "01 đề thi", gio: 2.0 },
            { id: "1f", label: "Đề hỗn hợp TN + tự luận kèm đáp án (TN < 50%)", dvt: "01 đề thi", gio: 1.5 },
            { id: "1g", label: "Đề hỗn hợp TN + thực hành kèm đáp án (TN < 50%)", dvt: "01 đề thi", gio: 1.0 },
            { id: "1h", label: "Đề hỗn hợp TN + vấn đáp kèm đáp án (TN < 50%)", dvt: "01 đề thi", gio: 0.75 }
        ],
        notes: [],
        info: []
    },
    {
        id: 2,
        title: "Coi thi, giám sát",
        saveType: "Coi thi",
        items: [
            { id: "2a", label: "Ca thi thời lượng <= 45 phút", dvt: "01 ca thi", gio: 0.3 },
            { id: "2b", label: "Ca thi thời lượng 46 - 90 phút", dvt: "01 ca thi", gio: 0.6 },
            { id: "2c", label: "Ca thi thời lượng 91 - 135 phút", dvt: "01 ca thi", gio: 0.9 },
            { id: "2d", label: "Ca thi thời lượng > 135 phút", dvt: "01 ca thi", gio: 1.2 }
        ],
        notes: [
            { id: "coeff2", label: "Coi thi, giám sát ngoài giờ hành chính -> nhân hệ số 1,2", coeff: 1.2, affects: ["2a", "2b", "2c", "2d"] }
        ],
        info: []
    },
    {
        id: 3,
        title: "Chấm thi",
        saveType: "Chấm thi",
        items: [
            { id: "3a", label: "Bài thi tự luận", dvt: "01 bài thi", gio: 0.1 },
            { id: "3b", label: "Bài thi vấn đáp", dvt: "01 bài thi", gio: 0.1 },
            { id: "3c", label: "Đồ án môn học", dvt: "01 ĐAMH", gio: 0.15 },
            { id: "3d", label: "Bài thực hành tại giảng đường, phòng máy, phòng thí nghiệm", dvt: "01 bài thi", gio: 0.05 },
            { id: "3e", label: "Bài thực hành tại thao trường, bãi tập", dvt: "01 bài thi", gio: 0.075 },
            { id: "3f", label: "Bài hỗn hợp - tỉ trọng TN >= 50% (tính 50% định mức tương ứng)", dvt: "01 bài thi", gio: null, mixPct: 0.5, mixLabel: "50% định mức" },
            { id: "3g", label: "Bài hỗn hợp - tỉ trọng TN < 50% (tính 75% định mức tương ứng)", dvt: "01 bài thi", gio: null, mixPct: 0.75, mixLabel: "75% định mức" }
        ],
        notes: [
            { id: "coeff3", label: "Chấm thực hành / vấn đáp / đồ án ngoài giờ hành chính -> nhân hệ số 1,2", coeff: 1.2, affects: ["3b", "3c", "3d", "3e"] }
        ],
        info: []
    },
    {
        id: 4,
        title: "Xây dựng ngân hàng câu hỏi thi",
        saveType: "Ngân hàng câu hỏi",
        items: [
            { id: "4a", label: "Biên soạn cấu trúc nhóm câu hỏi (tự luận / thực hành / vấn đáp)", dvt: "lần", gio: 2.0 },
            { id: "4b", label: "Biên soạn cấu trúc nhóm câu hỏi (trắc nghiệm / hỗn hợp có TN)", dvt: "lần", gio: 5.0 },
            { id: "4c", label: "Biên soạn 01 ma trận đề thi (tự luận / thực hành / vấn đáp)", dvt: "ma trận", gio: 1.0 },
            { id: "4d", label: "Biên soạn 01 ma trận đề thi (trắc nghiệm / hỗn hợp có TN)", dvt: "ma trận", gio: 2.5 },
            { id: "4e", label: "Biên soạn 01 câu hỏi tự luận / thực hành / vấn đáp kèm đáp án", dvt: "câu hỏi", gio: 1.5 },
            { id: "4f", label: "Biên soạn 01 câu hỏi trắc nghiệm kèm đáp án", dvt: "câu hỏi", gio: 0.6 },
            { id: "4g", label: "Câu hỏi dẫn xuất từ TL/TH/VĐ (tính 1/3 định mức câu gốc = 0,5 giờ)", dvt: "câu hỏi", gio: 0.5 },
            { id: "4h", label: "Câu hỏi dẫn xuất từ trắc nghiệm (tính 1/3 định mức câu gốc = 0,2 giờ)", dvt: "câu hỏi", gio: 0.2 },
            { id: "4i", label: "Cập nhật câu hỏi TL/TH/VĐ (30% định mức biên soạn mới = 0,45 giờ)", dvt: "câu hỏi", gio: 0.45 },
            { id: "4j", label: "Cập nhật câu hỏi trắc nghiệm (30% định mức biên soạn mới = 0,18 giờ)", dvt: "câu hỏi", gio: 0.18 }
        ],
        notes: [],
        info: [
            "Thẩm định cấu trúc nhóm câu hỏi, ma trận đề thi, câu hỏi thi -> áp dụng 80% định mức biên soạn tương ứng.",
            "Biên soạn câu hỏi môn ngoại ngữ -> áp dụng 2/3 định mức biên soạn môn khác."
        ]
    }
];

const state = {
    inputs: {},
    coeffs: {},
    open: { 1: true, 2: true, 3: true, 4: true }
};

// Danh sách giảng viên cho autocomplete
let giangVienList = [];
let heDaoTaoList = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadNamHocOptions();
    loadKhoaOptions();
    loadGiangVienList();
    loadHeDaoTaoOptions();

    document.getElementById('themKTHPForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('themKTHPForm').addEventListener('reset', () => {
        setTimeout(() => {
            resetCalculator();
        }, 0);
    });
    document.getElementById('resetCalculatorBtn').addEventListener('click', resetAll);
    const khoaForm = document.getElementById('khoaForm');
    if (khoaForm) {
        khoaForm.addEventListener('change', async () => {
            await loadGiangVienList(khoaForm.value);
        });
    }

    setupAutocomplete('giangVienForm', 'suggestionContainer');
    render();

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-container')) {
            document.querySelectorAll('.suggestion-list').forEach(list => list.classList.remove('show'));
        }
    });
});

// Load năm học từ API có sẵn
async function loadNamHocOptions() {
    try {
        const response = await fetch('/api/namhoc');
        const data = await response.json();
        const namHocSelects = document.querySelectorAll('.namHoc');
        namHocSelects.forEach(select => {
            select.innerHTML = '';
            data.forEach((item, index) => {
                const option = document.createElement('option');
                option.value = item.NamHoc;
                option.textContent = item.NamHoc;
                if (item.trangthai === 1 || (index === 0 && !data.some(i => i.trangthai === 1))) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading nam hoc:', error);
    }
}

// Load khoa từ API có sẵn
async function loadKhoaOptions() {
    try {
        const response = await fetch('/api/khoa');
        const data = await response.json();
        const khoaSelects = document.querySelectorAll('.khoa');
        khoaSelects.forEach(select => {
            if (!select.id.includes('Xem')) {
                select.innerHTML = '<option value="">-- Chọn Khoa --</option>';
                data.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.MaPhongBan;
                    option.textContent = dept.TenPhongBan || dept.MaPhongBan;
                    select.appendChild(option);
                });
            }
        });

        // Enforce khoa filter: nếu user thuộc khoa, lock dropdown
        if (typeof KhoaFilterUtils !== 'undefined' && KhoaFilterUtils.isKhoaUser()) {
            khoaSelects.forEach(select => {
                KhoaFilterUtils.applyKhoaFilter(select);
            });
        }

        const khoaForm = document.getElementById('khoaForm');
        if (khoaForm && khoaForm.value) {
            await loadGiangVienList(khoaForm.value);
        }
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

// Load danh sách giảng viên (dùng cho autocomplete)
async function loadGiangVienList(khoa = '') {
    try {
        const query = khoa ? `?Khoa=${encodeURIComponent(khoa)}` : '';
        const response = await fetch(`/v2/vuotgio/api/teachers${query}`);
        if (!response.ok) {
            throw new Error(`Load teachers failed with status ${response.status}`);
        }

        const rawData = await response.json();
        if (!Array.isArray(rawData)) {
            giangVienList = [];
            return;
        }

        // Chuẩn hóa cấu trúc dữ liệu để autocomplete xử lý ổn định
        giangVienList = rawData.map((row) => ({
            HoTen: row.HoTen || row.TenNhanVien || '',
            Khoa: row.Khoa || row.MaPhongBan || ''
        })).filter((row) => row.HoTen);
    } catch (error) {
        console.error('Error loading giang vien:', error);
        giangVienList = [];
    }
}

// Load danh sách hệ đào tạo cho trường đối tượng
async function loadHeDaoTaoOptions() {
    try {
        const response = await fetch('/api/gvm/v1/he-moi-giang');
        if (!response.ok) {
            throw new Error(`Load he dao tao failed with status ${response.status}`);
        }

        const rawData = await response.json();
        const list = Array.isArray(rawData)
            ? rawData
            : (rawData && Array.isArray(rawData.data) ? rawData.data : []);

        heDaoTaoList = list
            .map((item) => ({
                id: item.id,
                value: item.he_dao_tao || item.HeDaoTao || item.value || ''
            }))
            .filter((item) => item.value);

        const doiTuongSelect = document.getElementById('doiTuongForm');
        if (doiTuongSelect) {
            doiTuongSelect.innerHTML = '<option value="">-- Chọn hệ đào tạo --</option>';
            heDaoTaoList.forEach((item) => {
                const option = document.createElement('option');
                option.value = String(item.value);
                option.textContent = String(item.value);
                doiTuongSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading he dao tao:', error);
        heDaoTaoList = [];

        const doiTuongSelect = document.getElementById('doiTuongForm');
        if (doiTuongSelect) {
            doiTuongSelect.innerHTML = '<option value="">Không tải được hệ đào tạo</option>';
        }
    }
}

// Hàm setup autocomplete dùng chung
function setupAutocomplete(inputId, containerId) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    
    input.addEventListener('input', () => {
        const query = input.value.toLowerCase().trim();
        if (query.length < 2) {
            container.classList.remove('show');
            return;
        }
        
        const suggestions = giangVienList.filter(gv => {
            const name = gv.HoTen || gv.TenNhanVien || '';
            return name.toLowerCase().includes(query);
        }).slice(0, 10);
        
        if (suggestions.length === 0) {
            container.classList.remove('show');
            return;
        }
        
        container.innerHTML = suggestions.map(gv => {
            const name = gv.HoTen || gv.TenNhanVien || '';
            const mon = gv.MonGiangDayChinh ? ` (${gv.MonGiangDayChinh})` : '';
            return `<div class="suggestion-item" data-name="${name}">${name}${mon}</div>`;
        }).join('');
        
        container.classList.add('show');
        
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                input.value = item.dataset.name;
                container.classList.remove('show');
            });
        });
    });

    // Close on blur (with delay)
    input.addEventListener('blur', () => {
        setTimeout(() => {
            container.classList.remove('show');
        }, 200);
    });
}

// Tiêu chuẩn hóa chuỗi (Xử lý khoảng trắng và dấu Tiếng Việt NFC/NFD)
function normalizeString(str) {
    if (!str) return '';
    return str.toString().normalize('NFC').trim();
}

// Kiểm tra xem tên giảng viên có trong danh sách không
function isValidTeacher(name) {
    const normalizedInput = normalizeString(name);
    if (!normalizedInput) return false;

    return giangVienList.some(gv => {
        const listName = normalizeString(gv.HoTen || gv.TenNhanVien || '');
        return listName === normalizedInput;
    });
}

function calcResult(item, sec) {
    const qty = parseFloat(state.inputs[item.id] || 0);
    if (!qty) return 0;

    let base = 0;
    if (item.gio !== null && item.gio !== undefined) {
        base = qty * item.gio;
    } else if (item.mixPct !== undefined) {
        base = qty * 0.05 * item.mixPct;
    } else {
        return 0;
    }

    for (const note of (sec.notes || [])) {
        if (note.coeff && note.affects && note.affects.includes(item.id) && state.coeffs[note.id]) {
            base *= note.coeff;
        }
    }

    return base;
}

function gioLabel(item) {
    if (item.gio !== null && item.gio !== undefined) {
        return item.gio.toString().replace('.', ',');
    }
    if (item.mixLabel) return item.mixLabel;
    return '–';
}

function fmt(n) {
    return Number(n || 0).toFixed(2).replace('.', ',');
}

function getSectionTotal(sectionId) {
    const sec = sections.find(s => s.id === sectionId);
    if (!sec) return 0;
    return sec.items.reduce((sum, item) => sum + calcResult(item, sec), 0);
}

function buildDetailsForSave() {
    return sections
        .map((sec) => ({
            hinhthuc: sec.saveType,
            sotietqc: parseFloat(getSectionTotal(sec.id).toFixed(2))
        }))
        .filter((d) => d.sotietqc > 0);
}

function render() {
    const app = document.getElementById('app');
    if (!app) return;

    let html = '';

    sections.forEach(sec => {
        const secTotal = getSectionTotal(sec.id);
        const isOpen = state.open[sec.id];

        html += `<div class="section">
      <div class="section-header" onclick="toggleSec(${sec.id})">
        <div class="sec-left">
          <div class="sec-badge">${sec.id}</div>
          <span class="sec-title">${sec.title}</span>
        </div>
        <div class="sec-right">
          <span class="sec-total-pill" id="pill${sec.id}">${fmt(secTotal)} giờ</span>
          <span class="sec-arrow${isOpen ? ' open' : ''}">▼</span>
        </div>
      </div>`;

        if (isOpen) {
            html += `<div class="col-headers">
        <span>Nội dung</span>
        <span>ĐVT</span>
        <span>Giờ chuẩn</span>
        <span>Số lượng</span>
        <span>Thành giờ</span>
      </div>`;

            sec.items.forEach(item => {
                const result = calcResult(item, sec);
                const qty = state.inputs[item.id] || '';
                const hasVal = qty && parseFloat(qty) > 0;

                html += `<div class="item-row">
          <div class="i-label">${item.label}</div>
          <div class="i-dvt">${item.dvt}</div>
          <div class="i-gio">${gioLabel(item)}</div>
          <div class="i-input">
            <input type="number" min="0" step="1" value="${qty}" placeholder="0"
              class="${hasVal ? 'has-val' : ''}"
              onchange="setInput('${item.id}', this.value, ${sec.id})"
              oninput="setInput('${item.id}', this.value, ${sec.id})" />
          </div>
          <div class="i-result${result === 0 ? ' zero' : ''}">${result > 0 ? fmt(result) : '–'}</div>
        </div>`;
            });

            sec.notes.forEach(note => {
                const checked = !!state.coeffs[note.id];
                html += `<div class="coeff-row">
          <span class="coeff-text">${note.label}</span>
          <label class="coeff-label">
            <input type="checkbox" ${checked ? 'checked' : ''} onchange="setCoeff('${note.id}', this.checked)" />
            Áp dụng hệ số
          </label>
        </div>`;
            });

            sec.info.forEach(text => {
                html += `<div class="info-row"><div class="info-dot"></div><span class="info-text">${text}</span></div>`;
            });
        }

        html += `</div>`;
    });

    app.innerHTML = html;
    updateSummary();
}

function updateSummary() {
    const totals = sections.map(sec => getSectionTotal(sec.id));
    const sum1 = document.getElementById('sum1');
    const sum2 = document.getElementById('sum2');
    const sum3 = document.getElementById('sum3');
    const sum4 = document.getElementById('sum4');
    const grandTotal = document.getElementById('grandTotal');

    if (sum1) sum1.textContent = fmt(totals[0]);
    if (sum2) sum2.textContent = fmt(totals[1]);
    if (sum3) sum3.textContent = fmt(totals[2]);
    if (sum4) sum4.textContent = fmt(totals[3]);

    const total = totals.reduce((a, b) => a + b, 0);
    if (grandTotal) grandTotal.textContent = `${fmt(total)} giờ`;
}

window.toggleSec = function toggleSec(id) {
    state.open[id] = !state.open[id];
    render();
};

window.setInput = function setInput(id, val, secId) {
    state.inputs[id] = val;
    const sec = sections.find(s => s.id === secId);
    if (!sec) {
        updateSummary();
        return;
    }

    const secTotal = sec.items.reduce((s, item) => s + calcResult(item, sec), 0);
    const pill = document.getElementById(`pill${secId}`);
    if (pill) pill.textContent = `${fmt(secTotal)} giờ`;

    const inputEl = document.querySelector(`input[onchange*="'${id}'"]`);
    if (inputEl) {
        const hasVal = val && parseFloat(val) > 0;
        inputEl.className = hasVal ? 'has-val' : '';
    }

    const rows = document.querySelectorAll('.item-row');
    rows.forEach(row => {
        const inp = row.querySelector('input');
        const resEl = row.querySelector('.i-result');
        if (!inp || !resEl) return;

        const onch = inp.getAttribute('onchange') || '';
        const match = onch.match(/'([^']+)'/);
        if (!match) return;

        const itemId = match[1];
        const item = sec.items.find(it => it.id === itemId);
        if (!item) return;

        const r = calcResult(item, sec);
        resEl.textContent = r > 0 ? fmt(r) : '–';
        resEl.className = r === 0 ? 'i-result zero' : 'i-result';
    });

    updateSummary();
};

window.setCoeff = function setCoeff(id, val) {
    state.coeffs[id] = val;
    render();
};

function resetCalculator() {
    Object.keys(state.inputs).forEach(k => delete state.inputs[k]);
    Object.keys(state.coeffs).forEach(k => delete state.coeffs[k]);
    render();
}

window.resetAll = function resetAll() {
    if (!confirm('Xóa toàn bộ số liệu đã nhập?')) return;
    document.getElementById('themKTHPForm').reset();
    resetCalculator();
};

// Form submit
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const giangVien = document.getElementById('giangVienForm').value.trim();
    if (!isValidTeacher(giangVien)) {
        Swal.fire('Lỗi', 'Vui lòng chọn giảng viên từ danh sách gợi ý!', 'error');
        return;
    }
    
    const details = buildDetailsForSave();

    if (details.length === 0) {
        Swal.fire('Lỗi', 'Vui lòng nhập số tiết cho ít nhất 1 hình thức.', 'error');
        return;
    }

    const doiTuong = (document.getElementById('doiTuongForm')?.value || '').trim();
    if (!doiTuong) {
        Swal.fire('Lỗi', 'Vui lòng chọn Đối tượng cho lớp học phần.', 'error');
        return;
    }

    const formData = {
        namhoc: document.getElementById('namHocForm').value,
        ki: document.getElementById('hocKyForm').value,
        khoa: document.getElementById('khoaForm').value,
        tenhocphan: document.getElementById('tenHPForm').value,
        lophocphan: document.getElementById('lopForm').value,
        sotc: document.getElementById('soTCForm').value || 0,
        sosv: document.getElementById('siSoForm').value || 0,
        doituong: doiTuong,
        ghichu: document.getElementById('ghiChuForm').value,
        giangvien: giangVien,
        details
    };

    try {
        const response = await fetch('/v2/vuotgio/them-kthp/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            document.getElementById('themKTHPForm').reset();
            resetCalculator();
        } else {
            Swal.fire('Lỗi', result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi lưu', 'error');
    }
}
