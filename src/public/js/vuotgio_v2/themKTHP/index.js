/**
 * Thêm Kết Thúc Học Phần - Frontend JS.
 * Logic mới: người dùng nhập trực tiếp số tiết quy chuẩn cho từng loại KTHP;
 * Giữ nguyên format cấu trúc cũ, tinh chỉnh giao diện đẹp và ăn khớp với dự án.
 */
const sections = [
    {
        id: 1,
        title: "Ra đề thi",
        activityType: "RA_DE",
        saveType: "Ra đề",
        icon: "fa-solid fa-file-pen",
        badgeClass: "badge-ra-de"
    },
    {
        id: 2,
        title: "Coi thi, giám sát",
        activityType: "COI_THI",
        saveType: "Coi thi",
        icon: "fa-solid fa-user-check",
        badgeClass: "badge-coi-thi"
    },
    {
        id: 3,
        title: "Chấm thi",
        activityType: "CHAM_THI",
        saveType: "Chấm thi",
        icon: "fa-solid fa-clipboard-check",
        badgeClass: "badge-cham-thi"
    },
    {
        id: 4,
        title: "Xây dựng ngân hàng câu hỏi thi",
        activityType: "NGAN_HANG_CAU_HOI",
        saveType: "Ngân hàng câu hỏi",
        icon: "fa-solid fa-database",
        badgeClass: "badge-ngan-hang"
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
                select.innerHTML = '<option value="">-- Chọn Khoa / Bộ môn --</option>';
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
            Khoa: row.Khoa || row.MaPhongBan || '',
            MonGiangDayChinh: row.MonGiangDayChinh || ''
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

            const defaultSystem = heDaoTaoList.find((item) =>
                item.value.trim().toLocaleLowerCase('vi-VN') === 'đh đóng học phí'
            ) || heDaoTaoList.find((item) =>
                item.value.toLocaleLowerCase('vi-VN').includes('đóng học phí')
            );

            if (defaultSystem) {
                const defaultId = String(defaultSystem.id);
                Array.from(doiTuongSelect.options).forEach((option) => {
                    option.defaultSelected = option.value === defaultId;
                });
                doiTuongSelect.value = defaultId;
            }
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
    if (!input || !container) return;

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
            container.innerHTML = `<div class="p-2 text-center text-muted" style="font-size: 0.85rem;"><i class="fa-solid fa-magnifying-glass me-1"></i> Không tìm thấy giảng viên</div>`;
            container.classList.add('show');
            return;
        }

        container.innerHTML = suggestions.map(gv => {
            const name = gv.HoTen || gv.TenNhanVien || '';
            const metaInfo = gv.MonGiangDayChinh || gv.Khoa || '';
            const metaTag = metaInfo ? `<span class="teacher-meta">${escapeHtml(metaInfo)}</span>` : '';
            return `
                <div class="suggestion-item" data-id="${escapeHtml(gv.id || '')}" data-name="${escapeHtml(name)}">
                    <i class="fa-solid fa-circle-user text-primary" style="font-size: 1rem;"></i>
                    <span class="teacher-name">${escapeHtml(name)}</span>
                    ${metaTag}
                </div>`;
        }).join('');

        container.classList.add('show');

        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                input.value = item.dataset.name;
                selectedEmployeeId = item.dataset.id || null;
                const selected = giangVienList.find((gv) => String(gv.id) === String(selectedEmployeeId));
                const khoaForm = document.getElementById('khoaForm');
                if (selected?.Khoa && khoaForm) {
                    khoaForm.value = selected.Khoa;
                }
                container.classList.remove('show');
            });
        });
    });

    // Close on blur (with delay)
    input.addEventListener('blur', () => {
        setTimeout(() => {
            container.classList.remove('show');
        }, 250);
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
            ${sections.map((sec) => {
                const val = state.inputs[sec.id] || '';
                const hasVal = Number(val) > 0;
                return `
                <div class="item-row direct-qc-row ${hasVal ? 'has-val' : ''}" id="row-${sec.id}">
                    <div class="i-label">
                        <span class="i-icon-badge ${sec.badgeClass}">
                            <i class="${sec.icon}"></i>
                        </span>
                        <span>${escapeHtml(sec.title)}</span>
                    </div>
                    <div class="i-input">
                        <input type="number" min="0" step="0.01" placeholder="0"
                            class="${hasVal ? 'has-val' : ''}"
                            data-section-id="${sec.id}" value="${val}"
                            aria-label="Số tiết QC - ${escapeHtml(sec.title)}" />
                    </div>
                </div>`;
            }).join('')}
        </div>`;

    app.querySelectorAll('input[data-section-id]').forEach((input) => {
        input.addEventListener('input', () => {
            window.setInput(input.dataset.sectionId, input.value);
            const hasValue = Number(input.value) > 0;
            input.classList.toggle('has-val', hasValue);
            if (row) {
                row.classList.toggle('has-val', hasValue);
            }
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
    Swal.fire({
        title: 'Xác nhận xóa?',
        text: 'Bạn có chắc chắn muốn xóa toàn bộ số liệu đã nhập?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Đồng ý',
        cancelButtonText: 'Hủy bỏ',
        confirmButtonColor: '#dc2626'
    }).then((result) => {
        if (result.isConfirmed) {
            document.getElementById('themKTHPForm').reset();
            selectedEmployeeId = null;
            resetCalculator();
        }
    });
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
        Swal.fire('Lỗi', 'Vui lòng chọn Hệ đào tạo cho lớp học phần.', 'error');
        return;
    }

    const formData = {
        common: {
            academicYear: document.getElementById('namHocForm').value,
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

    const submitBtn = document.getElementById('themKTHPFormSubmit');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Đang kiểm tra...';
        }

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
                + (previewItems ? `<br><br><div class="text-start bg-light p-2 rounded border" style="font-size: 0.9rem;">${previewItems}</div>` : '')
                + (warningText ? `<br><div class="text-start alert alert-warning p-2 mt-2 mb-0" style="font-size: 0.85rem;">${warningText}</div>` : ''),
            icon: warningText ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonText: 'Lưu dữ liệu',
            cancelButtonText: 'Quay lại',
            confirmButtonColor: '#1e40af'
        });
        if (!confirmation.isConfirmed) return;

        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Đang lưu...';
        }

        const commitResponse = await fetch('/v2/vuotgio/kthp-import/commit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ previewToken: preview.previewToken })
        });
        const result = await commitResponse.json();
        if (!commitResponse.ok || !result.success) {
            throw new Error(result.message || 'Không thể lưu dữ liệu');
        }

        await Swal.fire({
            title: 'Thành công',
            text: result.message || 'Đã lưu dữ liệu thành công!',
            icon: 'success',
            confirmButtonColor: '#1e40af'
        });

        document.getElementById('themKTHPForm').reset();
        selectedEmployeeId = null;
        resetCalculator();
    } catch (error) {
        console.error('Error saving:', error);
        Swal.fire('Lỗi', error.message || 'Có lỗi xảy ra khi lưu', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnHtml;
        }
    }
}
