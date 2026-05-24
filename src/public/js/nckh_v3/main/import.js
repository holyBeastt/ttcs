/**
 * NCKH V3 - Import Frontend Logic
 * Handles file upload, preview rendering, inline editing, and save.
 */

(function () {
  "use strict";

  // ── State ──
  let currentPreviewData = [];

  // ── DOM Elements ──
  const $importType = document.getElementById("importType");
  const $importFile = document.getElementById("importFile");
  const $btnPreview = document.getElementById("btnPreview");
  const $btnSave = document.getElementById("btnSave");
  const $btnClear = document.getElementById("btnClear");
  const $previewSection = document.getElementById("previewSection");
  const $previewTableBody = document.getElementById("previewTableBody");
  const $importSummary = document.getElementById("importSummary");
  const $emptyState = document.getElementById("emptyState");

  // Summary elements
  const $summaryTotal = document.getElementById("summaryTotal");
  const $summaryOk = document.getElementById("summaryOk");
  const $summaryError = document.getElementById("summaryError");
  const $summaryDuplicate = document.getElementById("summaryDuplicate");

  // ── Role Label Map ──
  const ROLE_LABELS = {
    tac_gia: "Tác giả",
    thanh_vien: "Thành viên",
    chu_tich: "Chủ tịch",
    phan_bien: "Phản biện",
    uy_vien: "Ủy viên",
  };

  const $namHocSelect = document.getElementById("namHocSelect");

  // ── Init Năm Học ──
  async function loadNamHoc() {
    try {
      const response = await fetch("/getNamHoc");
      const data = await response.json();
      const list = data.NamHoc || [];
      
      list.forEach((item) => {
        const namHoc = item && item.NamHoc ? String(item.NamHoc) : "";
        if (!namHoc) return;
        const option = document.createElement("option");
        option.value = namHoc;
        option.textContent = namHoc;
        $namHocSelect.appendChild(option);
      });

      const yearNow = new Date().getFullYear();
      const currentNamHoc = `${yearNow}-${yearNow + 1}`;
      const found = Array.from($namHocSelect.options).find((x) => x.value === currentNamHoc);
      if (found) {
        $namHocSelect.value = currentNamHoc;
      }
    } catch (err) {
      console.error("Lỗi lấy năm học:", err);
    }
  }

  loadNamHoc();

  // ── Helpers ──

  function togglePreviewButton() {
    $btnPreview.disabled = !$importType.value || !$importFile.files.length || !$namHocSelect.value;
  }

  function updateSummary() {
    const total = currentPreviewData.length;
    const errorCount = currentPreviewData.filter((r) => r.status === "error").length;
    const duplicateCount = currentPreviewData.filter((r) => r.status === "duplicate").length;
    const okCount = total - errorCount - duplicateCount;

    $summaryTotal.textContent = total;
    $summaryOk.textContent = okCount;
    $summaryError.textContent = errorCount;
    $summaryDuplicate.textContent = duplicateCount;

    $importSummary.style.display = total > 0 ? "flex" : "none";
    $btnSave.disabled = okCount === 0;
    $btnClear.style.display = total > 0 ? "inline-block" : "none";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  // ── Render Table ──

  function renderPreviewTable() {
    if (currentPreviewData.length === 0) {
      $previewSection.style.display = "none";
      $emptyState.style.display = "block";
      updateSummary();
      return;
    }

    $previewSection.style.display = "block";
    $emptyState.style.display = "none";

    let html = "";

    currentPreviewData.forEach((record, index) => {
      const rowClass =
        record.status === "error" ? "row-error" :
        record.status === "duplicate" ? "row-duplicate" : "";

      const statusHtml =
        record.status === "ok" ? '<span class="status-badge ok">OK</span>' :
        record.status === "error" ? '<span class="status-badge error">Lỗi</span>' :
        '<span class="status-badge duplicate">Trùng</span>';

      // Participants
      let participantsHtml = '<ul class="participant-list">';
      (record.participants || []).forEach((p) => {
        const roleLabel = ROLE_LABELS[p.vaiTro] || p.vaiTro;
        const name = p.tenNhanVien || p.tenNgoai || "(Không rõ)";
        const soTiet = p.soTiet != null ? ` — ${p.soTiet}t` : "";
        participantsHtml += `<li><span class="badge-role">${escapeHtml(roleLabel)}</span>${escapeHtml(name)}${soTiet}</li>`;
      });
      participantsHtml += "</ul>";

      // Errors/Warnings
      let notesHtml = "";
      if ((record.errors && record.errors.length) || (record.warnings && record.warnings.length)) {
        notesHtml = '<ul class="error-list">';
        (record.errors || []).forEach((e) => {
          notesHtml += `<li>⛔ ${escapeHtml(e)}</li>`;
        });
        (record.warnings || []).forEach((w) => {
          notesHtml += `<li class="warning">⚠️ ${escapeHtml(w)}</li>`;
        });
        notesHtml += "</ul>";
      }

      html += `
        <tr class="${rowClass}" data-index="${index}">
          <td class="text-center">${index + 1}</td>
          <td class="text-center">${statusHtml}</td>
          <td class="text-start">${escapeHtml(record.chung?.tenCongTrinh)}</td>
          <td class="text-center">${escapeHtml(record.chung?.maSo || "—")}</td>
          <td class="text-center">${escapeHtml(record.chung?.phanLoai || "—")}</td>
          <td class="text-center">${escapeHtml(record.chung?.namHoc || "—")}</td>
          <td class="text-center"><strong>${record.chung?.tongSoTiet || 0}</strong></td>
          <td class="text-center">${escapeHtml(record.chung?.ngayNghiemThu || "—")}</td>
          <td class="text-center">${escapeHtml(record.chung?.xepLoai || "—")}</td>
          <td class="text-start">${participantsHtml}</td>
          <td class="text-start">${notesHtml || '<span style="color:#94a3b8">—</span>'}</td>
          <td class="text-center">
            <button class="btn-remove-row" title="Xóa dòng này" data-index="${index}">
              <i class="bi bi-trash3"></i>
            </button>
          </td>
        </tr>`;
    });

    $previewTableBody.innerHTML = html;
    updateSummary();
  }

  // ── Event: Remove Row ──

  $previewTableBody.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-remove-row");
    if (!btn) return;

    const index = parseInt(btn.dataset.index, 10);
    if (Number.isNaN(index) || index < 0 || index >= currentPreviewData.length) return;

    currentPreviewData.splice(index, 1);
    renderPreviewTable();
  });

  // ── Event: Clear Table ──

  $btnClear.addEventListener("click", () => {
    if (confirm("Bạn có chắc chắn muốn làm trống bảng dữ liệu này?")) {
      currentPreviewData = [];
      $importFile.value = ""; // Reset file input
      togglePreviewButton();
      renderPreviewTable();
    }
  });

  // ── Event: Toggle Preview Button ──

  $importType.addEventListener("change", togglePreviewButton);
  $importFile.addEventListener("change", togglePreviewButton);
  $namHocSelect.addEventListener("change", togglePreviewButton);

  // ── Event: Preview ──

  $btnPreview.addEventListener("click", async () => {
    const type = $importType.value;
    const file = $importFile.files[0];
    const namHoc = $namHocSelect.value;

    if (!type || !file || !namHoc) return;

    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);
    formData.append("namHoc", namHoc);

    $btnPreview.disabled = true;
    $btnPreview.innerHTML = '<span class="spinner-inline"></span>Đang xử lý...';

    try {
      const response = await fetch("/v3/nckh/import/preview", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        Swal.fire("Lỗi", result.message || "Không thể xử lý file.", "error");
        return;
      }

      currentPreviewData = result.data.records || [];
      renderPreviewTable();

      if (result.data.errorCount > 0 || result.data.duplicateCount > 0) {
        Swal.fire({
          title: "Cảnh báo",
          html: `Đọc được <strong>${result.data.totalRows}</strong> bản ghi.<br/>` +
            `<span style="color:#dc2626">${result.data.errorCount} lỗi</span>, ` +
            `<span style="color:#d97706">${result.data.duplicateCount} trùng lặp</span>.<br/>` +
            `Vui lòng kiểm tra trước khi lưu.`,
          icon: "warning",
        });
      } else {
        Swal.fire({
          title: "Thành công",
          text: `Đọc được ${result.data.totalRows} bản ghi. Kiểm tra dữ liệu và bấm "Lưu dữ liệu".`,
          icon: "success",
          timer: 2500,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      console.error("[NCKH Import]", err);
      Swal.fire("Lỗi", "Có lỗi xảy ra khi gọi server.", "error");
    } finally {
      $btnPreview.disabled = false;
      $btnPreview.innerHTML = '<i class="bi bi-eye"></i> Xem trước';
      togglePreviewButton();
    }
  });

  // ── Event: Save ──

  $btnSave.addEventListener("click", async () => {
    const validRecords = currentPreviewData.filter((r) => r.status !== "error");

    if (validRecords.length === 0) {
      Swal.fire("Thông báo", "Không có bản ghi hợp lệ để lưu.", "info");
      return;
    }

    const duplicateCount = validRecords.filter((r) => r.status === "duplicate").length;
    let confirmText = `Bạn có chắc muốn lưu <strong>${validRecords.length}</strong> bản ghi?`;
    if (duplicateCount > 0) {
      confirmText += `<br/><span style="color:#d97706">Trong đó có ${duplicateCount} bản ghi trùng mã số.</span>`;
    }

    const confirm = await Swal.fire({
      title: "Xác nhận lưu",
      html: confirmText,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Lưu",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#16a34a",
    });

    if (!confirm.isConfirmed) return;

    $btnSave.disabled = true;
    $btnSave.innerHTML = '<span class="spinner-inline"></span>Đang lưu...';

    try {
      const response = await fetch("/v3/nckh/import/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: validRecords }),
      });

      const result = await response.json();

      if (!result.success) {
        Swal.fire("Lỗi", result.message || "Không thể lưu dữ liệu.", "error");
        return;
      }

      Swal.fire({
        title: "Import thành công!",
        text: result.message,
        icon: "success",
      }).then(() => {
        // Reset state
        currentPreviewData = [];
        renderPreviewTable();
        $importFile.value = "";
        $importType.value = "";
        togglePreviewButton();
      });
    } catch (err) {
      console.error("[NCKH Import]", err);
      Swal.fire("Lỗi", "Có lỗi xảy ra khi lưu dữ liệu.", "error");
    } finally {
      $btnSave.disabled = false;
      $btnSave.innerHTML = '<i class="bi bi-check2-all"></i> Lưu dữ liệu';
      updateSummary();
    }
  });
})();
