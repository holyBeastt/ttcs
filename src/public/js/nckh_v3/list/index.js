(function () {
  const state = {
    rawRows: [],
    rows: [],
    permission: {
      canApprove: false,
      canApproveKhoa: false,
    },
  };

  const el = {
    namHocFilter: null,
    khoaFilter: null,
    quickSearchInput: null,
    loadDataBtn: null,
    tableBody: null,
  };

  const api = {
    async getNamHoc() {
      const response = await fetch("/getNamHoc");
      return response.json();
    },

    async getFilters() {
      const response = await fetch("/v3/nckh/records/filters");
      return response.json();
    },

    async list(namHoc, khoaId) {
      const query = new URLSearchParams({ namHoc, khoaId }).toString();
      const response = await fetch(`/v3/nckh/records?${query}`);
      return response.json();
    },

    async detail(id) {
      const response = await fetch(`/v3/nckh/records/${id}`);
      return response.json();
    },

    async approveKhoa(id, khoaDuyet) {
      const response = await fetch(`/v3/nckh/records/${id}/khoa-duyet`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ khoaDuyet }),
      });
      return response.json();
    },

    async approveVien(id, vienNcDuyet) {
      const response = await fetch(`/v3/nckh/records/${id}/vien-duyet`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vienNcDuyet }),
      });
      return response.json();
    },
  };

  function cacheElements() {
    el.namHocFilter = document.getElementById("namHocFilter");
    el.khoaFilter = document.getElementById("khoaFilter");
    el.quickSearchInput = document.getElementById("quickSearchInput");
    el.loadDataBtn = document.getElementById("loadDataBtn");
    el.tableBody = document.getElementById("recordsTableBody");
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function applyClientFilter() {
    const keyword = normalizeText(el.quickSearchInput && el.quickSearchInput.value ? el.quickSearchInput.value : "");

    if (!keyword) {
      state.rows = [...state.rawRows];
      renderRows();
      return;
    }

    state.rows = (state.rawRows || []).filter((row) => {
      const haystack = normalizeText([
        row.tenCongTrinh,
        row.tacGiaChinh,
        row.thanhVien,
      ].join(" "));

      return haystack.includes(keyword);
    });

    renderRows();
  }

  function getPermissionState() {
    const fallback = {
      canApprove: false,
      canApproveKhoa: false,
    };

    if (!window.NCKH_V3 || !window.NCKH_V3.permissions) {
      return fallback;
    }

    return window.NCKH_V3.permissions.getPermissionState() || fallback;
  }

  function fillNamHocOptions(namHocList) {
    if (!el.namHocFilter) return;

    el.namHocFilter.innerHTML = "";
    (namHocList || []).forEach((item) => {
      const namHoc = item && item.NamHoc ? String(item.NamHoc) : "";
      if (!namHoc) return;

      const option = document.createElement("option");
      option.value = namHoc;
      option.textContent = namHoc;
      el.namHocFilter.appendChild(option);
    });

    const yearNow = new Date().getFullYear();
    const currentNamHoc = `${yearNow}-${yearNow + 1}`;
    const found = Array.from(el.namHocFilter.options).find((x) => x.value === currentNamHoc);
    if (found) {
      el.namHocFilter.value = currentNamHoc;
    }
  }

  function fillKhoaOptions(khoaList) {
    if (!el.khoaFilter) return;

    el.khoaFilter.innerHTML = '<option value="ALL">Tất cả khoa</option>';

    (khoaList || []).forEach((khoa) => {
      const option = document.createElement("option");
      option.value = String(khoa.id);
      option.textContent = `${khoa.MaPhongBan} - ${khoa.TenPhongBan}`;
      el.khoaFilter.appendChild(option);
    });

    const userKhoaCode = String(localStorage.getItem("MaPhongBan") || "");
    if (userKhoaCode) {
      const matched = (khoaList || []).find((k) => String(k.MaPhongBan) === userKhoaCode);
      if (matched) {
        el.khoaFilter.value = String(matched.id);
      }
    }
  }

  function getRowClass(row) {
    if (row.vienNcDuyet === 1) return "nckh-v3-row-vien-duyet";
    if (row.khoaDuyet === 1) return "nckh-v3-row-khoa-duyet";
    return "";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderRows() {
    if (!el.tableBody) return;

    if (!state.rows.length) {
      el.tableBody.innerHTML = `
        <tr>
          <td colspan="12" class="text-center text-muted py-4">Không có dữ liệu</td>
        </tr>
      `;
      return;
    }

    const html = state.rows.map((row, index) => {
      const canToggleKhoa = state.permission.canApproveKhoa && row.vienNcDuyet !== 1;
      const canToggleVien = state.permission.canApprove && (row.khoaDuyet === 1 || row.vienNcDuyet === 1);

      const tacGia = escapeHtml(row.tacGiaChinh || "");
      const thanhVien = escapeHtml(row.thanhVien || "");

      return `
        <tr class="${getRowClass(row)}" data-id="${row.id}">
          <td>${index + 1}</td>
          <td>${escapeHtml(row.loaiNckhLabel)}</td>
          <td>${escapeHtml(row.phanLoai)}</td>
          <td class="text-start col-main">${escapeHtml(row.tenCongTrinh)}</td>
          <td class="text-start">${tacGia || ""}</td>
          <td class="text-start">${thanhVien || ""}</td>
          <td>${escapeHtml(row.tenPhongBan || row.maPhongBan || "")}</td>
          <td>${escapeHtml(row.namHoc || "")}</td>
          <td>${row.tongSoTiet}</td>
          <td>
            <input
              type="checkbox"
              class="nckh-v3-checkbox"
              data-action="khoa"
              data-id="${row.id}"
              ${row.khoaDuyet === 1 ? "checked" : ""}
              ${canToggleKhoa ? "" : "disabled"}
            />
          </td>
          <td>
            <input
              type="checkbox"
              class="nckh-v3-checkbox"
              data-action="vien"
              data-id="${row.id}"
              ${row.vienNcDuyet === 1 ? "checked" : ""}
              ${canToggleVien ? "" : "disabled"}
            />
          </td>
          <td>
            <button class="btn btn-sm btn-outline-info" data-action="detail" data-id="${row.id}">
              <i class="bi bi-eye"></i>
            </button>
          </td>
        </tr>
      `;
    }).join("");

    el.tableBody.innerHTML = html;
  }

  function formatParticipants(participants, role) {
    const list = (participants || []).filter((x) => x.vaiTro === role);
    if (!list.length) return "<em>Không có</em>";
    return list.map((item) => escapeHtml(item.tenNhanVien || item.tenNgoai || "")).join("<br/>");
  }

  async function showDetail(id) {
    if (id === null || id === undefined || String(id).trim() === "") {
      await Swal.fire("Thất bại", "ID bản ghi không hợp lệ", "error");
      return;
    }

    const result = await api.detail(id);
    if (!result.success) {
      await Swal.fire("Thất bại", result.message || "Không thể lấy chi tiết", "error");
      return;
    }

    const data = result.data;
    const html = `
      <div style="text-align:left;line-height:1.5;">
        <p><strong>Loại NCKH:</strong> ${escapeHtml(data.loaiNckhLabel)}</p>
        <p><strong>Phân loại:</strong> ${escapeHtml(data.phanLoai)}</p>
        <p><strong>Tên công trình:</strong> ${escapeHtml(data.tenCongTrinh)}</p>
        <p><strong>Năm học:</strong> ${escapeHtml(data.namHoc)}</p>
        <p><strong>Khoa:</strong> ${escapeHtml(data.tenPhongBan || data.maPhongBan || "")}</p>
        <p><strong>Tổng số tiết:</strong> ${data.tongSoTiet}</p>
        <p><strong>Tác giả chính/Chủ nhiệm:</strong><br/>${formatParticipants(data.participants, "tac_gia")}</p>
        <p><strong>Thành viên:</strong><br/>${formatParticipants(data.participants, "thanh_vien")}</p>
      </div>
    `;

    await Swal.fire({
      title: "Chi tiết công trình",
      html,
      width: 760,
      confirmButtonText: "Đóng",
    });
  }

  async function loadData() {
    const namHoc = String(el.namHocFilter && el.namHocFilter.value ? el.namHocFilter.value : "").trim();
    const khoaId = String(el.khoaFilter && el.khoaFilter.value ? el.khoaFilter.value : "ALL").trim() || "ALL";

    if (!namHoc) {
      await Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning");
      return;
    }

    const result = await api.list(namHoc, khoaId);
    if (!result.success) {
      await Swal.fire("Thất bại", result.message || "Không thể lấy dữ liệu", "error");
      return;
    }

    state.rawRows = Array.isArray(result.data) ? result.data : [];
    applyClientFilter();
  }

  async function handleKhoaApproval(target) {
    const id = target.getAttribute("data-id");
    if (!id) {
      await Swal.fire("Thất bại", "ID bản ghi không hợp lệ", "error");
      return;
    }

    const khoaDuyet = target.checked ? 1 : 0;

    const result = await api.approveKhoa(id, khoaDuyet);
    if (!result.success) {
      await Swal.fire("Thất bại", result.message || "Không thể cập nhật duyệt khoa", "error");
      await loadData();
      return;
    }

    await loadData();
  }

  async function handleVienApproval(target) {
    const id = target.getAttribute("data-id");
    if (!id) {
      await Swal.fire("Thất bại", "ID bản ghi không hợp lệ", "error");
      return;
    }

    const vienNcDuyet = target.checked ? 1 : 0;

    const result = await api.approveVien(id, vienNcDuyet);
    if (!result.success) {
      await Swal.fire("Thất bại", result.message || "Không thể cập nhật duyệt viện", "error");
      await loadData();
      return;
    }

    await loadData();
  }

  async function onTableClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");

    if (action === "detail") {
      await showDetail(id);
    }
  }

  async function onTableChange(event) {
    const checkbox = event.target.closest("input[data-action]");
    if (!checkbox) return;

    const action = checkbox.getAttribute("data-action");
    if (action === "khoa") {
      await handleKhoaApproval(checkbox);
    }

    if (action === "vien") {
      await handleVienApproval(checkbox);
    }
  }

  async function init() {
    cacheElements();
    state.permission = getPermissionState();

    const [yearResult, filterResult] = await Promise.all([api.getNamHoc(), api.getFilters()]);

    if (yearResult && yearResult.success) {
      fillNamHocOptions(yearResult.NamHoc || []);
    }

    if (filterResult && filterResult.success && filterResult.data) {
      fillKhoaOptions(filterResult.data.khoaList || []);
    }

    if (el.loadDataBtn) {
      el.loadDataBtn.addEventListener("click", loadData);
    }

    if (el.quickSearchInput) {
      el.quickSearchInput.addEventListener("input", applyClientFilter);
    }

    if (el.tableBody) {
      el.tableBody.addEventListener("click", onTableClick);
      el.tableBody.addEventListener("change", onTableChange);
    }

    await loadData();
  }

  window.addEventListener("DOMContentLoaded", () => {
    init().catch(async (error) => {
      console.error("[NCKH V3] list init error:", error);
      await Swal.fire("Lỗi", "Không thể khởi tạo trang xem chung", "error");
    });
  });
})();
