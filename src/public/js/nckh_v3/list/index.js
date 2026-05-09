(function () {
  const state = {
    rawRows: [],
    rows: [],
    permission: {
      canApprove: false,
      canApproveKhoa: false,
    },
    pendingApprovals: new Map(), // Map of id -> { khoaDuyet?, vienNcDuyet? }
  };

  const el = {
    namHocFilter: null,
    khoaFilter: null,
    workNameSearchInput: null,
    authorMemberSearchInput: null,
    loadDataBtn: null,
    submitApprovalsBtn: null,
    selectAllKhoaDuyet: null,
    selectAllVienDuyet: null,
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

    async bulkApprovals(updates) {
      const response = await fetch(`/v3/nckh/records/bulk-approvals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      return response.json();
    },
  };

  function cacheElements() {
    el.namHocFilter = document.getElementById("namHocFilter");
    el.khoaFilter = document.getElementById("khoaFilter");
    el.workNameSearchInput = document.getElementById("workNameSearchInput");
    el.authorMemberSearchInput = document.getElementById("authorMemberSearchInput");
    el.loadDataBtn = document.getElementById("loadDataBtn");
    el.submitApprovalsBtn = document.getElementById("submitApprovalsBtn");
    el.selectAllKhoaDuyet = document.getElementById("selectAllKhoaDuyet");
    el.selectAllVienDuyet = document.getElementById("selectAllVienDuyet");
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
    const workNameKeyword = normalizeText(
      el.workNameSearchInput && el.workNameSearchInput.value ? el.workNameSearchInput.value : ""
    );
    const authorMemberKeyword = normalizeText(
      el.authorMemberSearchInput && el.authorMemberSearchInput.value ? el.authorMemberSearchInput.value : ""
    );

    if (!workNameKeyword && !authorMemberKeyword) {
      state.rows = [...state.rawRows];
      renderRows();
      return;
    }

    state.rows = (state.rawRows || []).filter((row) => {
      const workNameHaystack = normalizeText(row.tenCongTrinh || "");
      const authorMemberHaystack = normalizeText([
        row.tacGiaChinh,
        row.thanhVien,
        row.tacGiaChinhDisplay,
        row.thanhVienDisplay,
      ].join(" "));

      const isWorkNameMatched = !workNameKeyword || workNameHaystack.includes(workNameKeyword);
      const isAuthorMemberMatched = !authorMemberKeyword || authorMemberHaystack.includes(authorMemberKeyword);

      return isWorkNameMatched && isAuthorMemberMatched;
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

    // No auto-focusing to user's department, keep 'ALL' as default.
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

  function formatHours(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return "0,00";
    }
    return numeric.toFixed(2).replace(".", ",");
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  function formatMultilineCell(value) {
    const lines = String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (!lines.length) {
      return "";
    }

    return lines
      .map((line) => `<span class="nckh-v3-person-row">${escapeHtml(line)}</span>`)
      .join("");
  }

  function renderRows() {
    if (!el.tableBody) return;

    if (!state.rows.length) {
      el.tableBody.innerHTML = `
        <tr>
          <td colspan="14" class="text-center text-muted py-4">Không có dữ liệu</td>
        </tr>
      `;
      return;
    }

    const html = state.rows.map((row, index) => {
      const pending = state.pendingApprovals.get(row.id) || {};
      const currentKhoaDuyet = pending.khoaDuyet !== undefined ? pending.khoaDuyet : row.khoaDuyet;
      const currentVienDuyet = pending.vienNcDuyet !== undefined ? pending.vienNcDuyet : row.vienNcDuyet;

      const canToggleKhoa = state.permission.canApproveKhoa && currentVienDuyet !== 1;
      const canToggleVien = state.permission.canApprove && (currentKhoaDuyet === 1 || currentVienDuyet === 1);

      const tacGia = formatMultilineCell(row.tacGiaChinhDisplay || row.tacGiaChinh || "");
      const thanhVien = formatMultilineCell(row.thanhVienDisplay || row.thanhVien || "");

      return `
        <tr class="${getRowClass(row)}" data-id="${row.id}">
          <td>${index + 1}</td>
          <td>${escapeHtml(row.loaiNckhLabel)}</td>
          <td>${escapeHtml(row.phanLoai)}</td>
          <td class="text-start col-main">${escapeHtml(row.ten_cong_trinh || row.tenCongTrinh)}</td>
          <td>${escapeHtml(row.maSo || "")}</td>
          <td>${escapeHtml(row.xepLoai || "")}</td>
          <td>${formatDate(row.ngayNghiemThu)}</td>
          <td class="text-start col-people">${tacGia || ""}</td>
          <td class="text-start col-people">${thanhVien || ""}</td>
          <td>${escapeHtml(row.maPhongBan || row.tenPhongBan || "")}</td>
          <td>${formatHours(row.tongSoTiet)}</td>
          <td>
            <input
              type="checkbox"
              class="nckh-v3-checkbox nckh-v3-approval-khoa"
              data-id="${row.id}"
              ${currentKhoaDuyet === 1 ? "checked" : ""}
              ${canToggleKhoa ? "" : "disabled"}
            />
          </td>
          <td>
            <input
              type="checkbox"
              class="nckh-v3-checkbox nckh-v3-approval-vien"
              data-id="${row.id}"
              ${currentVienDuyet === 1 ? "checked" : ""}
              ${canToggleVien ? "" : "disabled"}
            />
          </td>
          <td>
            <button class="btn btn-sm btn-outline-info" data-action="detail" data-id="${row.id}">
              <i class="bi bi-eye"></i>
            </button>
          </td>
          <td>
            ${state.permission.canApprove ? `
              <button class="btn btn-sm btn-outline-danger ${currentVienDuyet === 1 ? 'disabled' : ''}" data-action="delete" data-id="${row.id}" ${currentVienDuyet === 1 ? 'disabled' : ''}>
                <i class="bi bi-trash"></i>
              </button>
            ` : ""}
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

  const HOI_DONG_ROLE_LABELS = {
    chu_tich: "Chủ tịch",
    phan_bien: "Phản biện",
    uy_vien: "Ủy viên",
  };

  function formatHoiDongParticipants(participants) {
    const list = participants || [];
    if (!list.length) return "<em>Không có</em>";

    const roleOrder = ["chu_tich", "phan_bien", "uy_vien"];
    const lines = [];

    roleOrder.forEach((role) => {
      const label = HOI_DONG_ROLE_LABELS[role] || role;
      list.filter((item) => item.vaiTro === role).forEach((item) => {
        const name = item.tenNhanVien || item.tenNgoai || "";
        lines.push(`${escapeHtml(name)} (${escapeHtml(label)})`);
      });
    });

    if (!lines.length) return "<em>Không có</em>";
    return lines.join("<br/>");
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
    const participantHtml = data.loaiNckh === "HOIDONG"
      ? `<p><strong>Vai trò hội đồng:</strong><br/>${formatHoiDongParticipants(data.participants)}</p>`
      : `
        <p><strong>Tác giả chính/Chủ nhiệm:</strong><br/>${formatParticipants(data.participants, "tac_gia")}</p>
        <p><strong>Thành viên:</strong><br/>${formatParticipants(data.participants, "thanh_vien")}</p>
      `;

    const maSoLabel = data.loaiNckh === "HOIDONG" ? "Số quyết định" : "Mã số";

    const html = `
      <div style="text-align:left;line-height:1.5;">
        <p><strong>Loại NCKH:</strong> ${escapeHtml(data.loaiNckhLabel)}</p>
        <p><strong>Phân loại:</strong> ${escapeHtml(data.phanLoai)}</p>
        <p><strong>Tên công trình:</strong> ${escapeHtml(data.tenCongTrinh)}</p>
        <p><strong>Năm học:</strong> ${escapeHtml(data.namHoc)}</p>
        <p><strong>${maSoLabel}:</strong> ${escapeHtml(data.maSo || "")}</p>
        <p><strong>Xếp loại:</strong> ${escapeHtml(data.xepLoai || "")}</p>
        <p><strong>Ngày nghiệm thu:</strong> ${formatDate(data.ngayNghiemThu)}</p>
        <p><strong>Khoa:</strong> ${escapeHtml(data.tenPhongBan || data.maPhongBan || "")}</p>
        <p><strong>Tổng số tiết:</strong> ${formatHours(data.tongSoTiet)}</p>
        ${participantHtml}
      </div>
    `;

    await Swal.fire({
      title: "Chi tiết công trình",
      html,
      width: 760,
      confirmButtonText: "Đóng",
    });
  }

  function updateSubmitButtonVisibility() {
    if (!el.submitApprovalsBtn) return;
    const hasPendingChanges = state.pendingApprovals.size > 0;
    el.submitApprovalsBtn.style.display = hasPendingChanges ? "inline-block" : "none";
  }

  function onKhoaDuyetChange(event) {
    const checkbox = event.target.closest("input.nckh-v3-approval-khoa");
    if (!checkbox) return;

    const rowId = Number(checkbox.getAttribute("data-id"));
    const khoaDuyet = checkbox.checked ? 1 : 0;

    if (!state.pendingApprovals.has(rowId)) {
      state.pendingApprovals.set(rowId, {});
    }
    state.pendingApprovals.get(rowId).khoaDuyet = khoaDuyet;

    updateSubmitButtonVisibility();
  }

  function onVienDuyetChange(event) {
    const checkbox = event.target.closest("input.nckh-v3-approval-vien");
    if (!checkbox) return;

    const rowId = Number(checkbox.getAttribute("data-id"));
    const vienNcDuyet = checkbox.checked ? 1 : 0;

    if (!state.pendingApprovals.has(rowId)) {
      state.pendingApprovals.set(rowId, {});
    }
    state.pendingApprovals.get(rowId).vienNcDuyet = vienNcDuyet;

    updateSubmitButtonVisibility();
  }

  function onSelectAllKhoaDuyet(event) {
    const checkbox = event.target;
    if (!checkbox) return;

    const newValue = checkbox.checked ? 1 : 0;
    const affectedCount = state.rows.length;

    for (const row of state.rows) {
      if (!state.pendingApprovals.has(row.id)) {
        state.pendingApprovals.set(row.id, {});
      }
      state.pendingApprovals.get(row.id).khoaDuyet = newValue;
    }

    updateSubmitButtonVisibility();
    renderRows();
  }

  function onSelectAllVienDuyet(event) {
    const checkbox = event.target;
    if (!checkbox) return;

    const newValue = checkbox.checked ? 1 : 0;

    for (const row of state.rows) {
      if (!state.pendingApprovals.has(row.id)) {
        state.pendingApprovals.set(row.id, {});
      }
      state.pendingApprovals.get(row.id).vienNcDuyet = newValue;
    }

    updateSubmitButtonVisibility();
    renderRows();
  }

  async function onSubmitApprovals() {
    if (state.pendingApprovals.size === 0) {
      await Swal.fire("Thông báo", "Không có thay đổi nào để duyệt", "info");
      return;
    }

    const confirmed = await Swal.fire({
      title: "Xác nhận duyệt",
      text: `Bạn chắc chắn muốn duyệt ${state.pendingApprovals.size} công trình?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Duyệt",
      cancelButtonText: "Hủy",
    });

    if (!confirmed.isConfirmed) return;

    const updates = Array.from(state.pendingApprovals.entries()).map(([id, changes]) => ({
      id: Number(id),
      ...changes,
    }));

    const result = await api.bulkApprovals(updates);
    if (!result.success) {
      await Swal.fire("Thất bại", result.message || "Không thể cập nhật duyệt", "error");
      return;
    }

    await Swal.fire("Thành công", result.message || "Cập nhật duyệt thành công", "success");

    // Clear pending approvals and reload data
    state.pendingApprovals.clear();
    updateSubmitButtonVisibility();
    await loadData();
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

    if (el.submitApprovalsBtn) {
      el.submitApprovalsBtn.addEventListener("click", onSubmitApprovals);
    }

    if (el.selectAllKhoaDuyet) {
      el.selectAllKhoaDuyet.addEventListener("change", onSelectAllKhoaDuyet);
    }

    if (el.selectAllVienDuyet) {
      el.selectAllVienDuyet.addEventListener("change", onSelectAllVienDuyet);
    }

    if (el.workNameSearchInput) {
      el.workNameSearchInput.addEventListener("input", applyClientFilter);
    }

    if (el.authorMemberSearchInput) {
      el.authorMemberSearchInput.addEventListener("input", applyClientFilter);
    }

    if (el.tableBody) {
      el.tableBody.addEventListener("click", onTableClick);
      el.tableBody.addEventListener("change", (event) => {
        onKhoaDuyetChange(event);
        onVienDuyetChange(event);
      });
    }

    await loadData();
  }

  function onTableClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    if (button.hasAttribute('disabled') || button.classList.contains('disabled')) return;

    const action = button.getAttribute("data-action");
    const id = button.getAttribute("data-id");

    if (action === "detail") {
      showDetail(id);
    } else if (action === "delete") {
      deleteRecord(id);
    }
  }

  async function deleteRecord(id) {
    if (!id) return;

    if (state.pendingApprovals.has(Number(id))) {
      const pending = state.pendingApprovals.get(Number(id));
      if (pending.vienNcDuyet === 1) {
        await Swal.fire("Lỗi", "Bạn đang chuẩn bị duyệt viện công trình này. Vui lòng bỏ đánh dấu duyệt rồi thử lại.", "error");
        return;
      }
    }

    const confirmed = await Swal.fire({
      title: "Xác nhận xóa?",
      text: "Bạn có chắc chắn muốn xóa công trình này không? Hành động này không thể hoàn tác.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy"
    });

    if (!confirmed.isConfirmed) return;

    try {
      const response = await fetch(`/v3/nckh/records/${id}`, {
        method: "DELETE"
      });
      const result = await response.json();

      if (!result.success) {
        await Swal.fire("Thất bại", result.message || "Không thể xóa công trình", "error");
        return;
      }

      await Swal.fire("Thành công", result.message || "Đã xóa công trình", "success");
      await loadData();
    } catch (error) {
      console.error("[NCKH V3] delete error:", error);
      await Swal.fire("Lỗi", "Đã xảy ra lỗi khi xóa công trình", "error");
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    init().catch(async (error) => {
      console.error("[NCKH V3] list init error:", error);
      await Swal.fire("Lỗi", "Không thể khởi tạo trang xem chung", "error");
    });
  });
})();
