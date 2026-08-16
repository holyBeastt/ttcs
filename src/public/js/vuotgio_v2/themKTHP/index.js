/**
 * Thêm Kết Thúc Học Phần - Frontend JS.
 * Logic mới: người dùng nhập trực tiếp số tiết quy chuẩn cho từng loại KTHP;
 * không còn tính từ các dòng định mức chi tiết trên giao diện.
 */
const sections = [
    { id: 1, title: "Ra đề thi", activityType: "RA_DE", saveType: "Ra đề" },
    { id: 2, title: "Coi thi, giám sát", activityType: "COI_THI", saveType: "Coi thi" },
    { id: 3, title: "Chấm thi", activityType: "CHAM_THI", saveType: "Chấm thi" },
    {
        id: 4,
        title: "Xây dựng ngân hàng câu hỏi thi",
        activityType: "NGAN_HANG_CAU_HOI",
        saveType: "Ngân hàng câu hỏi",
    },
];

const state = {
    inputs: {},
};

// Danh sách giảng viên cho autocomplete
let giangVienList = [];
let heDaoTaoList = [];
let selectedEmployeeId = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupAddPagePermissions();
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

function setupAddPagePermissions() {
    const role = localStorage.getItem('userRole');
    const maPhongBan = localStorage.getItem('MaPhongBan');
    const isKhoa = localStorage.getItem('isKhoa') === '1';
    const isKhoaApprover = isKhoa
        && (role === (window.APP_ROLES?.gv_cnbm || 'GV_CNBM')
            || role === (window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa'));
    const isKhaoThiUser = maPhongBan === (window.APP_DEPARTMENTS?.khaoThi || 'KT&ĐBCL')
        && (role === (window.APP_ROLES?.troLy_phong || 'Trợ lý')
            || role === (window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng'));
    const allowed = isKhoaApprover || isKhaoThiUser;

    ['btn-import-kthp', 'resetCalculatorBtn', 'themKTHPFormSubmit'].forEach((id) => {
        const button = document.getElementById(id);
        if (button) button.style.display = allowed ? '' : 'none';
    });
}

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
            id: row.id_User || row.id,
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
        const response = await fetch('/api/gvm/v1/he-dao-tao');
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
                option.value = String(item.id);
                option.textContent = String(item.value);
                option.dataset.name = String(item.value);
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
        selectedEmployeeId = null;
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
            return `<div class="suggestion-item" data-id="${gv.id || ''}" data-name="${name}">${name}${mon}</div>`;
        }).join('');
        
        container.classList.add('show');
        
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                input.value = item.dataset.name;
                selectedEmployeeId = item.dataset.id || null;
                const selected = giangVienList.find((gv) => String(gv.id) === String(selectedEmployeeId));
                const khoaForm = document.getElementById('khoaForm');
                if (selected?.Khoa && khoaForm) khoaForm.value = selected.Khoa;
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

    const match = giangVienList.find(gv => {
        const listName = normalizeString(gv.HoTen || gv.TenNhanVien || '');
        return listName === normalizedInput;
    });
    if (match) {
        if (!selectedEmployeeId) selectedEmployeeId = match.id || null;
        const khoaForm = document.getElementById('khoaForm');
        if (match.Khoa && khoaForm) khoaForm.value = match.Khoa;
    }
    return !!match;
}

function fmt(n) {
    return Number(n || 0).toFixed(2).replace('.', ',');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function describePreviewRow(dto) {
    return `<b>${escapeHtml(dto.activityName)}</b>: nhập trực tiếp `
        + `${escapeHtml(fmt(dto.standardHours))} giờ quy chuẩn`;
}

function previewIssueMessages(preview) {
    const rows = Array.isArray(preview.rows) ? preview.rows : [];
    const messages = rows.flatMap((row) => {
        const activityName = row.dto?.activityName || 'Bản ghi';
        return [...(row.errors || []), ...(row.warnings || [])].map((issue) =>
            `${escapeHtml(activityName)}: ${escapeHtml(issue.message)}`
        );
    });

    if (messages.length > 0) return messages.slice(0, 10).join('<br>');

    const summary = preview.summary || {};
    const counts = [];
    if (summary.invalid) counts.push(`${summary.invalid} lỗi`);
    if (summary.duplicate) counts.push(`${summary.duplicate} bản ghi trùng`);
    return counts.length > 0
        ? `Không có bản ghi mới để lưu (${counts.join(', ')}).`
        : 'Không có bản ghi hợp lệ để lưu.';
}

function getSectionTotal(sectionId) {
    return Math.max(0, Number(state.inputs[sectionId] || 0));
}

function buildDetailsForSave() {
    return sections
        .map((sec) => {
            const standardHours = parseFloat(getSectionTotal(sec.id).toFixed(2));
            return {
                activityType: sec.activityType,
                displayType: sec.saveType,
                standardHours,
                // Manual aggregate entries intentionally keep detail values empty/zero.
                detail: sec.activityType === 'COI_THI'
                    ? { examDate: null, shift: null, duration: 0, room: null }
                    : sec.activityType === 'CHAM_THI'
                        ? { markedCount: 0, role: null }
                        : { quantity: 0 },
            };
        })
        .filter((item) => item.standardHours > 0);
}

function render() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
        <div class="section">
            <div class="col-headers direct-qc-header">
                <span>Nội dung</span>
                <span>Số tiết QC</span>
            </div>
            ${sections.map((sec) => `
                <div class="item-row direct-qc-row">
                    <div class="i-label">${escapeHtml(sec.title)}</div>
                    <div class="i-input">
                        <input type="number" min="0" step="0.01" placeholder="0"
                            data-section-id="${sec.id}" value="${state.inputs[sec.id] || ''}"
                            aria-label="Số tiết QC - ${escapeHtml(sec.title)}" />
                    </div>
                </div>`).join('')}
        </div>`;
    app.querySelectorAll('input[data-section-id]').forEach((input) => {
        input.addEventListener('input', () => {
            window.setInput(input.dataset.sectionId, input.value);
        });
    });
    updateSummary();
}

function updateSummary() {
    const grandTotal = document.getElementById('grandTotal');
    const totals = sections.map(sec => getSectionTotal(sec.id));
    const total = totals.reduce((a, b) => a + b, 0);
    if (grandTotal) grandTotal.textContent = `${fmt(total)} giờ`;
}

window.setInput = function setInput(id, val) {
    state.inputs[id] = val;
    updateSummary();
};

function resetCalculator() {
    Object.keys(state.inputs).forEach(k => delete state.inputs[k]);
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
    
    const items = buildDetailsForSave();

    if (items.length === 0) {
        Swal.fire('Lỗi', 'Vui lòng nhập số tiết cho ít nhất 1 hình thức.', 'error');
        return;
    }

    const doiTuongSelect = document.getElementById('doiTuongForm');
    const heDaoTaoId = (doiTuongSelect?.value || '').trim();
    const doiTuong = doiTuongSelect?.selectedOptions?.[0]?.dataset?.name || '';
    if (!heDaoTaoId) {
        Swal.fire('Lỗi', 'Vui lòng chọn Đối tượng cho lớp học phần.', 'error');
        return;
    }

    const formData = {
        common: {
            academicYear: document.getElementById('namHocForm').value,
            // Manual defaults: kỳ 1 và đợt 1; người dùng vẫn có thể đổi trên form.
            semester: document.getElementById('hocKyForm')?.value || '1',
            round: document.getElementById('dotForm')?.value || '1',
            employee: {
                id: selectedEmployeeId,
                name: giangVien,
                department: document.getElementById('khoaForm')?.value || null,
            },
            educationSystem: {
                id: heDaoTaoId,
                name: doiTuong,
            },
            // Các metadata không còn nhập trên form: để rỗng/0 theo yêu cầu.
            course: {
                name: null,
                code: null,
                className: null,
                credits: 0,
                studentCount: 0,
            },
            examForm: null,
            coefficient: 0,
            notes: document.getElementById('ghiChuForm')?.value || null,
        },
        items,
    };

    try {
        const previewResponse = await fetch('/v2/vuotgio/kthp-import/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source: 'MANUAL', input: formData })
        });
        const preview = await previewResponse.json();
        if (!previewResponse.ok || !preview.success) {
            throw new Error(preview.message || 'Không thể kiểm tra dữ liệu');
        }
        if (!preview.previewToken) {
            const summary = preview.summary || {};
            const duplicateOnly = summary.duplicate > 0
                && summary.valid === 0
                && summary.invalid === 0;
            return Swal.fire({
                title: duplicateOnly ? 'Bản ghi đã tồn tại' : 'Dữ liệu chưa hợp lệ',
                html: previewIssueMessages(preview),
                icon: duplicateOnly ? 'warning' : 'error'
            });
        }

        const warningText = (preview.warnings || [])
            .slice(0, 5)
            .map((warning) => `• ${escapeHtml(warning.message)}`)
            .join('<br>');
        const previewItems = (preview.rows || [])
            .map((row) => describePreviewRow(row.dto))
            .join('<br>');
        const confirmation = await Swal.fire({
            title: 'Xác nhận dữ liệu',
            html: `Sẽ lưu <b>${preview.summary.valid}</b> bản ghi.`
                + (previewItems ? `<br><br>${previewItems}` : '')
                + (warningText ? `<br><br>${warningText}` : ''),
            icon: warningText ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonText: 'Lưu dữ liệu',
            cancelButtonText: 'Quay lại'
        });
        if (!confirmation.isConfirmed) return;

        const commitResponse = await fetch('/v2/vuotgio/kthp-import/commit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ previewToken: preview.previewToken })
        });
        const result = await commitResponse.json();
        if (!commitResponse.ok || !result.success) {
            throw new Error(result.message || 'Không thể lưu dữ liệu');
        }
        await Swal.fire('Thành công', result.message, 'success');
        document.getElementById('themKTHPForm').reset();
        selectedEmployeeId = null;
        resetCalculator();
    } catch (error) {
        console.error('Error saving:', error);
        Swal.fire('Lỗi', error.message || 'Có lỗi xảy ra khi lưu', 'error');
    }
}
