(function () {
    "use strict";

    const state = {
        tab: "lecturer",
        scope: window.KTHP_STATS_SCOPE || "OFFICIAL",
        lecturerGroups: [],
        availableLecturers: [],
    };

    const el = {};

    const helpers = {
        escapeHtml(value) {
            return String(value ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\"/g, "&quot;")
                .replace(/'/g, "&#039;");
        },
        formatHours(value) {
            const num = Number(value);
            if (!Number.isFinite(num)) return "0,00";
            return num.toFixed(2).replace(".", ",");
        },
        formatDetail(row) {
            if (row.loai_kthp === "COI_THI") {
                const parts = [];
                if (row.ngay_thi) parts.push(`Ngày: ${new Date(row.ngay_thi).toLocaleDateString("vi-VN")}`);
                if (row.ca_thi) parts.push(`Ca: ${row.ca_thi}`);
                if (row.phong_thi) parts.push(`Phòng: ${row.phong_thi}`);
                if (row.thoi_gian) parts.push(`TG: ${row.thoi_gian}p`);
                return parts.join(", ") || "-";
            }
            if (row.loai_kthp === "CHAM_THI") {
                const parts = [];
                if (row.so_bai_phach) parts.push(`${row.so_bai_phach} bài/phách`);
                if (row.vai_tro) parts.push(`Vai trò: ${row.vai_tro}`);
                return parts.join(" - ") || "-";
            }
            if (row.loai_kthp === "RA_DE" || row.loai_kthp === "NGAN_HANG_CAU_HOI") {
                return row.so_luong_de ? `${row.so_luong_de} đề thi` : "-";
            }
            return "-";
        },
        formatApproval(khoaDuyet, khaoThiDuyet) {
            const kd = Number(khoaDuyet) === 1;
            const ktd = Number(khaoThiDuyet) === 1;
            if (kd && ktd) {
                return '<span class="badge-approved" title="Khoa và Khảo thí đã duyệt"><i class="bi bi-check-circle-fill"></i> Đã duyệt đủ</span>';
            }
            if (kd && !ktd) {
                return '<span class="badge-pending" title="Khoa đã duyệt, chờ Khảo thí duyệt"><i class="bi bi-clock-history"></i> Khoa đã duyệt</span>';
            }
            if (!kd && ktd) {
                return '<span class="badge-pending" title="Khảo thí duyệt, chờ Khoa duyệt"><i class="bi bi-clock-history"></i> Khảo thí duyệt</span>';
            }
            return '<span class="badge-pending" title="Chưa duyệt"><i class="bi bi-hourglass-split"></i> Chưa duyệt</span>';
        },
        getTypeBadge(type) {
            if (type === "COI_THI") return '<span class="type-badge-coi"><i class="bi bi-eye"></i> Coi thi</span>';
            if (type === "CHAM_THI") return '<span class="type-badge-cham"><i class="bi bi-pencil-square"></i> Chấm thi</span>';
            if (type === "RA_DE" || type === "NGAN_HANG_CAU_HOI") {
                return '<span class="type-badge-rade"><i class="bi bi-file-earmark-text"></i> Ra đề</span>';
            }
            return `<span class="badge bg-secondary">${helpers.escapeHtml(type)}</span>`;
        },
    };

    const isFilterModeRange = window.KTHP_FILTER_MODE === "range";

    const api = {
        async getFilters() {
            const res = await fetch("/v2/vuotgio/kthp/stats/filters");
            return res.json();
        },
        async getNamHoc() {
            try {
                const res = await fetch("/api/namhoc");
                return res.json();
            } catch (_e) {
                return [];
            }
        },
        async getHeDaoTao() {
            try {
                const res = await fetch("/api/gvm/v1/he-dao-tao");
                if (!res.ok) return [];
                const raw = await res.json();
                return Array.isArray(raw) ? raw : (raw && Array.isArray(raw.data) ? raw.data : []);
            } catch (_e) {
                return [];
            }
        },
        async lecturers(arg1, khoa, loaiKthp, keyword, namHocFrom, namHocTo) {
            let q;
            if (arg1 && typeof arg1 === "object" && arg1.params) {
                q = new URLSearchParams(arg1.params);
            } else {
                q = new URLSearchParams({ namHoc: arg1, khoa, loaiKthp, keyword, scope: state.scope });
                if (namHocFrom) q.set("namHocFrom", namHocFrom);
                if (namHocTo) q.set("namHocTo", namHocTo);
            }
            const res = await fetch(`/v2/vuotgio/kthp/stats/giang-vien?${q}`);
            return res.json();
        },
        async lecturerRecords(id, arg2, specificKhoa) {
            let q;
            if (arg2 && typeof arg2 === "object" && arg2.params) {
                q = new URLSearchParams(arg2.params);
                if (specificKhoa) q.set("khoa", specificKhoa);
            } else {
                q = new URLSearchParams({ namHoc: arg2, loaiKthp: specificKhoa, khoa: "ALL", scope: state.scope });
            }
            const res = await fetch(`/v2/vuotgio/kthp/stats/giang-vien/${id}/chi-tiet?${q}`);
            return res.json();
        },
        async faculties(arg1, khoa, loaiKthp, namHocFrom, namHocTo) {
            let q;
            if (arg1 && typeof arg1 === "object" && arg1.params) {
                q = new URLSearchParams(arg1.params);
            } else {
                q = new URLSearchParams({ namHoc: arg1, khoa: khoa || "ALL", loaiKthp, scope: state.scope });
                if (namHocFrom) q.set("namHocFrom", namHocFrom);
                if (namHocTo) q.set("namHocTo", namHocTo);
            }
            const res = await fetch(`/v2/vuotgio/kthp/stats/khoa?${q}`);
            return res.json();
        },
        async facultyRecords(khoa, arg2, loaiKthp, namHocFrom, namHocTo) {
            let q;
            if (arg2 && typeof arg2 === "object" && arg2.params) {
                q = new URLSearchParams(arg2.params);
            } else {
                q = new URLSearchParams({ namHoc: arg2, loaiKthp, scope: state.scope });
                if (namHocFrom) q.set("namHocFrom", namHocFrom);
                if (namHocTo) q.set("namHocTo", namHocTo);
            }
            const res = await fetch(`/v2/vuotgio/kthp/stats/khoa/${encodeURIComponent(khoa)}/chi-tiet?${q}`);
            return res.json();
        },
        async institute(arg1, loaiKthp, namHocFrom, namHocTo) {
            let q;
            if (arg1 && typeof arg1 === "object" && arg1.params) {
                q = new URLSearchParams(arg1.params);
            } else {
                q = new URLSearchParams({ namHoc: arg1, loaiKthp, scope: state.scope });
                if (namHocFrom) q.set("namHocFrom", namHocFrom);
                if (namHocTo) q.set("namHocTo", namHocTo);
            }
            const res = await fetch(`/v2/vuotgio/kthp/stats/hoc-vien?${q}`);
            return res.json();
        },
        async instituteRecords(arg1, loaiKthp, khoa, namHocFrom, namHocTo) {
            let q;
            if (arg1 && typeof arg1 === "object" && arg1.params) {
                q = new URLSearchParams(arg1.params);
            } else {
                q = new URLSearchParams({ namHoc: arg1, loaiKthp, khoa: khoa || "ALL", scope: state.scope });
                if (namHocFrom) q.set("namHocFrom", namHocFrom);
                if (namHocTo) q.set("namHocTo", namHocTo);
            }
            const res = await fetch(`/v2/vuotgio/kthp/stats/hoc-vien/chi-tiet?${q}`);
            return res.json();
        },
    };

    function getYearRange() {
        if (!isFilterModeRange) {
            const yearVal = String(el.namHoc?.value || el.namHocFrom?.value || "").trim();
            if (!yearVal) {
                throw new Error("Vui lòng chọn năm học");
            }
            return {
                namHocFrom: yearVal,
                namHocTo: yearVal,
                namHoc: yearVal,
                label: yearVal,
            };
        }
        const fromVal = String(el.namHocFrom?.value || el.namHoc?.value || "").trim();
        const toVal = String(el.namHocTo?.value || fromVal).trim();
        if (!fromVal || !toVal) {
            throw new Error("Vui lòng chọn đủ khoảng năm học");
        }
        const yearStart = Number((fromVal.match(/\b(19|20)\d{2}\b/) || [])[0]);
        const yearEnd = Number((toVal.match(/\b(19|20)\d{2}\b/) || [])[0]);
        if (!Number.isFinite(yearStart) || !Number.isFinite(yearEnd)) {
            throw new Error("Khoảng năm học không hợp lệ");
        }
        if (yearStart > yearEnd) {
            throw new Error("Từ năm học không được lớn hơn Đến năm học");
        }
        return {
            namHocFrom: fromVal,
            namHocTo: toVal,
            namHoc: fromVal === toVal ? fromVal : `${fromVal} - ${toVal}`,
            label: fromVal === toVal ? fromVal : `${fromVal} → ${toVal}`,
        };
    }

    function getFilterParams() {
        const yr = getYearRange();
        const khoa = el.khoa?.value || "ALL";
        const loaiKthp = el.loai?.value || "ALL";
        const keyword = el.keyword?.value?.trim() || "";
        const heDaoTao = el.heDaoTao?.value || "ALL";
        const dot = el.dot?.value || "ALL";
        const ki = el.ky?.value || "ALL";
        const hocPhan = el.hocPhan?.value?.trim() || "";

        const params = new URLSearchParams({
            namHoc: yr.namHoc,
            namHocFrom: yr.namHocFrom,
            namHocTo: yr.namHocTo,
            khoa,
            khoaId: khoa,
            loaiKthp,
            scope: state.scope,
        });
        if (keyword) params.set("keyword", keyword);
        if (heDaoTao && heDaoTao !== "ALL") params.set("heDaoTao", heDaoTao);
        if (dot && dot !== "ALL") params.set("dot", dot);
        if (ki && ki !== "ALL") {
            params.set("ki", ki);
            params.set("hocKy", ki);
        }
        if (hocPhan) params.set("hocPhan", hocPhan);

        return { yr, khoa, loaiKthp, keyword, heDaoTao, dot, ki, hocPhan, params };
    }

    function cacheElements() {
        el.namHoc = document.getElementById("kthpNamHoc");
        el.namHocFrom = document.getElementById("kthpNamHocFrom");
        el.namHocTo = document.getElementById("kthpNamHocTo");
        if (!el.namHoc && el.namHocFrom) {
            el.namHoc = el.namHocFrom;
        }
        el.khoa = document.getElementById("kthpKhoaFilter");
        el.khoaGroup = document.getElementById("kthpKhoaGroup");
        el.heDaoTao = document.getElementById("kthpHeDaoTao");
        el.heDaoTaoGroup = document.getElementById("kthpHeDaoTaoGroup");
        el.dot = document.getElementById("kthpDot");
        el.dotGroup = document.getElementById("kthpDotGroup");
        el.ky = document.getElementById("kthpKy");
        el.kyGroup = document.getElementById("kthpKyGroup");
        el.loai = document.getElementById("kthpLoaiFilter");
        el.keyword = document.getElementById("kthpKeywordInput");
        el.keywordGroup = document.getElementById("kthpKeywordGroup");
        el.hocPhan = document.getElementById("kthpHocPhanInput");
        el.hocPhanGroup = document.getElementById("kthpHocPhanGroup");
        el.suggestions = document.getElementById("kthpLecturerSuggestions");
        el.loadBtn = document.getElementById("kthpLoadBtn");
        el.exportBtn = document.getElementById("kthpExportBtn");
        el.content = document.getElementById("kthpContent");
        el.kpiLabel1 = document.getElementById("kthpKpiLabel1");
        el.kpiValue1 = document.getElementById("kthpKpiValue1");
        el.kpiValue2 = document.getElementById("kthpKpiValue2");
        el.kpiLabel3 = document.getElementById("kthpKpiLabel3");
        el.kpiValue3 = document.getElementById("kthpKpiValue3");
        el.chartSection = document.getElementById("kthpChartSection");
        el.chartTitle1 = document.getElementById("kthpChartTitle1");
        el.chartTitle2 = document.getElementById("kthpChartTitle2");
        el.chartCanvas1 = document.getElementById("kthpChart1");
        el.chartCanvas2 = document.getElementById("kthpChart2");

        if (!window.KTHP_SHOW_CHART && el.chartSection) {
            el.chartSection.style.display = "none";
        }
    }

    let chart1Instance = null;
    let chart2Instance = null;

    const CHART_COLORS = [
        "#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444",
        "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
        "#84cc16", "#0ea5e9", "#d946ef", "#22c55e", "#e11d48"
    ];

    function destroyCharts() {
        if (chart1Instance) {
            chart1Instance.destroy();
            chart1Instance = null;
        }
        if (chart2Instance) {
            chart2Instance.destroy();
            chart2Instance = null;
        }
    }

    function hideChartSection() {
        destroyCharts();
        if (el.chartSection) el.chartSection.style.display = "none";
    }

    function renderLecturerCharts(summary, yearLabel) {
        if (!window.KTHP_SHOW_CHART || !window.Chart || !el.chartSection || !el.chartCanvas1 || !el.chartCanvas2) {
            hideChartSection();
            return;
        }
        if (!Array.isArray(summary) || summary.length === 0) {
            hideChartSection();
            return;
        }

        destroyCharts();
        el.chartSection.style.display = "";

        const yrSuffix = yearLabel ? ` (${helpers.escapeHtml(yearLabel)})` : "";
        if (el.chartTitle1) {
            el.chartTitle1.innerHTML = `<i class="bi bi-bar-chart-fill me-2"></i>Top giảng viên theo số tiết QC${yrSuffix}`;
        }
        if (el.chartTitle2) {
            el.chartTitle2.innerHTML = `<i class="bi bi-pie-chart-fill me-2"></i>Cơ cấu tiết QC theo phân loại công việc${yrSuffix}`;
        }

        const sorted = [...summary]
            .sort((a, b) => Number(b.tong_so_tiet_qc || 0) - Number(a.tong_so_tiet_qc || 0))
            .slice(0, 15);

        const labels = sorted.map((g) => g.ten_nhan_vien || "Chưa rõ");
        const dataCoi = sorted.map((g) => Number(g.so_tiet_coi_thi || 0));
        const dataRaDe = sorted.map((g) => Number(g.so_tiet_ra_de || 0));
        const dataCham = sorted.map((g) => Number(g.so_tiet_cham_thi || 0));

        chart1Instance = new Chart(el.chartCanvas1, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Coi thi",
                        data: dataCoi,
                        backgroundColor: "rgba(2, 132, 199, 0.85)",
                        borderColor: "#0284c7",
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                    {
                        label: "Ra đề",
                        data: dataRaDe,
                        backgroundColor: "rgba(217, 119, 6, 0.85)",
                        borderColor: "#d97706",
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                    {
                        label: "Chấm thi",
                        data: dataCham,
                        backgroundColor: "rgba(219, 39, 119, 0.85)",
                        borderColor: "#db2777",
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                ],
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: "rgba(0,0,0,0.05)" },
                        title: { display: true, text: "Số tiết quy chuẩn" },
                    },
                    y: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { font: { size: 11 }, autoSkip: false },
                    },
                },
                plugins: {
                    legend: { position: "top", labels: { usePointStyle: true, boxWidth: 8 } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ${helpers.formatHours(ctx.parsed.x)} tiết QC`,
                        },
                    },
                },
            },
        });

        const totalCoi = summary.reduce((acc, g) => acc + Number(g.so_tiet_coi_thi || 0), 0);
        const totalRaDe = summary.reduce((acc, g) => acc + Number(g.so_tiet_ra_de || 0), 0);
        const totalCham = summary.reduce((acc, g) => acc + Number(g.so_tiet_cham_thi || 0), 0);

        chart2Instance = new Chart(el.chartCanvas2, {
            type: "doughnut",
            data: {
                labels: ["Coi thi", "Ra đề", "Chấm thi"],
                datasets: [
                    {
                        data: [totalCoi, totalRaDe, totalCham],
                        backgroundColor: ["#0284c7", "#d97706", "#db2777"],
                        borderWidth: 2,
                        borderColor: "#fff",
                        hoverOffset: 6,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "60%",
                plugins: {
                    legend: { position: "bottom", labels: { usePointStyle: true, padding: 12, boxWidth: 8 } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                                return ` ${ctx.label}: ${helpers.formatHours(ctx.parsed)} tiết QC (${pct}%)`;
                            },
                        },
                    },
                },
            },
        });
    }

    function renderFacultyCharts(faculties, yearLabel) {
        if (!window.KTHP_SHOW_CHART || !window.Chart || !el.chartSection || !el.chartCanvas1 || !el.chartCanvas2) {
            hideChartSection();
            return;
        }
        if (!Array.isArray(faculties) || faculties.length === 0) {
            hideChartSection();
            return;
        }

        destroyCharts();
        el.chartSection.style.display = "";

        const yrSuffix = yearLabel ? ` (${helpers.escapeHtml(yearLabel)})` : "";
        if (el.chartTitle1) {
            el.chartTitle1.innerHTML = `<i class="bi bi-bar-chart-fill me-2"></i>Tiết quy chuẩn coi, chấm, ra đề theo khoa${yrSuffix}`;
        }
        if (el.chartTitle2) {
            el.chartTitle2.innerHTML = `<i class="bi bi-pie-chart-fill me-2"></i>Tỉ lệ tiết quy chuẩn giữa các khoa${yrSuffix}`;
        }

        const labels = faculties.map((f) => f.ma_phong_ban || f.ten_phong_ban || "Chưa rõ");
        const dataCoi = faculties.map((f) => Number(f.so_tiet_coi_thi || 0));
        const dataRaDe = faculties.map((f) => Number(f.so_tiet_ra_de || 0));
        const dataCham = faculties.map((f) => Number(f.so_tiet_cham_thi || 0));
        const dataTotal = faculties.map((f) => Number(f.tong_so_tiet_qc || 0));

        chart1Instance = new Chart(el.chartCanvas1, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Coi thi",
                        data: dataCoi,
                        backgroundColor: "rgba(2, 132, 199, 0.85)",
                        borderColor: "#0284c7",
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                    {
                        label: "Ra đề",
                        data: dataRaDe,
                        backgroundColor: "rgba(217, 119, 6, 0.85)",
                        borderColor: "#d97706",
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                    {
                        label: "Chấm thi",
                        data: dataCham,
                        backgroundColor: "rgba(219, 39, 119, 0.85)",
                        borderColor: "#db2777",
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { font: { size: 11 } },
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: "rgba(0,0,0,0.05)" },
                        title: { display: true, text: "Số tiết QC" },
                    },
                },
                plugins: {
                    legend: { position: "top", labels: { usePointStyle: true, boxWidth: 8 } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ${helpers.formatHours(ctx.parsed.y)} tiết QC`,
                        },
                    },
                },
            },
        });

        chart2Instance = new Chart(el.chartCanvas2, {
            type: "doughnut",
            data: {
                labels,
                datasets: [
                    {
                        data: dataTotal,
                        backgroundColor: CHART_COLORS.slice(0, faculties.length),
                        borderWidth: 2,
                        borderColor: "#fff",
                        hoverOffset: 6,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "60%",
                plugins: {
                    legend: { position: "bottom", labels: { usePointStyle: true, padding: 12, boxWidth: 8 } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                                return ` ${ctx.label}: ${helpers.formatHours(ctx.parsed)} tiết QC (${pct}%)`;
                            },
                        },
                    },
                },
            },
        });
    }

    function renderInstituteCharts(byType, faculties, yearLabel) {
        if (!window.KTHP_SHOW_CHART || !window.Chart || !el.chartSection || !el.chartCanvas1 || !el.chartCanvas2) {
            hideChartSection();
            return;
        }
        if ((!byType || !byType.length) && (!faculties || !faculties.length)) {
            hideChartSection();
            return;
        }

        destroyCharts();
        el.chartSection.style.display = "";

        const yrSuffix = yearLabel ? ` (${helpers.escapeHtml(yearLabel)})` : "";
        if (el.chartTitle1) {
            el.chartTitle1.innerHTML = `<i class="bi bi-bar-chart-fill me-2"></i>Tổng số tiết QC & Số GV theo khoa toàn học viện${yrSuffix}`;
        }
        if (el.chartTitle2) {
            el.chartTitle2.innerHTML = `<i class="bi bi-pie-chart-fill me-2"></i>Phân bổ tiết QC theo loại công việc toàn học viện${yrSuffix}`;
        }

        const fList = Array.isArray(faculties) ? faculties : [];
        const fLabels = fList.map((f) => f.ma_phong_ban || f.ten_phong_ban);
        const fHours = fList.map((f) => Number(f.tong_so_tiet_qc || 0));
        const fGvs = fList.map((f) => Number(f.gv_count || 0));

        chart1Instance = new Chart(el.chartCanvas1, {
            type: "bar",
            data: {
                labels: fLabels,
                datasets: [
                    {
                        label: "Tổng số tiết QC",
                        data: fHours,
                        backgroundColor: "rgba(79, 70, 229, 0.8)",
                        borderColor: "#4f46e5",
                        borderWidth: 1,
                        borderRadius: 4,
                        yAxisID: "y",
                    },
                    {
                        label: "Số giảng viên",
                        data: fGvs,
                        backgroundColor: "rgba(6, 182, 212, 0.8)",
                        borderColor: "#06b6d4",
                        borderWidth: 1,
                        borderRadius: 4,
                        yAxisID: "y1",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: { position: "top", labels: { usePointStyle: true, boxWidth: 8 } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                if (ctx.datasetIndex === 0) return ` ${ctx.dataset.label}: ${helpers.formatHours(ctx.parsed.y)} tiết QC`;
                                return ` ${ctx.dataset.label}: ${ctx.parsed.y} GV`;
                            },
                        },
                    },
                },
                scales: {
                    x: { grid: { display: false } },
                    y: {
                        position: "left",
                        beginAtZero: true,
                        title: { display: true, text: "Số tiết quy chuẩn" },
                        grid: { color: "rgba(0,0,0,0.05)" },
                    },
                    y1: {
                        position: "right",
                        beginAtZero: true,
                        title: { display: true, text: "Số giảng viên" },
                        grid: { drawOnChartArea: false },
                    },
                },
            },
        });

        const tLabels = (byType || []).map((t) => t.loai_kthp_label);
        const tHours = (byType || []).map((t) => Number(t.tong_so_tiet_qc || 0));

        chart2Instance = new Chart(el.chartCanvas2, {
            type: "doughnut",
            data: {
                labels: tLabels,
                datasets: [
                    {
                        data: tHours,
                        backgroundColor: ["#0284c7", "#d97706", "#db2777", "#8b5cf6"],
                        borderWidth: 2,
                        borderColor: "#fff",
                        hoverOffset: 6,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "60%",
                plugins: {
                    legend: { position: "bottom", labels: { usePointStyle: true, padding: 12, boxWidth: 8 } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                                return ` ${ctx.label}: ${helpers.formatHours(ctx.parsed)} tiết QC (${pct}%)`;
                            },
                        },
                    },
                },
            },
        });
    }

    function setKpis(label1, val1, totalHours, label3, val3) {
        if (el.kpiLabel1) el.kpiLabel1.textContent = label1;
        if (el.kpiValue1) el.kpiValue1.textContent = String(val1 || 0);
        if (el.kpiValue2) el.kpiValue2.textContent = helpers.formatHours(totalHours);
        if (el.kpiLabel3) el.kpiLabel3.textContent = label3;
        if (el.kpiValue3) el.kpiValue3.textContent = String(val3 || 0);
    }

    function updateControls() {
        if (el.keywordGroup) {
            el.keywordGroup.style.display = state.tab === "lecturer" ? "" : "none";
        }
        if (isFilterModeRange && el.khoaGroup) {
            el.khoaGroup.style.display = state.tab === "institute" ? "none" : "";
        }
    }

    async function loadLecturers() {
        const fp = getFilterParams();

        const res = await api.lecturers(fp);
        if (!res.success) throw new Error(res.message || "Không thể lấy dữ liệu giảng viên");

        const summary = Array.isArray(res.data) ? res.data : [];
        state.availableLecturers = summary;

        if (el.suggestions) {
            el.suggestions.innerHTML = summary
                .map((gv) => `<option value="${helpers.escapeHtml(gv.ten_nhan_vien)}" label="${helpers.escapeHtml(gv.ma_phong_ban)}"></option>`)
                .join("");
        }

        if (!summary.length) {
            hideChartSection();
            setKpis("Giảng viên", 0, 0, "Tổng công việc", 0);
            el.content.innerHTML = '<div class="stats-table-card text-center py-5 text-muted"><i class="bi bi-inbox fs-2 d-block mb-2"></i>Không tìm thấy dữ liệu phù hợp</div>';
            return;
        }

        renderLecturerCharts(summary, fp.yr.label);

        // Load records for each lecturer, passing current filters
        const groups = await Promise.all(
            summary.map(async (gv) => {
                const recordsRes = await api.lecturerRecords(gv.lecturer_id, fp, fp.khoa);
                return {
                    lecturerId: gv.lecturer_id,
                    name: gv.ten_nhan_vien,
                    department: gv.ten_phong_ban || gv.ma_phong_ban || "Chưa có khoa",
                    totalHours: gv.tong_so_tiet_qc,
                    hoursCoi: gv.so_tiet_coi_thi,
                    hoursRaDe: gv.so_tiet_ra_de,
                    hoursCham: gv.so_tiet_cham_thi,
                    records: recordsRes.success ? recordsRes.data : [],
                };
            })
        );

        const totalHours = groups.reduce((acc, g) => acc + Number(g.totalHours || 0), 0);
        const totalRecords = groups.reduce((acc, g) => acc + (g.records || []).length, 0);
        setKpis("Giảng viên", groups.length, totalHours, "Tổng công việc", totalRecords);

        // Render groups
        const headers = [
            "STT",
            "Loại",
            "Tên học phần",
            "Mã HP",
            "Lớp học phần",
            "Hệ ĐT",
            "Hình thức",
            "Chi tiết (Ca/Phòng/Bài/Đề)",
            "Số TC",
            "Số SV",
            "Hệ số",
            "Số tiết QC",
            "Trạng thái duyệt",
        ];

        let globalIndex = 0;
        const bodyHtml = groups
            .map((g) => {
                const rowsHtml = g.records.length
                    ? g.records
                            .map((r) => {
                                globalIndex++;
                                return `
                                <tr>
                                    <td>${globalIndex}</td>
                                    <td>${helpers.getTypeBadge(r.loai_kthp)}</td>
                                    <td class="text-start font-monospace">${helpers.escapeHtml(r.ten_hoc_phan || "-")}</td>
                                    <td>${helpers.escapeHtml(r.ma_hoc_phan || "-")}</td>
                                    <td>${helpers.escapeHtml(r.lop_hoc_phan || "-")}</td>
                                    <td>${helpers.escapeHtml(r.he_dao_tao || "-")}</td>
                                    <td>${helpers.escapeHtml(r.hinh_thuc_thi || "-")}</td>
                                    <td class="text-start">${helpers.formatDetail(r)}</td>
                                    <td>${r.so_tc ?? "-"}</td>
                                    <td>${r.so_sv ?? "-"}</td>
                                    <td>${r.he_so ?? "-"}</td>
                                    <td class="fw-bold text-primary">${helpers.formatHours(r.quy_chuan)}</td>
                                    <td>${helpers.formatApproval(r.khoa_duyet, r.khao_thi_duyet)}</td>
                                </tr>
                            `;
                            })
                            .join("")
                    : `<tr><td colspan="${headers.length}" class="text-muted">Chưa có công việc nào</td></tr>`;

                return `
                    <tr class="nckh-stats-group-header">
                        <td colspan="${headers.length}">
                            <strong><i class="bi bi-person-badge me-1"></i> ${helpers.escapeHtml(g.name)}</strong> - <span class="text-muted">${helpers.escapeHtml(g.department)}</span>
                            <span class="kthp-hours-tag">${helpers.formatHours(g.totalHours)} tiết QC</span>
                            <span class="kthp-badge-sub">Coi: ${helpers.formatHours(g.hoursCoi)}</span>
                            <span class="kthp-badge-sub">Ra đề: ${helpers.formatHours(g.hoursRaDe)}</span>
                            <span class="kthp-badge-sub">Chấm: ${helpers.formatHours(g.hoursCham)}</span>
                            <span class="nckh-v3-group-count">${g.records.length} việc</span>
                        </td>
                    </tr>
                    ${rowsHtml}
                `;
            })
            .join("");

        el.content.innerHTML = `
            <div class="stats-table-card table-responsive">
                <table class="table table-hover text-center align-middle">
                    <thead>
                        <tr>
                            ${headers.map((h, i) => `<th class="${[2, 7].includes(i) ? "text-start" : ""}">${h}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>${bodyHtml}</tbody>
                </table>
            </div>
        `;
    }

    async function loadFaculties() {
        const fp = getFilterParams();

        const res = await api.faculties(fp);
        if (!res.success) throw new Error(res.message || "Không thể lấy thống kê khoa");

        const faculties = Array.isArray(res.data) ? res.data : [];
        if (!faculties.length) {
            hideChartSection();
            setKpis("Khoa / Bộ môn", 0, 0, "Tổng công việc", 0);
            el.content.innerHTML = '<div class="stats-table-card text-center py-5 text-muted"><i class="bi bi-inbox fs-2 d-block mb-2"></i>Không có dữ liệu theo khoa</div>';
            return;
        }

        renderFacultyCharts(faculties, fp.yr.label);

        const totalHours = faculties.reduce((acc, f) => acc + Number(f.tong_so_tiet_qc || 0), 0);
        const totalJobs = faculties.reduce((acc, f) => acc + Number(f.cong_viec_count || 0), 0);
        setKpis("Khoa / Bộ môn", faculties.length, totalHours, "Tổng công việc", totalJobs);

        const rowsHtml = faculties
            .map((f, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td><span class="badge bg-light text-dark border font-monospace">${helpers.escapeHtml(f.ma_phong_ban)}</span></td>
                    <td class="text-start fw-bold">${helpers.escapeHtml(f.ten_phong_ban || f.ma_phong_ban)}</td>
                    <td>${f.gv_count || 0}</td>
                    <td>${f.cong_viec_count || 0}</td>
                    <td>${helpers.formatHours(f.so_tiet_coi_thi)}</td>
                    <td>${helpers.formatHours(f.so_tiet_ra_de)}</td>
                    <td>${helpers.formatHours(f.so_tiet_cham_thi)}</td>
                    <td class="fw-bold text-primary">${helpers.formatHours(f.tong_so_tiet_qc)}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary btn-view-faculty" data-khoa="${helpers.escapeHtml(f.ma_phong_ban)}">
                            <i class="bi bi-eye"></i> Chi tiết
                        </button>
                    </td>
                </tr>
                <tr id="faculty-detail-${helpers.escapeHtml(f.ma_phong_ban)}" class="d-none">
                    <td colspan="10" class="p-3 bg-light text-start">
                        <div class="spinner-border spinner-border-sm text-primary" role="status"></div> Đang tải chi tiết...
                    </td>
                </tr>
            `)
            .join("");

        el.content.innerHTML = `
            <div class="stats-table-card table-responsive">
                <table class="table table-hover text-center align-middle">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Mã Khoa</th>
                            <th class="text-start">Tên Khoa / Bộ môn</th>
                            <th>Số GV</th>
                            <th>Số lượt việc</th>
                            <th>Tiết QC Coi thi</th>
                            <th>Tiết QC Ra đề</th>
                            <th>Tiết QC Chấm thi</th>
                            <th>Tổng tiết QC</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;

        // Attach click for faculty detail
        el.content.querySelectorAll(".btn-view-faculty").forEach((btn) => {
            btn.addEventListener("click", async () => {
                const khoaCode = btn.getAttribute("data-khoa");
                const detailRow = document.getElementById(`faculty-detail-${khoaCode}`);
                if (!detailRow) return;

                if (!detailRow.classList.contains("d-none")) {
                    detailRow.classList.add("d-none");
                    btn.innerHTML = '<i class="bi bi-eye"></i> Chi tiết';
                    return;
                }

                detailRow.classList.remove("d-none");
                btn.innerHTML = '<i class="bi bi-eye-slash"></i> Thu gọn';

                try {
                    const detailRes = await api.facultyRecords(khoaCode, fp);
                    const records = detailRes.success ? detailRes.data : [];
                    if (!records.length) {
                        detailRow.innerHTML = '<td colspan="10" class="p-3 bg-light text-center text-muted">Không có công việc nào trong khoa này</td>';
                        return;
                    }

                    let subIndex = 0;
                    const subRows = records
                        .map(
                            (r) => `
                            <tr>
                                <td>${++subIndex}</td>
                                <td class="text-start fw-bold">${helpers.escapeHtml(r.giang_vien || "-")}</td>
                                <td>${helpers.getTypeBadge(r.loai_kthp)}</td>
                                <td class="text-start font-monospace">${helpers.escapeHtml(r.ten_hoc_phan || "-")}</td>
                                <td>${helpers.escapeHtml(r.lop_hoc_phan || "-")}</td>
                                <td class="text-start">${helpers.formatDetail(r)}</td>
                                <td class="fw-bold text-primary">${helpers.formatHours(r.quy_chuan)}</td>
                                <td>${helpers.formatApproval(r.khoa_duyet, r.khao_thi_duyet)}</td>
                            </tr>
                        `
                        )
                        .join("");

                    detailRow.innerHTML = `
                        <td colspan="10" class="p-3 bg-light">
                            <div class="card border-0 shadow-sm">
                                <div class="card-body p-2 table-responsive">
                                    <table class="table table-sm table-bordered text-center align-middle mb-0 bg-white">
                                        <thead class="table-light">
                                            <tr>
                                                <th>STT</th>
                                                <th class="text-start">Giảng viên</th>
                                                <th>Loại</th>
                                                <th class="text-start">Tên học phần</th>
                                                <th>Lớp HP</th>
                                                <th class="text-start">Chi tiết ca/phòng/bài/đề</th>
                                                <th>Số tiết QC</th>
                                                <th>Trạng thái duyệt</th>
                                            </tr>
                                        </thead>
                                        <tbody>${subRows}</tbody>
                                    </table>
                                </div>
                            </div>
                        </td>
                    `;
                } catch (err) {
                    detailRow.innerHTML = `<td colspan="10" class="p-3 text-danger">Lỗi khi tải chi tiết: ${helpers.escapeHtml(err.message)}</td>`;
                }
            });
        });
    }

    async function loadInstitute() {
        const fp = getFilterParams();

        const res = await api.institute(fp);
        if (!res.success) throw new Error(res.message || "Không thể lấy thống kê học viện");

        const summary = res.data || {};
        const overview = summary.overview || {};
        const byType = summary.byType || [];

        setKpis(
            "Tổng số GV",
            overview.tong_gv || 0,
            overview.tong_so_tiet_qc || 0,
            "Tổng công việc",
            overview.tong_cong_viec || 0
        );

        const typeRowsHtml = byType.length
            ? byType
                    .map(
                        (t, idx) => `
                    <tr>
                        <td>${idx + 1}</td>
                        <td class="text-start fw-bold">${helpers.getTypeBadge(t.loai_kthp_group)} ${helpers.escapeHtml(t.loai_kthp_label)}</td>
                        <td>${t.gv_count || 0}</td>
                        <td>${t.cong_viec_count || 0}</td>
                        <td class="fw-bold text-primary">${helpers.formatHours(t.tong_so_tiet_qc)}</td>
                    </tr>
                `
                    )
                    .join("")
            : '<tr><td colspan="5" class="text-muted">Không có dữ liệu loại công việc</td></tr>';

        // Also load full institute records and faculties for charts
        const [allRecordsRes, facultiesRes] = await Promise.all([
            api.instituteRecords(fp),
            api.faculties(fp),
        ]);
        const allRecords = allRecordsRes.success ? allRecordsRes.data : [];
        const faculties = facultiesRes.success && Array.isArray(facultiesRes.data) ? facultiesRes.data : [];

        if (!byType.length && !allRecords.length) {
            hideChartSection();
        } else {
            renderInstituteCharts(byType, faculties, fp.yr.label);
        }

        let recIdx = 0;
        const recRowsHtml = allRecords.length
            ? allRecords
                    .map(
                        (r) => `
                    <tr>
                        <td>${++recIdx}</td>
                        <td><span class="badge bg-light text-dark border">${helpers.escapeHtml(r.khoa)}</span></td>
                        <td class="text-start fw-bold">${helpers.escapeHtml(r.giang_vien || "-")}</td>
                        <td>${helpers.getTypeBadge(r.loai_kthp)}</td>
                        <td class="text-start font-monospace">${helpers.escapeHtml(r.ten_hoc_phan || "-")}</td>
                        <td>${helpers.escapeHtml(r.lop_hoc_phan || "-")}</td>
                        <td class="text-start">${helpers.formatDetail(r)}</td>
                        <td class="fw-bold text-primary">${helpers.formatHours(r.quy_chuan)}</td>
                        <td>${helpers.formatApproval(r.khoa_duyet, r.khao_thi_duyet)}</td>
                    </tr>
                `
                    )
                    .join("")
            : '<tr><td colspan="9" class="text-muted">Không có bản ghi chi tiết nào</td></tr>';

        el.content.innerHTML = `
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="stats-table-card table-responsive h-100">
                        <h6 class="fw-bold p-3 border-bottom mb-0"><i class="bi bi-pie-chart-fill text-primary me-2"></i>Tổng hợp theo phân loại công việc</h6>
                        <table class="table table-hover text-center align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th>STT</th>
                                    <th class="text-start">Loại công việc</th>
                                    <th>Số GV</th>
                                    <th>Số lượt</th>
                                    <th>Tổng tiết QC</th>
                                </tr>
                            </thead>
                            <tbody>${typeRowsHtml}</tbody>
                        </table>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="stats-table-card p-4 h-100 d-flex flex-column justify-content-center">
                        <h6 class="fw-bold text-muted mb-3"><i class="bi bi-info-circle me-1"></i> Tổng quan toàn Học viện (${helpers.escapeHtml(yr.label)})</h6>
                        <div class="d-flex justify-content-around text-center mb-2">
                            <div>
                                <span class="fs-4 fw-bold text-primary d-block">${overview.tong_khoa || 0}</span>
                                <span class="text-muted small">Khoa tham gia</span>
                            </div>
                            <div>
                                <span class="fs-4 fw-bold text-success d-block">${helpers.formatHours(overview.so_tiet_coi_thi)}</span>
                                <span class="text-muted small">Tiết Coi thi</span>
                            </div>
                            <div>
                                <span class="fs-4 fw-bold text-warning d-block">${helpers.formatHours(overview.so_tiet_ra_de)}</span>
                                <span class="text-muted small">Tiết Ra đề</span>
                            </div>
                            <div>
                                <span class="fs-4 fw-bold text-danger d-block">${helpers.formatHours(overview.so_tiet_cham_thi)}</span>
                                <span class="text-muted small">Tiết Chấm thi</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="stats-table-card table-responsive">
                <h6 class="fw-bold p-3 border-bottom mb-0"><i class="bi bi-list-task text-primary me-2"></i>Danh sách toàn bộ công việc Học viện</h6>
                <table class="table table-hover text-center align-middle mb-0">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Khoa</th>
                            <th class="text-start">Giảng viên</th>
                            <th>Loại</th>
                            <th class="text-start">Tên học phần</th>
                            <th>Lớp HP</th>
                            <th class="text-start">Chi tiết ca/phòng/bài/đề</th>
                            <th>Số tiết QC</th>
                            <th>Trạng thái duyệt</th>
                        </tr>
                    </thead>
                    <tbody>${recRowsHtml}</tbody>
                </table>
            </div>
        `;
    }

    async function loadCurrent() {
        let fp;
        try {
            fp = getFilterParams();
        } catch (err) {
            if (isFilterModeRange ? (el.namHocFrom && el.namHocTo) : el.namHoc) {
                return Swal.fire("Thông báo", err.message, "warning");
            }
            return;
        }
        el.content.innerHTML = '<div class="stats-table-card text-center py-5"><div class="spinner-border text-primary" role="status"></div><div class="mt-2 text-muted">Đang tải dữ liệu...</div></div>';
        try {
            if (state.tab === "lecturer") {
                await loadLecturers();
            } else if (state.tab === "faculty") {
                await loadFaculties();
            } else {
                await loadInstitute();
            }
        } catch (err) {
            console.error(err);
            Swal.fire("Lỗi tải dữ liệu", err.message || "Đã xảy ra lỗi", "error");
            el.content.innerHTML = `<div class="stats-table-card text-center py-5 text-danger"><i class="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>${helpers.escapeHtml(err.message)}</div>`;
        }
    }

    function exportCurrent() {
        let fp;
        try {
            fp = getFilterParams();
        } catch (err) {
            return Swal.fire("Thông báo", err.message, "warning");
        }

        if (state.tab === "lecturer" && (!state.availableLecturers || state.availableLecturers.length === 0)) {
            return Swal.fire("Thông báo", "Không có dữ liệu để xuất", "info");
        }

        const isPreview = state.scope === "PREVIEW";
        const exportBase = isPreview ? "/v2/vuotgio/kthp/export/stats/preview" : "/v2/vuotgio/kthp/export/stats";

        if (state.tab === "lecturer") {
            window.location.href = `${exportBase}/giang-vien?${fp.params.toString()}`;
        } else if (state.tab === "faculty") {
            window.location.href = `${exportBase}/khoa?${fp.params.toString()}`;
        } else if (state.tab === "institute") {
            window.location.href = `${exportBase}/hoc-vien?${fp.params.toString()}`;
        }
    }

    async function init() {
        cacheElements();
        updateControls();

        const urlParams = new URLSearchParams(window.location.search);
        const urlNamHoc = urlParams.get("namHoc");
        const urlNamHocFrom = urlParams.get("namHocFrom") || urlNamHoc;
        const urlNamHocTo = urlParams.get("namHocTo") || urlNamHoc;

        // 1. Populate Năm học từ /api/namhoc cho cả el.namHoc, el.namHocFrom và el.namHocTo
        try {
            const namHocList = await api.getNamHoc();
            const fillSelect = (selectEl, defaultVal) => {
                if (!selectEl) return;
                selectEl.innerHTML = "";
                if (Array.isArray(namHocList) && namHocList.length > 0) {
                    namHocList.forEach((item, index) => {
                        const option = document.createElement("option");
                        option.value = item.NamHoc;
                        option.textContent = item.NamHoc;

                        if (defaultVal && item.NamHoc === defaultVal) {
                            option.selected = true;
                        } else if (!defaultVal && (item.trangthai === 1 || (index === 0 && !namHocList.some((i) => i.trangthai === 1)))) {
                            option.selected = true;
                        }
                        selectEl.appendChild(option);
                    });
                }
            };

            fillSelect(el.namHoc, urlNamHoc);
            fillSelect(el.namHocFrom, urlNamHocFrom);
            fillSelect(el.namHocTo, urlNamHocTo);
        } catch (err) {
            console.warn("Lỗi tải danh sách năm học:", err);
        }

        // 2. Populate Khoa từ /v2/vuotgio/kthp/stats/filters
        try {
            const filterData = await api.getFilters();
            if (filterData.success && Array.isArray(filterData.data?.khoaList)) {
                const khoaOpts = filterData.data.khoaList
                    .map((k) => `<option value="${helpers.escapeHtml(k.MaPhongBan)}">${helpers.escapeHtml(k.MaPhongBan)} - ${helpers.escapeHtml(k.TenPhongBan)}</option>`)
                    .join("");
                el.khoa.innerHTML = '<option value="ALL">Tất cả khoa</option>' + khoaOpts;

                const urlKhoa = urlParams.get("khoa");
                if (urlKhoa && el.khoa.querySelector(`option[value="${urlKhoa}"]`)) {
                    el.khoa.value = urlKhoa;
                } else {
                    el.khoa.value = "ALL";
                }
                el.khoa.disabled = false;
            }
        } catch (err) {
            console.warn("Lỗi tải danh sách khoa:", err);
        }

        // 3. Populate Hệ đào tạo từ /api/gvm/v1/he-dao-tao
        if (el.heDaoTao) {
            try {
                const rawHdt = await api.getHeDaoTao();
                const hdtList = Array.isArray(rawHdt) ? rawHdt : (rawHdt && Array.isArray(rawHdt.data) ? rawHdt.data : []);
                const filteredHdt = hdtList
                    .map((item) => ({
                        id: item.id,
                        value: item.he_dao_tao || item.HeDaoTao || item.value || "",
                    }))
                    .filter((item) => item.value && !item.value.toLowerCase().includes("đồ án"));

                el.heDaoTao.innerHTML = '<option value="ALL">Tất cả hệ</option>' +
                    filteredHdt
                        .map((h) => `<option value="${helpers.escapeHtml(String(h.id))}">${helpers.escapeHtml(h.value)}</option>`)
                        .join("");

                const urlHeDaoTao = urlParams.get("heDaoTao");
                if (urlHeDaoTao && el.heDaoTao.querySelector(`option[value="${urlHeDaoTao}"]`)) {
                    el.heDaoTao.value = urlHeDaoTao;
                } else {
                    el.heDaoTao.value = "ALL";
                }
            } catch (err) {
                console.warn("Lỗi tải danh sách hệ đào tạo:", err);
            }
        }

        const urlDot = urlParams.get("dot");
        if (urlDot && el.dot) el.dot.value = urlDot;

        const urlKi = urlParams.get("ki") || urlParams.get("hocKy");
        if (urlKi && el.ky) el.ky.value = urlKi;

        const urlHocPhan = urlParams.get("hocPhan");
        if (urlHocPhan && el.hocPhan) el.hocPhan.value = urlHocPhan;

        // Tab buttons
        document.querySelectorAll(".nav-pill").forEach((pill) => {
            pill.addEventListener("click", () => {
                document.querySelectorAll(".nav-pill").forEach((p) => p.classList.remove("active"));
                pill.classList.add("active");
                state.tab = pill.getAttribute("data-stat-tab");
                updateControls();
                destroyCharts();
                loadCurrent();
            });
        });

        if (el.loadBtn) el.loadBtn.addEventListener("click", loadCurrent);
        if (el.exportBtn) el.exportBtn.addEventListener("click", exportCurrent);

        if (el.namHoc) el.namHoc.addEventListener("change", loadCurrent);
        if (el.namHocFrom) el.namHocFrom.addEventListener("change", loadCurrent);
        if (el.namHocTo) el.namHocTo.addEventListener("change", loadCurrent);

        if (el.khoa) {
            el.khoa.addEventListener("change", () => {
                if (el.keyword) el.keyword.value = "";
                loadCurrent();
            });
        }
        if (el.heDaoTao) el.heDaoTao.addEventListener("change", loadCurrent);
        if (el.dot) el.dot.addEventListener("change", loadCurrent);
        if (el.ky) el.ky.addEventListener("change", loadCurrent);
        if (el.loai) el.loai.addEventListener("change", loadCurrent);

        if (el.keyword) {
            el.keyword.addEventListener("keyup", (e) => {
                if (e.key === "Enter") loadCurrent();
            });
        }
        if (el.hocPhan) {
            el.hocPhan.addEventListener("keyup", (e) => {
                if (e.key === "Enter") loadCurrent();
            });
        }

        // Load initial data
        loadCurrent();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
