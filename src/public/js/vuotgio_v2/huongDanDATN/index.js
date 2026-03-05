/**
 * VUOT GIO V2 - Hướng Dẫn Đồ Án Tốt Nghiệp
 * JavaScript cho trang view hướng dẫn ĐATN
 * Hiển thị dữ liệu nhóm theo giảng viên với số tiết
 * Date: 2026-02-03
 */

document.addEventListener("DOMContentLoaded", function () {
    // =====================================================
    // KHỞI TẠO
    // =====================================================
    
    initDropdowns();
    
    // Event listeners
    document.getElementById("loadDataBtn").addEventListener("click", loadData);
    document.getElementById("filterGiangVien").addEventListener("input", filterTable);
    
    // =====================================================
    // LOAD DROPDOWNS
    // =====================================================
    
    async function initDropdowns() {
        await Promise.all([
            loadNamHoc(),
            loadKhoa(),
            loadHeDaoTao()
        ]);
    }
    
    async function loadNamHoc() {
        try {
            const response = await fetch("/api/namhoc");
            const data = await response.json();
            
            const select = document.getElementById("namHocFilter");
            select.innerHTML = "";
            
            data.forEach((item, index) => {
                const option = document.createElement("option");
                option.value = item.NamHoc;
                option.textContent = item.NamHoc;
                // Select năm học có trạng thái = 1 hoặc năm đầu tiên
                if (item.trangthai === 1 || (index === 0 && !data.some(i => i.trangthai === 1))) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        } catch (error) {
            console.error("Error loading NamHoc:", error);
        }
    }
    
    async function loadKhoa() {
        try {
            const response = await fetch("/api/khoa");
            const data = await response.json();
            
            const select = document.getElementById("khoaFilter");
            // Giữ option "Tất cả" đã có sẵn
            
            data.forEach(item => {
                const option = document.createElement("option");
                option.value = item.MaPhongBan;
                option.textContent = item.TenPhongBan || item.MaPhongBan;
                select.appendChild(option);
            });
        } catch (error) {
            console.error("Error loading Khoa:", error);
        }
    }
    
    async function loadHeDaoTao() {
        try {
            const response = await fetch("/api/gvm/v1/he-do-an");
            const data = await response.json();
            
            if (!data.success) return;
            
            const select = document.getElementById("heDaoTaoFilter");
            select.innerHTML = "";
            
            data.data.forEach((item, index) => {
                const option = document.createElement("option");
                option.value = item.id;
                option.textContent = item.he_dao_tao;
                if (index === 0) option.selected = true;
                select.appendChild(option);
            });
        } catch (error) {
            console.error("Error loading He Dao Tao:", error);
        }
    }
    
    // =====================================================
    // LOAD DATA
    // =====================================================
    
    async function loadData() {
        const dot = document.getElementById("dotFilter").value;
        const ki = document.getElementById("kiFilter").value;
        const namHoc = document.getElementById("namHocFilter").value;
        const khoa = document.getElementById("khoaFilter").value;
        const heDaoTao = document.getElementById("heDaoTaoFilter").value;
        
        if (!namHoc) {
            Swal.fire({
                icon: "warning",
                title: "Thông báo",
                text: "Vui lòng chọn năm học",
                confirmButtonText: "OK"
            });
            return;
        }
        
        try {
            // Show loading
            Swal.fire({
                title: "Đang tải dữ liệu...",
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
            
            const params = new URLSearchParams({
                NamHoc: namHoc,
                Dot: dot,
                Ki: ki,
                Khoa: khoa,
                HeDaoTao: heDaoTao
            });
            
            const response = await fetch(`/v2/vuotgio/huong-dan-datn/table?${params}`);
            const result = await response.json();
            
            Swal.close();
            
            if (result.success) {
                renderTable(result.data);
                document.getElementById("tongSoTiet").innerHTML = `<strong>${result.tongSoTiet || 0}</strong>`;
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Lỗi",
                    text: result.message || "Không thể tải dữ liệu"
                });
            }
        } catch (error) {
            Swal.close();
            console.error("Error loading data:", error);
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: "Lỗi kết nối server"
            });
        }
    }
    
    // =====================================================
    // RENDER TABLE
    // =====================================================
    
    function renderTable(data) {
        const tableBody = document.getElementById("tableBody");
        tableBody.innerHTML = "";
        
        if (!data || data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-2x mb-2"></i><br>
                        Không có dữ liệu
                    </td>
                </tr>
            `;
            return;
        }
        
        data.forEach((row, index) => {
            const tr = document.createElement("tr");
            tr.setAttribute("data-giangvien", row.GiangVien || "");
            
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td class="text-start">${row.GiangVien || ""}</td>
                <td>${row.Khoa || ""}</td>
                <td>${row.TongSoTiet || 0}</td>
                <td>
                    <button class="btn btn-info btn-view" onclick="viewChiTiet('${encodeURIComponent(row.GiangVien || "")}')">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            
            tableBody.appendChild(tr);
        });
    }
    
    // =====================================================
    // FILTER TABLE
    // =====================================================
    
    function filterTable() {
        const filterValue = document.getElementById("filterGiangVien").value.toLowerCase();
        const rows = document.querySelectorAll("#tableBody tr");
        
        rows.forEach(row => {
            const giangVien = row.getAttribute("data-giangvien") || "";
            if (giangVien.toLowerCase().includes(filterValue)) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });
    }
});

// =====================================================
// VIEW CHI TIET (Global function for onclick)
// =====================================================

async function viewChiTiet(giangVienEncoded) {
    const giangVien = decodeURIComponent(giangVienEncoded);
    
    const dot = document.getElementById("dotFilter").value;
    const ki = document.getElementById("kiFilter").value;
    const namHoc = document.getElementById("namHocFilter").value;
    const khoa = document.getElementById("khoaFilter").value;
    const heDaoTao = document.getElementById("heDaoTaoFilter").value;
    
    try {
        // Show loading
        Swal.fire({
            title: "Đang tải chi tiết...",
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });
        
        const params = new URLSearchParams({
            NamHoc: namHoc,
            Dot: dot,
            Ki: ki,
            Khoa: khoa,
            HeDaoTao: heDaoTao
        });
        
        const response = await fetch(`/v2/vuotgio/huong-dan-datn/chi-tiet/${encodeURIComponent(giangVien)}?${params}`);
        const result = await response.json();
        
        Swal.close();
        
        if (result.success) {
            renderChiTietModal(result.data, giangVien, result.tongSoTiet);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById("chiTietModal"));
            modal.show();
        } else {
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: result.message || "Không thể tải chi tiết"
            });
        }
    } catch (error) {
        Swal.close();
        console.error("Error loading chi tiet:", error);
        Swal.fire({
            icon: "error",
            title: "Lỗi",
            text: "Lỗi kết nối server"
        });
    }
}

function renderChiTietModal(data, giangVien, tongSoTiet) {
    document.getElementById("modalGiangVien").textContent = giangVien;
    
    const tableBody = document.getElementById("chiTietTableBody");
    tableBody.innerHTML = "";
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted py-4">
                    Không có dữ liệu
                </td>
            </tr>
        `;
        document.getElementById("modalTongSoTiet").innerHTML = "<strong>0</strong>";
        return;
    }
    
    data.forEach((row, index) => {
        const tr = document.createElement("tr");
        
        // Format dates
        const ngayBD = row.NgayBatDau ? formatDate(row.NgayBatDau) : "";
        const ngayKT = row.NgayKetThuc ? formatDate(row.NgayKetThuc) : "";
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td class="text-start">${row.SinhVien || ""}</td>
            <td>${row.MaSV || ""}</td>
            <td>${row.KhoaSV || ""}</td>
            <td class="text-start">${row.Nganh || ""}</td>
            <td class="text-start">${row.TenDeTai || ""}</td>
            <td>${ngayBD}</td>
            <td>${ngayKT}</td>
            <td>${row.SoTiet || 0}</td>
        `;
        
        tableBody.appendChild(tr);
    });
    
    document.getElementById("modalTongSoTiet").innerHTML = `<strong>${tongSoTiet || 0}</strong>`;
}

function formatDate(dateString) {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}
