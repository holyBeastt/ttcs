/**
 * Tổng hợp theo Giảng viên - Frontend JS
 * VuotGio V2 - Refactored to HTML Table (No AG-Grid)
 */

let globalData = []; // Biến toàn cục để lưu dữ liệu từ server
let previewPdfObjectUrl = null;

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function () {
    console.log('[tongHopGV] DOMContentLoaded - HTML Table Version');

    // Load dropdowns và tự động nạp dữ liệu
    await Promise.all([
        loadNamHocOptions(),
        loadKhoaOptions()
    ]);

    loadData();

    // Event listeners
    document.getElementById('loadDataBtn').addEventListener('click', loadData);
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportExcel);
    document.getElementById('filterGiangVien').addEventListener('input', filterTable);

    // Snapshot actions
    document.getElementById('chotDuLieuBtn').addEventListener('click', chotDuLieu);
    document.getElementById('versionSelect').addEventListener('change', loadData);
    document.getElementById('namHocXem').addEventListener('change', loadHistory);

    // Chuyển sang thống kê Khoa
    const btnSwitchToKhoa = document.getElementById('btnSwitchToKhoa');
    if (btnSwitchToKhoa) {
        btnSwitchToKhoa.addEventListener('click', () => {
            const namHoc = document.getElementById('namHocXem').value;
            window.location.href = `/v2/vuotgio/tong-hop-khoa?namHoc=${encodeURIComponent(namHoc)}`;
        });
    }

    // Toggle Summary
    const btnToggleSummary = document.getElementById('btnToggleSummary');
    if (btnToggleSummary) {
        btnToggleSummary.addEventListener('click', () => {
            document.getElementById('summaryBox').classList.toggle('collapsed');
            const icon = btnToggleSummary.querySelector('i');
            if (icon.classList.contains('bi-chevron-down')) {
                icon.classList.replace('bi-chevron-down', 'bi-chevron-up');
            } else {
                icon.classList.replace('bi-chevron-up', 'bi-chevron-down');
            }
        });
    }
});

// ==================== DATA LOADING ====================

// Load năm học từ API có sẵn
async function loadNamHocOptions() {
    console.log('[tongHopGV] loadNamHocOptions called');
    const urlNamHoc = new URLSearchParams(window.location.search).get('namHoc');
    
    try {
        const response = await fetch('/api/namhoc');
        const data = await response.json();
        console.log('[tongHopGV] NamHoc data:', data);

        const select = document.getElementById('namHocXem');
        select.innerHTML = '';
        data.forEach((item, index) => {
            const option = document.createElement('option');
            option.value = item.NamHoc;
            option.textContent = item.NamHoc;
            
            // Ưu tiên chọn năm học từ URL
            if (urlNamHoc && item.NamHoc === urlNamHoc) {
                option.selected = true;
            } else if (!urlNamHoc && (item.trangthai === 1 || (index === 0 && !data.some(i => i.trangthai === 1)))) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        // Sau khi load xong năm học, load lịch sử chốt
        loadHistory();
    } catch (error) {
        console.error('Error loading nam hoc:', error);
        const currentYear = new Date().getFullYear();
        const select = document.getElementById('namHocXem');
        select.innerHTML = `<option value="${currentYear}-${currentYear + 1}">${currentYear}-${currentYear + 1}</option>`;
    }
}

// Load khoa từ API có sẵn
async function loadKhoaOptions() {
    console.log('[tongHopGV] loadKhoaOptions called');
    const urlKhoa = new URLSearchParams(window.location.search).get('khoa');

    try {
        const response = await fetch('/api/khoa');
        const data = await response.json();
        console.log('[tongHopGV] Khoa data:', data);

        const select = document.getElementById('khoaXem');
        data.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.MaPhongBan;
            option.textContent = dept.TenPhongBan || dept.MaPhongBan;
            
            // Ưu tiên chọn khoa từ URL
            if (urlKhoa && dept.MaPhongBan === urlKhoa) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

// ==================== FORMAT HELPERS ====================

// Format number
function formatNumber(val) {
    if (val === null || val === undefined) return '0';
    return Number(val).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ==================== LOAD DATA ====================

// Load data
async function loadData() {
    const namHoc = document.getElementById('namHocXem').value;
    const khoa = document.getElementById('khoaXem').value;
    const version = document.getElementById('versionSelect').value;

    if (!namHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'warning');
        return;
    }

    try {
        let url = '';
        if (version === 'LIVE') {
            url = `/v2/vuotgio/tong-hop/giang-vien?namHoc=${namHoc}&khoa=${khoa}`;
        } else {
            url = `/v2/vuotgio/tong-hop/snapshot-data?namHoc=${namHoc}&version=${version}`;
        }

        const response = await fetch(url);
        const result = await response.json();

        if (!result.success) {
            Swal.fire('Lỗi', result.message || 'Không thể tải dữ liệu', 'error');
            return;
        }

        let data = result.data || [];

        // Nếu là snapshot, chúng ta vẫn cần filter theo khoa ở client nếu API snapshot chưa filter
        if (version !== 'LIVE' && khoa !== 'ALL') {
            data = data.filter(r => r.maKhoa === khoa);
        }

        globalData = data;
        renderTable(globalData);
        updateSummary(globalData);
        initStickyHeader();


        if (data.length === 0) {
            Swal.fire('Thông báo', 'Không có dữ liệu', 'info');
        }
    } catch (error) {
        console.error('Error loading data:', error);
        Swal.fire('Lỗi', 'Không thể tải dữ liệu', 'error');
    }
}


// ==================== TABLE RENDERING ====================

function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    const tableFoot = document.getElementById('tableFoot');
    tableBody.innerHTML = '';
    tableFoot.innerHTML = '';

    let STT = 1;

    let totalGiangDay = 0;
    let totalDoAn = 0;
    let totalHDTQ = 0;
    let totalKTHP = 0;
    let totalNgoaiQC = 0;
    let totalTongTiet = 0;
    let totalDinhMuc = 0;
    let totalMienGiam = 0;
    let totalDinhMucSauGiamTru = 0;
    let totalThieuTiet = 0;
    let totalNoNCKH = 0;
    let totalThanhToan = 0;

    data.forEach((row, index) => {
        const tableRow = document.createElement('tr');
        tableRow.setAttribute('data-index', index);
        
        // Nếu thiếu tiết giảng dạy (> 0) thì cảnh báo cả dòng
        if (row.thieuTietGiangDay > 0) {
            tableRow.classList.add('row-warning-danger');
        }

        // 1. STT
        // 2. Họ tên
        // 3. Khoa/Phòng
        // 4. % Miễn giảm
        // 5. Chức vụ
        // 6. Lý do miễn giảm
        // 7. Số tiết giảng dạy (soTietGiangDay)
        // 8. Định mức chuẩn (dinhMucChuan)
        // 9. Số tiết được giảm trừ (mienGiam)
        // 10. Định mức sau giảm trừ (dinhMucSauMienGiam)
        // 11. Số tiết Nợ NCKH (thieuNCKH)
        // 12. Thiếu tiết (thieuTietGiangDay)
        // 13. Tổng số tiết (tongThucHien)
        // 14. Số tiết được thanh toán (thanhToan)

        tableRow.innerHTML = `
            <td style="text-align: center;">${STT++}</td>
            <td style="text-align: center;">${row.giangVien || ''}</td>
            <td style="text-align: center;">${row.maKhoa || ''}</td>
            <td style="text-align: center; color: ${row.phanTramMienGiam > 0 ? '#e67e22' : 'inherit'}">
                ${row.phanTramMienGiam || 0}%
            </td>
            <td style="text-align: center;">${row.chucVu || ''}</td>
            <td style="text-align: center;">${row.lyDoMienGiam || ''}</td>
            <td style="text-align: center;">${formatNumber(row.soTietGiangDay)}</td>
            <td style="text-align: center;">${formatNumber(row.soTietDoAn)}</td>
            <td style="text-align: center;">${formatNumber(row.soTietHDTQ)}</td>
            <td style="text-align: center;">${formatNumber(row.soTietKTHP)}</td>
            <td style="text-align: center;">${formatNumber(row.soTietNgoaiQC)}</td>
            <td style="text-align: center; font-weight: bold;">${formatNumber(row.tongThucHien)}</td>
            <td style="text-align: center;">${formatNumber(row.dinhMucChuan)}</td>
            <td style="text-align: center;">${formatNumber(row.mienGiam)}</td>
            <td style="text-align: center;">${formatNumber(row.dinhMucSauMienGiam)}</td>
            <td style="text-align: center;" class="${row.thieuNCKH > 0 ? 'text-danger-bold' : ''}">
                ${formatNumber(row.thieuNCKH)}
            </td>
            <td style="text-align: center; ${row.thieuTietGiangDay > 0 ? 'color: red; font-weight: bold;' : ''}">
                ${formatNumber(row.thieuTietGiangDay)}
            </td>
            <td style="text-align: center; color: green; font-weight: bold;">${formatNumber(row.thanhToan)}</td>
            <td style="text-align: center;">
                <button class="btn btn-sm btn-success" onclick="previewExcel('${row.id_User}', '${row.giangVien}')" title="Xem preview Excel">
                    <i class="fas fa-file-excel"></i>
                </button>
            </td>
        `;

        tableBody.appendChild(tableRow);

        // Sum totals
        totalGiangDay += row.soTietGiangDay || 0;
        totalDoAn += row.soTietDoAn || 0;
        totalHDTQ += row.soTietHDTQ || 0;
        totalKTHP += row.soTietKTHP || 0;
        totalNgoaiQC += row.soTietNgoaiQC || 0;
        totalTongTiet += row.tongThucHien || 0;
        totalDinhMuc += row.dinhMucChuan || 0;
        totalMienGiam += row.mienGiam || 0;
        totalDinhMucSauGiamTru += row.dinhMucSauMienGiam || 0;
        totalThieuTiet += row.thieuTietGiangDay || 0;
        totalNoNCKH += row.thieuNCKH || 0;
        totalThanhToan += row.thanhToan || 0;
    });

    // Render footer
    const footRow = document.createElement('tr');
    footRow.style.fontWeight = 'bold';
    footRow.style.backgroundColor = '#e9ecef';

    footRow.innerHTML = `
        <td colspan="6" style="text-align: center;">TỔNG CỘNG</td>
        <td style="text-align: center;">${formatNumber(totalGiangDay)}</td>
        <td style="text-align: center;">${formatNumber(totalDoAn)}</td>
        <td style="text-align: center;">${formatNumber(totalHDTQ)}</td>
        <td style="text-align: center;">${formatNumber(totalKTHP)}</td>
        <td style="text-align: center;">${formatNumber(totalNgoaiQC)}</td>
        <td style="text-align: center;">${formatNumber(totalTongTiet)}</td>
        <td style="text-align: center;">${formatNumber(totalDinhMuc)}</td>
        <td style="text-align: center;">${formatNumber(totalMienGiam)}</td>
        <td style="text-align: center;">${formatNumber(totalDinhMucSauGiamTru)}</td>
        <td style="text-align: center;">${formatNumber(totalNoNCKH)}</td>
        <td style="text-align: center;">${formatNumber(totalThieuTiet)}</td>
        <td style="text-align: center;">${formatNumber(totalThanhToan)}</td>
        <td></td>
    `;

    tableFoot.appendChild(footRow);
}

/**
 * Đọc chiều rộng thực của td đầu tiên trong tbody và áp lại cho th tương ứng.
 * Giải quyết lệch cột khi scrollbar xuất hiện (scrollbar-gutter fallback).
 */
function syncTableColumnWidths() {
    const firstBodyRow = document.querySelector('#tableBody tr');
    if (!firstBodyRow) return;

    const bodyTds = firstBodyRow.querySelectorAll('td');
    const headThs = document.querySelectorAll('#mainTable thead th');

    bodyTds.forEach((td, i) => {
        if (headThs[i]) {
            const w = td.getBoundingClientRect().width;
            headThs[i].style.width = w + 'px';
            headThs[i].style.minWidth = w + 'px';
        }
    });
}

// ==================== UPDATE SUMMARY ====================

function updateSummary(data) {
    const totalGV = data.length;
    const totalVuotGio = data.reduce((sum, r) => sum + (r.thanhToan || 0), 0);
    const gvCoVuotGio = data.filter(r => (r.thanhToan || 0) > 0).length;

    const elTotalGV = document.getElementById('totalGV');
    const elTotalVuotGio = document.getElementById('totalVuotGio');
    const elGvCoVuotGio = document.getElementById('gvCoVuotGio');

    if (elTotalGV) elTotalGV.textContent = totalGV;
    if (elTotalVuotGio) elTotalVuotGio.textContent = formatNumber(totalVuotGio);
    if (elGvCoVuotGio) elGvCoVuotGio.textContent = gvCoVuotGio;

    // Show the summary box once data is loaded
    const summaryBox = document.getElementById('summaryBox');
    if (summaryBox) summaryBox.style.display = '';
}

// ==================== FILTER ====================

function filterTable() {
    const gvFilter = document.getElementById('filterGiangVien').value.toLowerCase();
    const tableRows = document.querySelectorAll('#tableBody tr');

    tableRows.forEach(row => {
        const hoTenCell = row.querySelector('td:nth-child(2)'); // Họ tên
        const hoTenValue = hoTenCell ? hoTenCell.textContent.toLowerCase() : '';

        if (hoTenValue.includes(gvFilter)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ==================== EXCEL PREVIEW (PDF) ====================

// Preview Excel as PDF generated from xlsx + LibreOffice
async function previewExcel(maGV, hoTen) {
    const namHoc = document.getElementById('namHocXem').value;
    const khoa = document.getElementById('khoaXem').value;
    const previewMode = 'pdf';

    console.info('[vuotgio_v2.preview] click', {
        giangVien: hoTen,
        maGV,
        namHoc,
        khoa,
        previewMode,
        url: `/v2/vuotgio/tong-hop/preview/${maGV}?namHoc=${namHoc}&format=${previewMode}`
    });

    Swal.showLoading();

    try {
        const response = await fetch(`/v2/vuotgio/tong-hop/preview/${maGV}?namHoc=${namHoc}&format=${previewMode}`);
        const result = await response.json();

        console.info('[vuotgio_v2.preview] result from server:', result);

        if (result.success) {
            console.info('[vuotgio_v2.preview] intermediate data keys:', Object.keys(result.data?.intermediateJson || {}));
            if (result.data?.pdfBase64) {
                console.info('[vuotgio_v2.preview] PDF base64 received, length:', result.data.pdfBase64.length);
            }
        }

        if (!result.success) {
            Swal.close();
            Swal.fire('Lỗi', result.message || 'Không thể tải dữ liệu preview', 'error');
            return;
        }

        if (result.data?.pdfBase64) {
            renderExcelPdfPreview(result.data, hoTen, namHoc, khoa);
        } else {
            Swal.close();
            Swal.fire('Lỗi', 'Không tạo được bản PDF preview', 'error');
        }

        if (Array.isArray(result.data?.warnings) && result.data.warnings.length > 0) {
            console.warn('[preview-template] warnings:', result.data.warnings);
            Swal.fire({
                icon: 'warning',
                title: 'Lưu ý preview',
                text: result.data.warnings[0],
                timer: 3500,
                showConfirmButton: false,
            });
        }

    } catch (error) {
        Swal.close();
        console.error('Error loading excel preview:', error);
        Swal.fire('Lỗi', 'Không thể tải chi tiết', 'error');
    }
}

function renderExcelPdfPreview(serverData, hoTen, namHoc, khoa) {
    Swal.close();

    if (previewPdfObjectUrl) {
        URL.revokeObjectURL(previewPdfObjectUrl);
        previewPdfObjectUrl = null;
    }

    const pdfBytes = atob(serverData.pdfBase64);
    const byteNumbers = new Array(pdfBytes.length);
    for (let i = 0; i < pdfBytes.length; i++) {
        byteNumbers[i] = pdfBytes.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
    previewPdfObjectUrl = URL.createObjectURL(pdfBlob);

    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
        Swal.fire('Lỗi', 'Trình duyệt đã chặn cửa sổ preview mới. Vui lòng cho phép popup.', 'error');
        return;
    }

    const escapeHtml = (text) => String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const escapedTitle = escapeHtml(`Xem trước: ${hoTen || ''}`);
    const escapedNamHoc = escapeHtml(namHoc || '');
    const escapedKhoa = escapeHtml(khoa === 'ALL' ? 'Tất cả' : (khoa || ''));
    previewWindow.document.open();
    previewWindow.document.write(`
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${escapedTitle}</title>
            <style>
                html, body {
                    margin: 0;
                    width: 100%;
                    height: 100%;
                    background: #fff;
                    overflow: hidden;
                    font-family: Arial, sans-serif;
                    user-select: none;
                }
                .layout {
                    display: flex;
                    width: 100%;
                    height: 100%;
                }
                .sidebar {
                    width: 260px;
                    min-width: 260px;
                    border-right: 1px solid #e5e7eb;
                    background: #f8fafc;
                    box-sizing: border-box;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .sidebar h1 {
                    margin: 0;
                    font-size: 18px;
                    line-height: 1.3;
                    color: #0f172a;
                }
                .sidebar .meta {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    align-items: stretch;
                    font-size: 14px;
                    color: #334155;
                }
                .meta-item {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    padding: 10px 12px;
                    line-height: 1.4;
                    word-break: break-word;
                }
                .sidebar .actions {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    margin-top: auto;
                }
                .sidebar button {
                    padding: 8px 12px;
                    border: 1px solid #94a3b8;
                    background: #fff;
                    border-radius: 6px;
                    cursor: pointer;
                }
                .viewer {
                    flex: 1;
                    height: 100%;
                    border: 0;
                }
            </style>
            <script>
                // Chặn chuột phải
                document.addEventListener('contextmenu', e => e.preventDefault());
                
                // Chặn phím tắt Ctrl+S, Ctrl+P
                document.addEventListener('keydown', e => {
                    if (e.ctrlKey && (e.key === 's' || e.key === 'p' || e.key === 'S' || e.key === 'P')) {
                        e.preventDefault();
                    }
                });
            </script>
        </head>
        <body>
            <div class="layout">
                <aside class="sidebar">
                    <h1>${escapedTitle}</h1>
                    <div class="meta">
                        <div class="meta-item"><strong>Năm học</strong><br>${escapedNamHoc}</div>
                        <div class="meta-item"><strong>Khoa</strong><br>${escapedKhoa}</div>
                    </div>
                    <div class="actions">
                        <button onclick="window.close()">Đóng</button>
                    </div>
                </aside>
                <iframe class="viewer" src="${previewPdfObjectUrl}#toolbar=0&navpanes=0" title="Excel PDF Preview"></iframe>
            </div>
        </body>
        </html>
    `);
    previewWindow.document.close();
}

// ==================== EXPORT EXCEL ====================

// function exportExcel() {
//     if (globalData.length === 0) {
//         Swal.fire('Thông báo', 'Không có dữ liệu để xuất', 'info');
//         return;
//     }

//     const namHoc = document.getElementById('namHocXem').value;
//     const khoa = document.getElementById('khoaXem').value;

//     // Create CSV content
//     let csvContent = '\uFEFF'; // BOM for UTF-8
//     csvContent += 'STT,Mã GV,Họ tên,Khoa,Chức danh,Thực hiện,Định mức,Thiếu NCKH,Vượt giờ\n';

//     globalData.forEach((row, index) => {
//         csvContent += `${index + 1},"${row.MaGV || ''}","${row.HoTen || ''}","${row.MaKhoa || ''}","${row.ChucDanh || ''}",${row.SoTietThucHien || 0},${row.SoTietDinhMuc || 0},${row.SoTietThieuNCKH || 0},${row.SoTietVuotGio || 0}\n`;
//     });

//     // Download
//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//     const link = document.createElement('a');
//     link.href = URL.createObjectURL(blob);
//     link.download = `TongHopVuotGio_${namHoc}_${khoa}.csv`;
//     link.click();
// }
// ==================== SNAPSHOT ACTIONS ====================

// Tải lịch sử chốt
async function loadHistory() {
    const namHoc = document.getElementById('namHocXem').value;
    if (!namHoc) return;

    try {
        const response = await fetch(`/v2/vuotgio/tong-hop/lich-su-chot?namHoc=${namHoc}`);
        const result = await response.json();

        const select = document.getElementById('versionSelect');
        // Giữ lại option LIVE
        select.innerHTML = '<option value="LIVE">Phiên bản (Live)</option>';

        if (result.success && result.data) {
            result.data.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.version;
                const date = new Date(v.ngay_chot).toLocaleString('vi-VN');
                opt.textContent = `V${v.version} - ${date} ${v.is_latest ? '(Mới nhất)' : ''}`;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

// Chốt dữ liệu
async function chotDuLieu() {
    const namHoc = document.getElementById('namHocXem').value;
    if (!namHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học trước khi chốt', 'warning');
        return;
    }

    const { value: ghiChu } = await Swal.fire({
        title: 'Chốt dữ liệu vượt giờ',
        input: 'text',
        inputLabel: 'Ghi chú cho phiên bản này',
        inputPlaceholder: 'Nhập ghi chú...',
        showCancelButton: true,
        confirmButtonText: 'Chốt ngay',
        cancelButtonText: 'Hủy'
    });

    if (ghiChu === undefined) return; // User cancelled

    try {
        Swal.showLoading();
        const response = await fetch('/v2/vuotgio/tong-hop/chot-du-lieu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ namHoc, ghiChu })
        });
        const result = await response.json();

        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            loadHistory(); // Tải lại dropdown
        } else {
            Swal.fire('Lỗi', result.message, 'error');
        }
    } catch (error) {
        console.error('Error chotDuLieu:', error);
        Swal.fire('Lỗi', 'Không thể chốt dữ liệu', 'error');
    }
}



// Thêm vào cuối file giangVien.js hoặc trong <script> cuối trang
function initStickyHeader() {
    const table = document.getElementById('mainTable');
    if (!table) return;

    // 1. Xóa header cũ nếu đã tồn tại để tránh trùng lặp khi ấn Hiển thị nhiều lần
    const existingWrapper = table.parentElement.querySelector('.sticky-header-wrapper');
    if (existingWrapper) {
        existingWrapper.remove();
    }

    const thead = table.querySelector('thead');
    
    // 2. Reset lại style của thead gốc trước khi clone (để không clone trạng thái đang ẩn)
    thead.style.cssText = '';
    const origThs = thead.querySelectorAll('th');
    origThs.forEach(th => th.style.cssText = '');

    // 3. Tạo wrapper và clone table
    const wrapper = document.createElement('div');
    wrapper.className = 'sticky-header-wrapper'; // Thêm class để dễ nhận diện và xóa
    wrapper.style.cssText = 'position:sticky;top:0;z-index:100;overflow:hidden;box-shadow: 0 2px 5px rgba(0,0,0,0.15);';

    const cloneTable = document.createElement('table');
    cloneTable.className = table.className;
    cloneTable.style.cssText = 'width:100%;margin:0;border-collapse:collapse;table-layout:fixed;';

    const cloneThead = thead.cloneNode(true);
    const cloneThs = cloneThead.querySelectorAll('th');
    cloneThs.forEach(th => {
        th.style.padding = '14px 8px';
    });

    cloneTable.appendChild(cloneThead);
    wrapper.appendChild(cloneTable);

    // 4. Ẩn thead gốc bằng height = 0 nhưng vẫn giữ cấu trúc để đồng bộ độ rộng cột
    thead.style.cssText = 'height:0;line-height:0;visibility:hidden;';
    origThs.forEach(th => {
        th.style.cssText = 'height:0;padding:0 8px;border:0;line-height:0;';
    });
    
    // Chèn sticky header vào trước table
    table.parentElement.insertBefore(wrapper, table);

    // 5. Đồng bộ độ rộng cột
    const syncWidths = () => {
        const currentOrigThs = thead.querySelectorAll('th');
        const currentCloneThs = cloneThead.querySelectorAll('th');
        currentOrigThs.forEach((th, i) => {
            if (currentCloneThs[i]) {
                const width = th.getBoundingClientRect().width + 'px';
                currentCloneThs[i].style.width = width;
                currentCloneThs[i].style.minWidth = width;
            }
        });
        cloneTable.style.width = table.getBoundingClientRect().width + 'px';
    };

    syncWidths();
    
    // 6. Quản lý resize listener: xóa cái cũ trước khi thêm cái mới
    if (window._stickyResizeHandler) {
        window.removeEventListener('resize', window._stickyResizeHandler);
    }
    window._stickyResizeHandler = syncWidths;
    window.addEventListener('resize', window._stickyResizeHandler);

    // 7. Khởi tạo hover effect (chỉ chạy một lần duy nhất qua delegation)
    initTableHover();
}

/**
 * Hiệu ứng hover theo cột cho bảng (Dùng delegation để tránh trùng lặp event listener)
 */
function initTableHover() {
    const container = document.getElementById('renderInfo');
    if (!container || container._hoverInitialized) return;
    container._hoverInitialized = true;

    container.addEventListener('mouseover', function(e) {
        const cell = e.target.closest('td, th');
        if (!cell) return;
        const index = cell.cellIndex;
        
        // Tìm tất cả table trong container (bao gồm table chính và sticky clone)
        const allTables = container.querySelectorAll('table');
        allTables.forEach(t => {
            const cells = t.querySelectorAll(`tbody tr td:nth-child(${index + 1})`);
            cells.forEach(c => c.classList.add('column-hover'));
        });
    });

    container.addEventListener('mouseout', function(e) {
        const cell = e.target.closest('td, th');
        if (!cell) return;
        container.querySelectorAll('.column-hover').forEach(c => c.classList.remove('column-hover'));
    });
}

// Gọi sau khi render xong dữ liệu
// Thêm initStickyHeader() vào cuối hàm render bảng của mày