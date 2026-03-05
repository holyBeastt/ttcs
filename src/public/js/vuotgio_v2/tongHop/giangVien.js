/**
 * Tổng hợp theo Giảng viên - Frontend JS
 * VuotGio V2 - Refactored to HTML Table (No AG-Grid)
 */

let globalData = []; // Biến toàn cục để lưu dữ liệu từ server

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('[tongHopGV] DOMContentLoaded - HTML Table Version');
    
    // Load dropdowns
    loadNamHocOptions();
    loadKhoaOptions();

    // Event listeners
    document.getElementById('loadDataBtn').addEventListener('click', loadData);
    document.getElementById('exportBtn').addEventListener('click', exportExcel);
    document.getElementById('filterGiangVien').addEventListener('input', filterTable);
});

// ==================== DATA LOADING ====================

// Load năm học từ API có sẵn
async function loadNamHocOptions() {
    console.log('[tongHopGV] loadNamHocOptions called');
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
            if (item.trangthai === 1 || (index === 0 && !data.some(i => i.trangthai === 1))) {
                option.selected = true;
            }
            select.appendChild(option);
        });
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
    try {
        const response = await fetch('/api/khoa');
        const data = await response.json();
        console.log('[tongHopGV] Khoa data:', data);
        
        const select = document.getElementById('khoaXem');
        data.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.MaPhongBan;
            option.textContent = dept.TenPhongBan || dept.MaPhongBan;
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
    
    if (!namHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'warning');
        return;
    }

    try {
        const response = await fetch(`/v2/vuotgio/tong-hop/giang-vien?namHoc=${namHoc}&khoa=${khoa}`);
        const result = await response.json();
        
        if (!result.success) {
            Swal.fire('Lỗi', result.message || 'Không thể tải dữ liệu', 'error');
            return;
        }
        
        const data = result.data || [];
        globalData = data;
        renderTable(globalData);
        updateSummary(globalData);
        
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

    // Calculate totals
    let totalThucHien = 0;
    let totalDinhMuc = 0;
    let totalThieuNCKH = 0;
    let totalVuotGio = 0;

    data.forEach((row, index) => {
        const tableRow = document.createElement('tr');
        tableRow.setAttribute('data-index', index);

        // STT
        const sttTd = document.createElement('td');
        sttTd.textContent = STT++;
        tableRow.appendChild(sttTd);

        // Mã GV (không có trong API, để trống hoặc dùng STT)
        const maGVTd = document.createElement('td');
        maGVTd.textContent = STT - 1;
        tableRow.appendChild(maGVTd);

        // Họ tên (giangVien từ API)
        const hoTenTd = document.createElement('td');
        hoTenTd.textContent = row.giangVien || '';
        hoTenTd.style.textAlign = 'left';
        tableRow.appendChild(hoTenTd);

        // Khoa (maKhoa từ API)
        const khoaTd = document.createElement('td');
        khoaTd.textContent = row.maKhoa || '';
        tableRow.appendChild(khoaTd);

        // Chức danh (không có trong API)
        const chucDanhTd = document.createElement('td');
        chucDanhTd.textContent = '';
        tableRow.appendChild(chucDanhTd);

        // Thực hiện (soTietThucHien từ API)
        const thucHienTd = document.createElement('td');
        thucHienTd.textContent = formatNumber(row.soTietThucHien);
        thucHienTd.style.textAlign = 'right';
        tableRow.appendChild(thucHienTd);
        totalThucHien += row.soTietThucHien || 0;

        // Định mức (soTietDinhMuc từ API)
        const dinhMucTd = document.createElement('td');
        dinhMucTd.textContent = formatNumber(row.soTietDinhMuc);
        dinhMucTd.style.textAlign = 'right';
        tableRow.appendChild(dinhMucTd);
        totalDinhMuc += row.soTietDinhMuc || 0;

        // Thiếu NCKH (soTietThieuNCKH từ API)
        const thieuNCKHTd = document.createElement('td');
        thieuNCKHTd.textContent = formatNumber(row.soTietThieuNCKH);
        thieuNCKHTd.style.textAlign = 'right';
        if (row.soTietThieuNCKH > 0) {
            thieuNCKHTd.classList.add('text-danger-bold');
        }
        tableRow.appendChild(thieuNCKHTd);
        totalThieuNCKH += row.soTietThieuNCKH || 0;

        // Vượt giờ (soTietVuotGio từ API)
        const vuotGioTd = document.createElement('td');
        vuotGioTd.textContent = formatNumber(row.soTietVuotGio);
        vuotGioTd.style.textAlign = 'right';
        if (row.soTietVuotGio > 0) {
            vuotGioTd.classList.add('text-success-bold');
        }
        tableRow.appendChild(vuotGioTd);
        totalVuotGio += row.soTietVuotGio || 0;

        // Thao tác - sử dụng giangVien làm ID
        const actionTd = document.createElement('td');
        actionTd.innerHTML = `
            <button class="btn btn-sm btn-info" onclick="showDetail('${encodeURIComponent(row.giangVien)}', '${row.giangVien}')" title="Xem chi tiết">
                <i class="fas fa-eye"></i> Chi tiết
            </button>
        `;
        tableRow.appendChild(actionTd);

        tableBody.appendChild(tableRow);
    });

    // Render footer (totals)
    const footRow = document.createElement('tr');
    footRow.style.fontWeight = 'bold';
    footRow.style.backgroundColor = '#e9ecef';
    
    footRow.innerHTML = `
        <td colspan="5" style="text-align: right;">TỔNG CỘNG</td>
        <td style="text-align: right;">${formatNumber(totalThucHien)}</td>
        <td style="text-align: right;">${formatNumber(totalDinhMuc)}</td>
        <td style="text-align: right;">${formatNumber(totalThieuNCKH)}</td>
        <td style="text-align: right;">${formatNumber(totalVuotGio)}</td>
        <td></td>
    `;

    tableFoot.appendChild(footRow);
}

// ==================== UPDATE SUMMARY ====================

function updateSummary(data) {
    const totalGV = data.length;
    const totalVuotGio = data.reduce((sum, r) => sum + (r.soTietVuotGio || 0), 0);
    const gvCoVuotGio = data.filter(r => r.soTietVuotGio > 0).length;
    const avgVuotGio = totalGV > 0 ? totalVuotGio / totalGV : 0;

    document.getElementById('totalGV').textContent = totalGV;
    document.getElementById('totalVuotGio').textContent = formatNumber(totalVuotGio);
    document.getElementById('avgVuotGio').textContent = formatNumber(avgVuotGio);
    document.getElementById('gvCoVuotGio').textContent = gvCoVuotGio;
}

// ==================== FILTER ====================

function filterTable() {
    const gvFilter = document.getElementById('filterGiangVien').value.toLowerCase();
    const tableRows = document.querySelectorAll('#tableBody tr');

    tableRows.forEach(row => {
        const hoTenCell = row.querySelector('td:nth-child(3)'); // Họ tên
        const hoTenValue = hoTenCell ? hoTenCell.textContent.toLowerCase() : '';

        if (hoTenValue.includes(gvFilter)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ==================== DETAIL MODAL ====================

// Show detail modal
async function showDetail(maGV, hoTen) {
    const namHoc = document.getElementById('namHocXem').value;
    
    document.getElementById('detailGVName').textContent = hoTen;
    
    try {
        const response = await fetch(`/v2/vuotgio/tong-hop/chi-tiet/${maGV}?namHoc=${namHoc}`);
        const result = await response.json();
        
        if (!result.success) {
            Swal.fire('Lỗi', result.message || 'Không thể tải chi tiết', 'error');
            return;
        }
        
        renderDetailContent(result.data);
        
        const modal = new bootstrap.Modal(document.getElementById('detailModal'));
        modal.show();
    } catch (error) {
        console.error('Error loading detail:', error);
        Swal.fire('Lỗi', 'Không thể tải chi tiết', 'error');
    }
}

// Render detail content
function renderDetailContent(data) {
    let html = '';
    
    // Tính tổng số tiết
    const totalGiangDay = (data.giangDay || []).reduce((s, r) => s + (r.QuyChuan || 0), 0);
    const totalLopNgoaiQC = (data.lopNgoaiQC || []).reduce((s, r) => s + (r.QuyChuan || 0), 0);
    const totalKTHP = (data.kthp || []).reduce((s, r) => s + (r.sotietqc || 0), 0);
    const totalDoAn = (data.doAn || []).reduce((s, r) => s + (r.SoTiet || 0), 0);
    const totalThucHien = totalGiangDay + totalLopNgoaiQC + totalKTHP + totalDoAn;
    
    // Summary
    html += `
        <div class="card mb-3">
            <div class="card-header bg-primary text-white">
                <h6 class="mb-0">Tổng hợp - ${data.giangVien || ''}</h6>
            </div>
            <div class="card-body">
                <div class="row">
                    <div class="col-md-3">
                        <strong>Giảng dạy:</strong> ${formatNumber(totalGiangDay)}
                    </div>
                    <div class="col-md-3">
                        <strong>Ngoài QC:</strong> ${formatNumber(totalLopNgoaiQC)}
                    </div>
                    <div class="col-md-3">
                        <strong>KTHP:</strong> ${formatNumber(totalKTHP)}
                    </div>
                    <div class="col-md-3">
                        <strong>Đồ án:</strong> ${formatNumber(totalDoAn)}
                    </div>
                </div>
                <hr>
                <div class="row">
                    <div class="col-md-12">
                        <strong>Tổng thực hiện:</strong> <span class="text-primary fs-5">${formatNumber(totalThucHien)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Giảng dạy
    if (data.giangDay && data.giangDay.length > 0) {
        html += `
            <div class="card mb-3">
                <div class="card-header bg-info text-white d-flex justify-content-between">
                    <h6 class="mb-0">Giảng dạy</h6>
                    <span class="badge bg-light text-dark">${data.giangDay.length} lớp</span>
                </div>
                <div class="card-body p-0">
                    <table class="table table-sm table-striped mb-0">
                        <thead>
                            <tr>
                                <th>HK</th>
                                <th>Mã HP</th>
                                <th>Tên HP</th>
                                <th>Lớp</th>
                                <th class="text-end">Quy chuẩn</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.giangDay.map(row => `
                                <tr>
                                    <td>${row.HocKy || ''}</td>
                                    <td>${row.MaHocPhan || ''}</td>
                                    <td>${row.TenHocPhan || ''}</td>
                                    <td>${row.Lop || ''}</td>
                                    <td class="text-end">${formatNumber(row.QuyChuan)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="table-dark">
                                <th colspan="4">Tổng</th>
                                <th class="text-end">${formatNumber(totalGiangDay)}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    }
    
    // Lớp ngoài quy chuẩn
    if (data.lopNgoaiQC && data.lopNgoaiQC.length > 0) {
        html += `
            <div class="card mb-3">
                <div class="card-header bg-warning d-flex justify-content-between">
                    <h6 class="mb-0">Lớp ngoài quy chuẩn</h6>
                    <span class="badge bg-dark">${data.lopNgoaiQC.length} lớp</span>
                </div>
                <div class="card-body p-0">
                    <table class="table table-sm table-striped mb-0">
                        <thead>
                            <tr>
                                <th>HK</th>
                                <th>Mã HP</th>
                                <th>Tên HP</th>
                                <th>Lớp</th>
                                <th class="text-end">Quy chuẩn</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.lopNgoaiQC.map(row => `
                                <tr>
                                    <td>${row.HocKy || ''}</td>
                                    <td>${row.MaHocPhan || ''}</td>
                                    <td>${row.TenHocPhan || ''}</td>
                                    <td>${row.Lop || ''}</td>
                                    <td class="text-end">${formatNumber(row.QuyChuan)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="table-dark">
                                <th colspan="4">Tổng</th>
                                <th class="text-end">${formatNumber(totalLopNgoaiQC)}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    }
    
    // KTHP
    if (data.kthp && data.kthp.length > 0) {
        html += `
            <div class="card mb-3">
                <div class="card-header bg-success text-white d-flex justify-content-between">
                    <h6 class="mb-0">Kết thúc học phần</h6>
                    <span class="badge bg-light text-dark">${data.kthp.length} bản ghi</span>
                </div>
                <div class="card-body p-0">
                    <table class="table table-sm table-striped mb-0">
                        <thead>
                            <tr>
                                <th>HK</th>
                                <th>Tên HP</th>
                                <th>Lớp</th>
                                <th>Hình thức</th>
                                <th class="text-end">Số tiết QC</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.kthp.map(row => `
                                <tr>
                                    <td>${row.ki || ''}</td>
                                    <td>${row.tenhocphan || ''}</td>
                                    <td>${row.lop || ''}</td>
                                    <td>${row.hinhthuc || ''}</td>
                                    <td class="text-end">${formatNumber(row.sotietqc)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="table-dark">
                                <th colspan="4">Tổng</th>
                                <th class="text-end">${formatNumber(totalKTHP)}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    }
    
    // Đồ án
    if (data.doAn && data.doAn.length > 0) {
        html += `
            <div class="card mb-3">
                <div class="card-header bg-secondary text-white d-flex justify-content-between">
                    <h6 class="mb-0">Hướng dẫn đồ án</h6>
                    <span class="badge bg-light text-dark">${data.doAn.length} đồ án</span>
                </div>
                <div class="card-body p-0">
                    <table class="table table-sm table-striped mb-0">
                        <thead>
                            <tr>
                                <th>Tên SV</th>
                                <th>Mã SV</th>
                                <th>Khóa</th>
                                <th class="text-end">Số tiết</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.doAn.map(row => `
                                <tr>
                                    <td>${row.TenSinhVien || row.HoTen || ''}</td>
                                    <td>${row.MaSV || row.MaSinhVien || ''}</td>
                                    <td>${row.Khoa || ''}</td>
                                    <td class="text-end">${formatNumber(row.SoTiet)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr class="table-dark">
                                <th colspan="3">Tổng</th>
                                <th class="text-end">${formatNumber(totalDoAn)}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    }
    
    // NCKH
    if (data.nckh && data.nckh.length > 0) {
        html += `
            <div class="card mb-3">
                <div class="card-header bg-danger text-white d-flex justify-content-between">
                    <h6 class="mb-0">NCKH</h6>
                    <span class="badge bg-light text-dark">${data.nckh.length} bản ghi</span>
                </div>
                <div class="card-body p-0">
                    <table class="table table-sm table-striped mb-0">
                        <thead>
                            <tr>
                                <th>Loại</th>
                                <th>Tên</th>
                                <th class="text-end">Số tiết</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.nckh.map(row => `
                                <tr>
                                    <td>${row.PhanLoai || ''}</td>
                                    <td>${row.TenCongTrinh || ''}</td>
                                    <td class="text-end">${formatNumber(row.SoTiet || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    document.getElementById('detailModalBody').innerHTML = html;
}


// ==================== EXPORT EXCEL ====================

function exportExcel() {
    if (globalData.length === 0) {
        Swal.fire('Thông báo', 'Không có dữ liệu để xuất', 'info');
        return;
    }

    const namHoc = document.getElementById('namHocXem').value;
    const khoa = document.getElementById('khoaXem').value;
    
    // Create CSV content
    let csvContent = '\uFEFF'; // BOM for UTF-8
    csvContent += 'STT,Mã GV,Họ tên,Khoa,Chức danh,Thực hiện,Định mức,Thiếu NCKH,Vượt giờ\n';
    
    globalData.forEach((row, index) => {
        csvContent += `${index + 1},"${row.MaGV || ''}","${row.HoTen || ''}","${row.MaKhoa || ''}","${row.ChucDanh || ''}",${row.SoTietThucHien || 0},${row.SoTietDinhMuc || 0},${row.SoTietThieuNCKH || 0},${row.SoTietVuotGio || 0}\n`;
    });

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `TongHopVuotGio_${namHoc}_${khoa}.csv`;
    link.click();
}
