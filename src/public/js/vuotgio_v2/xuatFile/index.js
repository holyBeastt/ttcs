/**
 * Xuat File V2 — Frontend JS
 * Handles UI toggle, filter logic, and API calls for both export types.
 */

/* ════════════════════════════════════════════════════
   State
   ════════════════════════════════════════════════════ */
let currentType = 'A';   // 'A' = Kê khai cá nhân  |  'B' = Tổng hợp
let currentScope = 'all'; // 'all' | 'khoa' | 'gv'
let lockStatusCache = {}; // { namHoc: { locked: bool, lockInfo: object } }

let giangVienList = [];
let selectedTeacherId = null;
let selectedTeacherName = '';
let activeSuggestionIndex = -1;

/* ════════════════════════════════════════════════════
   Boot
   ════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
    loadNamHocOptions();
    loadKhoaOptions();
    setupGiangVienAutocomplete();

    // Listen for năm học changes to check lock status
    document.getElementById('namHocA')?.addEventListener('change', () => checkLockStatus('A'));
    document.getElementById('namHocB')?.addEventListener('change', () => checkLockStatus('B'));
});

/* ════════════════════════════════════════════════════
   Type toggle: A / B
   ════════════════════════════════════════════════════ */
function setType(type) {
    currentType = type;

    const btnA  = document.getElementById('btnTypeA');
    const btnB  = document.getElementById('btnTypeB');
    const panelA = document.getElementById('panelTypeA');
    const panelB = document.getElementById('panelTypeB');

    if (type === 'A') {
        btnA.className  = 'xf-type-btn active-typeA';
        btnB.className  = 'xf-type-btn';
        panelA.classList.remove('hidden');
        panelB.classList.add('hidden');
    } else {
        btnA.className  = 'xf-type-btn';
        btnB.className  = 'xf-type-btn active-typeB';
        panelA.classList.add('hidden');
        panelB.classList.remove('hidden');
    }
}

/* ════════════════════════════════════════════════════
   Scope toggle (Type A only): all / khoa / gv
   ════════════════════════════════════════════════════ */
function setScope(scope) {
    currentScope = scope;

    // Update visual state of scope buttons
    ['all', 'khoa', 'gv'].forEach(s => {
        const el = document.getElementById('scope' + s.charAt(0).toUpperCase() + s.slice(1));
        if (el) el.classList.toggle('selected', s === scope);
    });

    const khoaRow = document.getElementById('khoaFilterRow');
    const gvRow   = document.getElementById('gvFilterRow');

    if (scope === 'all') {
        khoaRow.classList.add('hidden');
        gvRow.classList.add('hidden');
    } else if (scope === 'khoa') {
        khoaRow.classList.remove('hidden');
        gvRow.classList.add('hidden');
        // Reset khoa select to ALL
        const khoaSelect = document.getElementById('khoaA');
        if (khoaSelect) khoaSelect.value = 'ALL';
    } else {
        // gv
        khoaRow.classList.remove('hidden');
        gvRow.classList.remove('hidden');
        loadGiangVienByKhoa();
    }
}

/* ════════════════════════════════════════════════════
   Data loaders
   ════════════════════════════════════════════════════ */
async function loadNamHocOptions() {
    try {
        const res  = await fetch('/api/namhoc');
        const data = await res.json();

        document.querySelectorAll('.namHoc').forEach(select => {
            select.innerHTML = '';
            data.forEach((item, index) => {
                const opt = document.createElement('option');
                opt.value = item.NamHoc;
                opt.textContent = item.NamHoc;
                if (item.trangthai === 1 || (index === 0 && !data.some(i => i.trangthai === 1))) {
                    opt.selected = true;
                }
                select.appendChild(opt);
            });
        });

        // Check lock status for the initially selected năm học
        checkLockStatus('A');
        checkLockStatus('B');
    } catch (err) {
        console.error('[xuatFile] loadNamHoc error:', err);
        const year = new Date().getFullYear();
        document.querySelectorAll('.namHoc').forEach(select => {
            select.innerHTML = `<option value="${year}-${year + 1}">${year}-${year + 1}</option>`;
        });
    }
}

async function loadKhoaOptions() {
    try {
        const res  = await fetch('/api/khoa');
        const data = await res.json();

        document.querySelectorAll('.khoa').forEach(select => {
            select.innerHTML = '<option value="ALL">Tất cả các Khoa</option>';
            data.forEach(dept => {
                const opt = document.createElement('option');
                opt.value = dept.MaPhongBan;
                opt.textContent = dept.TenPhongBan || dept.MaPhongBan;
                select.appendChild(opt);
            });
        });

        // When khoa changes, reload GV list
        const khoaA = document.getElementById('khoaA');
        if (khoaA) khoaA.addEventListener('change', loadGiangVienByKhoa);
    } catch (err) {
        console.error('[xuatFile] loadKhoa error:', err);
    }
}

async function loadGiangVienByKhoa() {
    const khoa  = document.getElementById('khoaA')?.value || 'ALL';
    const input = document.getElementById('giangVienA');
    const hiddenId = document.getElementById('giangVienIdA');

    try {
        const res  = await fetch(`/v2/vuotgio/api/teachers?Khoa=${encodeURIComponent(khoa)}`);
        const data = await res.json();

        giangVienList = (Array.isArray(data) ? data : []).map(gv => ({
            id: gv.id_User || gv.id,
            HoTen: gv.HoTen || '',
            Khoa: gv.Khoa || ''
        })).filter(gv => gv.HoTen);

        // Nếu đã chọn một giảng viên nhưng không thuộc khoa mới lọc (khi khoa !== 'ALL')
        if (khoa !== 'ALL' && selectedTeacherId) {
            const exists = giangVienList.some(gv => String(gv.id) === String(selectedTeacherId));
            if (!exists) {
                if (input) input.value = '';
                if (hiddenId) hiddenId.value = '';
                selectedTeacherId = null;
                selectedTeacherName = '';
            }
        }
    } catch (err) {
        console.error('[xuatFile] loadGiangVien error:', err);
        giangVienList = [];
    }
}

/* ════════════════════════════════════════════════════
   Autocomplete Giảng Viên
   ════════════════════════════════════════════════════ */
function setupGiangVienAutocomplete() {
    const input = document.getElementById('giangVienA');
    const container = document.getElementById('suggestionContainer');
    const hiddenId = document.getElementById('giangVienIdA');
    if (!input || !container) return;

    function renderSuggestions(query = '') {
        const normalizedQuery = removeVietnameseTones(query).toLowerCase().trim();
        const rawQuery = query.toLowerCase().trim();

        let filtered = giangVienList;
        if (normalizedQuery) {
            filtered = giangVienList.filter(gv => {
                const nameNoTone = removeVietnameseTones(gv.HoTen).toLowerCase();
                const nameRaw = (gv.HoTen || '').toLowerCase();
                const khoaRaw = (gv.Khoa || '').toLowerCase();
                return nameNoTone.includes(normalizedQuery) || nameRaw.includes(rawQuery) || khoaRaw.includes(rawQuery);
            });
        }

        const listToDisplay = filtered.slice(0, 15);
        activeSuggestionIndex = -1;

        if (listToDisplay.length === 0) {
            container.innerHTML = '<div class="suggestion-empty"><i class="fas fa-magnifying-glass me-1"></i> Không tìm thấy giảng viên phù hợp</div>';
            container.classList.add('show');
            return;
        }

        container.innerHTML = listToDisplay.map(gv => {
            const metaTag = gv.Khoa ? `<span class="teacher-meta">${escapeHtml(gv.Khoa)}</span>` : '';
            return `
                <div class="suggestion-item" data-id="${escapeHtml(gv.id)}" data-name="${escapeHtml(gv.HoTen)}" data-khoa="${escapeHtml(gv.Khoa)}">
                    <i class="fa-solid fa-circle-user text-primary" style="font-size: 1rem;"></i>
                    <span class="teacher-name">${escapeHtml(gv.HoTen)}</span>
                    ${metaTag}
                </div>`;
        }).join('');

        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                selectTeacher(item.dataset.id, item.dataset.name, item.dataset.khoa);
            });
        });

        container.classList.add('show');
    }

    function selectTeacher(id, name, khoa) {
        input.value = name;
        if (hiddenId) hiddenId.value = id;
        selectedTeacherId = id;
        selectedTeacherName = name;
        container.classList.remove('show');
        activeSuggestionIndex = -1;
    }

    input.addEventListener('input', () => {
        const val = input.value;
        if (val.trim() !== selectedTeacherName) {
            selectedTeacherId = null;
            if (hiddenId) hiddenId.value = '';
        }
        renderSuggestions(val);
    });

    input.addEventListener('focus', () => {
        renderSuggestions(input.value);
    });

    input.addEventListener('keydown', (e) => {
        const items = container.querySelectorAll('.suggestion-item');
        if (!container.classList.contains('show') || items.length === 0) {
            if (e.key === 'ArrowDown') {
                renderSuggestions(input.value);
            }
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
            updateActiveItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
            updateActiveItem(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeSuggestionIndex >= 0 && activeSuggestionIndex < items.length) {
                const item = items[activeSuggestionIndex];
                selectTeacher(item.dataset.id, item.dataset.name, item.dataset.khoa);
            }
        } else if (e.key === 'Escape') {
            container.classList.remove('show');
            activeSuggestionIndex = -1;
        }
    });

    function updateActiveItem(items) {
        items.forEach((it, idx) => {
            it.classList.toggle('active', idx === activeSuggestionIndex);
            if (idx === activeSuggestionIndex) {
                it.scrollIntoView({ block: 'nearest' });
            }
        });
    }

    // Đóng dropdown khi click ra ngoài
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-container')) {
            container.classList.remove('show');
            activeSuggestionIndex = -1;
        }
    });
}

/* ════════════════════════════════════════════════════
   Lock status check
   ════════════════════════════════════════════════════ */
async function checkLockStatus(type) {
    const selectId = type === 'A' ? 'namHocA' : 'namHocB';
    const btnId    = type === 'A' ? 'btnExportA' : 'btnExportB';
    const namHoc   = document.getElementById(selectId)?.value;
    const btn      = document.getElementById(btnId);

    if (!namHoc || !btn) return;

    // Check cache first
    if (lockStatusCache[namHoc] !== undefined) {
        _updateExportButton(btn, type, lockStatusCache[namHoc]);
        return;
    }

    try {
        const res = await fetch(`/v2/vuotgio/trang-thai-khoa?namHoc=${encodeURIComponent(namHoc)}`);
        const data = await res.json();

        if (data.success) {
            lockStatusCache[namHoc] = data.locked;
            _updateExportButton(btn, type, data.locked);
        }
    } catch (err) {
        console.error('[xuatFile] checkLockStatus error:', err);
    }
}

function _updateExportButton(btn, type, locked) {
    const warningId = `lockWarning${type}`;
    let warningEl = document.getElementById(warningId);

    if (!locked) {
        // Chưa lưu → disable nút xuất + hiển thị cảnh báo
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        btn.style.pointerEvents = 'none';

        if (!warningEl) {
            warningEl = document.createElement('div');
            warningEl.id = warningId;
            warningEl.style.cssText = 'background:#fef3c7;border-left:4px solid #b45309;border-radius:0 8px 8px 0;padding:12px 16px;font-size:.87rem;color:#92400e;margin-bottom:16px;display:flex;gap:10px;align-items:center;';
            warningEl.innerHTML = '<i class="fas fa-lock" style="flex-shrink:0;"></i><span><strong>Chưa thể xuất file:</strong> Dữ liệu năm học này chưa được lưu. Vui lòng lưu dữ liệu trước khi xuất file.</span>';
            btn.parentNode.insertBefore(warningEl, btn);
        }
    } else {
        // Đã lưu → enable nút xuất + xóa cảnh báo
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.cursor = '';
        btn.style.pointerEvents = '';

        if (warningEl) {
            warningEl.remove();
        }
    }
}

/* ════════════════════════════════════════════════════
   Export Type A — Kê khai cá nhân
   Query: namHoc + (khoa?) + (giangVien?)
   ════════════════════════════════════════════════════ */
async function exportTypeA() {
    const namHoc = document.getElementById('namHocA')?.value;
    if (!namHoc) return Swal.fire('Thiếu thông tin', 'Vui lòng chọn Năm học', 'warning');

    const query = new URLSearchParams();
    query.set('namHoc', namHoc);

    if (currentScope === 'khoa') {
        const khoa = document.getElementById('khoaA')?.value;
        if (khoa && khoa !== 'ALL') query.set('khoa', khoa);

    } else if (currentScope === 'gv') {
        const khoa = document.getElementById('khoaA')?.value;
        const gvInput = document.getElementById('giangVienA')?.value?.trim();
        if (!gvInput) return Swal.fire('Thiếu thông tin', 'Vui lòng nhập tên Giảng viên', 'warning');

        let gvVal = document.getElementById('giangVienIdA')?.value || selectedTeacherId;
        if (!gvVal || gvInput.toLowerCase() !== (selectedTeacherName || '').toLowerCase()) {
            const match = giangVienList.find(gv =>
                normalizeString(gv.HoTen).toLowerCase() === normalizeString(gvInput).toLowerCase()
            ) || giangVienList.find(gv =>
                removeVietnameseTones(gv.HoTen).toLowerCase() === removeVietnameseTones(gvInput).toLowerCase()
            );
            if (match) {
                gvVal = match.id;
            } else {
                gvVal = gvInput;
            }
        }

        if (khoa && khoa !== 'ALL') query.set('khoa', khoa);
        query.set('giangVien', gvVal);
    }
    // scope === 'all' → không cần thêm khoa / giangVien

    await _download(`/v2/vuotgio/xuat-file/excel?${query.toString()}`, 'Đang tạo file kê khai...');
}

/* ════════════════════════════════════════════════════
   Export Type B — Tổng hợp Khoa/Phòng
   Query: namHoc (toàn bộ khoa)
   ════════════════════════════════════════════════════ */
async function exportTypeB() {
    const namHoc = document.getElementById('namHocB')?.value;
    if (!namHoc) return Swal.fire('Thiếu thông tin', 'Vui lòng chọn Năm học', 'warning');

    const query = new URLSearchParams();
    query.set('namHoc', namHoc);

    await _download(`/v2/vuotgio/xuat-file/tong-hop?${query.toString()}`, 'Đang tạo file tổng hợp...');
}

/* ════════════════════════════════════════════════════
   Download helper (triggers browser download)
   ════════════════════════════════════════════════════ */
async function _download(url, loadingMsg) {
    showLoading(loadingMsg);
    try {
        const res = await fetch(url);

        if (!res.ok) {
            let msg = 'Không thể xuất file';
            try { const err = await res.json(); msg = err.message || msg; } catch (_) {}
            throw new Error(msg);
        }

        const disposition = res.headers.get('Content-Disposition') || '';
        let filename = 'VuotGio_V2.xlsx';
        // Ưu tiên filename* (UTF-8) nếu có, fallback về filename thường
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;\s]+)/i);
        if (utf8Match && utf8Match[1]) {
            filename = decodeURIComponent(utf8Match[1]);
        } else {
            const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match && match[1]) filename = decodeURIComponent(match[1].replace(/['"]/g, ''));
        }

        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);

        hideLoading();
        Swal.fire({ icon: 'success', title: 'Thành công', text: 'File Excel đã được tải xuống', timer: 2000, showConfirmButton: false });
    } catch (err) {
        hideLoading();
        console.error('[xuatFile] download error:', err);
        Swal.fire('Lỗi xuất file', err.message || 'Không thể xuất file', 'error');
    }
}

function showLoading(msg) {
    Swal.fire({
        title: msg || 'Đang xử lý...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });
}
function hideLoading() { Swal.close(); }

/* ════════════════════════════════════════════════════
   String Helpers
   ════════════════════════════════════════════════════ */
function removeVietnameseTones(str) {
    if (!str) return '';
    return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
}

function normalizeString(str) {
    if (!str) return '';
    return String(str).normalize('NFC').trim();
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
