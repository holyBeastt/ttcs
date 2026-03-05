/**
 * Xuất File - Frontend JS
 * VuotGio V2
 */

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Load options
    loadNamHocOptions();
    loadKhoaOptions();

    // Event listeners
    document.getElementById('exportExcelBtn').addEventListener('click', exportExcel);
    document.getElementById('previewBtn').addEventListener('click', previewData);
    
    // Toggle khoa select based on export type
    document.getElementById('exportType').addEventListener('change', function() {
        const khoaGroup = document.getElementById('khoaSelectGroup');
        if (this.value === 'all' || this.value === 'department') {
            khoaGroup.style.display = 'block';
        } else {
            khoaGroup.style.display = 'block';
        }
    });
});

// Load năm học từ API có sẵn
async function loadNamHocOptions() {
    console.log('[xuatFile] loadNamHocOptions called');
    try {
        console.log('[xuatFile] Fetching /api/namhoc...');
        const response = await fetch('/api/namhoc');
        console.log('[xuatFile] Response status:', response.status);
        const data = await response.json();
        console.log('[xuatFile] NamHoc data:', data);
        
        const select = document.getElementById('namHoc');
        console.log('[xuatFile] Found namHoc select:', select);
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
        const select = document.getElementById('namHoc');
        select.innerHTML = `<option value="${currentYear}-${currentYear + 1}">${currentYear}-${currentYear + 1}</option>`;
    }
}

// Load khoa từ API có sẵn
async function loadKhoaOptions() {
    console.log('[xuatFile] loadKhoaOptions called');
    try {
        console.log('[xuatFile] Fetching /api/khoa...');
        const response = await fetch('/api/khoa');
        console.log('[xuatFile] Response status:', response.status);
        const data = await response.json();
        console.log('[xuatFile] Khoa data:', data);
        
        const select = document.getElementById('khoa');
        console.log('[xuatFile] Found khoa select:', select);
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

// Format number
function formatNumber(val) {
    if (val === null || val === undefined) return '0';
    return Number(val).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Preview data
async function previewData() {
    const namHoc = document.getElementById('namHoc').value;
    const khoa = document.getElementById('khoa').value;
    
    if (!namHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'warning');
        return;
    }

    try {
        showLoading();
        
        const response = await fetch(`/v2/vuotgio/tong-hop/giang-vien?namHoc=${namHoc}&khoa=${khoa}`);
        const data = await response.json();
        
        hideLoading();
        
        renderPreview(data);
    } catch (error) {
        hideLoading();
        console.error('Error loading preview:', error);
        Swal.fire('Lỗi', 'Không thể tải dữ liệu xem trước', 'error');
    }
}

// Render preview
function renderPreview(data) {
    const container = document.getElementById('previewContainer');
    
    if (data.length === 0) {
        container.innerHTML = '<div class="alert alert-warning">Không có dữ liệu để xuất</div>';
        return;
    }
    
    // Calculate totals
    const totals = {
        thucHien: data.reduce((sum, r) => sum + (r.SoTietThucHien || 0), 0),
        dinhMuc: data.reduce((sum, r) => sum + (r.SoTietDinhMuc || 0), 0),
        thieuNCKH: data.reduce((sum, r) => sum + (r.SoTietThieuNCKH || 0), 0),
        vuotGio: data.reduce((sum, r) => sum + (r.SoTietVuotGio || 0), 0)
    };
    
    let html = `
        <div class="card">
            <div class="card-header bg-info text-white">
                <h6 class="mb-0"><i class="fas fa-eye"></i> Xem trước dữ liệu xuất (${data.length} giảng viên)</h6>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-sm table-striped table-bordered mb-0">
                        <thead class="table-dark">
                            <tr>
                                <th>STT</th>
                                <th>Mã GV</th>
                                <th>Họ tên</th>
                                <th>Khoa</th>
                                <th class="text-end">Thực hiện</th>
                                <th class="text-end">Định mức</th>
                                <th class="text-end">Thiếu NCKH</th>
                                <th class="text-end">Vượt giờ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map((row, index) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${row.MaGV}</td>
                                    <td>${row.HoTen}</td>
                                    <td>${row.MaKhoa}</td>
                                    <td class="text-end">${formatNumber(row.SoTietThucHien)}</td>
                                    <td class="text-end">${formatNumber(row.SoTietDinhMuc)}</td>
                                    <td class="text-end text-danger">${formatNumber(row.SoTietThieuNCKH)}</td>
                                    <td class="text-end text-success">${formatNumber(row.SoTietVuotGio)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot class="table-dark">
                            <tr>
                                <th colspan="4">TỔNG CỘNG</th>
                                <th class="text-end">${formatNumber(totals.thucHien)}</th>
                                <th class="text-end">${formatNumber(totals.dinhMuc)}</th>
                                <th class="text-end">${formatNumber(totals.thieuNCKH)}</th>
                                <th class="text-end">${formatNumber(totals.vuotGio)}</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Export Excel
async function exportExcel() {
    const namHoc = document.getElementById('namHoc').value;
    const khoa = document.getElementById('khoa').value;
    const exportType = document.getElementById('exportType').value;
    
    if (!namHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'warning');
        return;
    }

    try {
        showLoading('Đang tạo file Excel...');
        
        // Build URL
        let url = `/v2/vuotgio/xuat-file/excel?namHoc=${encodeURIComponent(namHoc)}`;
        if (khoa) {
            url += `&khoa=${encodeURIComponent(khoa)}`;
        }
        url += `&type=${exportType}`;
        
        // Fetch file
        const response = await fetch(url);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Export failed');
        }
        
        // Get filename from header or generate
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `VuotGio_${namHoc}.xlsx`;
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1].replace(/['"]/g, '');
            }
        }
        
        // Download file
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
        
        hideLoading();
        
        Swal.fire({
            icon: 'success',
            title: 'Thành công',
            text: 'File Excel đã được tải xuống',
            timer: 2000
        });
    } catch (error) {
        hideLoading();
        console.error('Error exporting:', error);
        Swal.fire('Lỗi', error.message || 'Không thể xuất file', 'error');
    }
}

// Show loading
function showLoading(message = 'Đang xử lý...') {
    Swal.fire({
        title: message,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
}

// Hide loading
function hideLoading() {
    Swal.close();
}
