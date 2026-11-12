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
    
    // Khởi tạo và tự động tải dữ liệu
    initDropdowns().then(() => {
        loadData();
    });
    
    // Event listeners
    document.getElementById("loadDataBtn").addEventListener("click", loadData);
    document.getElementById("filterGiangVien").addEventListener("input", filterTable);
    document.getElementById("exportExcelBtn")?.addEventListener("click", exportToExcel);
    document.getElementById("exportChiTietExcelBtn")?.addEventListener("click", exportChiTietToExcel);
    
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

            const isKhoa = localStorage.getItem('isKhoa') === '1' || localStorage.getItem('isKhoa') === 1;
            const userKhoa = localStorage.getItem('MaPhongBan') || '';
            if (isKhoa && userKhoa) {
                select.value = userKhoa;
                select.disabled = true;
            } else {
                select.disabled = false;
            }
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
            select.innerHTML = '<option value="ALL">Tất cả hệ</option>';
            
            data.data.forEach((item) => {
                const option = document.createElement("option");
                option.value = item.id;
                option.textContent = item.he_dao_tao;
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
        const isKhoa = localStorage.getItem('isKhoa') === '1' || localStorage.getItem('isKhoa') === 1;
        const userKhoa = localStorage.getItem('MaPhongBan') || '';
        const khoa = (isKhoa && userKhoa) ? userKhoa : document.getElementById("khoaFilter").value;
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
            // Show loading (Đã bỏ)
            
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
                    <td colspan="9" class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-2x mb-2"></i><br>
                        Không có dữ liệu
                    </td>
                </tr>
            `;
            return;
        }
        
        let currentGVKey = "";
        let stt = 0;

        data.forEach((row, index) => {
            const tr = document.createElement("tr");
            // Sử dụng key kết hợp Khoa + Tên giảng viên để tránh trùng lặp
            const gvKey = `${row.Khoa}_${row.GiangVien}`;
            tr.setAttribute("data-giangvien", row.GiangVien || "");
            tr.setAttribute("data-sotiet", row.SoTiet || 0);
            
            // Kiểm tra xem giảng viên này có phải là giảng viên mới không (để gộp dòng)
            const isNewGV = gvKey !== currentGVKey;
            
            if (isNewGV) {
                currentGVKey = gvKey;
                stt++;
                
                // Đếm số lượng bản ghi liên tiếp của giảng viên này để đặt rowspan
                let gvCount = 0;
                for (let i = index; i < data.length; i++) {
                    const nextKey = `${data[i].Khoa}_${data[i].GiangVien}`;
                    if (nextKey === gvKey) {
                        gvCount++;
                    } else {
                        break;
                    }
                }
                
                tr.innerHTML = `
                    <td rowspan="${gvCount}">${stt}</td>
                    <td rowspan="${gvCount}">${row.GiangVien || ""}</td>
                    <td rowspan="${gvCount}">${row.Khoa || ""}</td>
                    <td>${row.SinhVien || ""}</td>
                    <td>${row.KhoaSV || ""}</td>
                    <td>${row.TenDeTai || ""}</td>
                    <td>${row.SoTiet || 0}</td>
                     <td rowspan="${gvCount}"><strong>${row.TongSoTietGV || 0}</strong></td>
                    <td rowspan="${gvCount}">
                        <button class="btn btn-info btn-view" onclick="viewChiTiet('${encodeURIComponent(row.GiangVien || "")}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                `;
            } else {
                // Đối với các dòng tiếp theo của cùng một giảng viên, chỉ hiển thị thông tin sinh viên
                tr.innerHTML = `
                    <td>${row.SinhVien || ""}</td>
                    <td>${row.KhoaSV || ""}</td>
                    <td>${row.TenDeTai || ""}</td>
                    <td>${row.SoTiet || 0}</td>
                `;
            }
            
            tableBody.appendChild(tr);
        });

        updateSummary();
    }

    // =====================================================
    // UPDATE SUMMARY
    // =====================================================
    
    function updateSummary() {
        const rows = document.querySelectorAll("#tableBody tr");
        const uniqueGVs = new Set();
        let totalStudents = 0;
        let totalHours = 0;

        rows.forEach(row => {
            if (row.style.display !== "none") {
                const gv = row.getAttribute("data-giangvien");
                if (gv) uniqueGVs.add(gv);
                
                // Mỗi dòng dữ liệu ứng với 1 sinh viên
                totalStudents++;
                totalHours += parseFloat(row.getAttribute("data-sotiet")) || 0;
            }
        });

        document.getElementById("totalTeachers").textContent = uniqueGVs.size;
        document.getElementById("totalStudents").textContent = totalStudents;
        document.getElementById("totalHours").textContent = totalHours.toFixed(2);
        
        // Cập nhật cả phần footer cũ nếu còn tồn tại
        const footerTotal = document.getElementById("tongSoTiet");
        if (footerTotal) {
            footerTotal.innerHTML = `<strong>${totalHours.toFixed(2)}</strong>`;
        }
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

        updateSummary();
    }

    // =====================================================
    // TOGGLE SUMMARY
    // =====================================================
    document.getElementById("btnToggleSummary").addEventListener("click", function() {
        document.getElementById("summaryBox").classList.toggle("collapsed");
        const icon = this.querySelector("i");
        if (document.getElementById("summaryBox").classList.contains("collapsed")) {
            icon.className = "bi bi-chevron-up";
        } else {
            icon.className = "bi bi-chevron-down";
        }
    });
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
        // Show loading (Đã bỏ)
        
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

// =====================================================
// XUẤT EXCEL TỪ BẢNG DỮ LIỆU (SHEETJS)
// =====================================================

function getSelectedText(selectId) {
    const el = document.getElementById(selectId);
    if (!el || el.selectedIndex < 0) return "";
    return el.options[el.selectedIndex]?.textContent?.trim() || el.value || "";
}

/**
 * Xuất dữ liệu bảng chính ra file Excel
 * Đọc trực tiếp từ DOM tableBody, xử lý nhóm giảng viên (rowspan), bộ lọc tìm kiếm và tính tổng
 */
function exportToExcel() {
    if (typeof XLSX === "undefined") {
        Swal.fire({
            icon: "error",
            title: "Lỗi",
            text: "Thư viện xuất Excel (SheetJS) chưa được tải thành công. Vui lòng kiểm tra lại kết nối mạng!"
        });
        return;
    }

    const rows = document.querySelectorAll("#tableBody tr");
    if (!rows || rows.length === 0 || (rows.length === 1 && rows[0].innerText.includes("Không có dữ liệu"))) {
        Swal.fire({
            icon: "warning",
            title: "Thông báo",
            text: "Không có dữ liệu trong bảng để xuất file Excel!"
        });
        return;
    }

    const dotText = getSelectedText("dotFilter");
    const kiText = getSelectedText("kiFilter");
    const namHocText = getSelectedText("namHocFilter");
    const khoaText = getSelectedText("khoaFilter");
    const heDaoTaoText = getSelectedText("heDaoTaoFilter");

    // Tiêu đề và dòng thông tin bộ lọc
    const aoaData = [
        ["THỐNG KÊ HƯỚNG DẪN ĐỒ ÁN TỐT NGHIỆP - VƯỢT GIỜ"],
        [`Năm học: ${namHocText} | ${kiText} | ${dotText} | Khoa: ${khoaText} | Hệ đào tạo: ${heDaoTaoText}`],
        [],
        ["STT", "Giảng viên", "Khoa", "Sinh viên", "Khóa", "Tên đề tài", "Số tiết", "Tổng số tiết GV"]
    ];

    const merges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }
    ];

    let currentSTT = "";
    let currentGV = "";
    let currentKhoa = "";
    let currentTongSoTiet = "";
    let lecturerStartRow = -1;
    let totalHoursSum = 0;
    let visibleRowCount = 0;

    // Helper merge các ô thông tin giảng viên cho nhóm
    function closeLecturerGroup() {
        if (lecturerStartRow !== -1) {
            const lecturerEndRow = aoaData.length - 1;
            if (lecturerEndRow > lecturerStartRow) {
                merges.push({ s: { r: lecturerStartRow, c: 0 }, e: { r: lecturerEndRow, c: 0 } });
                merges.push({ s: { r: lecturerStartRow, c: 1 }, e: { r: lecturerEndRow, c: 1 } });
                merges.push({ s: { r: lecturerStartRow, c: 2 }, e: { r: lecturerEndRow, c: 2 } });
                merges.push({ s: { r: lecturerStartRow, c: 7 }, e: { r: lecturerEndRow, c: 7 } });
            }
            lecturerStartRow = -1;
        }
    }

    rows.forEach(row => {
        // Bỏ qua dòng bị ẩn do tìm kiếm tên giảng viên
        if (row.style.display === "none") return;

        const cells = row.querySelectorAll("td");
        if (!cells || cells.length === 0) return;

        // Bỏ qua dòng thông báo colspan
        if (cells.length === 1 && cells[0].getAttribute("colspan")) return;

        visibleRowCount++;

        if (cells.length >= 8) {
            // Dòng đầu tiên của một giảng viên (có đầy đủ 9 cột kể cả nút chi tiết)
            closeLecturerGroup();

            currentSTT = cells[0].textContent.trim();
            currentGV = cells[1].textContent.trim();
            currentKhoa = cells[2].textContent.trim();
            const sv = cells[3].textContent.trim();
            const khoaSV = cells[4].textContent.trim();
            const deTai = cells[5].textContent.trim();
            const soTietVal = parseFloat(cells[6].textContent.trim()) || 0;
            currentTongSoTiet = parseFloat(cells[7].textContent.trim()) || 0;

            totalHoursSum += soTietVal;

            aoaData.push([
                currentSTT,
                currentGV,
                currentKhoa,
                sv,
                khoaSV,
                deTai,
                soTietVal,
                currentTongSoTiet
            ]);

            lecturerStartRow = aoaData.length - 1;
        } else if (cells.length >= 4) {
            // Các dòng tiếp theo của cùng giảng viên (4 cột: SV, Khóa, Tên đề tài, Số tiết)
            const sv = cells[0].textContent.trim();
            const khoaSV = cells[1].textContent.trim();
            const deTai = cells[2].textContent.trim();
            const soTietVal = parseFloat(cells[3].textContent.trim()) || 0;

            totalHoursSum += soTietVal;

            aoaData.push([
                "",
                "",
                "",
                sv,
                khoaSV,
                deTai,
                soTietVal,
                ""
            ]);
        }
    });

    // Đóng nhóm giảng viên cuối cùng
    closeLecturerGroup();

    if (visibleRowCount === 0) {
        Swal.fire({
            icon: "warning",
            title: "Thông báo",
            text: "Không có dòng dữ liệu nào hiển thị để xuất file Excel!"
        });
        return;
    }

    // Dòng tổng cộng ở cuối bảng
    const summaryRowIdx = aoaData.length;
    aoaData.push([
        "TỔNG CỘNG SỐ TIẾT",
        "",
        "",
        "",
        "",
        "",
        Number(totalHoursSum.toFixed(2)),
        ""
    ]);
    merges.push({ s: { r: summaryRowIdx, c: 0 }, e: { r: summaryRowIdx, c: 5 } });

    // Tạo worksheet và định dạng độ rộng cột
    const ws = XLSX.utils.aoa_to_sheet(aoaData);
    ws["!merges"] = merges;
    ws["!cols"] = [
        { wch: 6 },  // STT
        { wch: 25 }, // Giảng viên
        { wch: 15 }, // Khoa
        { wch: 25 }, // Sinh viên
        { wch: 10 }, // Khóa
        { wch: 45 }, // Tên đề tài
        { wch: 12 }, // Số tiết
        { wch: 16 }  // Tổng số tiết GV
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HuongDanDATN");

    // Tạo tên file
    const safeNamHoc = (namHocText || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const dotVal = document.getElementById("dotFilter")?.value || "1";
    const kiVal = document.getElementById("kiFilter")?.value || "1";
    const filename = `Huong_Dan_DATN_${safeNamHoc}_Ki_${kiVal}_Dot_${dotVal}.xlsx`;

    XLSX.writeFile(wb, filename);
}

/**
 * Xuất dữ liệu từ modal chi tiết hướng dẫn ĐATN ra file Excel
 */
function exportChiTietToExcel() {
    if (typeof XLSX === "undefined") {
        Swal.fire({
            icon: "error",
            title: "Lỗi",
            text: "Thư viện xuất Excel (SheetJS) chưa được tải thành công!"
        });
        return;
    }

    const giangVien = document.getElementById("modalGiangVien")?.textContent?.trim() || "";
    const rows = document.querySelectorAll("#chiTietTableBody tr");
    if (!rows || rows.length === 0 || (rows.length === 1 && rows[0].innerText.includes("Không có dữ liệu"))) {
        Swal.fire({
            icon: "warning",
            title: "Thông báo",
            text: "Không có dữ liệu chi tiết để xuất Excel!"
        });
        return;
    }

    const dotText = getSelectedText("dotFilter");
    const kiText = getSelectedText("kiFilter");
    const namHocText = getSelectedText("namHocFilter");

    const aoaData = [
        [`CHI TIẾT HƯỚNG DẪN ĐỒ ÁN TỐT NGHIỆP - ${giangVien.toUpperCase()}`],
        [`Giảng viên: ${giangVien} | Năm học: ${namHocText} | ${kiText} | ${dotText}`],
        [],
        ["TT", "Sinh viên", "Mã SV", "Khóa", "Ngành", "Tên đề tài", "Ngày BĐ", "Ngày KT", "Số tiết"]
    ];

    const merges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }
    ];

    let totalHoursSum = 0;
    rows.forEach(row => {
        const cells = row.querySelectorAll("td");
        if (cells.length < 9) return;

        const tt = cells[0].textContent.trim();
        const sv = cells[1].textContent.trim();
        const maSV = cells[2].textContent.trim();
        const khoaSV = cells[3].textContent.trim();
        const nganh = cells[4].textContent.trim();
        const deTai = cells[5].textContent.trim();
        const ngayBD = cells[6].textContent.trim();
        const ngayKT = cells[7].textContent.trim();
        const soTiet = parseFloat(cells[8].textContent.trim()) || 0;

        totalHoursSum += soTiet;

        aoaData.push([
            tt,
            sv,
            maSV,
            khoaSV,
            nganh,
            deTai,
            ngayBD,
            ngayKT,
            soTiet
        ]);
    });

    const summaryRowIdx = aoaData.length;
    aoaData.push([
        "TỔNG CỘNG SỐ TIẾT",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        Number(totalHoursSum.toFixed(2))
    ]);
    merges.push({ s: { r: summaryRowIdx, c: 0 }, e: { r: summaryRowIdx, c: 7 } });

    const ws = XLSX.utils.aoa_to_sheet(aoaData);
    ws["!merges"] = merges;
    ws["!cols"] = [
        { wch: 6 },  // TT
        { wch: 25 }, // Sinh viên
        { wch: 14 }, // Mã SV
        { wch: 10 }, // Khóa
        { wch: 22 }, // Ngành
        { wch: 45 }, // Tên đề tài
        { wch: 14 }, // Ngày BĐ
        { wch: 14 }, // Ngày KT
        { wch: 12 }  // Số tiết
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ChiTiet");

    const safeGv = giangVien.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, "_");
    const safeNamHoc = (namHocText || "").replace(/[^a-zA-Z0-9_-]/g, "_");
    const dotVal = document.getElementById("dotFilter")?.value || "1";
    const kiVal = document.getElementById("kiFilter")?.value || "1";
    const filename = `Chi_Tiet_HDDATN_${safeGv}_${safeNamHoc}_Ki_${kiVal}_Dot_${dotVal}.xlsx`;

    XLSX.writeFile(wb, filename);
}

// Gắn hàm vào window để có thể gọi từ inline hoặc bên ngoài
window.exportToExcel = exportToExcel;
window.exportChiTietToExcel = exportChiTietToExcel;
