/**
 * VUOT GIO V2 - Đồ án / Luận án tính vượt giờ Client JS
 * Date: 2026-11-09
 */

"use strict";

(function () {
    const state = {
        scope: window.STATS_SCOPE || "OFFICIAL",
        currentTab: "giang-vien",
        debounceTimer: null,
        currentDeptData: null,
        currentLecturerName: "",
        currentLecturerId: "",
        currentDeptName: "",
        currentDeptCode: "",
    };

    const els = {
        namHoc: document.getElementById("namHocFilter"),
        khoa: document.getElementById("khoaFilter"),
        heDaoTao: document.getElementById("heDaoTaoFilter"),
        dot: document.getElementById("dotFilter"),
        ki: document.getElementById("kiFilter"),
        keyword: document.getElementById("filterKeyword"),
        btnShow: document.getElementById("btnShow"),
        btnExport: document.getElementById("btnExport"),
        tabButtons: document.querySelectorAll(".nckh-tab-btn"),
        tableHead: document.getElementById("tableHead"),
        tableBody: document.getElementById("dataTableBody"),

        // Floating Summary
        summaryBox: document.getElementById("summaryBox"),
        btnToggleSummary: document.getElementById("btnToggleSummary"),
        kpiTeachers: document.getElementById("kpiTotalTeachers"),
        kpiStudents: document.getElementById("kpiTotalStudents"),
        kpiHours: document.getElementById("kpiTotalHours"),

        // Modal Giảng viên
        modalLecturerEl: document.getElementById("chiTietModal"),
        modalLecturerTitle: document.getElementById("modalLecturerName"),
        modalLecturerBody: document.getElementById("modalTableBody"),
        modalLecturerTotalHours: document.getElementById("modalTotalHours"),
        btnExportLecturerModal: document.getElementById("btnExportLecturerModal"),

        // Modal Khoa
        modalKhoaEl: document.getElementById("khoaDetailModal"),
        modalKhoaSubtitle: document.getElementById("khoaDetailSubtitle"),
        modalKhoaLecturers: document.getElementById("modalKhoaLecturers"),
        modalKhoaProjects: document.getElementById("modalKhoaProjects"),
        modalKhoaHours: document.getElementById("modalKhoaHours"),
        modalKhoaSearch: document.getElementById("modalKhoaSearch"),
        modalKhoaTableBody: document.getElementById("modalKhoaTableBody"),
        btnExportKhoaModal: document.getElementById("btnExportKhoaModal"),
    };

    let bsLecturerModal = null;
    let bsKhoaModal = null;
    if (els.modalLecturerEl && typeof bootstrap !== "undefined") {
        bsLecturerModal = new bootstrap.Modal(els.modalLecturerEl);
    }
    if (els.modalKhoaEl && typeof bootstrap !== "undefined") {
        bsKhoaModal = new bootstrap.Modal(els.modalKhoaEl);
    }

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const getFilterParams = () => {
        const params = new URLSearchParams();
        params.set("scope", state.scope);
        const isKhoa = localStorage.getItem('isKhoa') === '1' || localStorage.getItem('isKhoa') === 1;
        const userKhoa = localStorage.getItem('MaPhongBan') || '';
        const targetKhoa = (isKhoa && userKhoa) ? userKhoa : (els.khoa ? els.khoa.value : "");

        if (els.namHoc && els.namHoc.value) params.set("namHoc", els.namHoc.value);
        if (targetKhoa) params.set("khoa", targetKhoa);
        if (els.heDaoTao && els.heDaoTao.value) params.set("heDaoTao", els.heDaoTao.value);
        if (els.dot && els.dot.value) params.set("dot", els.dot.value);
        if (els.ki && els.ki.value) params.set("ki", els.ki.value);
        if (els.keyword && els.keyword.value.trim()) params.set("keyword", els.keyword.value.trim());
        return params;
    };

    const renderEmptyState = (msg = "Không tìm thấy bản ghi hợp lệ", colspan = 9) => {
        if (!els.tableBody) return;
        els.tableBody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="text-center py-5">
                    <div class="d-flex flex-column align-items-center justify-content-center text-muted">
                        <i class="bi bi-inbox fs-1 mb-2"></i>
                        <span class="fs-6 fw-semibold">${msg}</span>
                    </div>
                </td>
            </tr>
        `;
    };

    const renderLoadingState = (colspan = 9) => {
        if (!els.tableBody) return;
        els.tableBody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Đang tải...</span>
                    </div>
                    <div class="mt-2 text-muted fs-6">Đang tải dữ liệu...</div>
                </td>
            </tr>
        `;
    };

    const updateSummaryBox = (summary = {}) => {
        if (els.kpiTeachers) {
            els.kpiTeachers.textContent = (summary.totalTeachers || 0).toLocaleString("vi-VN");
        }
        if (els.kpiStudents) {
            const count = summary.totalStudents || summary.totalProjects || 0;
            els.kpiStudents.textContent = count.toLocaleString("vi-VN");
        }
        if (els.kpiHours) {
            els.kpiHours.textContent = (summary.totalHours || 0).toLocaleString("vi-VN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        }
    };

    /**
     * Tab 1: Render Theo Giảng Viên (Rowspan theo từng Giảng viên như Hình 2)
     */
    const renderLecturerTable = (rows = []) => {
        if (!els.tableHead || !els.tableBody) return;

        // Tiêu đề căn giữa, màu xanh dương #007bff theo Hình 2
        els.tableHead.innerHTML = `
            <tr>
                <th class="text-center" style="width: 50px;">STT</th>
                <th class="text-center" style="width: 170px;">Giảng viên</th>
                <th class="text-center" style="width: 90px;">Khoa</th>
                <th class="text-center" style="width: 170px;">Sinh viên</th>
                <th class="text-center" style="width: 90px;">Khóa</th>
                <th class="text-center">Tên đề tài</th>
                <th class="text-center" style="width: 90px;">Số tiết</th>
                <th class="text-center" style="width: 110px;">Tổng số tiết</th>
                <th class="text-center" style="width: 80px;">Chi tiết</th>
            </tr>
        `;

        if (!rows || !rows.length) {
            renderEmptyState("Không tìm thấy bản ghi hợp lệ", 9);
            return;
        }

        // 1. Phân nhóm giảng viên theo Khoa
        const facultyGroups = [];
        const facultyMap = new Map();

        rows.forEach((teacher) => {
            const facKey = teacher.khoa || "KHAC";
            const facName = teacher.khoaDisplayName || teacher.khoa || "Khoa khác";
            if (!facultyMap.has(facKey)) {
                const group = {
                    code: facKey,
                    name: facName,
                    teachers: [],
                    totalHours: 0,
                    totalStudents: 0
                };
                facultyMap.set(facKey, group);
                facultyGroups.push(group);
            }
            const g = facultyMap.get(facKey);
            g.teachers.push(teacher);
            g.totalHours += Number(teacher.tongSoTiet || 0);
            g.totalStudents += (teacher.projects || []).length;
        });

        let html = "";
        let stt = 1;

        facultyGroups.forEach((group) => {
            // Dòng Group Header theo Khoa
            html += `
                <tr class="nckh-stats-group-header">
                    <td colspan="9" class="text-start ps-3 py-2">
                        <i class="bi bi-building me-1"></i>
                        <strong>${group.name}</strong>
                        <span class="nckh-v3-group-count">${group.teachers.length} giảng viên</span>
                        <span class="nckh-v3-group-count">${group.totalStudents} sinh viên</span>
                        <span class="nckh-v3-group-count">${group.totalHours.toFixed(2)} tiết</span>
                    </td>
                </tr>
            `;

            group.teachers.forEach((teacher) => {
                const projects = teacher.projects || [];
                const gvCount = projects.length || 1;

                if (!projects.length) {
                    html += `
                        <tr data-giangvien="${teacher.giangVien}">
                            <td class="text-center">${stt++}</td>
                            <td class="fw-semibold">${teacher.giangVien}</td>
                            <td class="text-center">${teacher.khoa || "-"}</td>
                            <td colspan="4" class="text-center text-muted">Không có dữ liệu sinh viên</td>
                            <td class="text-center fw-bold text-success">${Number(teacher.tongSoTiet || 0).toFixed(2)}</td>
                            <td class="text-center">
                                <button class="btn btn-sm btn-view-detail" data-gv="${encodeURIComponent(teacher.giangVien)}" data-id="${teacher.idUser || ''}">
                                    <i class="bi bi-eye"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                    return;
                }

                // 2. Nhóm sinh viên theo Lớp (khoaSV) để gộp ô (rowspan) cột Khóa
                const classGroups = [];
                projects.forEach((proj) => {
                    const cls = (proj.khoaSV || "-").trim();
                    const lastGroup = classGroups[classGroups.length - 1];
                    if (lastGroup && lastGroup.cls === cls) {
                        lastGroup.count++;
                        lastGroup.items.push(proj);
                    } else {
                        classGroups.push({ cls, count: 1, items: [proj] });
                    }
                });

                let isFirstTeacherRow = true;

                classGroups.forEach((cg) => {
                    cg.items.forEach((proj, pIdxInClass) => {
                        const isFirstInClass = pIdxInClass === 0;

                        html += `<tr data-giangvien="${teacher.giangVien}" data-sotiet="${proj.soTiet || 0}">`;

                        if (isFirstTeacherRow) {
                            html += `
                                <td rowspan="${gvCount}" class="text-center">${stt++}</td>
                                <td rowspan="${gvCount}" class="fw-semibold">${teacher.giangVien}</td>
                                <td rowspan="${gvCount}" class="text-center">${teacher.khoa || "-"}</td>
                            `;
                        }

                        html += `<td>${proj.sinhVien || "-"}</td>`;

                        if (isFirstInClass) {
                            html += `<td rowspan="${cg.count}" class="text-center font-monospace fw-semibold">${cg.cls}</td>`;
                        }

                        html += `
                            <td>${proj.tenDeTai || "-"}</td>
                            <td class="text-center">${Number(proj.soTiet || 0).toFixed(2)}</td>
                        `;

                        if (isFirstTeacherRow) {
                            html += `
                                <td rowspan="${gvCount}" class="text-center fw-bold text-success">${Number(teacher.tongSoTiet || 0).toFixed(2)}</td>
                                <td rowspan="${gvCount}" class="text-center">
                                    <button class="btn btn-sm btn-view-detail" data-gv="${encodeURIComponent(teacher.giangVien)}" data-id="${teacher.idUser || ''}">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                </td>
                            `;
                            isFirstTeacherRow = false;
                        }

                        html += `</tr>`;
                    });
                });
            });
        });

        els.tableBody.innerHTML = html;

        // Bind nút Chi tiết mở Modal Hình 3
        els.tableBody.querySelectorAll(".btn-view-detail").forEach((btn) => {
            btn.addEventListener("click", () => {
                const gv = decodeURIComponent(btn.getAttribute("data-gv"));
                const id = btn.getAttribute("data-id");
                openLecturerDetailModal(gv, id);
            });
        });
    };

    /**
     * Tab 2: Render Theo Khoa / Phòng Ban
     */
    const renderDepartmentTable = (rows = []) => {
        if (!els.tableHead || !els.tableBody) return;

        els.tableHead.innerHTML = `
            <tr>
                <th class="text-center" style="width: 60px;">STT</th>
                <th class="text-center">Khoa / Phòng ban</th>
                <th class="text-center" style="width: 170px;">Số giảng viên</th>
                <th class="text-center" style="width: 190px;">Số sinh viên</th>
                <th class="text-center" style="width: 190px;">Tổng số tiết</th>
                <th class="text-center" style="width: 140px;">Thao tác</th>
            </tr>
        `;

        if (!rows || !rows.length) {
            renderEmptyState("Không tìm thấy bản ghi hợp lệ", 6);
            return;
        }

        let html = "";
        rows.forEach((row, index) => {
            const facDisplayName = row.khoaDisplayName || row.khoa || "Không xác định";
            html += `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td class="text-center">
                        <span class="fw-semibold text-primary">${facDisplayName}</span>
                    </td>
                    <td class="text-center">
                        <strong class="fs-7">${row.soGiangVien}</strong>
                    </td>
                    <td class="text-center">
                        <strong class="fs-7">${row.soSinhVien || row.soDoAn}</strong>
                    </td>
                    <td class="text-end">
                        <strong class="text-success fs-7">${Number(row.tongSoTiet).toFixed(2)}</strong>
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-info text-nowrap btn-dept-detail" style="white-space: nowrap !important;" data-index="${index}">
                            <i class="bi bi-eye me-1"></i> Xem chi tiết
                        </button>
                    </td>
                </tr>
            `;
        });

        els.tableBody.innerHTML = html;

        // Lưu dữ liệu dept vào state để mở modal
        state.currentDeptData = rows;

        // Bind nút Xem chi tiết Khoa
        els.tableBody.querySelectorAll(".btn-dept-detail").forEach((btn) => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.getAttribute("data-index"), 10);
                const dept = state.currentDeptData[idx];
                if (dept) {
                    openKhoaDetailModal(dept);
                }
            });
        });
    };

    /**
     * Tab 3: Render Theo Toàn Học Viện (Bảng phẳng danh sách sinh viên toàn học viện)
     */
    const renderHocVienTable = (rows = []) => {
        if (!els.tableHead || !els.tableBody) return;

        els.tableHead.innerHTML = `
            <tr>
                <th class="text-center" style="width: 45px;">STT</th>
                <th class="text-center" style="width: 170px;">Giảng viên</th>
                <th class="text-center" style="width: 90px;">Khoa</th>
                <th class="text-center" style="width: 160px;">Sinh viên</th>
                <th class="text-center" style="width: 105px;">Mã SV</th>
                <th class="text-center" style="width: 80px;">Khóa</th>
                <th class="text-center" style="width: 150px;">Ngành</th>
                <th class="text-center">Tên đề tài</th>
                <th class="text-center" style="width: 105px;">Ngày BĐ</th>
                <th class="text-center" style="width: 105px;">Ngày KT</th>
                <th class="text-center" style="width: 90px;">Số tiết</th>
            </tr>
        `;

        if (!rows || !rows.length) {
            renderEmptyState("Không tìm thấy bản ghi hợp lệ", 11);
            return;
        }

        let html = "";
        rows.forEach((row, index) => {
            html += `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td class="fw-semibold">${row.giangVien || "-"}</td>
                    <td class="text-center">${row.khoa || "-"}</td>
                    <td>${row.sinhVien || "-"}</td>
                    <td class="text-center font-monospace">${row.maSV || "-"}</td>
                    <td class="text-center font-monospace fw-semibold">${row.khoaSV || "-"}</td>
                    <td>${row.nganh || "-"}</td>
                    <td>${row.tenDeTai || "-"}</td>
                    <td class="text-center">${formatDate(row.ngayBatDau)}</td>
                    <td class="text-center">${formatDate(row.ngayKetThuc)}</td>
                    <td class="text-end fw-bold text-success">${Number(row.soTiet).toFixed(2)}</td>
                </tr>
            `;
        });

        els.tableBody.innerHTML = html;
    };

    /**
     * Tải dữ liệu từ máy chủ
     */
    const loadData = async () => {
        const colspan = state.currentTab === "hoc-vien" ? 11 : (state.currentTab === "khoa" ? 6 : 9);
        renderLoadingState(colspan);
        const params = getFilterParams();

        try {
            let endpoint = "";
            if (state.currentTab === "khoa") {
                endpoint = `/v2/vuotgio/do-an/stats/khoa?${params.toString()}`;
            } else if (state.currentTab === "hoc-vien") {
                endpoint = `/v2/vuotgio/do-an/stats/hoc-vien?${params.toString()}`;
            } else {
                endpoint = `/v2/vuotgio/do-an/stats/giang-vien?${params.toString()}`;
            }

            const response = await fetch(endpoint);
            const result = await response.json();

            if (!result.success) {
                renderEmptyState(result.message || "Không thể tải dữ liệu", colspan);
                updateSummaryBox({});
                return;
            }

            const { summary, rows } = result.data;
            updateSummaryBox(summary);

            if (state.currentTab === "khoa") {
                renderDepartmentTable(rows);
            } else if (state.currentTab === "hoc-vien") {
                renderHocVienTable(rows);
            } else {
                renderLecturerTable(rows || []);
            }
        } catch (error) {
            console.error("loadData error:", error);
            renderEmptyState("Đã xảy ra lỗi khi kết nối máy chủ", colspan);
            updateSummaryBox({});
        }
    };

    /**
     * Mở modal chi tiết Giảng viên (Hình 3)
     */
    const openLecturerDetailModal = async (giangVien, idUser) => {
        if (!bsLecturerModal) return;

        state.currentLecturerName = giangVien;
        state.currentLecturerId = idUser || "";

        if (els.modalLecturerTitle) {
            els.modalLecturerTitle.textContent = giangVien;
        }
        if (els.modalLecturerBody) {
            els.modalLecturerBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <div class="spinner-border spinner-border-sm text-primary me-2"></div> Đang tải danh sách đồ án...
                    </td>
                </tr>
            `;
        }

        bsLecturerModal.show();

        const params = getFilterParams();
        params.set("name", giangVien);

        try {
            const targetId = idUser || encodeURIComponent(giangVien);
            const response = await fetch(`/v2/vuotgio/do-an/stats/giang-vien/${targetId}/chi-tiet?${params.toString()}`);
            const result = await response.json();

            if (!result.success || !result.data || !result.data.rows || !result.data.rows.length) {
                if (els.modalLecturerBody) {
                    els.modalLecturerBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">Không tìm thấy bản ghi hợp lệ</td></tr>`;
                }
                if (els.modalLecturerTotalHours) els.modalLecturerTotalHours.textContent = "0";
                return;
            }

            let html = "";
            result.data.rows.forEach((r, idx) => {
                html += `
                    <tr>
                        <td class="text-center">${idx + 1}</td>
                        <td>${r.sinhVien || "-"}</td>
                        <td class="text-center font-monospace">${r.maSV || "-"}</td>
                        <td class="text-center text-nowrap font-monospace fw-semibold">${r.khoaSV || "-"}</td>
                        <td class="text-center text-nowrap">${r.khoaTen || r.nganh || r.khoa || "-"}</td>
                        <td>${r.tenDeTai || "-"}</td>
                        <td class="text-center">${formatDate(r.ngayBatDau)}</td>
                        <td class="text-center">${formatDate(r.ngayKetThuc)}</td>
                        <td class="text-center fw-semibold text-success">${Number(r.soTiet).toFixed(2)}</td>
                    </tr>
                `;
            });

            if (els.modalLecturerBody) els.modalLecturerBody.innerHTML = html;
            if (els.modalLecturerTotalHours) {
                els.modalLecturerTotalHours.textContent = Number(result.data.tongSoTiet || 0).toFixed(2);
            }
        } catch (error) {
            console.error("openLecturerDetailModal error:", error);
            if (els.modalLecturerBody) {
                els.modalLecturerBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-danger">Lỗi khi tải chi tiết</td></tr>`;
            }
        }
    };

    /**
     * Mở modal chi tiết Khoa
     */
    let currentDeptProjects = [];
    const openKhoaDetailModal = (dept) => {
        if (!bsKhoaModal) return;

        state.currentDeptCode = dept.khoa;
        state.currentDeptName = dept.khoaDisplayName || dept.khoa || "Không xác định";

        if (els.modalKhoaSubtitle) els.modalKhoaSubtitle.textContent = state.currentDeptName;
        if (els.modalKhoaLecturers) els.modalKhoaLecturers.textContent = dept.soGiangVien || 0;
        if (els.modalKhoaProjects) els.modalKhoaProjects.textContent = dept.soSinhVien || dept.soDoAn || 0;
        if (els.modalKhoaHours) els.modalKhoaHours.textContent = Number(dept.tongSoTiet || 0).toFixed(2);
        if (els.modalKhoaSearch) els.modalKhoaSearch.value = "";

        currentDeptProjects = dept.projects || [];
        renderDeptProjectsTable(currentDeptProjects);

        bsKhoaModal.show();
    };

    const renderDeptProjectsTable = (projects = []) => {
        if (!els.modalKhoaTableBody) return;

        if (!projects || !projects.length) {
            els.modalKhoaTableBody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">Không có bản ghi hợp lệ</td></tr>`;
            return;
        }

        let html = "";
        projects.forEach((r, idx) => {
            html += `
                <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td class="fw-semibold text-primary">${r.giangVien || "-"}</td>
                    <td>${r.sinhVien || "-"}</td>
                    <td class="text-center font-monospace">${r.maSV || "-"}</td>
                    <td class="text-center text-nowrap font-monospace fw-semibold">${r.khoaSV || "-"}</td>
                    <td class="text-center text-nowrap">${r.khoaTen || r.nganh || r.khoa || "-"}</td>
                    <td>${r.tenDeTai || "-"}</td>
                    <td class="text-center">${formatDate(r.ngayBatDau)}</td>
                    <td class="text-center">${formatDate(r.ngayKetThuc)}</td>
                    <td class="text-center fw-semibold text-success">${Number(r.soTiet).toFixed(2)}</td>
                </tr>
            `;
        });

        els.modalKhoaTableBody.innerHTML = html;
    };

    /**
     * Tải bộ lọc
     */
    const loadFilters = async () => {
        try {
            const response = await fetch("/v2/vuotgio/do-an/stats/filters");
            const result = await response.json();
            if (!result.success || !result.data) return;

            const { namHocList, khoaList, heDaoTaoList, dotList, kiList } = result.data;

            // Năm học
            if (els.namHoc) {
                const curVal = els.namHoc.value;
                els.namHoc.innerHTML = '<option value="ALL">Tất cả năm học</option>';
                (namHocList || []).forEach((nh) => {
                    const opt = document.createElement("option");
                    opt.value = nh;
                    opt.textContent = nh;
                    els.namHoc.appendChild(opt);
                });
                if (curVal && Array.from(els.namHoc.options).some((o) => o.value === curVal)) {
                    els.namHoc.value = curVal;
                }
            }

            // Khoa
            if (els.khoa) {
                const curVal = els.khoa.value;
                els.khoa.innerHTML = '<option value="ALL">Tất cả khoa</option>';
                (khoaList || []).forEach((k) => {
                    const opt = document.createElement("option");
                    opt.value = k.id || k.code;
                    opt.textContent = k.displayName || k.name || k.id;
                    els.khoa.appendChild(opt);
                });

                const isKhoa = localStorage.getItem('isKhoa') === '1' || localStorage.getItem('isKhoa') === 1;
                const userKhoa = localStorage.getItem('MaPhongBan') || '';
                if (isKhoa && userKhoa) {
                    els.khoa.value = userKhoa;
                    els.khoa.disabled = true;
                } else {
                    if (curVal && Array.from(els.khoa.options).some((o) => o.value === curVal)) {
                        els.khoa.value = curVal;
                    }
                    els.khoa.disabled = false;
                }
            }

            // Hệ đào tạo
            if (els.heDaoTao) {
                const curVal = els.heDaoTao.value;
                els.heDaoTao.innerHTML = '<option value="ALL">Tất cả hệ</option>';
                (heDaoTaoList || []).forEach((h) => {
                    const opt = document.createElement("option");
                    opt.value = String(h.id);
                    opt.textContent = h.name;
                    els.heDaoTao.appendChild(opt);
                });
                if (curVal && Array.from(els.heDaoTao.options).some((o) => o.value === curVal)) {
                    els.heDaoTao.value = curVal;
                }
            }

            // Đợt
            if (els.dot) {
                const curVal = els.dot.value;
                els.dot.innerHTML = '<option value="ALL">Cả 2 đợt</option>';
                (dotList || []).forEach((d) => {
                    const opt = document.createElement("option");
                    opt.value = typeof d === "object" ? d.id : d;
                    opt.textContent = typeof d === "object" ? (d.name || `Đợt ${d.id}`) : `Đợt ${d}`;
                    els.dot.appendChild(opt);
                });
                if (curVal && Array.from(els.dot.options).some((o) => o.value === curVal)) {
                    els.dot.value = curVal;
                }
            }

            // Kỳ
            if (els.ki) {
                const curVal = els.ki.value;
                els.ki.innerHTML = '<option value="ALL">Cả 2 kỳ</option>';
                (kiList || []).forEach((k) => {
                    const opt = document.createElement("option");
                    opt.value = typeof k === "object" ? k.id : k;
                    opt.textContent = typeof k === "object" ? (k.name || `Kỳ ${k.id}`) : `Kỳ ${k}`;
                    els.ki.appendChild(opt);
                });
                if (curVal && Array.from(els.ki.options).some((o) => o.value === curVal)) {
                    els.ki.value = curVal;
                }
            }
        } catch (error) {
            console.error("loadFilters error:", error);
        }
    };

    /**
     * Gắn sự kiện giao diện
     */
    const bindEvents = () => {
        // Tab buttons (Pill)
        els.tabButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                const targetTab = btn.getAttribute("data-tab");
                if (targetTab === state.currentTab) return;

                els.tabButtons.forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
                state.currentTab = targetTab;
                loadData();
            });
        });

        // Dropdown changes -> auto reload
        [els.namHoc, els.khoa, els.heDaoTao, els.dot, els.ki].forEach((el) => {
            if (el) {
                el.addEventListener("change", () => loadData());
            }
        });

        // Search input with debounce
        if (els.keyword) {
            els.keyword.addEventListener("input", () => {
                clearTimeout(state.debounceTimer);
                state.debounceTimer = setTimeout(() => {
                    loadData();
                }, 350);
            });
        }

        // Quick search inside Khoa Detail modal
        if (els.modalKhoaSearch) {
            els.modalKhoaSearch.addEventListener("input", (e) => {
                const term = (e.target.value || "").trim().toLowerCase();
                if (!term) {
                    renderDeptProjectsTable(currentDeptProjects);
                    return;
                }
                const filtered = currentDeptProjects.filter((p) => {
                    const gv = (p.giangVien || "").toLowerCase();
                    const sv = (p.sinhVien || "").toLowerCase();
                    const dt = (p.tenDeTai || "").toLowerCase();
                    const msv = (p.maSV || "").toLowerCase();
                    const kh = (p.khoaSV || "").toLowerCase();
                    return gv.includes(term) || sv.includes(term) || dt.includes(term) || msv.includes(term) || kh.includes(term);
                });
                renderDeptProjectsTable(filtered);
            });
        }

        // Button Hiển thị
        if (els.btnShow) {
            els.btnShow.addEventListener("click", () => loadData());
        }

        // Button Xuất Excel trang chính
        if (els.btnExport) {
            els.btnExport.addEventListener("click", () => {
                const params = getFilterParams();
                params.set("tab", state.currentTab);
                window.location.href = `/v2/vuotgio/do-an/export/stats?${params.toString()}`;
            });
        }

        // Button Xuất Excel Chi Tiết trong Modal Giảng Viên (Hình 3)
        if (els.btnExportLecturerModal) {
            els.btnExportLecturerModal.addEventListener("click", () => {
                if (!state.currentLecturerName) return;
                const params = getFilterParams();
                params.set("tab", "giang-vien-detail");
                params.set("name", state.currentLecturerName);
                params.set("lecturerName", state.currentLecturerName);
                if (state.currentLecturerId) params.set("lecturerId", state.currentLecturerId);
                window.location.href = `/v2/vuotgio/do-an/export/stats?${params.toString()}`;
            });
        }

        // Button Xuất Excel Chi Tiết trong Modal Khoa
        if (els.btnExportKhoaModal) {
            els.btnExportKhoaModal.addEventListener("click", () => {
                if (!state.currentDeptCode) return;
                const params = getFilterParams();
                params.set("tab", "khoa-detail");
                params.set("khoa", state.currentDeptCode);
                window.location.href = `/v2/vuotgio/do-an/export/stats?${params.toString()}`;
            });
        }

        // Toggle Floating Summary Box (Hình 1)
        if (els.btnToggleSummary && els.summaryBox) {
            els.btnToggleSummary.addEventListener("click", () => {
                els.summaryBox.classList.toggle("collapsed");
                const icon = els.btnToggleSummary.querySelector("i");
                if (icon) {
                    if (els.summaryBox.classList.contains("collapsed")) {
                        icon.className = "bi bi-chevron-up";
                    } else {
                        icon.className = "bi bi-chevron-down";
                    }
                }
            });
        }
    };

    document.addEventListener("DOMContentLoaded", async () => {
        bindEvents();
        await loadFilters();
        loadData();
    });
})();
