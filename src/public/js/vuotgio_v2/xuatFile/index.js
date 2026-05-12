/**
 * Xuat File V2 — Frontend JS
 * Handles UI toggle, filter logic, and API calls for both export types.
 */

/* ════════════════════════════════════════════════════
   State
   ════════════════════════════════════════════════════ */
let currentType = 'A';   // 'A' = Kê khai cá nhân  |  'B' = Tổng hợp
let currentScope = 'all'; // 'all' | 'khoa' | 'gv'

/* ════════════════════════════════════════════════════
   Boot
   ════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
    loadNamHocOptions();
    loadKhoaOptions();
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
    const select = document.getElementById('giangVienA');
    if (!select) return;

    try {
        const res  = await fetch(`/v2/vuotgio/api/teachers?Khoa=${encodeURIComponent(khoa)}`);
        const data = await res.json();

        select.innerHTML = '<option value="">— Chọn giảng viên —</option>';
        data.forEach(gv => {
            const opt = document.createElement('option');
            opt.value = gv.id_User || gv.HoTen;
            opt.textContent = `${gv.HoTen}${gv.Khoa ? ` (${gv.Khoa})` : ''}`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('[xuatFile] loadGiangVien error:', err);
        const select = document.getElementById('giangVienA');
        if (select) select.innerHTML = '<option value="">— Chọn giảng viên —</option>';
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
        const gv   = document.getElementById('giangVienA')?.value;
        if (!gv) return Swal.fire('Thiếu thông tin', 'Vui lòng chọn Giảng viên', 'warning');
        if (khoa && khoa !== 'ALL') query.set('khoa', khoa);
        query.set('giangVien', gv);
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
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match && match[1]) filename = match[1].replace(/['"]/g, '');

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
