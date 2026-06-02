# Files

## File: src/controllers/nckh_v3/baiBaoKhoaHoc.controller.js
```javascript
const buildTypeInputController = require("./buildTypeInputController");
const service = require("../../services/nckh_v3/baiBaoKhoaHoc.service");

module.exports = buildTypeInputController(service, "bài báo khoa học");
```

## File: src/controllers/nckh_v3/buildTypeInputController.js
```javascript
const buildTypeInputController = (service, successLabel) => {
  const getUserContext = (req) => ({
    userId: req.session?.userId || 1,
    userName: req.session?.TenNhanVien || req.session?.username || "ADMIN",
  });

  const getMetadata = async (req, res) => {
    try {
      const khoaId = req.query.khoaId || "ALL";
      const data = await service.getMetadata(khoaId);
      res.json({ success: true, data });
    } catch (error) {
      console.error("[NCKH V3] getMetadata error:", error);
      res.status(500).json({ success: false, message: error.message || "Không thể lấy metadata" });
    }
  };

  const create = async (req, res) => {
    try {
      const result = await service.create(req.body, getUserContext(req));
      res.status(201).json({ success: true, message: `Thêm ${successLabel} thành công`, data: result });
    } catch (error) {
      console.error("[NCKH V3] create error:", error);
      res.status(400).json({ success: false, message: error.message || `Không thể thêm ${successLabel}` });
    }
  };

  const update = async (req, res) => {
    try {
      const result = await service.update(req.params.id, req.body, getUserContext(req));
      res.json({ success: true, message: `Cập nhật ${successLabel} thành công`, data: result });
    } catch (error) {
      console.error("[NCKH V3] update error:", error);
      res.status(400).json({ success: false, message: error.message || `Không thể cập nhật ${successLabel}` });
    }
  };

  const remove = async (req, res) => {
    try {
      const result = await service.remove(req.params.id, getUserContext(req));
      res.json({ success: true, message: `Xóa ${successLabel} thành công`, data: result });
    } catch (error) {
      console.error("[NCKH V3] remove error:", error);
      res.status(400).json({ success: false, message: error.message || `Không thể xóa ${successLabel}` });
    }
  };

  const list = async (req, res) => {
    try {
      const { namHoc, khoaId } = req.params;
      const data = await service.list(namHoc, khoaId);
      res.json({ success: true, data });
    } catch (error) {
      console.error("[NCKH V3] list error:", error);
      res.status(500).json({ success: false, message: error.message || `Không thể lấy danh sách ${successLabel}` });
    }
  };

  const detail = async (req, res) => {
    try {
      const data = await service.getById(req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Không tìm thấy công trình" });
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error("[NCKH V3] detail error:", error);
      res.status(500).json({ success: false, message: error.message || "Không thể lấy chi tiết" });
    }
  };

  return {
    getMetadata,
    create,
    update,
    remove,
    list,
    detail,
  };
};

module.exports = buildTypeInputController;
```

## File: src/controllers/nckh_v3/deTaiDuAn.controller.js
```javascript
const buildTypeInputController = require("./buildTypeInputController");
const service = require("../../services/nckh_v3/deTaiDuAn.service");

module.exports = buildTypeInputController(service, "đề tài, dự án");
```

## File: src/controllers/nckh_v3/deXuatNghienCuu.controller.js
```javascript
const buildTypeInputController = require("./buildTypeInputController");
const service = require("../../services/nckh_v3/deXuatNghienCuu.service");

module.exports = buildTypeInputController(service, "đề xuất nghiên cứu");
```

## File: src/controllers/nckh_v3/giaiThuong.controller.js
```javascript
const buildTypeInputController = require("./buildTypeInputController");
const service = require("../../services/nckh_v3/giaiThuong.service");

module.exports = buildTypeInputController(service, "giải thưởng và sáng chế");
```

## File: src/controllers/nckh_v3/huongDanSvNckh.controller.js
```javascript
const buildTypeInputController = require("./buildTypeInputController");
const service = require("../../services/nckh_v3/huongDanSvNckh.service");

module.exports = buildTypeInputController(service, "hướng dẫn sinh viên NCKH");
```

## File: src/controllers/nckh_v3/import.controller.js
```javascript
/**
 * NCKH V3 Import Controller
 * Handles rendering import page, previewing Excel, and saving data.
 */

const importService = require("../../services/nckh_v3/import.service");
const { IMPORT_TYPES } = require("../../mappers/nckh_v3/import.mapper");

class ImportController {
  /**
   * GET /v3/nckh/import
   * Render the import page.
   */
  renderImportPage(req, res) {
    res.render("nckh_v3/import.ejs", {
      importTypes: IMPORT_TYPES,
    });
  }

  /**
   * POST /v3/nckh/import/preview
   * Upload Excel file, parse and return JSON preview.
   */
  async previewExcel(req, res) {
    try {
      const type = req.body.type;
      const namHoc = req.body.namHoc;
      if (!type) {
        return res.status(400).json({ success: false, message: "Chưa chọn loại NCKH." });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: "Vui lòng chọn file Excel." });
      }

      const preview = await importService.buildPreview(req.file.buffer, type, namHoc);

      return res.json({
        success: true,
        message: `Đọc file thành công: ${preview.totalRows} bản ghi`,
        data: preview,
      });
    } catch (error) {
      console.error("[NCKH V3 Import] Preview error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Lỗi khi xử lý file Excel.",
      });
    }
  }

  /**
   * POST /v3/nckh/import/save
   * Save validated records to database.
   */
  async saveImportData(req, res) {
    try {
      const records = req.body.records;
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, message: "Không có dữ liệu để lưu." });
      }

      const userContext = {
        userId: req.session?.userId || 1,
        userName: req.session?.TenNhanVien || req.session?.username || "ADMIN",
      };

      const result = await importService.saveToDatabase(records, userContext);

      return res.json({
        success: true,
        message: `Import thành công ${result.savedCount} công trình NCKH.`,
        savedCount: result.savedCount,
      });
    } catch (error) {
      console.error("[NCKH V3 Import] Save error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Lỗi khi lưu dữ liệu.",
      });
    }
  }
}

module.exports = new ImportController();
```

## File: src/controllers/nckh_v3/portal.controller.js
```javascript
const {
  NCKH_TYPE_OPTIONS,
  resolveSelectedType,
  getTypeByValue,
} = require("../../config/nckh_v3/types");

const buildPageViewModel = (req, pageMode) => {
  const requestedType = String(req.query.type || "").trim();
  const selectedType = resolveSelectedType(requestedType);
  const selectedTypeMeta = getTypeByValue(selectedType);
  const pagePath = `${req.baseUrl}${req.path}`;

  return {
    requestedType,
    selectedType,
    selectedTypeMeta,
    pagePath,
    pageMode,
    inputPageUrl: `/v3/nckh/them-moi-nckh?type=${selectedType}`,
    listPageUrl: `/v3/nckh/xem-chung`,
  };
};

const renderWithMode = (req, res, pageMode) => {
  const viewModel = buildPageViewModel(req, pageMode);

  if (!viewModel.requestedType) {
    return res.redirect(`${viewModel.pagePath}?type=${viewModel.selectedType}`);
  }

  res.render("nckh_v3/index.ejs", {
    nckhTypeOptions: NCKH_TYPE_OPTIONS,
    selectedType: viewModel.selectedType,
    selectedTypeMeta: viewModel.selectedTypeMeta,
    pageMode: viewModel.pageMode,
    pagePath: viewModel.pagePath,
    inputPageUrl: viewModel.inputPageUrl,
    listPageUrl: viewModel.listPageUrl,
  });
};

const renderPage = (req, res) => {
  res.redirect("/v3/nckh/them-moi-nckh?type=de-tai-du-an");
};

const renderInputPage = (req, res) => renderWithMode(req, res, "input");
const renderUnifiedListPage = (_req, res) => {
  res.render("nckh_v3/list.ejs");
};

module.exports = {
  renderPage,
  renderInputPage,
  renderUnifiedListPage,
};
```

## File: src/controllers/nckh_v3/sachGiaoTrinh.controller.js
```javascript
const buildTypeInputController = require("./buildTypeInputController");
const service = require("../../services/nckh_v3/sachGiaoTrinh.service");

module.exports = buildTypeInputController(service, "sách, giáo trình");
```

## File: src/controllers/nckh_v3/sangKien.controller.js
```javascript
const buildTypeInputController = require("./buildTypeInputController");
const service = require("../../services/nckh_v3/sangKien.service");

module.exports = buildTypeInputController(service, "sáng kiến");
```

## File: src/controllers/nckh_v3/thanhVienHoiDong.controller.js
```javascript
const buildTypeInputController = require("./buildTypeInputController");
const service = require("../../services/nckh_v3/thanhVienHoiDong.service");

module.exports = buildTypeInputController(service, "thành viên hội đồng khoa học");
```

## File: src/public/js/nckh_v3/bai_bao_khoa_hoc/index.js
```javascript
window.addEventListener("DOMContentLoaded", () => {
  window.NCKH_V3_TypeInputCommon.init({
    slug: "bai-bao-khoa-hoc",
    loaiNckh: "BAIBAO",
    label: "Bài báo khoa học",
    mode: "standard",
    hasSecondaryMembers: true,
  });
});
```

## File: src/public/js/nckh_v3/de_tai_du_an/index.js
```javascript
window.addEventListener("DOMContentLoaded", () => {
  window.NCKH_V3_TypeInputCommon.init({
    slug: "de-tai-du-an",
    loaiNckh: "DETAI_DUAN",
    label: "Đề tài, dự án",
    mode: "standard",
    hasSecondaryMembers: true,
  });
});
```

## File: src/public/js/nckh_v3/de_xuat_nghien_cuu/index.js
```javascript
window.addEventListener("DOMContentLoaded", () => {
  window.NCKH_V3_TypeInputCommon.init({
    slug: "de-xuat-nghien-cuu",
    loaiNckh: "DEXUAT",
    label: "Đề xuất nghiên cứu",
    mode: "equal",
    hasSecondaryMembers: true,
  });
});
```

## File: src/public/js/nckh_v3/giai_thuong/index.js
```javascript
window.addEventListener("DOMContentLoaded", () => {
  window.NCKH_V3_TypeInputCommon.init({
    slug: "giai-thuong",
    loaiNckh: "GIAITHUONG",
    label: "Giải thưởng và sáng chế",
    mode: "standard",
    hasSecondaryMembers: true,
  });
});
```

## File: src/public/js/nckh_v3/main/import.js
```javascript
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
```

## File: src/public/js/nckh_v3/main/permissions.js
```javascript
window.NCKH_V3 = window.NCKH_V3 || {};

(function () {
  function getPermissionState() {
    const role = localStorage.getItem("userRole") || "";
    const maPhongBan = localStorage.getItem("MaPhongBan") || "";

    const APP_DEPARTMENTS = window.APP_DEPARTMENTS || {};
    const APP_ROLES = window.APP_ROLES || {};

    const daoTaoCode = APP_DEPARTMENTS.daoTao || "DT";
    const ncHtptCode = APP_DEPARTMENTS.ncHtpt || "NCKHHTQT";

    const troLyPhongRole = APP_ROLES.troLy_phong || "tro_ly_phong";
    const lanhDaoPhongRole = APP_ROLES.lanhDao_phong || "lanh_dao_phong";
    const lanhDaoKhoaRole = APP_ROLES.lanhDao_khoa || "lanh_dao_khoa";
    const gvCnbmKhoaRole = APP_ROLES.gv_cnbm_khoa || "gv_cnbm_khoa";

    const canApprove =
      (role === troLyPhongRole || role === lanhDaoPhongRole) &&
      (maPhongBan === daoTaoCode || maPhongBan === ncHtptCode);

    const canApproveKhoa =
      role === lanhDaoKhoaRole &&
      maPhongBan !== daoTaoCode &&
      maPhongBan !== ncHtptCode;

    const canEdit = canApprove || canApproveKhoa || role === gvCnbmKhoaRole;
    const canDelete = canEdit;
    const canInput = canEdit;

    return {
      role,
      maPhongBan,
      canApprove,
      canApproveKhoa,
      canEdit,
      canDelete,
      canInput,
    };
  }

  window.NCKH_V3.permissions = {
    getPermissionState,
  };
})();
```

## File: src/public/js/nckh_v3/main/typeSwitcher.js
```javascript
(function () {
  const STORAGE_KEY = "nckh_v3_selected_type";

  function initTypeSwitcher() {
    const form = document.getElementById("nckhTypeForm");
    const select = document.getElementById("nckhTypeSelect");
    if (!form || !select) {
      return;
    }

    const url = new URL(window.location.href);
    const queryType = url.searchParams.get("type");
    form.action = window.location.pathname;

    if (queryType) {
      localStorage.setItem(STORAGE_KEY, queryType);
    }

    select.addEventListener("change", function () {
      localStorage.setItem(STORAGE_KEY, select.value);
      form.submit();
    });

    const savedType = localStorage.getItem(STORAGE_KEY);
    if (!queryType && savedType && select.querySelector(`option[value="${savedType}"]`)) {
      select.value = savedType;
      form.submit();
    }
  }

  window.addEventListener("DOMContentLoaded", initTypeSwitcher);
})();
```

## File: src/public/js/nckh_v3/sach_giao_trinh/index.js
```javascript
window.addEventListener("DOMContentLoaded", () => {
  window.NCKH_V3_TypeInputCommon.init({
    slug: "sach-giao-trinh",
    loaiNckh: "SACHGIAOTRINH",
    label: "Sách, giáo trình",
    mode: "standard",
    hasSecondaryMembers: true,
  });
});
```

## File: src/public/js/nckh_v3/sang_kien/index.js
```javascript
window.addEventListener("DOMContentLoaded", () => {
  window.NCKH_V3_TypeInputCommon.init({
    slug: "sang-kien",
    loaiNckh: "SANGKIEN",
    label: "Sáng kiến",
    mode: "standard",
    hasSecondaryMembers: true,
  });
});
```

## File: src/public/js/nckh_v3/thanh_vien_hoi_dong/index.js
```javascript
window.addEventListener("DOMContentLoaded", () => {
  window.NCKH_V3_TypeInputCommon.init({
    slug: "thanh-vien-hoi-dong",
    loaiNckh: "HOIDONG",
    label: "Thành viên hội đồng khoa học",
    mode: "fixed",
    hasSecondaryMembers: false,
  });
});
```

## File: src/repositories/nckh_v3/export.repo.js
```javascript
const statsRepo = require("./stats.repo");

/**
 * Export Repository - Thin layer for export-specific queries.
 * Initially reusing statsRepo for data consistency.
 */
class ExportRepository {
  async getLecturerSummary(connection, filters) {
    return statsRepo.listLecturerSummary(connection, filters);
  }

  async getLecturerRecords(connection, filters) {
    return statsRepo.listLecturerRecords(connection, filters);
  }
}

module.exports = new ExportRepository();
```

## File: src/repositories/nckh_v3/nckhImport.repo.js
```javascript
const TABLE_CHUNG = "nckh_chung";

/**
 * Insert a record into nckh_chung with extended import fields.
 * Returns the insertId.
 */
const insertChungExtended = async (connection, data) => {
  const query = `
    INSERT INTO ${TABLE_CHUNG} (
      ten_cong_trinh,
      loai_nckh,
      phan_loai,
      nam_hoc,
      tong_so_tiet,
      khoa_duyet,
      vien_nc_duyet,
      ngay_nghiem_thu,
      xep_loai,
      ma_so,
      so_quyet_dinh,
      cap_nhiem_vu,
      kinh_phi,
      ten_tap_chi,
      so_bao,
      so_trich_dan,
      co_quan_chu_tri,
      co_quan_chu_quan,
      thuoc_nhiem_vu,
      linh_vuc_nghien_cuu,
      kinh_phi_nam_nhat,
      kinh_phi_nam_hai,
      kinh_phi_nam_ba,
      nguon_kinh_phi,
      ngay_quyet_dinh
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    data.tenCongTrinh,
    data.loaiNckh,
    data.phanLoai || null,
    data.namHoc,
    data.tongSoTiet,
    data.khoaDuyet ?? 0,
    data.vienNcDuyet ?? 0,
    data.ngayNghiemThu || null,
    data.xepLoai || null,
    data.maSo || null,
    data.soQuyetDinh || null,
    data.capNhiemVu || null,
    data.kinhPhi || null,
    data.tenTapChi || null,
    data.soBao || null,
    data.soTrichDan ?? null,
    data.coQuanChuTri || null,
    data.coQuanChuQuan || null,
    data.thuocNhiemVu || null,
    data.linhVucNghienCuu || null,
    data.kinhPhiNamNhat || null,
    data.kinhPhiNamHai || null,
    data.kinhPhiNamBa || null,
    data.nguonKinhPhi || null,
    data.ngayQuyetDinh || null,
  ];

  const [result] = await connection.execute(query, params);
  return result.insertId;
};

/**
 * Check for duplicate records by ma_so.
 * Returns an array of existing ma_so values from the provided list.
 */
const findExistingMaSo = async (connection, maSoList) => {
  if (!maSoList.length) return [];

  const filtered = maSoList.filter((m) => m !== null && m !== undefined && String(m).trim() !== "");
  if (!filtered.length) return [];

  const placeholders = filtered.map(() => "?").join(", ");
  const query = `SELECT ma_so FROM ${TABLE_CHUNG} WHERE ma_so IN (${placeholders})`;
  const [rows] = await connection.execute(query, filtered);
  return rows.map((r) => r.ma_so);
};

/**
 * Lookup nhanvien by MaSoCanBo codes.
 * Returns rows with id_User and MaSoCanBo.
 */
const findNhanVienByMaCodes = async (connection, maCodes) => {
  if (!maCodes.length) return [];

  const filtered = [...new Set(maCodes.filter((m) => m && String(m).trim()))];
  if (!filtered.length) return [];

  const placeholders = filtered.map(() => "?").join(", ");
  const query = `SELECT id_User, MaSoCanBo, TenNhanVien FROM nhanvien WHERE MaSoCanBo IN (${placeholders})`;
  const [rows] = await connection.execute(query, filtered);
  return rows;
};

module.exports = {
  insertChungExtended,
  findExistingMaSo,
  findNhanVienByMaCodes,
};
```

## File: src/repositories/nckh_v3/nhanVien.repo.js
```javascript
const getByIds = async (connection, ids) => {
  if (!ids.length) return [];

  const placeholders = ids.map(() => "?").join(",");
  const query = `SELECT id_User AS id, id_User, TenNhanVien, MaPhongBan FROM nhanvien WHERE id_User IN (${placeholders})`;
  const [rows] = await connection.execute(query, ids);
  return rows;
};

const listByKhoaId = async (connection, khoaId = "ALL") => {
  let query = `
    SELECT nv.id_User AS id, nv.id_User, nv.TenNhanVien, nv.MaPhongBan, pb.id AS khoa_id, pb.TenPhongBan
    FROM nhanvien nv
    INNER JOIN phongban pb ON pb.MaPhongBan = nv.MaPhongBan
    WHERE pb.isKhoa = 1
  `;
  const params = [];

  if (khoaId !== "ALL") {
    query += " AND pb.id = ?";
    params.push(Number(khoaId));
  }

  query += " ORDER BY nv.TenNhanVien ASC";

  const [rows] = await connection.execute(query, params);
  return rows;
};

module.exports = {
  getByIds,
  listByKhoaId,
};
```

## File: src/services/nckh_v3/baiBaoKhoaHoc.service.js
```javascript
const { createTypeInputService } = require("./typeInput.service");

module.exports = createTypeInputService({
  loaiNckh: "BAIBAO",
  mode: "standard",
  logLabel: "bài báo khoa học",
});
```

## File: src/services/nckh_v3/deTaiDuAn.service.js
```javascript
const { createTypeInputService } = require("./typeInput.service");

module.exports = createTypeInputService({
  loaiNckh: "DETAI_DUAN",
  mode: "standard",
  logLabel: "đề tài, dự án",
});
```

## File: src/services/nckh_v3/deXuatNghienCuu.service.js
```javascript
const { createTypeInputService } = require("./typeInput.service");

module.exports = createTypeInputService({
  loaiNckh: "DEXUAT",
  mode: "equal",
  logLabel: "đề xuất nghiên cứu",
});
```

## File: src/services/nckh_v3/giaiThuong.service.js
```javascript
const { createTypeInputService } = require("./typeInput.service");

module.exports = createTypeInputService({
  loaiNckh: "GIAITHUONG",
  mode: "standard",
  logLabel: "giải thưởng và sáng chế",
});
```

## File: src/services/nckh_v3/huongDanSvNckh.service.js
```javascript
const { createTypeInputService } = require("./typeInput.service");

module.exports = createTypeInputService({
  loaiNckh: "HUONGDAN",
  mode: "equal",
  logLabel: "hướng dẫn sinh viên NCKH",
});
```

## File: src/services/nckh_v3/sachGiaoTrinh.service.js
```javascript
const { createTypeInputService } = require("./typeInput.service");

module.exports = createTypeInputService({
  loaiNckh: "SACHGIAOTRINH",
  mode: "standard",
  logLabel: "sách, giáo trình",
});
```

## File: src/services/nckh_v3/sangKien.service.js
```javascript
const { createTypeInputService } = require("./typeInput.service");

module.exports = createTypeInputService({
  loaiNckh: "SANGKIEN",
  mode: "standard",
  logLabel: "sáng kiến",
});
```

## File: src/services/nckh_v3/thanhVienHoiDong.service.js
```javascript
const { createTypeInputService } = require("./typeInput.service");

module.exports = createTypeInputService({
  loaiNckh: "HOIDONG",
  mode: "fixed",
  logLabel: "thành viên hội đồng khoa học",
});
```

## File: src/validators/nckh_v3/approval.validator.js
```javascript
const validateApprovalValue = (value, fieldName) => {
  const num = Number(value);
  if (!(num === 0 || num === 1)) {
    throw new Error(`${fieldName} chi nhan 0 hoac 1`);
  }
  return num;
};

module.exports = {
  validateApprovalValue,
};
```

## File: src/views/nckh_v3/import.ejs
```ejs
<!DOCTYPE html>
<html lang="vi">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NCKH V3 - Import dữ liệu</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
  <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />

  <link rel="stylesheet" href="/css/admin.css" />
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="stylesheet" href="/css/nckh_v3.css" />
  <link rel="stylesheet" href="/css/nckh_v3_stats.css" />

  <style>
    .import-wrap {
      padding: 20px;
      max-width: 1700px;
      margin: 0 auto;
    }

    /* ── Upload Zone ── */
    .import-upload-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 28px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }

    .import-upload-card h5 {
      font-weight: 700;
      margin-bottom: 20px;
      color: #1e293b;
    }

    .import-upload-card h5 i {
      color: #3b82f6;
      margin-right: 8px;
    }

    .upload-form-row {
      display: flex;
      align-items: flex-end;
      gap: 16px;
      flex-wrap: wrap;
    }

    .upload-form-row .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .upload-form-row .form-group label {
      font-weight: 600;
      font-size: 0.85rem;
      color: #475569;
    }

    .upload-form-row .form-group select,
    .upload-form-row .form-group input {
      height: 42px;
      border-radius: 8px;
    }

    .upload-form-row .form-group select {
      min-width: 240px;
    }

    .upload-form-row .form-group input[type="file"] {
      min-width: 320px;
    }

    .btn-preview {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      border: none;
      color: #fff;
      font-weight: 600;
      padding: 10px 24px;
      border-radius: 8px;
      height: 42px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-preview:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(59,130,246,0.35);
      color: #fff;
    }

    .btn-preview:disabled {
      opacity: 0.6;
      transform: none;
      box-shadow: none;
    }

    /* ── Summary Bar ── */
    .import-summary {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .summary-badge {
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .summary-badge.total { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .summary-badge.ok { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .summary-badge.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .summary-badge.duplicate { background: #fffbeb; color: #a16207; border: 1px solid #fde68a; }

    /* ── Preview Table ── */
    .import-preview-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      margin-bottom: 20px;
    }

    .import-preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .import-preview-header h6 {
      margin: 0;
      font-weight: 700;
      color: #1e293b;
    }

    .btn-save-import {
      background: linear-gradient(135deg, #22c55e, #16a34a);
      border: none;
      color: #fff;
      font-weight: 600;
      padding: 10px 24px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-save-import:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(34,197,94,0.35);
      color: #fff;
    }

    .btn-save-import:disabled {
      opacity: 0.6;
      transform: none;
      box-shadow: none;
    }

    .import-table-wrap {
      overflow-x: auto;
    }

    .import-table-wrap table {
      width: 100%;
      border-collapse: collapse;
      min-width: 1200px;
      font-size: 0.88rem;
    }

    .import-table-wrap thead th {
      background: #f1f5f9;
      padding: 10px 12px;
      text-align: center;
      font-weight: 600;
      font-size: 0.82rem;
      color: #475569;
      white-space: nowrap;
      border-bottom: 2px solid #e2e8f0;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .import-table-wrap tbody td {
      padding: 8px 12px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: middle;
    }

    .import-table-wrap tbody tr:hover {
      background: #f8fafc;
    }

    .import-table-wrap tbody tr.row-error {
      background: #fef2f2;
    }

    .import-table-wrap tbody tr.row-error:hover {
      background: #fee2e2;
    }

    .import-table-wrap tbody tr.row-duplicate {
      background: #fffbeb;
    }

    .import-table-wrap tbody tr.row-duplicate:hover {
      background: #fef3c7;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.ok { background: #dcfce7; color: #166534; }
    .status-badge.error { background: #fecaca; color: #991b1b; }
    .status-badge.duplicate { background: #fde68a; color: #92400e; }

    .error-list {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 0.78rem;
    }

    .error-list li {
      color: #dc2626;
      line-height: 1.4;
    }

    .error-list li.warning {
      color: #d97706;
    }

    .participant-list {
      list-style: none;
      padding: 0;
      margin: 0;
      font-size: 0.82rem;
    }

    .participant-list li {
      line-height: 1.5;
      white-space: nowrap;
    }

    .participant-list .badge-role {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      background: #e0e7ff;
      color: #3730a3;
      margin-right: 4px;
    }

    .btn-remove-row {
      background: none;
      border: none;
      color: #ef4444;
      cursor: pointer;
      font-size: 1rem;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.15s;
    }

    .btn-remove-row:hover {
      background: #fef2f2;
      color: #b91c1c;
    }

    .import-empty {
      text-align: center;
      padding: 60px 20px;
      color: #94a3b8;
    }

    .import-empty i {
      font-size: 3rem;
      display: block;
      margin-bottom: 12px;
    }

    /* ── Nav pills ── */
    .import-nav {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .import-nav .nav-pill {
      padding: 6px 14px;
      border-radius: 20px;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 500;
      color: #64748b;
      background: #f1f5f9;
      transition: all 0.2s;
    }

    .import-nav .nav-pill:hover {
      background: #e2e8f0;
      color: #1e293b;
    }

    .import-nav .nav-pill.active {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: #fff;
    }

    .spinner-inline {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #ffffff80;
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-right: 6px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>

<body>
  <%- include('../header') %>

  <div class="import-wrap">
    <!-- Page Header -->
    <div class="stats-page-header">
      <h1 class="stats-page-title">
        <span class="title-icon"><i class="bi bi-file-earmark-spreadsheet"></i></span>
        Thêm bằng file NCKH
      </h1>
      <nav class="import-nav">
        <a href="/v3/nckh/them-moi-nckh" class="nav-pill">
          <i class="bi bi-pencil-square"></i> Thêm thủ công
        </a>
        <a href="/v3/nckh/import" class="nav-pill active">
          <i class="bi bi-file-earmark-spreadsheet"></i> Thêm bằng file
        </a>
      </nav>
    </div>

    <!-- Upload Card -->
    <div class="import-upload-card">
      <h5><i class="bi bi-file-earmark-spreadsheet"></i> Tải file Excel</h5>
      <div class="upload-form-row">
        <div class="form-group">
          <label for="importType">Loại NCKH</label>
          <select id="importType" class="form-select">
            <option value="">-- Chọn loại --</option>
            <% importTypes.forEach(function(t) { %>
              <option value="<%= t.value %>"><%= t.label %></option>
            <% }); %>
          </select>
        </div>
        <div class="form-group">
          <label for="namHocSelect">Năm học</label>
          <select id="namHocSelect" class="form-select">
            <!-- Will be populated via JS -->
          </select>
        </div>
        <div class="form-group">
          <label for="importFile">File Excel (.xlsx, .xls)</label>
          <input type="file" id="importFile" class="form-control" accept=".xlsx,.xls" />
        </div>
        <button id="btnPreview" class="btn btn-preview" disabled>
          <i class="bi bi-eye"></i> Xem trước
        </button>
      </div>
    </div>

    <!-- Summary (hidden initially) -->
    <div id="importSummary" class="import-summary" style="display: none;">
      <span class="summary-badge total"><i class="bi bi-list-ol"></i> Tổng: <strong id="summaryTotal">0</strong></span>
      <span class="summary-badge ok"><i class="bi bi-check-circle"></i> Hợp lệ: <strong id="summaryOk">0</strong></span>
      <span class="summary-badge error"><i class="bi bi-x-circle"></i> Lỗi: <strong id="summaryError">0</strong></span>
      <span class="summary-badge duplicate"><i class="bi bi-exclamation-triangle"></i> Trùng: <strong id="summaryDuplicate">0</strong></span>
    </div>

    <!-- Preview Table -->
    <div id="previewSection" style="display: none;">
      <div class="import-preview-card">
        <div class="import-preview-header">
          <h6><i class="bi bi-table me-2"></i>Bảng dữ liệu xem trước</h6>
          <div class="d-flex gap-2">
            <button id="btnClear" class="btn btn-outline-danger" style="display: none;">
              <i class="bi bi-eraser"></i> Xóa bảng
            </button>
            <button id="btnSave" class="btn btn-save-import" disabled>
              <i class="bi bi-check2-all"></i> Lưu dữ liệu
            </button>
          </div>
        </div>
        <div class="import-table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:40px">STT</th>
                <th style="width:80px">Trạng thái</th>
                <th style="min-width:220px" class="text-start">Tên công trình</th>
                <th style="width:120px">Mã số</th>
                <th style="width:100px">Phân loại</th>
                <th style="width:80px">Năm</th>
                <th style="width:100px">Tổng số tiết</th>
                <th style="width:100px">Ngày NT</th>
                <th style="width:100px">Xếp loại</th>
                <th style="min-width:260px" class="text-start">Người tham gia</th>
                <th style="min-width:160px" class="text-start">Ghi chú</th>
                <th style="width:50px">Xóa</th>
              </tr>
            </thead>
            <tbody id="previewTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div id="emptyState" class="import-empty">
      <i class="bi bi-inbox"></i>
      <p>Chọn loại NCKH và tải file Excel để bắt đầu import.</p>
    </div>
  </div>

  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>
  <script src="/js/nckh_v3/main/import.js"></script>
</body>

</html>
```

## File: src/views/nckh_v3/notImplemented.ejs
```ejs
<div class="placeholder-message">
  <i class="fas fa-tools"></i>
  <h4><%= (selectedTypeMeta && selectedTypeMeta.label) || 'Loại NCKH' %></h4>
  <p class="mb-0">Loại NCKH này chưa được triển khai ở giai đoạn hiện tại.</p>
</div>
```

## File: src/controllers/nckh_v3/adminQuyDinh.controller.js
```javascript
const LogService = require("../../services/logService");
const quyDinhService = require("../../services/nckh_v3/quyDinh.service");
const { NCKH_TYPE_OPTIONS } = require("../../config/nckh_v3/types");

const nckhTypes = (NCKH_TYPE_OPTIONS || []).reduce((acc, item) => {
  if (!item || !item.loaiNckh) return acc;
  acc[item.loaiNckh] = item.loaiNckh;
  return acc;
}, {});

const displayNames = (NCKH_TYPE_OPTIONS || []).reduce((acc, item) => {
  if (!item || !item.loaiNckh) return acc;
  acc[item.loaiNckh] = item.label || item.loaiNckh;
  return acc;
}, {});

const getUserContext = (req) => ({
  userId: req.session?.userId || 1,
  userName: req.session?.TenNhanVien || req.session?.username || "ADMIN",
});

const getAdminQuyDinhPage = async (req, res) => {
  try {
    const allQuyDinh = await quyDinhService.getAllQuyDinhSoGio();

    const groupedData = {};
    Object.keys(nckhTypes).forEach((type) => {
      groupedData[type] = allQuyDinh.filter((item) => String(item.LoaiNCKH || "") === String(type));
    });

    res.render("nckh.adminQuyDinhSoGio.ejs", {
      groupedData,
      nckhTypes,
      displayNames,
    });
  } catch (error) {
    console.error("[NCKH V3] Lỗi tải trang quản lý quy định:", error);
    res.status(500).send("Lỗi hệ thống khi tải trang quản lý quy định NCKH V3.");
  }
};

const saveQuyDinhSoGio = async (req, res) => {
  const user = getUserContext(req);

  try {
    const {
      id,
      loaiNCKH,
      loaiNckh,
      loai_nckh,
      phanLoai,
      phan_loai,
      tenQuyDinh,
      ten_quydinh,
      soGio,
      so_gio,
      soTiet,
      so_tiet,
      moTa,
      mo_ta,
      thuTu,
      thu_tu,
    } = req.body;

    const resolvedLoaiNCKH = loaiNCKH ?? loaiNckh ?? loai_nckh;
    const resolvedPhanLoai = phanLoai ?? phan_loai ?? tenQuyDinh ?? ten_quydinh;
    const resolvedSoGio = soGio ?? so_gio ?? soTiet ?? so_tiet;
    const resolvedMoTa = moTa ?? mo_ta ?? null;
    const resolvedThuTu = thuTu ?? thu_tu;

    if (!resolvedLoaiNCKH || !resolvedPhanLoai || resolvedSoGio === undefined || resolvedSoGio === null) {
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu bắt buộc." });
    }

    const payload = {
      id: id ? Number(id) : null,
      loaiNCKH: String(resolvedLoaiNCKH).trim(),
      phanLoai: String(resolvedPhanLoai).trim(),
      soGio: Number(resolvedSoGio),
      moTa: resolvedMoTa,
      thuTu: resolvedThuTu !== undefined && resolvedThuTu !== null ? Number(resolvedThuTu) : undefined,
    };

    if (!Number.isInteger(payload.soGio) || payload.soGio < 0) {
      return res.status(400).json({ success: false, message: "Số tiết không hợp lệ." });
    }

    if (payload.thuTu !== undefined && (!Number.isInteger(payload.thuTu) || payload.thuTu < 0)) {
      return res.status(400).json({ success: false, message: "Thứ tự không hợp lệ." });
    }

    const result = await quyDinhService.manageQuyDinhSoGio(payload);
    const action = payload.id ? "Cập nhật" : "Thêm mới";

    try {
      await LogService.logChange(
        user.userId,
        user.userName,
        "Quản lý quy định NCKH V3",
        `${action} quy định: ${payload.phanLoai} (${displayNames[payload.loaiNCKH] || payload.loaiNCKH})`
      );
    } catch (logError) {
      console.error("[NCKH V3] Lỗi ghi log:", logError);
    }

    return res.status(200).json({
      success: true,
      message: `${action} quy định thành công!`,
      id: result.id,
    });
  } catch (error) {
    console.error("[NCKH V3] Lỗi lưu quy định:", error);
    return res.status(500).json({ success: false, message: error.message || "Lỗi hệ thống khi lưu quy định." });
  }
};

const toggleQuyDinhStatus = async (req, res) => {
  const user = getUserContext(req);

  try {
    const { id } = req.params;
    const { isActive, trangThai, trang_thai } = req.body;
    const resolvedStatus = isActive ?? trangThai ?? trang_thai;

    if (!id || resolvedStatus === undefined) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin." });
    }

    await quyDinhService.toggleQuyDinhStatus(Number(id), Number(resolvedStatus));

    try {
      const statusText = Number(resolvedStatus) === 1 ? "Bật" : "Tắt";
      await LogService.logChange(
        user.userId,
        user.userName,
        "Quản lý quy định NCKH V3",
        `${statusText} trạng thái quy định ID: ${id}`
      );
    } catch (logError) {
      console.error("[NCKH V3] Lỗi ghi log:", logError);
    }

    return res.status(200).json({ success: true, message: "Cập nhật trạng thái thành công!" });
  } catch (error) {
    console.error("[NCKH V3] Lỗi cập nhật trạng thái quy định:", error);
    return res.status(500).json({ success: false, message: error.message || "Lỗi hệ thống khi cập nhật trạng thái." });
  }
};

module.exports = {
  getAdminQuyDinhPage,
  saveQuyDinhSoGio,
  toggleQuyDinhStatus,
};
```

## File: src/controllers/nckh_v3/export.controller.js
```javascript
const exportService = require("../../services/nckh_v3/export.service");

class ExportController {
  /**
   * Export lecturer statistics to Excel.
   * GET /v3/nckh/export/stats/giang-vien?namHoc=...&khoaId=...&keyword=...
   */
  async exportLecturerStats(req, res) {
    try {
      const { namHoc, khoaId = "ALL", keyword = "" } = req.query;
      if (!namHoc) return res.status(400).json({ success: false, message: "Thiếu năm học" });

      const workbook = await exportService.exportLecturerStats(namHoc, khoaId, keyword);
      const filename = `ThongKe_NCKH_GiangVien_${namHoc}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(filename)}`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("[NCKH V3] export lecturer stats error:", error);
      res.status(500).json({ success: false, message: error.message || "Lỗi khi xuất file Excel" });
    }
  }

  /**
   * Export faculty statistics to Excel.
   * GET /v3/nckh/export/stats/khoa?namHoc=...&khoaId=...
   */
  async exportFacultyStats(req, res) {
    try {
      const { namHoc, khoaId = "ALL" } = req.query;
      if (!namHoc) throw new Error("Thiếu năm học");

      const workbook = await exportService.exportFacultyStats(namHoc, khoaId);
      const filename = `ThongKe_NCKH_Khoa_${namHoc}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(filename)}`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("[NCKH V3] export faculty stats error:", error);
      res.status(500).json({ success: false, message: error.message || "Lỗi khi xuất file Excel" });
    }
  }

  /**
   * Export institute statistics to Excel.
   * GET /v3/nckh/export/stats/hoc-vien?namHoc=...
   */
  async exportInstituteStats(req, res) {
    try {
      const { namHoc } = req.query;
      if (!namHoc) throw new Error("Thiếu năm học");

      const workbook = await exportService.exportInstituteStats(namHoc);
      const filename = `ThongKe_NCKH_HocVien_${namHoc}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(filename)}`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("[NCKH V3] export institute stats error:", error);
      res.status(500).json({ success: false, message: error.message || "Lỗi khi xuất file Excel" });
    }
  }
}

module.exports = new ExportController();
```

## File: src/controllers/nckh_v3/stats.controller.js
```javascript
const statsService = require("../../services/nckh_v3/stats.service");

const renderLecturerPage = (_req, res) => {
  res.render("nckh_v3/stats_lecturer.ejs");
};

const renderFacultyPage = (_req, res) => {
  res.render("nckh_v3/stats_faculty.ejs");
};

const renderInstitutePage = (_req, res) => {
  res.render("nckh_v3/stats_institute.ejs");
};

const getFilters = async (_req, res) => {
  try {
    const data = await statsService.getFilters();
    res.json({ success: true, data });
  } catch (error) {
    console.error("[NCKH V3] stats filters error:", error);
    res.status(500).json({ success: false, message: error.message || "Không thể lấy bộ lọc" });
  }
};

const lecturerSummary = async (req, res) => {
  try {
    const { namHoc, khoaId = "ALL", keyword = "" } = req.query;
    const data = await statsService.getLecturerSummary(namHoc, khoaId, keyword);
    res.json({ success: true, data });
  } catch (error) {
    console.error("[NCKH V3] stats lecturer summary error:", error);
    res.status(400).json({ success: false, message: error.message || "Không thể lấy thống kê giảng viên" });
  }
};

const lecturerRecords = async (req, res) => {
  try {
    const { namHoc } = req.query;
    const data = await statsService.getLecturerRecords(req.params.lecturerId, namHoc);
    res.json({ success: true, data });
  } catch (error) {
    console.error("[NCKH V3] stats lecturer records error:", error);
    res.status(400).json({ success: false, message: error.message || "Không thể lấy công trình của giảng viên" });
  }
};

const facultySummary = async (req, res) => {
  try {
    const { namHoc } = req.query;
    const data = await statsService.getFacultySummary(namHoc);
    res.json({ success: true, data });
  } catch (error) {
    console.error("[NCKH V3] stats faculty summary error:", error);
    res.status(400).json({ success: false, message: error.message || "Không thể lấy thống kê khoa" });
  }
};

const facultyRecords = async (req, res) => {
  try {
    const { namHoc } = req.query;
    const data = await statsService.getFacultyRecords(namHoc, req.params.khoaId);
    res.json({ success: true, data });
  } catch (error) {
    console.error("[NCKH V3] stats faculty records error:", error);
    res.status(400).json({ success: false, message: error.message || "Không thể lấy công trình theo khoa" });
  }
};

const instituteSummary = async (req, res) => {
  try {
    const { namHoc } = req.query;
    const data = await statsService.getInstituteSummary(namHoc);
    res.json({ success: true, data });
  } catch (error) {
    console.error("[NCKH V3] stats institute summary error:", error);
    res.status(400).json({ success: false, message: error.message || "Không thể lấy thống kê học viện" });
  }
};

const instituteRecords = async (req, res) => {
  try {
    const { namHoc, khoaId = "ALL", type = "ALL" } = req.query;
    const data = await statsService.getInstituteRecords(namHoc, khoaId, type);
    res.json({ success: true, data });
  } catch (error) {
    console.error("[NCKH V3] stats institute records error:", error);
    res.status(400).json({ success: false, message: error.message || "Không thể lấy danh sách công trình học viện" });
  }
};

module.exports = {
  renderLecturerPage,
  renderFacultyPage,
  renderInstitutePage,
  getFilters,
  lecturerSummary,
  lecturerRecords,
  facultySummary,
  facultyRecords,
  instituteSummary,
  instituteRecords,
};
```

## File: src/mappers/nckh_v3/import.mapper.js
```javascript
/**
 * NCKH Import Mapper
 * Transforms raw Excel row objects → standardized DB-ready objects
 * for each of the 8 supported NCKH types.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

const trimStr = (v) => (v === null || v === undefined ? "" : String(v).trim());
const toIntOrNull = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};
const toFloatOrNull = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const cleaned = String(v).replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
};

/**
 * Parses various date formats from Excel (e.g. DD/MM/YYYY, MM/YYYY, YYYY)
 * into MySQL compatible YYYY-MM-DD string.
 */
const parseMySQLDate = (v) => {
  if (!v) return null;
  const str = String(v).trim();
  if (!str) return null;

  // Pattern: Excel serial date (e.g. 45432 or 45432.5)
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const excelDate = parseFloat(str);
    const d = new Date((excelDate - 25569) * 86400 * 1000);
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = d.getUTCFullYear();
    return `${year}-${month}-${day}`;
  }

  // Pattern: DD/MM/YYYY or DD-MM-YYYY
  const regexDDMMYYYY = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const match1 = str.match(regexDDMMYYYY);
  if (match1) {
    const day = match1[1].padStart(2, "0");
    const month = match1[2].padStart(2, "0");
    const year = match1[3];
    return `${year}-${month}-${day}`;
  }

  // Pattern: MM/YYYY or MM-YYYY
  const regexMMYYYY = /^(\d{1,2})[\/\-](\d{4})$/;
  const match2 = str.match(regexMMYYYY);
  if (match2) {
    const month = match2[1].padStart(2, "0");
    const year = match2[2];
    return `${year}-${month}-01`;
  }

  // Pattern: YYYY
  const regexYYYY = /^(\d{4})$/;
  const match3 = str.match(regexYYYY);
  if (match3) {
    return `${str}-01-01`;
  }
  
  // Pattern: YYYY-MM-DD (already MySQL format)
  const regexYYYYMMDD = /^(\d{4})-(\d{2})-(\d{2})$/;
  if (regexYYYYMMDD.test(str)) {
    return str;
  }

  // Fallback to JS Date parser
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  }

  return null; // Return null if format is unrecognizable
};

/**
 * Split a comma-separated string of employee codes into an array.
 */
const splitCodes = (str) =>
  trimStr(str)
    .split(/[,;，；\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

// ─── Type-specific Mappers ──────────────────────────────────────────────────

/**
 * File 1: Bài báo khoa học
 */
const mapBaiBaoKhoaHoc = (row) => {
  // Support both old and new headers for backward compatibility
  const rawTacGia = row["Mã số TGC"] || row["Mã tác giả chính thuộc HV"];
  const rawThanhVien = row["Mã số TV"] || row["Mã các tác giả khác thuộc HV"];

  const tacGiaChinh = splitCodes(rawTacGia);
  const dongTacGia = splitCodes(rawThanhVien);

  return {
    chung: {
      tenCongTrinh: trimStr(row["Tên bài"]),
      loaiNckh: "BAIBAO",
      phanLoai: trimStr(row["Phân loại"]) || null,
      namHoc: null, // Sẽ được lấy từ UI
      maSo: trimStr(row["Mã bài báo"]) || null,
      tenTapChi: trimStr(row["Tên Tạp chí/Hội thảo"]) || null,
      soTrichDan: toIntOrNull(row["Số trích dẫn"]),
      soBao: trimStr(row["Số báo"]) || null,
      tongSoTiet: toFloatOrNull(row["Tổng số tiết"]) || 0,
      soQuyetDinh: trimStr(row["Số quyết định"] || row["Quyết định "]) || null,
      ngayQuyetDinh: parseMySQLDate(row["Ngày quyết định"]) || null,
      capNhiemVu: null,
      kinhPhi: null,
      ngayNghiemThu: parseMySQLDate(row["Ngày nghiệm thu"] || row["Ngày công bố"]),
      xepLoai: trimStr(row["Xếp loại"]) || null,
    },
    participants: {
      tacGiaMaCodes: tacGiaChinh,
      thanhVienMaCodes: dongTacGia,
      ngoaiList: [],
    },
    namThucHien: toIntOrNull(row["Năm công bố"] || row["Năm thực hiện"]) || 1,
    mode: "standard",
  };
};

/**
 * File 2: Hướng dẫn sinh viên NCKH
 */
const mapHuongDanSvNckh = (row) => {
  const cbhd1 = trimStr(row["Mã CBHD1"]);
  const cbhd2 = trimStr(row["Mã CBHD2"]);
  const lop = trimStr(row["Lớp"]);

  // Build external participants (sinh viên)
  const ngoaiList = [];
  const truongNhom = trimStr(row["Trưởng nhóm thực hiện"] || row["Trưởng nhóm"]);
  if (truongNhom) {
    ngoaiList.push({ ten: truongNhom, donVi: lop || "Chưa rõ", vaiTro: "thanh_vien" });
  }

  const thanhVienStr = trimStr(row["Các thành viên khác"] || row["Các thành viên"]);
  if (thanhVienStr) {
    thanhVienStr.split(/[,;]+/).forEach((name) => {
      const n = name.trim();
      if (n) ngoaiList.push({ ten: n, donVi: lop || "Chưa rõ", vaiTro: "thanh_vien" });
    });
  }

  const tacGiaMaCodes = [];
  if (cbhd1) tacGiaMaCodes.push(cbhd1);

  const thanhVienMaCodes = [];
  if (cbhd2) thanhVienMaCodes.push(cbhd2);

  return {
    chung: {
      tenCongTrinh: trimStr(row["Tên đề tài"]),
      loaiNckh: "HUONGDAN",
      phanLoai: trimStr(row["Xếp loại đề tài"]) || null, // Map làm phân loại để tính số tiết
      namHoc: trimStr(row["Năm kết thúc"]),
      maSo: trimStr(row["Mã số đề tài"]) || null,
      xepLoai: trimStr(row["Kết quả"]) || null,
      soQuyetDinh: trimStr(row["Số quyết định"] || row["Quyết định giao"]) || null,
      ngayQuyetDinh: parseMySQLDate(row["Ngày quyết định"]) || null,
      tongSoTiet: toFloatOrNull(row["Tổng số tiết"]) || 0,
      capNhiemVu: null,
      kinhPhi: null,
      tenTapChi: null,
      soBao: null,
      soTrichDan: null,
      ngayNghiemThu: null,
      coQuanChuTri: trimStr(row["Cơ quan chủ trì"]) || null,
    },
    participants: {
      tacGiaMaCodes,
      thanhVienMaCodes,
      ngoaiList,
    },
    namThucHien: toIntOrNull(row["Năm thực hiện"]) || 1,
    mode: "standard",
  };
};

/**
 * File 3: Đề tài dự án
 */
const mapDeTaiDuAn = (row) => {
  const chuNhiem = trimStr(row["Mã số cán bộ"]);
  const thanhVien = splitCodes(row["Mã các thành viên khác"] || row["Mã số các thành viên khác"] || row["Mã số thành viên"] || row["Mã thành viên"]);

  // Parse "Thời gian thực hiện" to get ngayNghiemThu
  let ngayNghiemThu = null;
  const thoiGian = trimStr(row["Thời gian thực hiện"]);
  if (thoiGian) {
    // Try to extract last date: "01/2024 - 12/2024" → "12/2024"
    const parts = thoiGian.split(/[-–~]/);
    const lastPart = (parts[parts.length - 1] || "").trim();
    if (lastPart) ngayNghiemThu = parseMySQLDate(lastPart);
  }

  return {
    chung: {
      tenCongTrinh: trimStr(row["Tên nhiệm vụ"]),
      loaiNckh: "DETAI_DUAN",
      phanLoai: trimStr(row["Phân loại nhiệm vụ"]) || null,
      namHoc: trimStr(row["Năm kết thúc"] || row["Năm"]),
      maSo: trimStr(row["Mã nhiệm vụ"]) || null,
      capNhiemVu: trimStr(row["Phân cấp nhiệm vụ"]) || null,
      soQuyetDinh: trimStr(row["Số quyết định"] || row["Quyết định giao"]) || null,
      ngayQuyetDinh: parseMySQLDate(row["Ngày quyết định"]) || null,
      kinhPhi: trimStr(row["Tổng kinh phí"]) || null,
      xepLoai: trimStr(row["Kết quả"]) || null,
      tongSoTiet: toFloatOrNull(row["Tổng số tiết"]) || 0,
      ngayNghiemThu,
      tenTapChi: null,
      soBao: null,
      soTrichDan: null,
      coQuanChuTri: trimStr(row["Cơ quan chủ trì"]) || null,
      coQuanChuQuan: trimStr(row["Cơ quan chủ quản"]) || null,
      thuocNhiemVu: trimStr(row["Thuộc nhiệm vụ"]) || null,
      linhVucNghienCuu: trimStr(row["Lĩnh vực nghiên cứu"]) || null,
      kinhPhiNamNhat: trimStr(row["Kinh phí năm nhất"]) || null,
      kinhPhiNamHai: trimStr(row["Kinh phí năm hai"]) || null,
      kinhPhiNamBa: trimStr(row["Kinh phí năm ba"]) || null,
      nguonKinhPhi: trimStr(row["Nguồn kinh phí"]) || null,
    },
    participants: {
      tacGiaMaCodes: chuNhiem ? [chuNhiem] : [],
      thanhVienMaCodes: thanhVien,
      ngoaiList: [],
    },
    namThucHien: toIntOrNull(row["Năm thực hiện"]) || 1,
    mode: "standard",
  };
};

/**
 * File 4: Thành viên hội đồng
 * Each row generates MULTIPLE nckh_so_tiet entries (one per role).
 * Mode = "fixed" → each member gets a fixed amount of hours.
 */
const mapThanhVienHoiDong = (row) => {
  // Collect all role-code pairs
  const rolePairs = [];

  const addRole = (maCol, vaiTro) => {
    const ma = trimStr(row[maCol]);
    if (ma) rolePairs.push({ ma, vaiTro });
  };

  const addRolesList = (maCol, vaiTro) => {
    const codes = splitCodes(row[maCol]);
    codes.forEach(ma => rolePairs.push({ ma, vaiTro }));
  };

  // Support for old format columns
  addRole("Mã số chủ tịch", "chu_tich");
  addRole("Mã số phó chủ tịch", "chu_tich");
  addRole("Mã số phản biện 1", "phan_bien");
  addRole("Mã số phản biện 2", "phan_bien");
  for (let i = 1; i <= 5; i++) {
    addRole(`Mã số ủy viên ${i}`, "uy_vien");
  }

  // Support for new format columns (single column per role, separated by comma/semicolon)
  addRole("Mã số cán bộ CT", "chu_tich");
  addRole("Mã số cán bộ PCT", "chu_tich");
  addRolesList("Mã số cán bộ PB", "phan_bien");
  addRolesList("Mã số cán bộ UV", "uy_vien");

  return {
    chung: {
      tenCongTrinh: trimStr(row["Tên nhiệm vụ"]),
      loaiNckh: "HOIDONG",
      phanLoai: trimStr(row["Loại Hội đồng"]) || null,
      namHoc: trimStr(row["Năm"]),
      maSo: trimStr(row["Mã Hội đồng"]) || null,
      capNhiemVu: trimStr(row["Cấp Hội đồng"]) || null,
      soQuyetDinh: trimStr(row["Số Quyết định"] || row["Số quyết định"] || row["Quyết định giao"]) || null,
      ngayQuyetDinh: parseMySQLDate(row["Ngày quyết định"]) || null,
      xepLoai: trimStr(row["Kết quả"]) || null,
      tongSoTiet: toFloatOrNull(row["Tổng số tiết"]) || 0,
      kinhPhi: null,
      tenTapChi: null,
      soBao: null,
      soTrichDan: null,
      ngayNghiemThu: null,
    },
    hoiDongRoles: rolePairs,
    namThucHien: toIntOrNull(row["Năm thực hiện"]) || 1,
    mode: "fixed",
  };
};

/**
 * File 5: Sách / Giáo trình
 * tongSoTiet = 0 → hệ thống tự tính dựa theo phanLoai
 */
const mapSachGiaoTrinh = (row) => {
  const tacGiaChinh = splitCodes(row["Mã số Chủ biên"]);
  const dongTacGia = splitCodes(row["Mã số Đồng tác giả"]);

  return {
    chung: {
      tenCongTrinh: trimStr(row["Tên sách/giáo trình"]),
      loaiNckh: "SACHGIAOTRINH",
      phanLoai: trimStr(row["Phân loại sách"]) || null,
      namHoc: null, // Sẽ được lấy từ UI select
      maSo: trimStr(row["Mã số sách"]) || null,
      soQuyetDinh: trimStr(row["Số quyết định"]) || null,
      ngayQuyetDinh: parseMySQLDate(row["Ngày quyết định"]) || null,
      coQuanChuQuan: trimStr(row["Nhà xuất bản"]) || null,
      coQuanChuTri: trimStr(row["Cơ quan chủ trì"]) || null,
      tongSoTiet: 0,
      capNhiemVu: null,
      kinhPhi: null,
      tenTapChi: null,
      soBao: null,
      soTrichDan: null,
      ngayNghiemThu: null,
      xepLoai: null,
    },
    participants: {
      tacGiaMaCodes: tacGiaChinh,
      thanhVienMaCodes: dongTacGia,
      ngoaiList: [],
    },
    namThucHien: toIntOrNull(row["Năm thực hiện"]) || 1,
    mode: "standard",
  };
};

/**
 * File 6: Sáng kiến
 * tongSoTiet = 0 → hệ thống tự tính dựa theo phanLoai
 */
const mapSangKien = (row) => {
  const tacGiaChinh = splitCodes(row["Mã số Tác giả chính"]);
  const dongTacGia = splitCodes(row["Mã số Đồng tác giả"]);

  return {
    chung: {
      tenCongTrinh: trimStr(row["Tên sáng kiến"]),
      loaiNckh: "SANGKIEN",
      phanLoai: trimStr(row["Cấp sáng kiến"]) || null,
      namHoc: null, // Sẽ được lấy từ UI select
      maSo: trimStr(row["Mã số sáng kiến"]) || null,
      xepLoai: trimStr(row["Kết quả đánh giá"]) || null,
      coQuanChuTri: trimStr(row["Cơ quan chủ trì"]) || null,
      soQuyetDinh: trimStr(row["Số quyết định"]) || null,
      ngayQuyetDinh: parseMySQLDate(row["Ngày quyết định"]) || null,
      tongSoTiet: 0,
      capNhiemVu: null,
      kinhPhi: null,
      tenTapChi: null,
      soBao: null,
      soTrichDan: null,
      ngayNghiemThu: null,
    },
    participants: {
      tacGiaMaCodes: tacGiaChinh,
      thanhVienMaCodes: dongTacGia,
      ngoaiList: [],
    },
    namThucHien: toIntOrNull(row["Năm thực hiện"]) || 1,
    mode: "standard",
  };
};

/**
 * File 7: Giải thưởng
 * tongSoTiet = 0 → hệ thống tự tính dựa theo phanLoai
 */
const mapGiaiThuong = (row) => {
  const tacGiaChinh = splitCodes(row["Mã số Người đạt giải chính"]);
  const dongTacGia = splitCodes(row["Mã số Thành viên khác"]);

  return {
    chung: {
      tenCongTrinh: trimStr(row["Tên giải thưởng"]),
      loaiNckh: "GIAITHUONG",
      phanLoai: trimStr(row["Cấp giải thưởng"]) || null,
      namHoc: null, // Sẽ được lấy từ UI select
      xepLoai: trimStr(row["Thứ hạng giải"]) || null,
      coQuanChuTri: trimStr(row["Cơ quan chủ trì"]) || null,
      soQuyetDinh: trimStr(row["Số quyết định"]) || null,
      ngayQuyetDinh: parseMySQLDate(row["Ngày quyết định"]) || null,
      tongSoTiet: 0,
      maSo: null,
      capNhiemVu: null,
      kinhPhi: null,
      tenTapChi: null,
      soBao: null,
      soTrichDan: null,
      ngayNghiemThu: null,
    },
    participants: {
      tacGiaMaCodes: tacGiaChinh,
      thanhVienMaCodes: dongTacGia,
      ngoaiList: [],
    },
    namThucHien: toIntOrNull(row["Năm thực hiện"]) || 1,
    mode: "standard",
  };
};

/**
 * File 8: Đề xuất nghiên cứu
 * tongSoTiet = 0 → hệ thống tự tính dựa theo phanLoai
 */
const mapDeXuatNghienCuu = (row) => {
  const tacGiaChinh = splitCodes(row["Mã số Chủ nhiệm đề xuất"]);
  const dongTacGia = splitCodes(row["Mã số Thành viên khác"]);

  return {
    chung: {
      tenCongTrinh: trimStr(row["Tên đề xuất nghiên cứu"]),
      loaiNckh: "DEXUAT",
      phanLoai: trimStr(row["Phân loại đề xuất"]) || null,
      namHoc: null, // Sẽ được lấy từ UI select
      xepLoai: trimStr(row["Kết quả"]) || null,
      coQuanChuTri: trimStr(row["Cơ quan chủ trì"]) || null,
      tongSoTiet: 0,
      maSo: null,
      soQuyetDinh: null,
      ngayQuyetDinh: null,
      capNhiemVu: null,
      kinhPhi: null,
      tenTapChi: null,
      soBao: null,
      soTrichDan: null,
      ngayNghiemThu: null,
    },
    participants: {
      tacGiaMaCodes: tacGiaChinh,
      thanhVienMaCodes: dongTacGia,
      ngoaiList: [],
    },
    namThucHien: toIntOrNull(row["Năm thực hiện"]) || 1,
    mode: "standard",
  };
};

// ─── Main Dispatcher ────────────────────────────────────────────────────────

const MAPPER_MAP = {
  "bai-bao-khoa-hoc": mapBaiBaoKhoaHoc,
  "huong-dan-sv-nckh": mapHuongDanSvNckh,
  "de-tai-du-an": mapDeTaiDuAn,
  "thanh-vien-hoi-dong": mapThanhVienHoiDong,
  "sach-giao-trinh": mapSachGiaoTrinh,
  "sang-kien": mapSangKien,
  "giai-thuong": mapGiaiThuong,
  "de-xuat-nghien-cuu": mapDeXuatNghienCuu,
};

/**
 * Map a single raw Excel row to a standardized record object.
 * @param {string} type - One of the 8 type keys
 * @param {Object} row  - Raw row from XLSX
 * @returns {Object}    - Mapped record
 */
const mapRow = (type, row) => {
  const mapper = MAPPER_MAP[type];
  if (!mapper) {
    throw new Error(`Loại NCKH "${type}" không được hỗ trợ import.`);
  }
  return mapper(row);
};

/**
 * Get supported import types
 */
const IMPORT_TYPES = [
  { value: "bai-bao-khoa-hoc", label: "Bài báo khoa học" },
  { value: "huong-dan-sv-nckh", label: "Hướng dẫn SV NCKH" },
  { value: "de-tai-du-an", label: "Đề tài dự án" },
  { value: "thanh-vien-hoi-dong", label: "Thành viên hội đồng" },
  { value: "sach-giao-trinh", label: "Sách giáo trình" },
  { value: "sang-kien", label: "Sáng kiến" },
  { value: "giai-thuong", label: "Giải thưởng" },
  { value: "de-xuat-nghien-cuu", label: "Đề xuất nghiên cứu" },
];

module.exports = {
  mapRow,
  IMPORT_TYPES,
  MAPPER_MAP,
};
```

## File: src/public/js/nckh_v3/huong_dan_sv_nckh/index.js
```javascript
window.addEventListener("DOMContentLoaded", () => {
  window.NCKH_V3_TypeInputCommon.init({
    slug: "huong-dan-sv-nckh",
    loaiNckh: "HUONGDAN",
    label: "Hướng dẫn SV NCKH",
    mode: "equal",
    hasSecondaryMembers: false,
  });
});
```

## File: src/public/js/nckh_v3/stats/common.js
```javascript
(function () {
  const api = {
    async getNamHoc() {
      const response = await fetch("/getNamHoc");
      return response.json();
    },
    async getFilters() {
      const response = await fetch("/v3/nckh/stats/filters");
      return response.json();
    },
  };

  const helpers = {
    escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },
    formatHours(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return "0,00";
      }
      return numeric.toFixed(2).replace(".", ",");
    },
    fillNamHocOptions(selectEl, namHocList) {
      if (!selectEl) return;
      selectEl.innerHTML = "";

      (namHocList || []).forEach((item) => {
        const namHoc = item && item.NamHoc ? String(item.NamHoc) : "";
        if (!namHoc) return;
        const option = document.createElement("option");
        option.value = namHoc;
        option.textContent = namHoc;
        selectEl.appendChild(option);
      });

      const yearNow = new Date().getFullYear();
      const currentNamHoc = `${yearNow}-${yearNow + 1}`;
      const found = Array.from(selectEl.options).find((x) => x.value === currentNamHoc);
      if (found) {
        selectEl.value = currentNamHoc;
      }
    },
    fillKhoaOptions(selectEl, khoaList, includeAll = true) {
      if (!selectEl) return;
      selectEl.innerHTML = includeAll ? '<option value="ALL">Tất cả khoa</option>' : "";
      (khoaList || []).forEach((khoa) => {
        const option = document.createElement("option");
        option.value = String(khoa.id);
        option.textContent = `${khoa.MaPhongBan} - ${khoa.TenPhongBan}`;
        selectEl.appendChild(option);
      });
    },
    async showError(error, fallbackMessage) {
      console.error(error);
      await Swal.fire("Lỗi", error?.message || fallbackMessage || "Đã xảy ra lỗi", "error");
    },
    formatRole(role) {
      const r = String(role || "").toLowerCase();
      if (r === "tac_gia") return "Tác giả";
      if (r === "thanh_vien") return "Thành viên";
      return role || "";
    },
  };

  window.NCKH_V3_STATS = {
    api,
    helpers,
  };
})();
```

## File: src/repositories/nckh_v3/nckhSoTiet.repo.js
```javascript
const TABLE = "nckh_so_tiet";

const bulkInsert = async (connection, nckhId, participants) => {
  if (!participants.length) return;

  const placeholders = participants.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");
  const query = `INSERT INTO ${TABLE} (nckh_id, nhanvien_id, ten_ngoai, don_vi_ngoai, vai_tro, so_tiet, nam_thuc_hien) VALUES ${placeholders}`;

  const params = [];
  participants.forEach((item) => {
    params.push(
      nckhId,
      item.nhanvienId ?? null,
      item.tenNgoai ?? null,
      item.donViNgoai ?? null,
      item.vaiTro,
      item.soTiet,
      Number(item.namThucHien || 1)
    );
  });

  await connection.execute(query, params);
};

const deleteByNckhId = async (connection, nckhId) => {
  await connection.execute(`DELETE FROM ${TABLE} WHERE nckh_id = ?`, [nckhId]);
};

const getByNckhId = async (connection, nckhId) => {
  const query = `
    SELECT st.id, st.nhanvien_id, st.ten_ngoai, st.don_vi_ngoai, st.vai_tro, st.so_tiet, st.nam_thuc_hien, nv.TenNhanVien, nv.MaPhongBan
    FROM ${TABLE} st
    LEFT JOIN nhanvien nv ON nv.id_User = st.nhanvien_id
    WHERE st.nckh_id = ?
    ORDER BY st.nam_thuc_hien ASC, st.id ASC
  `;
  const [rows] = await connection.execute(query, [nckhId]);
  return rows;
};

const getByNckhIds = async (connection, nckhIds) => {
  const ids = Array.isArray(nckhIds)
    ? nckhIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
    : [];

  if (!ids.length) {
    return [];
  }

  const placeholders = ids.map(() => "?").join(", ");
  const query = `
    SELECT st.id, st.nckh_id, st.nhanvien_id, st.ten_ngoai, st.don_vi_ngoai, st.vai_tro, st.so_tiet, st.nam_thuc_hien, nv.TenNhanVien, nv.MaPhongBan
    FROM ${TABLE} st
    LEFT JOIN nhanvien nv ON nv.id_User = st.nhanvien_id
    WHERE st.nckh_id IN (${placeholders})
    ORDER BY st.nckh_id ASC, st.id ASC
  `;

  const [rows] = await connection.execute(query, ids);
  return rows;
};

const sumHours = async (connection, nckhId) => {
  const [rows] = await connection.execute(
    `SELECT COALESCE(SUM(so_tiet), 0) AS total FROM ${TABLE} WHERE nckh_id = ?`,
    [nckhId]
  );

  return Number(rows[0]?.total || 0);
};

module.exports = {
  bulkInsert,
  deleteByNckhId,
  getByNckhId,
  getByNckhIds,
  sumHours,
};
```

## File: src/repositories/nckh_v3/phongBan.repo.js
```javascript
const listKhoa = async (connection) => {
  const query = `
    SELECT id, MaPhongBan, TenPhongBan
    FROM phongban
    ORDER BY TenPhongBan ASC
  `;
  const [rows] = await connection.execute(query);
  return rows;
};

const findById = async (connection, id) => {
  const [rows] = await connection.execute(
    "SELECT id, MaPhongBan, TenPhongBan, isKhoa FROM phongban WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
};

module.exports = {
  listKhoa,
  findById,
};
```

## File: src/services/nckh_v3/import.service.js
```javascript
/**
 * NCKH V3 Import Service
 * Parse Excel → Map → Calculate hours → Check duplicates → Save to DB
 */

const XLSX = require("xlsx");
const createPoolConnection = require("../../config/databasePool");
const LogService = require("../logService");

const importRepo = require("../../repositories/nckh_v3/nckhImport.repo");
const nckhSoTietRepo = require("../../repositories/nckh_v3/nckhSoTiet.repo");
const importMapper = require("../../mappers/nckh_v3/import.mapper");
const formulaService = require("./formula.service");

// ─── Excel Parsing ──────────────────────────────────────────────────────────

/**
 * Find the header row by looking for rows with enough non-empty cells.
 */
function findHeaderRow(sheet) {
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  for (let row = 0; row <= Math.min(range.e.r, 10); row += 1) {
    const rowData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: row })[0] || [];
    const nonEmpty = rowData.filter((cell) => cell !== null && cell !== undefined && String(cell).trim() !== "");
    if (nonEmpty.length >= 3) {
      return row;
    }
  }
  return 0;
}

/**
 * Parse an Excel buffer into an array of raw row objects.
 */
function parseExcelBuffer(fileBuffer) {
  const workbook = XLSX.read(fileBuffer, {
    type: "buffer",
    cellDates: false,
    raw: false,
    cellText: true,
  });

  let allRows = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet["!ref"]) return;

    const headerRowIndex = findHeaderRow(sheet);
    const headerRow = XLSX.utils.sheet_to_json(sheet, { header: 1, range: headerRowIndex })[0] || [];
    const normalizedHeaders = headerRow.map((h) =>
      (h || "")
        .toString()
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    );

    const rawRows = XLSX.utils.sheet_to_json(sheet, {
      header: normalizedHeaders,
      range: headerRowIndex + 1,
      defval: "",
      raw: false,
      cellText: true,
    });

    // Override with display values for date cells
    rawRows.forEach((row, rowIndex) => {
      const realRowNumber = headerRowIndex + 1 + rowIndex + 1;
      for (let col = 0; col < normalizedHeaders.length; col += 1) {
        const colLetter = XLSX.utils.encode_col(col);
        const cellAddress = `${colLetter}${realRowNumber}`;
        const cell = sheet[cellAddress];
        if (cell && cell.w !== undefined) {
          row[normalizedHeaders[col]] = cell.w;
        }
      }
    });

    allRows = allRows.concat(rawRows);
  });

  return allRows;
}

// ─── Preview Logic ──────────────────────────────────────────────────────────

/**
 * Parse Excel, map rows, resolve employee codes, calculate hours,
 * check duplicates, and return preview data.
 */
const buildPreview = async (fileBuffer, type, namHocFromUI) => {
  const rawRows = parseExcelBuffer(fileBuffer);

  if (rawRows.length === 0) {
    throw new Error("File Excel không có dữ liệu.");
  }

  // Filter out completely empty rows
  const filteredRows = rawRows.filter((row) => {
    const values = Object.values(row).map((v) => String(v || "").trim());
    return values.some((v) => v !== "");
  });

  if (filteredRows.length === 0) {
    throw new Error("File Excel không có dữ liệu hợp lệ.");
  }

  // Map each row
  const mappedRecords = filteredRows.map((row, index) => {
    try {
      const mapped = importMapper.mapRow(type, row);
      
      // Override namHoc from UI for the whole file
      if (namHocFromUI) {
        mapped.chung.namHoc = namHocFromUI;
      }
      

      mapped._rowIndex = index + 1;
      mapped._errors = [];
      mapped._warnings = [];
      return mapped;
    } catch (err) {
      return {
        _rowIndex: index + 1,
        _errors: [err.message],
        _warnings: [],
        chung: { tenCongTrinh: "LỖI", loaiNckh: "", maSo: "" },
        participants: { tacGiaMaCodes: [], thanhVienMaCodes: [], ngoaiList: [] },
        mode: "standard",
        namThucHien: 1,
      };
    }
  });

  // Validate basic required fields
  mappedRecords.forEach((rec) => {
    if (!rec.chung.tenCongTrinh || rec.chung.tenCongTrinh === "LỖI") {
      rec._errors.push("Thiếu tên công trình");
    }
    if (!rec.chung.tongSoTiet || rec.chung.tongSoTiet <= 0) {
      rec._errors.push("Thiếu hoặc sai tổng số tiết");
    }
  });

  // Collect all employee codes to resolve
  const allMaCodes = new Set();
  mappedRecords.forEach((rec) => {
    if (rec.participants) {
      (rec.participants.tacGiaMaCodes || []).forEach((c) => allMaCodes.add(c));
      (rec.participants.thanhVienMaCodes || []).forEach((c) => allMaCodes.add(c));
    }
    if (rec.hoiDongRoles) {
      rec.hoiDongRoles.forEach((r) => allMaCodes.add(r.ma));
    }
  });

  // Resolve codes → nhanvien IDs
  let connection;
  let codeToIdMap = {};
  let codeToNameMap = {};
  let duplicateMaSoSet = new Set();
  let quyDinhMap = new Map();

  try {
    connection = await createPoolConnection();

    // Lấy danh sách quy định số giờ cho loại NCKH này
    // Chú ý: Cần lấy loaiNckh từ config hoặc record đầu tiên
    const loaiNckh = mappedRecords.find(r => r.chung.loaiNckh)?.chung.loaiNckh;
    if (loaiNckh) {
      const { getQuyDinhSoGioByLoai } = require("./quyDinh.service");
      const quyDinhs = await getQuyDinhSoGioByLoai(loaiNckh);
      quyDinhs.forEach(qd => {
        if (qd.PhanLoai) {
          const cleanedKey = qd.PhanLoai.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
          quyDinhMap.set(cleanedKey, Number(qd.SoGio));
        }
      });
    }

    if (allMaCodes.size > 0) {
      const employees = await importRepo.findNhanVienByMaCodes(connection, [...allMaCodes]);
      employees.forEach((emp) => {
        codeToIdMap[String(emp.MaSoCanBo).trim()] = emp.id_User;
        codeToNameMap[String(emp.MaSoCanBo).trim()] = emp.TenNhanVien;
      });
    }

    // Check duplicates
    const allMaSo = mappedRecords
      .map((r) => r.chung.maSo)
      .filter((m) => m !== null && m !== undefined && String(m).trim() !== "");

    if (allMaSo.length > 0) {
      const existing = await importRepo.findExistingMaSo(connection, allMaSo);
      duplicateMaSoSet = new Set(existing);
    }
  } finally {
    if (connection) connection.release();
  }

  // Build preview output
  const previewRecords = mappedRecords.map((rec) => {
    // Tự động gán Tổng số tiết LUÔN LUÔN dựa theo Phân loại (bỏ qua file Excel)
    // Fallback thử tìm theo Cấp nhiệm vụ nếu Phân loại không khớp (đặc thù Đề tài dự án)
    let matchedGio;
    if (rec.chung.phanLoai) {
      const cleanPhanLoai = rec.chung.phanLoai.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
      matchedGio = quyDinhMap.get(cleanPhanLoai);
    }
    if (matchedGio === undefined && rec.chung.capNhiemVu) {
      const cleanCapNhiemVu = rec.chung.capNhiemVu.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
      matchedGio = quyDinhMap.get(cleanCapNhiemVu);
    }

    if (matchedGio !== undefined) {
      rec.chung.tongSoTiet = matchedGio;
      // Xóa thông báo lỗi "Thiếu tổng số tiết" nếu đã lấy được từ quy định
      rec._errors = rec._errors.filter(e => e !== "Thiếu hoặc sai tổng số tiết");
    }
    const errors = [...rec._errors];
    const warnings = [...rec._warnings];
    let status = "ok";

    // Check duplicate
    if (rec.chung.maSo && duplicateMaSoSet.has(rec.chung.maSo)) {
      status = "duplicate";
      warnings.push(`Mã số "${rec.chung.maSo}" đã tồn tại trong hệ thống`);
    }

    // Resolve participant codes and build preview participants
    let previewParticipants = [];

    if (rec.hoiDongRoles) {
      // Hội đồng mode
      rec.hoiDongRoles.forEach((rolePair) => {
        const id = codeToIdMap[rolePair.ma];
        const name = codeToNameMap[rolePair.ma];
        if (!id) {
          errors.push(`Không tìm thấy nhân viên mã "${rolePair.ma}"`);
        }
        previewParticipants.push({
          nhanvienId: id || null,
          maSoCanBo: rolePair.ma,
          tenNhanVien: name || rolePair.ma,
          vaiTro: rolePair.vaiTro,
          tenNgoai: null,
          donViNgoai: null,
          soTiet: 0,
          namThucHien: rec.namThucHien || 1,
        });
      });

      // Calculate fixed hours for each member
      if (rec.chung.tongSoTiet > 0 && previewParticipants.length > 0) {
        const fixedHours = formulaService.round2(Number(rec.chung.tongSoTiet));
        previewParticipants.forEach((p) => {
          p.soTiet = fixedHours;
        });
      }
    } else if (rec.participants) {
      // Standard / Equal mode
      const tacGiaIds = [];
      const thanhVienIds = [];
      const tacGiaNgoai = [];
      const thanhVienNgoai = [];

      // Resolve tac gia codes
      (rec.participants.tacGiaMaCodes || []).forEach((code) => {
        const id = codeToIdMap[code];
        if (id) {
          tacGiaIds.push(id);
        } else {
          errors.push(`Không tìm thấy tác giả mã "${code}"`);
        }
      });

      // Resolve thanh vien codes
      (rec.participants.thanhVienMaCodes || []).forEach((code) => {
        const id = codeToIdMap[code];
        if (id) {
          thanhVienIds.push(id);
        } else {
          errors.push(`Không tìm thấy thành viên mã "${code}"`);
        }
      });

      // External participants
      (rec.participants.ngoaiList || []).forEach((ext) => {
        if (ext.vaiTro === "tac_gia") {
          tacGiaNgoai.push({ ten: ext.ten, donVi: ext.donVi || null });
        } else {
          thanhVienNgoai.push({ ten: ext.ten, donVi: ext.donVi || null });
        }
      });

      // Calculate hours using formulaService
      const totalPeople = tacGiaIds.length + thanhVienIds.length + tacGiaNgoai.length + thanhVienNgoai.length;

      if (totalPeople > 0 && rec.chung.tongSoTiet > 0) {
        try {
          const participants = formulaService.buildParticipantsByMode(
            rec.mode || "standard",
            rec.chung.tongSoTiet,
            tacGiaIds,
            thanhVienIds,
            tacGiaNgoai,
            thanhVienNgoai,
            rec.namThucHien || 1
          );

          previewParticipants = participants.map((p) => ({
            nhanvienId: p.nhanvienId,
            maSoCanBo: p.nhanvienId
              ? Object.entries(codeToIdMap).find(([, id]) => id === p.nhanvienId)?.[0] || null
              : null,
            tenNhanVien: p.nhanvienId
              ? Object.entries(codeToIdMap)
                  .filter(([, id]) => id === p.nhanvienId)
                  .map(([code]) => codeToNameMap[code])[0] || ""
              : p.tenNgoai || "",
            vaiTro: p.vaiTro,
            tenNgoai: p.tenNgoai || null,
            donViNgoai: p.donViNgoai || null,
            soTiet: p.soTiet,
            namThucHien: p.namThucHien || rec.namThucHien || 1,
          }));
        } catch (calcErr) {
          errors.push(`Lỗi tính số tiết: ${calcErr.message}`);
        }
      } else if (totalPeople === 0) {
        warnings.push("Không có người tham gia");
      }
    }

    if (errors.length > 0 && status === "ok") {
      status = "error";
    }

    return {
      rowIndex: rec._rowIndex,
      status,
      errors,
      warnings,
      chung: rec.chung,
      participants: previewParticipants,
      mode: rec.mode,
      namThucHien: rec.namThucHien || 1,
    };
  });

  return {
    totalRows: previewRecords.length,
    errorCount: previewRecords.filter((r) => r.status === "error").length,
    duplicateCount: previewRecords.filter((r) => r.status === "duplicate").length,
    records: previewRecords,
  };
};

// ─── Save Logic ─────────────────────────────────────────────────────────────

/**
 * Save validated records to database within a single transaction.
 */
const saveToDatabase = async (records, userContext) => {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Không có dữ liệu để lưu.");
  }

  let connection;
  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    let savedCount = 0;

    for (const record of records) {
      // Skip error rows
      if (record.status === "error") continue;

      const chung = record.chung;

      const nckhId = await importRepo.insertChungExtended(connection, {
        tenCongTrinh: chung.tenCongTrinh,
        loaiNckh: chung.loaiNckh,
        phanLoai: chung.phanLoai || null,
        namHoc: chung.namHoc,
        tongSoTiet: chung.tongSoTiet || 0,
        khoaDuyet: 0,
        vienNcDuyet: 0,
        ngayNghiemThu: chung.ngayNghiemThu || null,
        xepLoai: chung.xepLoai || null,
        maSo: chung.maSo || null,
        soQuyetDinh: chung.soQuyetDinh || null,
        capNhiemVu: chung.capNhiemVu || null,
        kinhPhi: chung.kinhPhi || null,
        tenTapChi: chung.tenTapChi || null,
        soBao: chung.soBao || null,
        soTrichDan: chung.soTrichDan ?? null,
        coQuanChuTri: chung.coQuanChuTri || null,
        coQuanChuQuan: chung.coQuanChuQuan || null,
        thuocNhiemVu: chung.thuocNhiemVu || null,
        linhVucNghienCuu: chung.linhVucNghienCuu || null,
        kinhPhiNamNhat: chung.kinhPhiNamNhat || null,
        kinhPhiNamHai: chung.kinhPhiNamHai || null,
        kinhPhiNamBa: chung.kinhPhiNamBa || null,
        nguonKinhPhi: chung.nguonKinhPhi || null,
        ngayQuyetDinh: chung.ngayQuyetDinh || null,
      });

      // Insert participants into nckh_so_tiet
      const participants = (record.participants || [])
        .filter((p) => p.nhanvienId || p.tenNgoai)
        .map((p) => ({
          nhanvienId: p.nhanvienId || null,
          tenNgoai: p.tenNgoai || null,
          donViNgoai: p.donViNgoai || null,
          vaiTro: p.vaiTro || "thanh_vien",
          soTiet: p.soTiet || 0,
          namThucHien: p.namThucHien || 1,
        }));

      if (participants.length > 0) {
        await nckhSoTietRepo.bulkInsert(connection, nckhId, participants);
      }

      savedCount += 1;
    }

    await connection.commit();

    // Log
    try {
      await LogService.logChange(
        userContext.userId,
        userContext.userName,
        "NCKH V3",
        `Import ${savedCount} công trình NCKH từ file Excel`
      );
    } catch (logErr) {
      console.error("[NCKH V3 Import] Log failed:", logErr.message);
    }

    return { savedCount };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  buildPreview,
  saveToDatabase,
};
```

## File: src/services/nckh_v3/quyDinh.service.js
```javascript
const createPoolConnection = require("../../config/databasePool");

const TABLE_CANDIDATES = [
  "admin_quydinhsogio",
  "nckh_quydinhsogio",
  "nckh_quy_dinh_so_tiet",
  "nckh_quydinh_so_tiet",
];

const COLUMN_CANDIDATES = {
  id: ["ID", "id"],
  loaiNckh: ["LoaiNCKH", "loai_nckh"],
  phanLoai: ["PhanLoai", "phan_loai", "ten_quydinh"],
  soGio: ["SoGio", "so_gio", "so_tiet"],
  moTa: ["MoTa", "mo_ta"],
  isActive: ["IsActive", "is_active", "trang_thai"],
  thuTu: ["ThuTu", "thu_tu"],
};

const findColumn = (columns, candidates) => {
  const byLower = new Map(columns.map((name) => [String(name).toLowerCase(), name]));

  for (const candidate of candidates) {
    const found = byLower.get(String(candidate).toLowerCase());
    if (found) return found;
  }

  return null;
};

const resolveSchema = async (connection) => {
  for (const table of TABLE_CANDIDATES) {
    try {
      const [rows] = await connection.query(`SHOW COLUMNS FROM ${table}`);
      const columns = rows.map((item) => item.Field);

      const schema = {
        table,
        id: findColumn(columns, COLUMN_CANDIDATES.id),
        loaiNckh: findColumn(columns, COLUMN_CANDIDATES.loaiNckh),
        phanLoai: findColumn(columns, COLUMN_CANDIDATES.phanLoai),
        soGio: findColumn(columns, COLUMN_CANDIDATES.soGio),
        moTa: findColumn(columns, COLUMN_CANDIDATES.moTa),
        isActive: findColumn(columns, COLUMN_CANDIDATES.isActive),
        thuTu: findColumn(columns, COLUMN_CANDIDATES.thuTu),
      };

      if (!schema.id || !schema.loaiNckh || !schema.phanLoai || !schema.soGio) {
        continue;
      }

      return schema;
    } catch (_error) {
      // Try next candidate table.
    }
  }

  throw new Error(
    "Không tìm thấy bảng quy định số giờ NCKH V3 tương thích (admin_quydinhsogio / nckh_quydinhsogio / nckh_quy_dinh_so_tiet)."
  );
};

const normalizeRow = (row, schema) => ({
  ID: Number(row[schema.id]),
  LoaiNCKH: row[schema.loaiNckh],
  PhanLoai: row[schema.phanLoai],
  SoGio: Number(row[schema.soGio] || 0),
  MoTa: schema.moTa ? row[schema.moTa] || "" : "",
  IsActive: schema.isActive ? Number(row[schema.isActive] || 0) : 1,
  ThuTu: schema.thuTu ? Number(row[schema.thuTu] || 0) : 0,
});

const getAllQuyDinhSoGio = async () => {
  let connection;
  try {
    connection = await createPoolConnection();
    const schema = await resolveSchema(connection);

    const query = `
      SELECT *
      FROM ${schema.table}
      ORDER BY ${schema.loaiNckh} ASC, ${schema.thuTu ? schema.thuTu + " ASC," : ""} ${schema.soGio} DESC, ${schema.phanLoai} ASC
    `;

    const [rows] = await connection.query(query);
    return rows.map((row) => normalizeRow(row, schema));
  } finally {
    if (connection) connection.release();
  }
};

const getQuyDinhSoGioByLoai = async (loaiNCKH) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const schema = await resolveSchema(connection);

    const whereActive = schema.isActive ? ` AND COALESCE(${schema.isActive}, 1) = 1` : "";

    const query = `
      SELECT *
      FROM ${schema.table}
      WHERE ${schema.loaiNckh} = ?${whereActive}
      ORDER BY ${schema.thuTu ? schema.thuTu + " ASC," : ""} ${schema.soGio} DESC, ${schema.phanLoai} ASC
    `;

    const [rows] = await connection.execute(query, [loaiNCKH]);

    return rows.map((row) => {
      const normalized = normalizeRow(row, schema);
      return {
        ID: normalized.ID,
        PhanLoai: normalized.PhanLoai,
        SoGio: normalized.SoGio,
      };
    });
  } finally {
    if (connection) connection.release();
  }
};

const manageQuyDinhSoGio = async ({ id, loaiNCKH, phanLoai, soGio, moTa, thuTu }) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const schema = await resolveSchema(connection);

    if (id) {
      const setParts = [
        `${schema.loaiNckh} = ?`,
        `${schema.phanLoai} = ?`,
        `${schema.soGio} = ?`,
      ];
      const params = [loaiNCKH, phanLoai, Number(soGio)];

      if (schema.moTa) {
        setParts.push(`${schema.moTa} = ?`);
        params.push(moTa || null);
      }

      if (schema.thuTu && Number.isFinite(Number(thuTu))) {
        setParts.push(`${schema.thuTu} = ?`);
        params.push(Number(thuTu));
      }

      const query = `UPDATE ${schema.table} SET ${setParts.join(", ")} WHERE ${schema.id} = ?`;
      params.push(Number(id));

      await connection.execute(query, params);
      return { id: Number(id) };
    }

    const columns = [schema.loaiNckh, schema.phanLoai, schema.soGio];
    const placeholders = ["?", "?", "?"];
    const params = [loaiNCKH, phanLoai, Number(soGio)];

    if (schema.moTa) {
      columns.push(schema.moTa);
      placeholders.push("?");
      params.push(moTa || null);
    }

    if (schema.thuTu) {
      columns.push(schema.thuTu);
      placeholders.push("?");
      params.push(Number.isFinite(Number(thuTu)) ? Number(thuTu) : 0);
    }

    if (schema.isActive) {
      columns.push(schema.isActive);
      placeholders.push("?");
      params.push(1);
    }

    const query = `
      INSERT INTO ${schema.table} (${columns.join(", ")})
      VALUES (${placeholders.join(", ")})
    `;

    const [result] = await connection.execute(query, params);
    return { id: Number(result.insertId) };
  } finally {
    if (connection) connection.release();
  }
};

const toggleQuyDinhStatus = async (id, isActive) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const schema = await resolveSchema(connection);

    if (!schema.isActive) {
      throw new Error("Schema hiện tại không có cột trạng thái IsActive/is_active.");
    }

    const query = `UPDATE ${schema.table} SET ${schema.isActive} = ? WHERE ${schema.id} = ?`;
    await connection.execute(query, [Number(isActive), Number(id)]);

    return { success: true };
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getAllQuyDinhSoGio,
  getQuyDinhSoGioByLoai,
  manageQuyDinhSoGio,
  toggleQuyDinhStatus,
};
```

## File: src/services/nckh_v3/stats.service.js
```javascript
const createPoolConnection = require("../../config/databasePool");
const phongBanRepo = require("../../repositories/nckh_v3/phongBan.repo");
const statsRepo = require("../../repositories/nckh_v3/stats.repo");
const mapper = require("../../mappers/nckh_v3/stats.mapper");
const { getTypeByValue } = require("../../config/nckh_v3/types");

const ensureNamHoc = (namHoc) => {
  const value = String(namHoc || "").trim();
  if (!value) {
    throw new Error("Thiếu năm học");
  }
  return value;
};

const normalizeKhoaId = (khoaId) => {
  const value = String(khoaId || "ALL").trim() || "ALL";
  return value;
};

const getFilters = async () => {
  let connection;
  try {
    connection = await createPoolConnection();
    const khoaList = await phongBanRepo.listKhoa(connection);
    return { khoaList };
  } finally {
    if (connection) connection.release();
  }
};

const getLecturerSummary = async (namHoc, khoaId, keyword) => {
  const safeNamHoc = ensureNamHoc(namHoc);
  const safeKhoaId = normalizeKhoaId(khoaId);
  const safeKeyword = String(keyword || "").trim();

  let connection;
  try {
    connection = await createPoolConnection();
    const rows = await statsRepo.listLecturerSummary(connection, {
      namHoc: safeNamHoc,
      khoaId: safeKhoaId,
      keyword: safeKeyword,
    });
    return rows.map(mapper.mapLecturerSummaryRow);
  } finally {
    if (connection) connection.release();
  }
};

const getLecturerRecords = async (lecturerId, namHoc) => {
  const safeNamHoc = ensureNamHoc(namHoc);
  const safeLecturerId = Number(lecturerId);

  if (!Number.isFinite(safeLecturerId) || safeLecturerId <= 0) {
    throw new Error("lecturerId không hợp lệ");
  }

  let connection;
  try {
    connection = await createPoolConnection();
    const rows = await statsRepo.listLecturerRecords(connection, {
      lecturerId: safeLecturerId,
      namHoc: safeNamHoc,
    });
    return rows.map(mapper.mapLecturerRecordRow);
  } finally {
    if (connection) connection.release();
  }
};

const getFacultySummary = async (namHoc) => {
  const safeNamHoc = ensureNamHoc(namHoc);

  let connection;
  try {
    connection = await createPoolConnection();
    const rows = await statsRepo.listFacultySummary(connection, { namHoc: safeNamHoc });
    return rows.map(mapper.mapFacultySummaryRow);
  } finally {
    if (connection) connection.release();
  }
};

const getFacultyRecords = async (namHoc, khoaId) => {
  const safeNamHoc = ensureNamHoc(namHoc);
  const safeKhoaId = String(khoaId || "").trim();

  if (!safeKhoaId) {
    throw new Error("Thiếu khoaId");
  }

  let connection;
  try {
    connection = await createPoolConnection();
    const rows = await statsRepo.listFacultyRecords(connection, {
      namHoc: safeNamHoc,
      khoaId: safeKhoaId,
    });
    return rows.map(mapper.mapCommonRecordRow);
  } finally {
    if (connection) connection.release();
  }
};

const getInstituteSummary = async (namHoc) => {
  const safeNamHoc = ensureNamHoc(namHoc);

  let connection;
  try {
    connection = await createPoolConnection();

    const [overviewRow, lecturerRow, typeRows, facultyRows] = await Promise.all([
      statsRepo.getInstituteOverview(connection, { namHoc: safeNamHoc }),
      statsRepo.countInstituteLecturers(connection, { namHoc: safeNamHoc }),
      statsRepo.listInstituteByType(connection, { namHoc: safeNamHoc }),
      statsRepo.listFacultySummary(connection, { namHoc: safeNamHoc }),
    ]);

    return {
      overview: mapper.mapInstituteOverview(overviewRow, lecturerRow),
      byType: typeRows.map(mapper.mapInstituteTypeRow),
      byFaculty: facultyRows.map(mapper.mapFacultySummaryRow),
    };
  } finally {
    if (connection) connection.release();
  }
};

const getInstituteRecords = async (namHoc, khoaId, typeSlug) => {
  const safeNamHoc = ensureNamHoc(namHoc);
  const safeKhoaId = normalizeKhoaId(khoaId);

  let loaiNckh = "ALL";
  const safeTypeSlug = String(typeSlug || "ALL").trim();
  if (safeTypeSlug && safeTypeSlug !== "ALL") {
    const meta = getTypeByValue(safeTypeSlug);
    if (!meta) {
      throw new Error("type không hợp lệ");
    }
    loaiNckh = meta.loaiNckh;
  }

  let connection;
  try {
    connection = await createPoolConnection();
    const rows = await statsRepo.listInstituteRecords(connection, {
      namHoc: safeNamHoc,
      khoaId: safeKhoaId,
      loaiNckh,
    });
    return rows.map(mapper.mapCommonRecordRow);
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getFilters,
  getLecturerSummary,
  getLecturerRecords,
  getFacultySummary,
  getFacultyRecords,
  getInstituteSummary,
  getInstituteRecords,
};
```

## File: src/config/nckh_v3/types.js
```javascript
const NCKH_TYPE_OPTIONS = [
  {
    value: "de-tai-du-an",
    label: "Đề tài, dự án",
    loaiNckh: "DETAI_DUAN",
    implemented: true,
    mode: "standard",
    mainActorLabel: "Chủ nhiệm",
    hasSecondaryMembers: true,
    phanLoaiPlaceholder: "-- Chọn cấp đề tài --",
    showSoNamThucHien: true,
    showMaSo: true,
    showKetQua: false,
    showNgayNghiemThu: false,
    showNgayQuyetDinh: false,
  },
  {
    value: "bai-bao-khoa-hoc",
    label: "Bài báo khoa học",
    loaiNckh: "BAIBAO",
    implemented: true,
    mode: "standard",
    mainActorLabel: "Tác giả chính",
    hasSecondaryMembers: true,
    phanLoaiPlaceholder: "-- Chọn loại tạp chí --",
    showSoNamThucHien: true,
    showMaSo: true,
    maSoLabel: "Chỉ số tạp chí/Mã số",
    showKetQua: false,
    showNgayNghiemThu: true,
    showNgayQuyetDinh: false,
  },
  {
    value: "sang-kien",
    label: "Sáng kiến",
    loaiNckh: "SANGKIEN",
    implemented: true,
    mode: "standard",
    mainActorLabel: "Tác giả",
    hasSecondaryMembers: true,
    phanLoaiPlaceholder: "-- Chọn loại sáng kiến --",
    showSoNamThucHien: true,
    showMaSo: false,
    showKetQua: true,
    showNgayNghiemThu: true,
    showNgayQuyetDinh: false,
  },
  {
    value: "giai-thuong",
    label: "Giải thưởng và sáng chế",
    loaiNckh: "GIAITHUONG",
    implemented: true,
    mode: "standard",
    mainActorLabel: "Tác giả",
    hasSecondaryMembers: true,
    phanLoaiPlaceholder: "-- Chọn loại giải thưởng/sáng chế --",
    showSoNamThucHien: true,
    showMaSo: true,
    maSoLabel: "Mã số",
    showKetQua: true,
    showNgayNghiemThu: true,
    showNgayQuyetDinh: true,
  },
  {
    value: "de-xuat-nghien-cuu",
    label: "Đề xuất nghiên cứu",
    loaiNckh: "DEXUAT",
    implemented: true,
    mode: "equal",
    mainActorLabel: "Người đề xuất chính",
    hasSecondaryMembers: true,
    phanLoaiPlaceholder: "-- Chọn cấp đề xuất --",
    showSoNamThucHien: false,
    showMaSo: false,
    showKetQua: true,
    showNgayNghiemThu: true,
    showNgayQuyetDinh: false,
  },
  {
    value: "sach-giao-trinh",
    label: "Sách, giáo trình",
    loaiNckh: "SACHGIAOTRINH",
    implemented: true,
    mode: "standard",
    mainActorLabel: "Tác giả/Chủ biên",
    hasSecondaryMembers: true,
    secondaryMemberLabel: "Đồng chủ biên/Thành viên",
    phanLoaiPlaceholder: "-- Chọn loại sách/giáo trình --",
    showSoNamThucHien: true,
    showMaSo: true,
    maSoLabel: "Số xuất bản/Mã số",
    showKetQua: true,
    showNgayNghiemThu: true,
    showNgayQuyetDinh: false,
  },
  {
    value: "huong-dan-sv-nckh",
    label: "Hướng dẫn SV NCKH",
    loaiNckh: "HUONGDAN",
    implemented: true,
    mode: "equal",
    mainActorLabel: "Cán bộ hướng dẫn tham gia",
    hasSecondaryMembers: false,
    phanLoaiPlaceholder: "-- Chọn loại hướng dẫn --",
    showSoNamThucHien: false,
    showMaSo: true,
    showKetQua: true,
    showNgayNghiemThu: true,
    showNgayQuyetDinh: false,
  },
  {
    value: "thanh-vien-hoi-dong",
    label: "Thành viên hội đồng khoa học",
    loaiNckh: "HOIDONG",
    implemented: true,
    mode: "fixed",
    mainActorLabel: "Thành viên hội đồng",
    hasSecondaryMembers: false,
    phanLoaiPlaceholder: "-- Chọn loại hội đồng --",
    showSoNamThucHien: false,
    showMaSo: true,
    maSoLabel: "Số quyết định",
    showKetQua: false,
    showNgayNghiemThu: false,
    showNgayQuyetDinh: false,
  },
];

const DEFAULT_NCKH_TYPE = "de-tai-du-an";

const TYPE_ALIASES = {
  "giai-thuong-sang-che": "giai-thuong",
  "hoi-dong-khoa-hoc": "thanh-vien-hoi-dong",
};

const getTypeByValue = (value) =>
  NCKH_TYPE_OPTIONS.find((item) => item.value === value) || null;

const resolveSelectedType = (requestedType) => {
  const normalized = TYPE_ALIASES[requestedType] || requestedType;
  return getTypeByValue(normalized) ? normalized : DEFAULT_NCKH_TYPE;
};

module.exports = {
  NCKH_TYPE_OPTIONS,
  DEFAULT_NCKH_TYPE,
  TYPE_ALIASES,
  getTypeByValue,
  resolveSelectedType,
};
```

## File: src/controllers/nckh_v3/record.controller.js
```javascript
const recordService = require("../../services/nckh_v3/record.service");

const list = async (req, res) => {
  try {
    const { namHoc, khoaId = "ALL" } = req.query;
    const data = await recordService.list(namHoc, khoaId);
    res.json({ success: true, data });
  } catch (error) {
    console.error("[NCKH V3] list unified error:", error);
    res.status(400).json({ success: false, message: error.message || "Không thể lấy danh sách" });
  }
};

const detail = async (req, res) => {
  try {
    const data = await recordService.detail(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Không tìm thấy công trình" });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error("[NCKH V3] detail unified error:", error);
    res.status(500).json({ success: false, message: error.message || "Không thể lấy chi tiết" });
  }
};

const remove = async (req, res) => {
  try {
    const userContext = {
      userId: req.session?.userId || 1,
      userName: req.session?.TenNhanVien || req.session?.username || "ADMIN",
    };
    const result = await recordService.removeRecord(req.params.id, userContext);
    res.json({ success: true, message: "Xóa công trình thành công", data: result });
  } catch (error) {
    console.error("[NCKH V3] remove unified error:", error);
    res.status(400).json({ success: false, message: error.message || "Không thể xóa công trình" });
  }
};

const approveKhoa = async (req, res) => {
  try {
    const data = await recordService.updateKhoaApproval(req.params.id, req.body.khoaDuyet);
    res.json({ success: true, message: "Cập nhật duyệt khoa thành công", data });
  } catch (error) {
    console.error("[NCKH V3] approveKhoa unified error:", error);
    res.status(400).json({ success: false, message: error.message || "Không thể cập nhật duyệt khoa" });
  }
};

const approveVien = async (req, res) => {
  try {
    const data = await recordService.updateVienApproval(req.params.id, req.body.vienNcDuyet);
    res.json({ success: true, message: "Cập nhật duyệt viện thành công", data });
  } catch (error) {
    console.error("[NCKH V3] approveVien unified error:", error);
    res.status(400).json({ success: false, message: error.message || "Không thể cập nhật duyệt viện" });
  }
};

const getFilters = async (_req, res) => {
  try {
    const data = await recordService.getFilters();
    res.json({ success: true, data });
  } catch (error) {
    console.error("[NCKH V3] getFilters unified error:", error);
    res.status(500).json({ success: false, message: error.message || "Không thể lấy bộ lọc" });
  }
};

const bulkApprovals = async (req, res) => {
  try {
    const { updates } = req.body;
    const result = await recordService.updateBulkApprovals(updates);
    res.json({ success: true, message: result.message, data: result });
  } catch (error) {
    console.error("[NCKH V3] bulkApprovals error:", error);
    res.status(400).json({ success: false, message: error.message || "Không thể cập nhật duyệt" });
  }
};

module.exports = {
  list,
  detail,
  remove,
  approveKhoa,
  approveVien,
  bulkApprovals,
  getFilters,
};
```

## File: src/mappers/nckh_v3/response.mapper.js
```javascript
const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const mapDetailResponse = (mainRow, participantRows) => ({
  id: mainRow.id,
  tenCongTrinh: mainRow.ten_cong_trinh,
  loaiNckh: mainRow.loai_nckh,
  phanLoai: mainRow.phan_loai,
  namHoc: mainRow.nam_hoc,
  tongSoTiet: round2(Number(mainRow.tong_so_tiet || 0)),
  khoaDuyet: Number(mainRow.khoa_duyet || 0),
  vienNcDuyet: Number(mainRow.vien_nc_duyet || 0),
  ngayNghiemThu: mainRow.ngay_nghiem_thu,
  xepLoai: mainRow.xep_loai,
  maSo: mainRow.ma_so,
  createdAt: mainRow.created_at,
  participants: participantRows.map((row) => ({
    id: row.id,
    nhanvienId: row.nhanvien_id,
    tenNhanVien: row.TenNhanVien || row.ten_ngoai,
    tenNgoai: row.ten_ngoai || null,
    donViNgoai: row.don_vi_ngoai || null,
    maPhongBan: row.MaPhongBan,
    vaiTro: row.vai_tro,
    soTiet: round2(Number(row.so_tiet || 0)),
    namThucHien: Number(row.nam_thuc_hien || 1),
  })),
});

const mapListResponse = (rows) => rows.map((row) => ({
  id: row.id,
  tenCongTrinh: row.ten_cong_trinh,
  loaiNckh: row.loai_nckh,
  phanLoai: row.phan_loai,
  namHoc: row.nam_hoc,
  tongSoTiet: round2(Number(row.tong_so_tiet || 0)),
  khoaDuyet: Number(row.khoa_duyet || 0),
  vienNcDuyet: Number(row.vien_nc_duyet || 0),
  ngayNghiemThu: row.ngay_nghiem_thu,
  xepLoai: row.xep_loai,
  maSo: row.ma_so,
  createdAt: row.created_at,
}));

module.exports = {
  mapDetailResponse,
  mapListResponse,
};
```

## File: src/public/js/nckh_v3/stats/faculty.js
```javascript
(function () {
  const state = { faculties: [], records: [], selectedKhoaId: null };
  const el = { namHocFilter: null, khoaFilter: null, loadDataBtn: null, exportExcelBtn: null, facultyTableBody: null, recordDetailTableBody: null, recordDetailModalLabel: null };
  let recordDetailModal = null, barChartInstance = null, pieChartInstance = null;

  const COLORS = ['#4f46e5','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16','#0ea5e9','#d946ef','#22c55e','#e11d48'];

  const api = {
    async getSummary(namHoc, khoaId = "ALL") {
      const r = await fetch(`/v3/nckh/stats/khoa?${new URLSearchParams({ namHoc, khoaId })}`);
      return r.json();
    },
    async getRecords(namHoc, khoaId) {
      const r = await fetch(`/v3/nckh/stats/khoa/${encodeURIComponent(khoaId)}/cong-trinh?${new URLSearchParams({ namHoc })}`);
      return r.json();
    },
  };

  function cacheElements() {
    el.namHocFilter = document.getElementById("namHocFilter");
    el.khoaFilter = document.getElementById("khoaFilter");
    el.loadDataBtn = document.getElementById("loadDataBtn");
    el.exportExcelBtn = document.getElementById("exportExcelBtn");
    el.facultyTableBody = document.getElementById("facultyTableBody");
    el.recordDetailTableBody = document.getElementById("recordDetailTableBody");
    el.recordDetailModalLabel = document.getElementById("recordDetailModalLabel");
    const m = document.getElementById("recordDetailModal");
    if (m) recordDetailModal = bootstrap.Modal.getOrCreateInstance(m);
  }

  function renderCharts() {
    const sec = document.getElementById("chartSection");
    if (!state.faculties.length || !sec) { if (sec) sec.style.display = "none"; return; }
    sec.style.display = "";

    const labels = state.faculties.map(r => r.maPhongBan || r.tenPhongBan || "N/A");
    const dCount = state.faculties.map(r => r.soCongTrinh || 0);
    const dHours = state.faculties.map(r => Number(r.tongSoTiet) || 0);
    const ttOpts = { backgroundColor: "#1e293b", titleFont: { family: "Inter", weight: "bold" }, bodyFont: { family: "Inter" }, cornerRadius: 8, padding: 12 };

    const barCtx = document.getElementById("facultyBarChart");
    if (barCtx) {
      if (barChartInstance) barChartInstance.destroy();
      barChartInstance = new Chart(barCtx, {
        type: "bar",
        data: { labels, datasets: [
          { label: "Số công trình", data: dCount, backgroundColor: "rgba(79,70,229,0.75)", borderColor: "#4f46e5", borderWidth: 1, borderRadius: 4, yAxisID: "y" },
          { label: "Tổng số tiết", data: dHours, backgroundColor: "rgba(6,182,212,0.75)", borderColor: "#06b6d4", borderWidth: 1, borderRadius: 4, yAxisID: "y1" },
        ]},
        options: {
          responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
          plugins: { legend: { position: "top", labels: { usePointStyle: true, padding: 16, font: { family: "Inter", size: 12 } } }, tooltip: ttOpts },
          scales: {
            x: { grid: { display: false }, ticks: { font: { family: "Inter", size: 11 } } },
            y: { position: "left", beginAtZero: true, title: { display: true, text: "Số công trình", font: { family: "Inter", size: 12 } }, grid: { color: "rgba(0,0,0,0.04)" } },
            y1: { position: "right", beginAtZero: true, title: { display: true, text: "Số tiết", font: { family: "Inter", size: 12 } }, grid: { drawOnChartArea: false } },
          },
        },
      });
    }

    const pieCtx = document.getElementById("facultyPieChart");
    if (pieCtx) {
      if (pieChartInstance) pieChartInstance.destroy();
      pieChartInstance = new Chart(pieCtx, {
        type: "doughnut",
        data: { labels: state.faculties.map(r => r.tenPhongBan || r.maPhongBan || "N/A"), datasets: [{ data: dCount, backgroundColor: COLORS.slice(0, state.faculties.length), borderWidth: 2, borderColor: "#fff", hoverOffset: 6 }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: "55%",
          plugins: {
            legend: { position: "bottom", labels: { usePointStyle: true, padding: 10, font: { family: "Inter", size: 11 }, boxWidth: 10 } },
            tooltip: { ...ttOpts, callbacks: { label: ctx => { const t = ctx.dataset.data.reduce((a, b) => a + b, 0); return ` ${ctx.label}: ${ctx.parsed} (${t > 0 ? ((ctx.parsed / t) * 100).toFixed(1) : 0}%)`; } } },
          },
        },
      });
    }
  }

  function renderFacultySummary() {
    if (!el.facultyTableBody) return;
    if (!state.faculties.length) { el.facultyTableBody.innerHTML = '<tr><td colspan="6" class="text-muted py-4">Không có dữ liệu</td></tr>'; return; }
    const esc = window.NCKH_V3_STATS.helpers.escapeHtml, fmt = window.NCKH_V3_STATS.helpers.formatHours;
    el.facultyTableBody.innerHTML = state.faculties.map((row, i) => {
      const k = row.khoaId === null ? "UNASSIGNED" : String(row.khoaId);
      return `<tr class="${state.selectedKhoaId === k ? "table-warning" : ""}"><td>${i + 1}</td><td>${esc(row.maPhongBan || "-")}</td><td class="text-start">${esc(row.tenPhongBan || "Chưa gán khoa")}</td><td>${row.soCongTrinh}</td><td>${fmt(row.tongSoTiet)}</td><td><button class="btn btn-sm btn-outline-info" data-action="detail" data-khoa-id="${k}"><i class="bi bi-eye"></i></button></td></tr>`;
    }).join("");
  }

  function renderRecords() {
    if (!el.recordDetailTableBody) return;
    if (!state.records.length) { el.recordDetailTableBody.innerHTML = '<tr><td colspan="7" class="text-muted py-4">Không có dữ liệu chi tiết</td></tr>'; return; }
    const esc = window.NCKH_V3_STATS.helpers.escapeHtml, fmt = window.NCKH_V3_STATS.helpers.formatHours;
    el.recordDetailTableBody.innerHTML = state.records.map((row, i) => `<tr><td>${i + 1}</td><td>${esc(row.loaiNckhLabel)}</td><td class="text-start">${esc(row.tenCongTrinh)}</td><td class="text-start">${esc(row.tacGiaChinh)}</td><td class="text-start">${esc(row.thanhVien)}</td><td>${esc(row.tenPhongBan || row.maPhongBan || "")}</td><td>${fmt(row.tongSoTietCongTrinh)}</td></tr>`).join("");
  }

  async function loadSummary() {
    const namHoc = String(el.namHocFilter?.value || "").trim();
    if (!namHoc) { await Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning"); return; }
    const khoaId = el.khoaFilter?.value || "ALL";
    const result = await api.getSummary(namHoc, khoaId);
    if (!result.success) throw new Error(result.message || "Không thể lấy thống kê theo khoa");
    state.faculties = Array.isArray(result.data) ? result.data : [];
    state.records = []; state.selectedKhoaId = null;
    renderFacultySummary();
    renderCharts();
  }

  async function loadRecordsByFaculty(khoaId) {
    const namHoc = String(el.namHocFilter?.value || "").trim();
    const result = await api.getRecords(namHoc, khoaId);
    if (!result.success) throw new Error(result.message || "Không thể lấy danh sách công trình theo khoa");
    state.selectedKhoaId = String(khoaId);
    state.records = Array.isArray(result.data) ? result.data : [];
    renderFacultySummary(); renderRecords();
    const sel = state.faculties.find(item => { const k = item.khoaId === null ? "UNASSIGNED" : String(item.khoaId); return k === String(khoaId); });
    if (el.recordDetailModalLabel) el.recordDetailModalLabel.textContent = `Chi tiết công trình - ${sel?.tenPhongBan || "Khoa"}`;
    if (recordDetailModal) recordDetailModal.show();
  }

  async function initFilters() {
    const [yearRes, filterRes] = await Promise.all([window.NCKH_V3_STATS.api.getNamHoc(), window.NCKH_V3_STATS.api.getFilters()]);
    if (yearRes?.success) window.NCKH_V3_STATS.helpers.fillNamHocOptions(el.namHocFilter, yearRes.NamHoc || []);
    if (filterRes?.success) window.NCKH_V3_STATS.helpers.fillKhoaOptions(el.khoaFilter, filterRes.data?.khoaList || [], true);
  }

  function bindEvents() {
    el.loadDataBtn?.addEventListener("click", async () => { try { await loadSummary(); } catch (e) { await window.NCKH_V3_STATS.helpers.showError(e, "Không thể tải dữ liệu"); } });
    el.exportExcelBtn?.addEventListener("click", () => {
      const namHoc = el.namHocFilter?.value, khoaId = el.khoaFilter?.value || "ALL";
      if (!namHoc) return Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning");
      window.location.href = `/v3/nckh/export/stats/khoa?namHoc=${encodeURIComponent(namHoc)}&khoaId=${encodeURIComponent(khoaId)}`;
    });
    el.facultyTableBody?.addEventListener("click", async (event) => {
      const btn = event.target.closest("button[data-action='detail']"); if (!btn) return;
      const khoaId = btn.getAttribute("data-khoa-id"); if (!khoaId) return;
      try { await loadRecordsByFaculty(khoaId); } catch (e) { await window.NCKH_V3_STATS.helpers.showError(e, "Không thể tải công trình theo khoa"); }
    });
  }

  async function init() { cacheElements(); await initFilters(); bindEvents(); await loadSummary(); }
  window.addEventListener("DOMContentLoaded", () => { init().catch(async (e) => { await window.NCKH_V3_STATS.helpers.showError(e, "Không thể khởi tạo thống kê khoa"); }); });
})();
```

## File: src/public/js/nckh_v3/stats/institute.js
```javascript
(function () {
  const state = { summary: null };
  const el = { namHocFilter: null, loadDataBtn: null, kpiCongTrinh: null, kpiSoTiet: null, kpiGiangVien: null, typeTableBody: null, facultyTableBody: null, recordsModal: null, modalTableBody: null, modalTitle: null };
  let doughnutInstance = null, barInstance = null;

  const COLORS = ['#4f46e5','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16','#0ea5e9','#d946ef','#22c55e','#e11d48'];

  const api = {
    async getSummary(namHoc) { const r = await fetch(`/v3/nckh/stats/hoc-vien?${new URLSearchParams({ namHoc })}`); return r.json(); },
    async getRecords(namHoc, khoaId, type) { const r = await fetch(`/v3/nckh/stats/hoc-vien/cong-trinh?${new URLSearchParams({ namHoc, khoaId, type })}`); return r.json(); },
  };

  function cacheElements() {
    el.namHocFilter = document.getElementById("namHocFilter");
    el.loadDataBtn = document.getElementById("loadDataBtn");
    el.kpiCongTrinh = document.getElementById("kpiCongTrinh");
    el.kpiSoTiet = document.getElementById("kpiSoTiet");
    el.kpiGiangVien = document.getElementById("kpiGiangVien");
    el.typeTableBody = document.getElementById("typeTableBody");
    el.facultyTableBody = document.getElementById("facultyTableBody");
    el.recordsModal = document.getElementById("recordsModal");
    el.modalTableBody = document.getElementById("modalTableBody");
    el.modalTitle = document.getElementById("recordsModalLabel");
  }

  function renderKpi() {
    const o = state.summary?.overview || {};
    const fmt = window.NCKH_V3_STATS.helpers.formatHours;
    if (el.kpiCongTrinh) el.kpiCongTrinh.textContent = String(o.tongCongTrinh || 0);
    if (el.kpiSoTiet) el.kpiSoTiet.textContent = fmt(o.tongSoTiet || 0);
    if (el.kpiGiangVien) el.kpiGiangVien.textContent = String(o.tongGiangVienNoiBo || 0);
  }

  function renderCharts() {
    const sec = document.getElementById("chartSection");
    const byType = state.summary?.byType || [];
    const byFaculty = state.summary?.byFaculty || [];
    if ((!byType.length && !byFaculty.length) || !sec) { if (sec) sec.style.display = "none"; return; }
    sec.style.display = "";
    const ttOpts = { backgroundColor: "#1e293b", titleFont: { family: "Inter", weight: "bold" }, bodyFont: { family: "Inter" }, cornerRadius: 8, padding: 12 };

    // Doughnut - by type
    const dCtx = document.getElementById("typeDoughnutChart");
    if (dCtx && byType.length) {
      if (doughnutInstance) doughnutInstance.destroy();
      doughnutInstance = new Chart(dCtx, {
        type: "doughnut",
        data: { labels: byType.map(r => r.loaiNckhLabel || r.loaiNckh || "N/A"), datasets: [{ data: byType.map(r => r.soCongTrinh || 0), backgroundColor: COLORS.slice(0, byType.length), borderWidth: 2, borderColor: "#fff", hoverOffset: 6 }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: "55%",
          plugins: {
            legend: { position: "bottom", labels: { usePointStyle: true, padding: 10, font: { family: "Inter", size: 11 }, boxWidth: 10 } },
            tooltip: { ...ttOpts, callbacks: { label: ctx => { const t = ctx.dataset.data.reduce((a, b) => a + b, 0); return ` ${ctx.label}: ${ctx.parsed} (${t > 0 ? ((ctx.parsed / t) * 100).toFixed(1) : 0}%)`; } } },
          },
        },
      });
    }

    // Bar - by faculty
    const bCtx = document.getElementById("facultyBarChart");
    if (bCtx && byFaculty.length) {
      if (barInstance) barInstance.destroy();
      barInstance = new Chart(bCtx, {
        type: "bar",
        data: {
          labels: byFaculty.map(r => r.maPhongBan || r.tenPhongBan || "N/A"),
          datasets: [
            { label: "Số công trình", data: byFaculty.map(r => r.soCongTrinh || 0), backgroundColor: "rgba(79,70,229,0.75)", borderColor: "#4f46e5", borderWidth: 1, borderRadius: 4, yAxisID: "y" },
            { label: "Tổng số tiết", data: byFaculty.map(r => Number(r.tongSoTiet) || 0), backgroundColor: "rgba(6,182,212,0.75)", borderColor: "#06b6d4", borderWidth: 1, borderRadius: 4, yAxisID: "y1" },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
          plugins: { legend: { position: "top", labels: { usePointStyle: true, padding: 16, font: { family: "Inter", size: 12 } } }, tooltip: ttOpts },
          scales: {
            x: { grid: { display: false }, ticks: { font: { family: "Inter", size: 11 } } },
            y: { position: "left", beginAtZero: true, title: { display: true, text: "Số công trình", font: { family: "Inter", size: 12 } }, grid: { color: "rgba(0,0,0,0.04)" } },
            y1: { position: "right", beginAtZero: true, title: { display: true, text: "Số tiết", font: { family: "Inter", size: 12 } }, grid: { drawOnChartArea: false } },
          },
        },
      });
    }
  }

  function renderByType() {
    if (!el.typeTableBody) return;
    const rows = state.summary?.byType || [];
    const esc = window.NCKH_V3_STATS.helpers.escapeHtml, fmt = window.NCKH_V3_STATS.helpers.formatHours;
    if (!rows.length) { el.typeTableBody.innerHTML = '<tr><td colspan="5" class="text-muted py-4">Không có dữ liệu</td></tr>'; return; }
    el.typeTableBody.innerHTML = rows.map((row, i) => `<tr><td>${i + 1}</td><td class="text-start">${esc(row.loaiNckhLabel || row.loaiNckh || "")}</td><td>${row.soCongTrinh}</td><td>${fmt(row.tongSoTiet)}</td><td><button class="btn btn-sm btn-outline-info btn-view-type" data-type="${esc(row.typeSlug || row.loaiNckh)}" title="Xem chi tiết"><i class="bi bi-eye"></i></button></td></tr>`).join("");
  }

  function renderByFaculty() {
    if (!el.facultyTableBody) return;
    const rows = state.summary?.byFaculty || [];
    const esc = window.NCKH_V3_STATS.helpers.escapeHtml, fmt = window.NCKH_V3_STATS.helpers.formatHours;
    if (!rows.length) { el.facultyTableBody.innerHTML = '<tr><td colspan="6" class="text-muted py-4">Không có dữ liệu</td></tr>'; return; }
    el.facultyTableBody.innerHTML = rows.map((row, i) => `<tr><td>${i + 1}</td><td>${esc(row.maPhongBan || "-")}</td><td class="text-start">${esc(row.tenPhongBan || "Chưa gán khoa")}</td><td>${row.soCongTrinh}</td><td>${fmt(row.tongSoTiet)}</td><td><button class="btn btn-sm btn-outline-info btn-view-faculty" data-id="${row.khoaId || "UNASSIGNED"}" title="Xem chi tiết"><i class="bi bi-eye"></i></button></td></tr>`).join("");
  }

  async function showRecords(params) {
    const { namHoc, khoaId, type, title } = params;
    if (el.modalTitle) el.modalTitle.textContent = title || "Chi tiết công trình NCKH";
    if (el.modalTableBody) el.modalTableBody.innerHTML = '<tr><td colspan="9" class="text-center py-4">Đang tải dữ liệu...</td></tr>';
    const modal = new bootstrap.Modal(el.recordsModal); modal.show();
    try {
      const result = await api.getRecords(namHoc, khoaId, type);
      if (!result.success) throw new Error(result.message);
      renderModalRows(result.data || []);
    } catch (error) {
      if (el.modalTableBody) el.modalTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Lỗi: ${error.message}</td></tr>`;
    }
  }

  function renderModalRows(rows) {
    if (!el.modalTableBody) return;
    const esc = window.NCKH_V3_STATS.helpers.escapeHtml, fmt = window.NCKH_V3_STATS.helpers.formatHours;
    if (!rows.length) { el.modalTableBody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">Không có dữ liệu chi tiết</td></tr>'; return; }
    el.modalTableBody.innerHTML = rows.map((row, i) => {
      const lbl = row.loaiNckhLabel || row.loaiNckh || "N/A";
      return `<tr><td class="text-center">${i + 1}</td><td class="text-start">${esc(row.tenCongTrinh)}</td><td class="text-center"><span class="fw-bold">${esc(lbl)}</span></td><td class="text-start">${esc(row.phanLoai)}</td><td class="small">${esc(row.tacGiaChinh)}</td><td class="small">${esc(row.thanhVien || "-")}</td><td class="text-center fw-bold text-primary">${fmt(row.tongSoTietCongTrinh)}</td><td class="small text-center">${esc(row.maSo || "-")}</td><td class="small text-center">${row.ngayNghiemThu ? new Date(row.ngayNghiemThu).toLocaleDateString("vi-VN") : "-"}</td></tr>`;
    }).join("");
  }

  async function loadSummary() {
    const namHoc = String(el.namHocFilter?.value || "").trim();
    if (!namHoc) { await Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning"); return; }
    const result = await api.getSummary(namHoc);
    if (!result.success) throw new Error(result.message || "Không thể lấy thống kê học viện");
    state.summary = result.data || null;
    renderKpi(); renderByType(); renderByFaculty(); renderCharts();
  }

  async function initFilters() {
    const yr = await window.NCKH_V3_STATS.api.getNamHoc();
    if (yr?.success) window.NCKH_V3_STATS.helpers.fillNamHocOptions(el.namHocFilter, yr.NamHoc || []);
  }

  function bindEvents() {
    el.loadDataBtn?.addEventListener("click", async () => { try { await loadSummary(); } catch (e) { await window.NCKH_V3_STATS.helpers.showError(e, "Không thể tải dữ liệu học viện"); } });
    el.typeTableBody?.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-view-type"); if (!btn) return;
      const type = btn.dataset.type, lbl = btn.closest("tr").querySelector("td:nth-child(2)").textContent.trim(), namHoc = el.namHocFilter.value;
      showRecords({ namHoc, khoaId: "ALL", type, title: `Chi tiết: ${lbl} (${namHoc})` });
    });
    el.facultyTableBody?.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-view-faculty"); if (!btn) return;
      const khoaId = btn.dataset.id, name = btn.closest("tr").querySelector("td:nth-child(3)").textContent.trim(), namHoc = el.namHocFilter.value;
      showRecords({ namHoc, khoaId, type: "ALL", title: `Chi tiết: ${name} (${namHoc})` });
    });
    document.getElementById("exportExcelBtn")?.addEventListener("click", () => {
      const namHoc = el.namHocFilter?.value;
      if (!namHoc) return Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning");
      window.location.href = `/v3/nckh/export/stats/hoc-vien?namHoc=${encodeURIComponent(namHoc)}`;
    });
  }

  async function init() { cacheElements(); await initFilters(); bindEvents(); await loadSummary(); }
  window.addEventListener("DOMContentLoaded", () => { init().catch(async (e) => { await window.NCKH_V3_STATS.helpers.showError(e, "Không thể khởi tạo thống kê học viện"); }); });
})();
```

## File: src/repositories/nckh_v3/nckhChung.repo.js
```javascript
const TABLE = "nckh_chung";

const insert = async (connection, data) => {
  const query = `
    INSERT INTO ${TABLE} (
      ten_cong_trinh,
      loai_nckh,
      phan_loai,
      nam_hoc,
      tong_so_tiet,
      khoa_duyet,
      vien_nc_duyet,
      ngay_nghiem_thu,
      xep_loai,
      ma_so
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    data.tenCongTrinh,
    data.loaiNckh,
    data.phanLoai,
    data.namHoc,
    data.tongSoTiet,
    data.khoaDuyet,
    data.vienNcDuyet,
    data.ngayNghiemThu || null,
    data.xepLoai || null,
    data.maSo || null,
  ];

  const [result] = await connection.execute(query, params);
  return result.insertId;
};

const updateById = async (connection, id, data) => {
  const query = `
    UPDATE ${TABLE}
    SET ten_cong_trinh = ?,
        loai_nckh = ?,
        phan_loai = ?,
        nam_hoc = ?,
        tong_so_tiet = ?,
        ngay_nghiem_thu = ?,
        xep_loai = ?,
        ma_so = ?
    WHERE id = ?
  `;

  const params = [
    data.tenCongTrinh,
    data.loaiNckh,
    data.phanLoai,
    data.namHoc,
    data.tongSoTiet,
    data.ngayNghiemThu || null,
    data.xepLoai || null,
    data.maSo || null,
    id,
  ];

  const [result] = await connection.execute(query, params);
  return result.affectedRows;
};

const deleteById = async (connection, id) => {
  const [result] = await connection.execute(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
  return result.affectedRows;
};

const findById = async (connection, id) => {
  const query = `
    SELECT c.*
    FROM ${TABLE} c
    WHERE c.id = ?
    LIMIT 1
  `;
  const [rows] = await connection.execute(query, [id]);
  return rows[0] || null;
};

const listByType = async (connection, loaiNckh, namHoc, khoaId) => {
  let query = `
    SELECT c.*
    FROM ${TABLE} c
    WHERE c.loai_nckh = ? AND c.nam_hoc = ?
  `;
  const params = [loaiNckh, namHoc];

  if (khoaId !== "ALL") {
    // Lọc: có ít nhất 1 giảng viên thuộc khoa này tham gia
    query += ` AND EXISTS (
      SELECT 1 FROM nckh_so_tiet st_sub
      INNER JOIN nhanvien nv_sub ON nv_sub.id_User = st_sub.nhanvien_id
      WHERE st_sub.nckh_id = c.id AND nv_sub.phongban_id = ?
    )`;
    params.push(Number(khoaId));
  }

  query += " ORDER BY c.id DESC";

  const [rows] = await connection.execute(query, params);
  return rows;
};

const list = async (connection, namHoc, khoaId) =>
  listByType(connection, "DETAI_DUAN", namHoc, khoaId);

const listUnified = async (connection, namHoc, khoaId) => {
  let query = `
    SELECT
      c.id AS id,
      c.ten_cong_trinh,
      c.loai_nckh,
      c.phan_loai,
      c.nam_hoc,
      c.tong_so_tiet,
      c.khoa_duyet,
      c.vien_nc_duyet,
      c.created_at,
      c.ngay_nghiem_thu,
      c.xep_loai,
      c.ma_so
    FROM ${TABLE} c
    WHERE c.nam_hoc = ?
  `;
  const params = [namHoc];

  if (khoaId !== "ALL") {
    // Lọc: có ít nhất 1 giảng viên thuộc khoa này tham gia
    query += ` AND EXISTS (
      SELECT 1 FROM nckh_so_tiet st_sub
      INNER JOIN nhanvien nv_sub ON nv_sub.id_User = st_sub.nhanvien_id
      WHERE st_sub.nckh_id = c.id AND nv_sub.phongban_id = ?
    )`;
    params.push(Number(khoaId));
  }

  query += " ORDER BY c.id DESC";

  const [rows] = await connection.execute(query, params);
  return rows;
};

const setKhoaApproval = async (connection, id, khoaDuyet, vienNcDuyetWhenReset = null) => {
  if (vienNcDuyetWhenReset === null) {
    const [result] = await connection.execute(
      `UPDATE ${TABLE} SET khoa_duyet = ? WHERE id = ?`,
      [khoaDuyet, id]
    );
    return result.affectedRows;
  }

  const [result] = await connection.execute(
    `UPDATE ${TABLE} SET khoa_duyet = ?, vien_nc_duyet = ? WHERE id = ?`,
    [khoaDuyet, vienNcDuyetWhenReset, id]
  );
  return result.affectedRows;
};

const setVienApproval = async (connection, id, vienNcDuyet, khoaDuyetWhenReset = null) => {
  if (khoaDuyetWhenReset === null) {
    const [result] = await connection.execute(
      `UPDATE ${TABLE} SET vien_nc_duyet = ? WHERE id = ?`,
      [vienNcDuyet, id]
    );
    return result.affectedRows;
  }

  const [result] = await connection.execute(
    `UPDATE ${TABLE} SET vien_nc_duyet = ?, khoa_duyet = ? WHERE id = ?`,
    [vienNcDuyet, khoaDuyetWhenReset, id]
  );
  return result.affectedRows;
};

const bulkUpdateApprovals = async (connection, updates) => {
  let totalAffected = 0;

  for (const update of updates) {
    const { id, khoaDuyet, vienNcDuyet } = update;

    let query = `UPDATE ${TABLE} SET `;
    const params = [];
    const setParts = [];

    if (khoaDuyet !== undefined) {
      setParts.push("khoa_duyet = ?");
      params.push(khoaDuyet);
    }

    if (vienNcDuyet !== undefined) {
      setParts.push("vien_nc_duyet = ?");
      params.push(vienNcDuyet);
    }

    if (setParts.length === 0) {
      continue;
    }

    query += setParts.join(", ");
    query += " WHERE id = ?";
    params.push(id);

    const [result] = await connection.execute(query, params);
    totalAffected += result.affectedRows;
  }

  return totalAffected;
};

module.exports = {
  insert,
  updateById,
  deleteById,
  findById,
  list,
  listByType,
  listUnified,
  setKhoaApproval,
  setVienApproval,
  bulkUpdateApprovals,
};
```

## File: src/services/nckh_v3/export.service.js
```javascript
const ExcelJS = require("exceljs");
const createPoolConnection = require("../../config/databasePool");
const exportRepo = require("../../repositories/nckh_v3/export.repo");
const statsService = require("./stats.service");

class ExportService {
  /**
   * Export lecturer statistics to Excel.
   * Each lecturer will have their own sheet, grouped by research type.
   */
  async exportLecturerStats(namHoc, khoaId, keyword) {
    let connection;
    try {
      connection = await createPoolConnection();
      
      // 1. Get filtered list of lecturers
      const lecturers = await statsService.getLecturerSummary(namHoc, khoaId, keyword);
      if (!lecturers.length) {
        throw new Error("Không có dữ liệu để xuất");
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "NCKH V3 System";
      workbook.lastModifiedBy = "NCKH V3 System";
      workbook.created = new Date();

      // 2. Iterate through each lecturer and create a sheet
      for (const lecturer of lecturers) {
        // Sheet name limited to 31 chars and invalid chars replaced
        const safeName = (lecturer.tenNhanVien || "Lecturer")
          .replace(/[*?:\\/\[\]]/g, "")
          .substring(0, 31);
        
        const worksheet = workbook.addWorksheet(safeName);

        // Header info
        worksheet.mergeCells("A1:G1");
        const titleCell = worksheet.getCell("A1");
        titleCell.value = `THỐNG KÊ CHI TIẾT NGHIÊN CỨU KHOA HỌC - NĂM HỌC ${namHoc}`;
        titleCell.font = { size: 14, bold: true };
        titleCell.alignment = { horizontal: "center" };

        worksheet.mergeCells("A2:G2");
        const lecturerInfoCell = worksheet.getCell("A2");
        lecturerInfoCell.value = `Giảng viên: ${lecturer.tenNhanVien} - Khoa: ${lecturer.lecturerKhoaName || "N/A"}`;
        lecturerInfoCell.font = { size: 12, italic: true };
        lecturerInfoCell.alignment = { horizontal: "center" };

        worksheet.addRow([]); // Blank row

        // Get records for this lecturer
        const records = await statsService.getLecturerRecords(lecturer.lecturerId, namHoc);
        
        // Group records by type
        const groupedRecords = this._groupRecordsByType(records);

        let currentRow = 5;

        for (const [typeLabel, groupRows] of Object.entries(groupedRecords)) {
          // Group Title Row
          const groupTitleRow = worksheet.addRow([typeLabel]);
          groupTitleRow.font = { bold: true };
          worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
          currentRow++;

          // Table Header
          const headerRow = worksheet.addRow([
            "STT",
            "Tên công trình",
            "Vai trò",
            "Số tiết",
            "Tổng tiết CT",
            "Tác giả chính",
            "Thành viên"
          ]);
          headerRow.font = { bold: true };
          headerRow.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" }
            };
            cell.alignment = { horizontal: "center" };
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE0E0E0" }
            };
          });
          currentRow++;

          // Data Rows
          groupRows.forEach((rec, idx) => {
            const dataRow = worksheet.addRow([
              idx + 1,
              rec.tenCongTrinh,
              rec.vaiTroGiangVien,
              rec.soTietGiangVien,
              rec.tongSoTietCongTrinh,
              rec.tacGiaChinh,
              rec.thanhVien
            ]);
            dataRow.eachCell((cell, colNumber) => {
              cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
              };
              if ([1, 3, 4, 5].includes(colNumber)) {
                cell.alignment = { horizontal: "center", vertical: "middle" };
              } else {
                cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
              }
              if ([4, 5].includes(colNumber)) {
                cell.numFmt = "#,##0.00";
              }
            });
            currentRow++;
          });

          worksheet.addRow([]); // Blank row after group
          currentRow++;
        }

        // Auto-fit columns
        worksheet.columns = [
          { width: 5 },  // STT
          { width: 50 }, // Tên công trình
          { width: 15 }, // Vai trò
          { width: 10 }, // Số tiết
          { width: 15 }, // Tổng tiết CT
          { width: 30 }, // Tác giả chính
          { width: 30 }  // Thành viên
        ];
      }

      return workbook;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Export faculty statistics to Excel.
   * If khoaId is 'ALL', create a sheet for each department.
   */
  async exportFacultyStats(namHoc, khoaId) {
    let connection;
    try {
      connection = await createPoolConnection();
      const workbook = this._createWorkbook();

      const faculties = await this._getFacultiesToExport(connection, khoaId);
      if (!faculties.length) {
        throw new Error("Không tìm thấy đơn vị nào để xuất");
      }

      for (const faculty of faculties) {
        const records = await statsService.getFacultyRecords(namHoc, faculty.id || faculty.khoaId);
        if (faculties.length > 1 && (!records || records.length === 0)) continue;

        const sheetName = this._safeSheetName(faculty.TenPhongBan || faculty.tenPhongBan || "Khoa");
        const worksheet = workbook.addWorksheet(sheetName);

        this._renderHeader(worksheet, `THỐNG KÊ NCKH - KHOA/PHÒNG: ${faculty.TenPhongBan || faculty.tenPhongBan}`, namHoc);
        this._renderResearchTable(worksheet, records, 5);
      }

      if (workbook.worksheets.length === 0) {
        throw new Error("Không có dữ liệu công trình để xuất");
      }

      return workbook;
    } finally {
      if (connection) connection.release();
    }
  }

  /**
   * Export institute statistics to Excel.
   * Sheet 1: All records grouped by Type.
   * Following sheets: Each faculty's records.
   */
  async exportInstituteStats(namHoc) {
    let connection;
    try {
      connection = await createPoolConnection();
      const workbook = this._createWorkbook();

      // 1. Sheet 1: Toàn Học viện
      const instituteRecords = await statsService.getInstituteRecords(namHoc, "ALL", "ALL");
      const overviewSheet = workbook.addWorksheet("Toàn Học viện");
      this._renderHeader(overviewSheet, "THỐNG KÊ TOÀN HỌC VIỆN", namHoc);
      this._renderResearchTable(overviewSheet, instituteRecords, 5, { groupByType: true });

      // 2. Following sheets: Individual Faculties
      const faculties = await statsService.getFilters().then(f => f.khoaList);
      for (const faculty of faculties) {
        const records = await statsService.getFacultyRecords(namHoc, faculty.id);
        if (!records || records.length === 0) continue;

        const sheetName = this._safeSheetName(faculty.TenPhongBan);
        const worksheet = workbook.addWorksheet(sheetName);
        this._renderHeader(worksheet, `CHI TIẾT: ${faculty.TenPhongBan}`, namHoc);
        this._renderResearchTable(worksheet, records, 5);
      }

      return workbook;
    } finally {
      if (connection) connection.release();
    }
  }

  // --- Helpers ---

  _createWorkbook() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "NCKH V3 System";
    workbook.created = new Date();
    return workbook;
  }

  _safeSheetName(name) {
    return String(name || "Sheet")
      .replace(/[*?:\\/\[\]]/g, "")
      .substring(0, 31);
  }

  _renderHeader(worksheet, title, namHoc) {
    worksheet.mergeCells("A1:G1");
    const tCell = worksheet.getCell("A1");
    tCell.value = title;
    tCell.font = { size: 14, bold: true };
    tCell.alignment = { horizontal: "center" };

    worksheet.mergeCells("A2:G2");
    const sCell = worksheet.getCell("A2");
    sCell.value = `Năm học: ${namHoc}`;
    sCell.font = { size: 12, italic: true };
    sCell.alignment = { horizontal: "center" };
  }

  _renderResearchTable(worksheet, records, startRow, options = {}) {
    let currentRow = startRow;

    const renderBlock = (rows, title = null) => {
      if (title) {
        worksheet.mergeCells(`A${currentRow}:G${currentRow}`);
        const groupCell = worksheet.getCell(`A${currentRow}`);
        groupCell.value = title;
        groupCell.font = { bold: true };
        groupCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F0" } };
        currentRow++;
      }

      const headerRow = worksheet.addRow(["STT", "Loại NCKH", "Phân loại", "Tên công trình", "Tổng tiết", "Tác giả chính", "Thành viên"]);
      headerRow.font = { bold: true };
      headerRow.eachCell(cell => {
        cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
        cell.alignment = { horizontal: "center" };
      });
      currentRow++;

      rows.forEach((rec, idx) => {
        const dataRow = worksheet.addRow([
          idx + 1,
          rec.loaiNckhLabel,
          rec.phanLoai,
          rec.tenCongTrinh,
          rec.tongSoTietCongTrinh, // Sửa từ tongSoTiet thành tongSoTietCongTrinh
          rec.tacGiaChinh,
          rec.thanhVien
        ]);
        dataRow.eachCell((cell, colNumber) => {
          cell.border = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
          if (colNumber === 1 || colNumber === 5) {
            cell.alignment = { horizontal: "center" };
          } else {
            cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
          }

          if (colNumber === 5) {
            cell.numFmt = "#,##0.00";
          }
        });
        currentRow++;
      });
      worksheet.addRow([]); currentRow++;
    };

    if (options.groupByType) {
      const groups = this._groupRecordsByType(records);
      for (const [label, gRows] of Object.entries(groups)) {
        renderBlock(gRows, label);
      }
    } else {
      renderBlock(records);
    }

    worksheet.columns = [
      { width: 5 }, { width: 20 }, { width: 30 }, { width: 50 }, { width: 15 }, { width: 25 }, { width: 25 }
    ];
  }

  async _getFacultiesToExport(connection, khoaId) {
    const filters = await statsService.getFilters();
    const all = filters.khoaList || [];
    if (String(khoaId || "ALL") === "ALL") return all;
    return all.filter(f => String(f.id) === String(khoaId));
  }

  _groupRecordsByType(records) {
    const groups = {};
    (records || []).forEach((rec) => {
      const label = rec.loaiNckhLabel || "Khác";
      if (!groups[label]) groups[label] = [];
      groups[label].push(rec);
    });
    return groups;
  }
}

module.exports = new ExportService();
```

## File: src/validators/nckh_v3/typeInput.validator.js
```javascript
const assertRequired = (value, message) => {
  if (value === undefined || value === null || value === "") {
    throw new Error(message);
  }
};

const validateMainPayload = (data) => {
  assertRequired(data.tenCongTrinh, "Thiếu tên công trình");
  assertRequired(data.phanLoai, "Thiếu phân loại");
  assertRequired(data.namHoc, "Thiếu năm học");
  assertRequired(data.tongSoTiet, "Thiếu tổng số tiết");

  const tongSoTiet = Number(data.tongSoTiet);
  if (Number.isNaN(tongSoTiet) || tongSoTiet <= 0) {
    throw new Error("Tổng số tiết phải là số dương");
  }

  if (data.soNamThucHien !== undefined && data.soNamThucHien !== null && data.soNamThucHien !== "") {
    const soNamThucHien = Number(data.soNamThucHien);
    if (!Number.isInteger(soNamThucHien) || soNamThucHien <= 0) {
      throw new Error("Số năm thực hiện phải là số nguyên dương");
    }
  }
};

const validatePeopleInput = (tacGiaIds = [], thanhVienIds = [], tacGiaNgoai = [], thanhVienNgoai = []) => {
  const totalTacGia = (Array.isArray(tacGiaIds) ? tacGiaIds.length : 0)
    + (Array.isArray(tacGiaNgoai) ? tacGiaNgoai.length : 0);

  if (totalTacGia === 0) {
    throw new Error("Cần ít nhất một người vai trò chính");
  }

  if (!Array.isArray(thanhVienIds)) {
    throw new Error("Danh sách thành viên không hợp lệ");
  }

  const allIds = [
    ...(Array.isArray(tacGiaIds) ? tacGiaIds : []),
    ...(Array.isArray(thanhVienIds) ? thanhVienIds : []),
  ].map(Number);

  if (allIds.some((id) => Number.isNaN(id) || id <= 0)) {
    throw new Error("Danh sách giảng viên không hợp lệ");
  }

  if (Array.isArray(tacGiaNgoai)) {
    tacGiaNgoai.forEach((item, i) => {
      if (!item.ten || !String(item.ten).trim()) {
        throw new Error(`Người ngoài vai trò chính thứ ${i + 1} thiếu tên`);
      }
      if (!item.donVi || !String(item.donVi).trim()) {
        throw new Error(`Người ngoài vai trò chính thứ ${i + 1} thiếu đơn vị công tác`);
      }
    });
  }

  if (Array.isArray(thanhVienNgoai)) {
    thanhVienNgoai.forEach((item, i) => {
      if (!item.ten || !String(item.ten).trim()) {
        throw new Error(`Thành viên ngoài thứ ${i + 1} thiếu tên`);
      }
      if (!item.donVi || !String(item.donVi).trim()) {
        throw new Error(`Thành viên ngoài thứ ${i + 1} thiếu đơn vị công tác`);
      }
    });
  }
};

module.exports = {
  validateMainPayload,
  validatePeopleInput,
};
```

## File: src/views/nckh_v3/index.ejs
```ejs
<!DOCTYPE html>
<html lang="vi">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NCKH V3</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />
  <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css" />

  <link rel="stylesheet" href="/css/admin.css" />
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="stylesheet" href="/css/nckh_v3.css" />

  <style>
    .nckh-v3-multi-select {
      min-height: 140px;
    }

    .nckh-v3-type-toolbar {
      display: flex;
      align-items: flex-end;
      gap: 14px;
      flex-wrap: wrap;
    }

    .nckh-v3-type-toolbar .tb-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 300px;
    }

    .nckh-v3-type-toolbar .tb-group .form-label {
      margin-bottom: 0;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--nckh-text-muted);
    }
  </style>
</head>

<body>
  <%- include('../header') %>

  <div class="nckh-v3-container">
    <div class="page-header">
      <h1 class="page-title">Thêm thủ công NCKH</h1>
      <a href="/v3/nckh/import" class="btn-import-link">
        <i class="bi bi-file-earmark-spreadsheet"></i> Thêm bằng file
      </a>
    </div>

    <div class="nckh-tab-content active">
      <div class="form-section">
        <form id="nckhTypeForm" class="nckh-v3-type-toolbar" method="GET" action="<%= pagePath %>">
          <div class="tb-group">
            <label for="nckhTypeSelect" class="form-label">Loại NCKH</label>
            <select id="nckhTypeSelect" name="type" class="form-select">
              <% (nckhTypeOptions || []).forEach(function(item) { %>
                <option value="<%= item.value %>" <%= selectedType === item.value ? 'selected' : '' %>>
                  <%= item.label %>
                </option>
              <% }); %>
            </select>
          </div>
        </form>

        <div id="nckhTypeContent" class="nckh-v3-form-scroll" style="margin-top: 20px;">
          <% if (selectedTypeMeta && selectedTypeMeta.implemented) { %>
            <%- include('./typeInput', { pageMode: pageMode, selectedTypeMeta: selectedTypeMeta }) %>
          <% } else { %>
            <%- include('./notImplemented', { selectedTypeMeta: selectedTypeMeta }) %>
          <% } %>
        </div>
      </div>
    </div>
  </div>

  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  <script src="https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/vn.js"></script>

  <script>
    window.NCKH_V3_PAGE_MODE = "<%= pageMode %>";
    window.NCKH_V3_SELECTED_TYPE = "<%= selectedType %>";
    window.NCKH_V3_SELECTED_TYPE_META = <%- JSON.stringify(selectedTypeMeta || {}) %>;
  </script>

  <script src="/js/nckh_v3/main/permissions.js"></script>
  <script src="/js/nckh_v3/main/typeSwitcher.js"></script>

  <% if (selectedTypeMeta && selectedTypeMeta.implemented) { %>
    <script src="/js/nckh_v3/main/typeInputCommon.js"></script>

    <% if (selectedType === 'de-tai-du-an') { %>
      <script src="/js/nckh_v3/de_tai_du_an/index.js"></script>
    <% } else if (selectedType === 'bai-bao-khoa-hoc') { %>
      <script src="/js/nckh_v3/bai_bao_khoa_hoc/index.js"></script>
    <% } else if (selectedType === 'sang-kien') { %>
      <script src="/js/nckh_v3/sang_kien/index.js"></script>
    <% } else if (selectedType === 'giai-thuong') { %>
      <script src="/js/nckh_v3/giai_thuong/index.js"></script>
    <% } else if (selectedType === 'de-xuat-nghien-cuu') { %>
      <script src="/js/nckh_v3/de_xuat_nghien_cuu/index.js"></script>
    <% } else if (selectedType === 'sach-giao-trinh') { %>
      <script src="/js/nckh_v3/sach_giao_trinh/index.js"></script>
    <% } else if (selectedType === 'huong-dan-sv-nckh') { %>
      <script src="/js/nckh_v3/huong_dan_sv_nckh/index.js"></script>
    <% } else if (selectedType === 'thanh-vien-hoi-dong') { %>
      <script src="/js/nckh_v3/thanh_vien_hoi_dong/index.js"></script>
    <% } %>
  <% } %>
</body>

</html>
```

## File: src/views/nckh_v3/stats_faculty.ejs
```ejs
<!DOCTYPE html>
<html lang="vi">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NCKH V3 - Thống Kê Theo Khoa</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
  <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />

  <link rel="stylesheet" href="/css/admin.css" />
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="stylesheet" href="/css/nckh_v3.css" />
  <link rel="stylesheet" href="/css/nckh_v3_stats.css" />
</head>

<body>
  <%- include('../header') %>

  <div class="stats-wrap">
    <!-- Page Header -->
    <div class="stats-page-header">
      <h1 class="stats-page-title">
        <span class="title-icon"><i class="bi bi-building"></i></span>
        Thống kê NCKH theo khoa
      </h1>
      <nav class="stats-nav">
        <a href="/v3/nckh/thong-ke/khoa" class="nav-pill active">
          <i class="bi bi-building"></i> Theo khoa
        </a>
        <a href="/v3/nckh/thong-ke/giang-vien" class="nav-pill">
          <i class="bi bi-person"></i> Theo giảng viên
        </a>
        <a href="/v3/nckh/thong-ke/hoc-vien" class="nav-pill">
          <i class="bi bi-bank"></i> Theo học viện
        </a>
      </nav>
    </div>

    <!-- Toolbar -->
    <div class="stats-toolbar">
      <div class="tb-group">
        <label for="namHocFilter">Năm học</label>
        <select id="namHocFilter" class="form-select"></select>
      </div>
      <div class="tb-group">
        <label for="khoaFilter">Khoa / Phòng ban</label>
        <select id="khoaFilter" class="form-select">
          <option value="ALL">Tất cả khoa/phòng</option>
        </select>
      </div>
      <div class="tb-actions">
        <button id="loadDataBtn" class="btn btn-load">
          <i class="bi bi-search"></i> Hiển thị
        </button>
        <button id="exportExcelBtn" class="btn btn-export">
          <i class="bi bi-file-earmark-excel"></i> Xuất Excel
        </button>
      </div>
    </div>

    <!-- Charts -->
    <div class="row g-3 mb-4" id="chartSection" style="display: none;">
      <div class="col-lg-8">
        <div class="stats-chart-card">
          <div class="stats-chart-header">
            <h6 class="stats-chart-title"><i class="bi bi-bar-chart-fill me-2"></i>Số công trình & Tổng số tiết theo khoa</h6>
          </div>
          <div class="stats-chart-body">
            <canvas id="facultyBarChart"></canvas>
          </div>
        </div>
      </div>
      <div class="col-lg-4">
        <div class="stats-chart-card">
          <div class="stats-chart-header">
            <h6 class="stats-chart-title"><i class="bi bi-pie-chart-fill me-2"></i>Tỉ lệ công trình theo khoa</h6>
          </div>
          <div class="stats-chart-body">
            <canvas id="facultyPieChart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Table -->
    <div class="stats-table-card table-responsive">
      <table class="table table-hover text-center align-middle">
        <thead>
          <tr>
            <th style="width: 60px">STT</th>
            <th style="width: 130px">Mã phòng ban</th>
            <th class="text-start">Tên khoa</th>
            <th style="width: 140px">Số công trình</th>
            <th style="width: 140px">Tổng số tiết</th>
            <th style="width: 90px">Chi tiết</th>
          </tr>
        </thead>
        <tbody id="facultyTableBody"></tbody>
      </table>
    </div>
  </div>

  <!-- Modal Chi Tiết -->
  <div class="modal fade stats-modal" id="recordDetailModal" tabindex="-1" aria-labelledby="recordDetailModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="recordDetailModalLabel">
            <i class="bi bi-journal-text me-2"></i>Chi tiết công trình theo khoa
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="stats-table-card table-responsive">
            <table class="table table-hover text-center align-middle">
              <thead>
                <tr>
                  <th style="width: 50px">STT</th>
                  <th>Loại NCKH</th>
                  <th class="text-start">Tên công trình</th>
                  <th class="text-start">Tác giả chính</th>
                  <th class="text-start">Thành viên</th>
                  <th>Khoa công trình</th>
                  <th>Tổng số tiết</th>
                </tr>
              </thead>
              <tbody id="recordDetailTableBody"></tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
            <i class="bi bi-x-lg me-1"></i> Đóng
          </button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
  <script src="/js/nckh_v3/stats/common.js"></script>
  <script src="/js/nckh_v3/stats/faculty.js"></script>
</body>

</html>
```

## File: src/views/nckh_v3/stats_institute.ejs
```ejs
<!DOCTYPE html>
<html lang="vi">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NCKH V3 - Thống Kê Học Viện</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
  <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />

  <link rel="stylesheet" href="/css/admin.css" />
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="stylesheet" href="/css/nckh_v3.css" />
  <link rel="stylesheet" href="/css/nckh_v3_stats.css" />
</head>

<body>
  <%- include('../header') %>

  <div class="stats-wrap">
    <!-- Page Header -->
    <div class="stats-page-header">
      <h1 class="stats-page-title">
        <span class="title-icon"><i class="bi bi-bank"></i></span>
        Thống kê NCKH theo học viện
      </h1>
      <nav class="stats-nav">
        <a href="/v3/nckh/thong-ke/khoa" class="nav-pill">
          <i class="bi bi-building"></i> Theo khoa
        </a>
        <a href="/v3/nckh/thong-ke/giang-vien" class="nav-pill">
          <i class="bi bi-person"></i> Theo giảng viên
        </a>
        <a href="/v3/nckh/thong-ke/hoc-vien" class="nav-pill active">
          <i class="bi bi-bank"></i> Theo học viện
        </a>
      </nav>
    </div>

    <!-- Toolbar -->
    <div class="stats-toolbar">
      <div class="tb-group">
        <label for="namHocFilter">Năm học</label>
        <select id="namHocFilter" class="form-select"></select>
      </div>
      <div class="tb-actions">
        <button id="loadDataBtn" class="btn btn-load">
          <i class="bi bi-search"></i> Hiển thị
        </button>
        <button id="exportExcelBtn" class="btn btn-export">
          <i class="bi bi-file-earmark-excel"></i> Xuất Excel
        </button>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="stats-kpi-row">
      <div class="stats-kpi-card">
        <div class="kpi-icon"><i class="bi bi-journal-richtext"></i></div>
        <div class="kpi-label">Tổng công trình</div>
        <div class="kpi-value" id="kpiCongTrinh">0</div>
      </div>
      <div class="stats-kpi-card">
        <div class="kpi-icon"><i class="bi bi-clock-history"></i></div>
        <div class="kpi-label">Tổng số tiết</div>
        <div class="kpi-value" id="kpiSoTiet">0</div>
      </div>
      <div class="stats-kpi-card">
        <div class="kpi-icon"><i class="bi bi-people"></i></div>
        <div class="kpi-label">Giảng viên tham gia</div>
        <div class="kpi-value" id="kpiGiangVien">0</div>
      </div>
    </div>

    <!-- Charts -->
    <div class="row g-3 mb-4" id="chartSection" style="display: none;">
      <div class="col-lg-5">
        <div class="stats-chart-card">
          <div class="stats-chart-header">
            <h6 class="stats-chart-title"><i class="bi bi-pie-chart-fill me-2"></i>Phân bổ theo loại NCKH</h6>
          </div>
          <div class="stats-chart-body stats-chart-body--doughnut">
            <canvas id="typeDoughnutChart"></canvas>
          </div>
        </div>
      </div>
      <div class="col-lg-7">
        <div class="stats-chart-card">
          <div class="stats-chart-header">
            <h6 class="stats-chart-title"><i class="bi bi-bar-chart-fill me-2"></i>Số công trình theo khoa</h6>
          </div>
          <div class="stats-chart-body">
            <canvas id="facultyBarChart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Table: Theo Loại NCKH -->
    <h6 class="stats-section-title">Thống kê theo loại NCKH</h6>
    <div class="stats-table-card table-responsive">
      <table class="table table-hover text-center align-middle">
        <thead>
          <tr>
            <th style="width: 60px">STT</th>
            <th class="text-start">Loại NCKH</th>
            <th style="width: 140px">Số công trình</th>
            <th style="width: 140px">Tổng số tiết</th>
            <th style="width: 90px">Chi tiết</th>
          </tr>
        </thead>
        <tbody id="typeTableBody"></tbody>
      </table>
    </div>

    <!-- Table: Theo Khoa -->
    <h6 class="stats-section-title">Thống kê theo khoa</h6>
    <div class="stats-table-card table-responsive">
      <table class="table table-hover text-center align-middle">
        <thead>
          <tr>
            <th style="width: 60px">STT</th>
            <th style="width: 130px">Mã phòng ban</th>
            <th class="text-start">Tên khoa</th>
            <th style="width: 140px">Số công trình</th>
            <th style="width: 140px">Tổng số tiết</th>
            <th style="width: 90px">Chi tiết</th>
          </tr>
        </thead>
        <tbody id="facultyTableBody"></tbody>
      </table>
    </div>
  </div>

  <!-- Modal Chi Tiết -->
  <div class="modal fade stats-modal" id="recordsModal" tabindex="-1" aria-labelledby="recordsModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="recordsModalLabel">
            <i class="bi bi-journal-text me-2"></i>Chi tiết công trình NCKH
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="stats-table-card table-responsive">
            <table class="table table-hover align-middle">
              <thead class="text-center">
                <tr>
                  <th style="width: 50px">STT</th>
                  <th>Tên công trình</th>
                  <th style="width: 150px">Loại công trình</th>
                  <th style="width: 150px">Phân loại</th>
                  <th style="width: 150px">Tác giả chính</th>
                  <th style="width: 150px">Thành viên</th>
                  <th style="width: 100px">Số tiết</th>
                  <th style="width: 100px">Mã số</th>
                  <th style="width: 100px">Ngày NT</th>
                </tr>
              </thead>
              <tbody id="modalTableBody">
                <tr>
                  <td colspan="9" class="text-center py-4">
                    <div class="stats-empty">
                      <div class="empty-icon"><i class="bi bi-hourglass-split"></i></div>
                      <div class="empty-text">Đang tải dữ liệu...</div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
            <i class="bi bi-x-lg me-1"></i> Đóng
          </button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
  <script src="/js/nckh_v3/stats/common.js"></script>
  <script src="/js/nckh_v3/stats/institute.js"></script>
</body>

</html>
```

## File: src/views/nckh_v3/typeInput.ejs
```ejs
<form id="typeInputForm">
    <div class="form-section">
      <div class="form-section-title">Thông tin <%= (selectedTypeMeta && selectedTypeMeta.label) || 'NCKH' %></div>

      <div class="form-row">
        <div class="form-col-full">
          <label class="form-label">Tên công trình <span class="required">*</span></label>
          <input id="tenCongTrinh" class="form-control" required />
        </div>
      </div>

      <div class="form-row">
        <% if (selectedTypeMeta && selectedTypeMeta.loaiNckh === 'BAIBAO') { %>
          <div class="form-col">
            <label class="form-label">Nhóm bài báo <span class="required">*</span></label>
            <select id="baiBaoGroup" class="form-select" required>
              <option value="TAP_CHI">Tạp chí</option>
              <option value="HOI_NGHI">Hội nghị</option>
            </select>
          </div>
        <% } %>

        <div class="form-col">
          <label class="form-label">Phân loại <span class="required">*</span></label>
          <select id="phanLoai" class="form-select" required>
            <option value=""><%= (selectedTypeMeta && selectedTypeMeta.phanLoaiPlaceholder) || '-- Chọn phân loại --' %></option>
          </select>
        </div>

        <div class="form-col">
          <label class="form-label">Năm học <span class="required">*</span></label>
          <select id="namHoc" class="form-select" required></select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-col">
          <label class="form-label">Xếp loại <span class="required">*</span></label>
          <select id="xepLoai" class="form-select" required>
            <option value="Đạt" selected>Đạt</option>
            <option value="Giỏi">Giỏi</option>
            <option value="Xuất sắc">Xuất sắc</option>
          </select>
        </div>

        <% if (selectedTypeMeta && selectedTypeMeta.loaiNckh !== 'BAIBAO') { %>
          <div class="form-col">
            <label class="form-label">Ngày nghiệm thu <span class="required">*</span></label>
            <input id="ngayNghiemThu" type="date" class="form-control" required />
          </div>
        <% } %>

        <% if (selectedTypeMeta && selectedTypeMeta.showMaSo) { %>
          <div class="form-col">
            <label class="form-label"><%= selectedTypeMeta.maSoLabel || 'Mã số' %> <span class="required">*</span></label>
            <input id="maSo" type="text" class="form-control" required placeholder="Nhập mã số" />
          </div>
        <% } %>

        <% if (selectedTypeMeta && selectedTypeMeta.showSoNamThucHien) { %>
          <div class="form-col">
            <label class="form-label">Số năm thực hiện</label>
            <input id="soNamThucHien" type="number" min="1" step="1" value="1" class="form-control" />
          </div>
        <% } %>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Danh sách tham gia</div>

      <div class="form-row">
        <div class="form-col autocomplete-wrapper">
          <label class="form-label">
            <%= (selectedTypeMeta && selectedTypeMeta.mainActorLabel) || 'Vai trò chính' %> <span class="required">*</span>
            <label class="checkbox-label ms-2">
              <input type="checkbox" id="tacGiaNgoaiToggle" /> Ngoài học viện
            </label>
          </label>
          <input type="text" id="tacGiaInput" class="form-control" placeholder="Nhập tên" />
          <button type="button" id="addTacGiaBtn" class="btn btn-secondary mt-2">Thêm</button>
          <div id="tacGia-suggestions" class="suggestions-list"></div>
        </div>

        <% if (selectedTypeMeta && selectedTypeMeta.loaiNckh === 'HOIDONG') { %>
          <div class="form-col">
            <label class="form-label">Vai trò <span class="required">*</span></label>
            <select id="vaiTroHoiDong" class="form-select" required>
              <option value="chu_tich">Chủ tịch</option>
              <option value="phan_bien">Phản biện</option>
              <option value="uy_vien">Ủy viên</option>
            </select>
          </div>
        <% } %>

        <div class="form-col" id="tacGiaDonViGroup">
          <label class="form-label">Đơn vị công tác</label>
          <input type="text" id="tacGiaDonVi" class="form-control" placeholder="Nhập đơn vị công tác" disabled />
        </div>
      </div>

      <div class="form-row">
        <div class="form-col-full">
          <label class="form-label"><%= (selectedTypeMeta && selectedTypeMeta.mainActorLabel) || 'Vai trò chính' %></label>
          <div id="tacGiaTags" class="member-tags">
            <span style="color: #999; font-style: italic;">Chưa có dữ liệu</span>
          </div>
        </div>
      </div>

      <% if (!selectedTypeMeta || selectedTypeMeta.hasSecondaryMembers !== false) { %>
        <hr style="margin: 20px 0; border-color: #dee2e6;" />

        <div class="form-row">
          <div class="form-col autocomplete-wrapper">
            <label class="form-label">
              <%= (selectedTypeMeta && selectedTypeMeta.secondaryMemberLabel) || 'Thành viên' %>
              <label class="checkbox-label ms-2">
                <input type="checkbox" id="thanhVienNgoaiToggle" /> Ngoài học viện
              </label>
            </label>
            <input type="text" id="thanhVienInput" class="form-control" placeholder="Nhập tên thành viên" />
            <button type="button" id="addThanhVienBtn" class="btn btn-secondary mt-2">Thêm</button>
            <div id="thanhVien-suggestions" class="suggestions-list"></div>
          </div>

          <div class="form-col" id="thanhVienDonViGroup">
            <label class="form-label">Đơn vị công tác</label>
            <input type="text" id="thanhVienDonVi" class="form-control" placeholder="Nhập đơn vị công tác" disabled />
          </div>
        </div>

        <div class="form-row">
          <div class="form-col-full">
            <label class="form-label"><%= (selectedTypeMeta && selectedTypeMeta.secondaryMemberLabel) || 'Thành viên' %></label>
            <div id="thanhVienTags" class="member-tags">
              <span style="color: #999; font-style: italic;">Chưa có thành viên</span>
            </div>
          </div>
        </div>
      <% } %>

      <div class="text-end">
        <button id="resetBtn" type="button" class="btn btn-outline-secondary me-2">Làm mới</button>
        <button id="submitBtn" type="submit" class="btn btn-primary">Lưu dữ liệu</button>
      </div>
    </div>
</form>
```

## File: src/mappers/nckh_v3/stats.mapper.js
```javascript
const { NCKH_TYPE_OPTIONS } = require("../../config/nckh_v3/types");

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const typeMetaByLoai = new Map(
  (NCKH_TYPE_OPTIONS || []).map((item) => [String(item.loaiNckh || ""), item])
);

const mapTypeMeta = (loaiNckh) => {
  const normalized = String(loaiNckh || "").trim().toUpperCase();
  const meta = typeMetaByLoai.get(normalized) || null;
  return {
    loaiNckh: normalized,
    typeSlug: meta ? meta.value : null,
    loaiNckhLabel: meta ? meta.label : (normalized || "N/A"),
  };
};
const mapRoleLabel = (role) => {
  const r = String(role || "").toLowerCase();
  if (r === "tac_gia") return "Tác giả";
  if (r === "thanh_vien") return "Thành viên";
  if (r === "chu_tich") return "Chủ tịch";
  if (r === "phan_bien") return "Phản biện";
  if (r === "uy_vien") return "Ủy viên";
  return role || "";
};

const mapLecturerSummaryRow = (row) => ({
  lecturerId: Number(row.lecturer_id),
  tenNhanVien: row.TenNhanVien || "",
  maPhongBan: row.MaPhongBan || null,
  lecturerKhoaId:
    row.lecturer_khoa_id !== null && row.lecturer_khoa_id !== undefined
      ? Number(row.lecturer_khoa_id)
      : null,
  lecturerKhoaName: row.lecturer_khoa_name || null,
  soCongTrinh: Number(row.cong_trinh_count || 0),
  tongSoTietGiangVien: round2(Number(row.tong_so_tiet_giang_vien || 0)),
});

const mapCommonRecordRow = (row) => ({
  id: Number(row.id),
  ...mapTypeMeta(row.loai_nckh),
  phanLoai: row.phan_loai || "",
  tenCongTrinh: row.ten_cong_trinh || "",
  namHoc: row.nam_hoc || "",
  tongSoTietCongTrinh: round2(Number(row.tong_so_tiet || 0)),
  ngayNghiemThu: row.ngay_nghiem_thu || null,
  xepLoai: row.xep_loai || null,
  maSo: row.ma_so || null,
  tacGiaChinh: row.tac_gia_chinh || "",
  thanhVien: row.thanh_vien || "",
});

const mapLecturerRecordRow = (row) => ({
  ...mapCommonRecordRow(row),
  vaiTroGiangVien: mapRoleLabel(row.vai_tro_giang_vien),
  soTietGiangVien: round2(Number(row.so_tiet_giang_vien || 0)),
});

const mapFacultySummaryRow = (row) => ({
  khoaId: row.khoa_id !== null && row.khoa_id !== undefined ? Number(row.khoa_id) : null,
  maPhongBan: row.MaPhongBan || null,
  tenPhongBan: row.TenPhongBan || "Cấp Học viện",
  soCongTrinh: Number(row.cong_trinh_count || 0),
  tongSoTiet: round2(Number(row.tong_so_tiet || 0)),
});

const mapInstituteOverview = (overviewRow, lecturerRow) => ({
  tongCongTrinh: Number(overviewRow?.tong_cong_trinh || 0),
  tongSoTiet: round2(Number(overviewRow?.tong_so_tiet || 0)),
  tongGiangVienNoiBo: Number(lecturerRow?.tong_giang_vien_noi_bo || 0),
});

const mapInstituteTypeRow = (row) => ({
  ...mapTypeMeta(row.loai_nckh),
  soCongTrinh: Number(row.cong_trinh_count || 0),
  tongSoTiet: round2(Number(row.tong_so_tiet || 0)),
});

module.exports = {
  mapLecturerSummaryRow,
  mapCommonRecordRow,
  mapLecturerRecordRow,
  mapFacultySummaryRow,
  mapInstituteOverview,
  mapInstituteTypeRow,
};
```

## File: src/public/js/nckh_v3/main/typeInputCommon.js
```javascript
window.NCKH_V3_TypeInputCommon = window.NCKH_V3_TypeInputCommon || {};

(function () {
  function createApi(slug) {
    return {
      async getMetadata(khoaId = "ALL") {
        const response = await fetch(`/v3/nckh/${slug}/metadata?khoaId=${encodeURIComponent(khoaId)}`);
        return response.json();
      },
      async create(payload) {
        const response = await fetch(`/v3/nckh/${slug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return response.json();
      },
    };
  }

  function setupAutocomplete(input, suggestionContainer, list, onPick, disabledCheck) {
    if (!input || !suggestionContainer) return;

    const clearSuggestion = () => {
      suggestionContainer.innerHTML = "";
      suggestionContainer.classList.remove("show");
    };

    input.addEventListener("input", () => {
      if (typeof disabledCheck === "function" && disabledCheck()) {
        clearSuggestion();
        return;
      }

      const query = String(input.value || "").trim().toLowerCase();
      suggestionContainer.innerHTML = "";

      if (!query || query.length < 2) {
        clearSuggestion();
        return;
      }

      const suggestions = list
        .filter((item) => String(item.TenNhanVien || "").toLowerCase().includes(query))
        .slice(0, 10);

      if (!suggestions.length) {
        clearSuggestion();
        return;
      }

      suggestions.forEach((gv) => {
        const item = document.createElement("div");
        item.className = "suggestion-item";
        item.textContent = gv.TenNhanVien;
        item.addEventListener("click", () => {
          onPick(gv);
          input.value = "";
          clearSuggestion();
        });
        suggestionContainer.appendChild(item);
      });

      suggestionContainer.classList.add("show");
    });

    document.addEventListener("click", (e) => {
      if (!input.contains(e.target) && !suggestionContainer.contains(e.target)) {
        clearSuggestion();
      }
    });
  }

  function ensureArrayUniqueNumbers(input) {
    return [...new Set((Array.isArray(input) ? input : []).map(Number).filter((x) => Number.isFinite(x) && x > 0))];
  }

  function normalizeText(input) {
    return String(input || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function classifyBaiBaoOption(phanLoai) {
    const normalized = normalizeText(phanLoai);
    if (normalized.includes("tap chi")) return "TAP_CHI";
    if (normalized.includes("hoi nghi") || normalized.includes("bao cao")) return "HOI_NGHI";
    return "TAP_CHI";
  }

  function renderPhanLoaiOptions(selectEl, options, placeholder) {
    if (!selectEl) return;

    const MAX_LEN = 100;
    const truncate = (text) => text.length > MAX_LEN ? text.slice(0, MAX_LEN) + "…" : text;

    selectEl.innerHTML = "";

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = placeholder || "-- Chọn phân loại --";
    selectEl.appendChild(defaultOption);

    (options || []).forEach((item) => {
      const option = document.createElement("option");
      option.value = item.PhanLoai;
      const soGioDisplay = String(item.SoGio).replace(".", ",");
      const fullLabel = `${item.PhanLoai} (${soGioDisplay} tiết)`;
      option.textContent = truncate(fullLabel);
      option.title = fullLabel;
      selectEl.appendChild(option);
    });

    selectEl.disabled = (options || []).length === 0;
  }

  async function loadNamHoc(selectEl) {
    if (!selectEl) return;

    const yearNow = new Date().getFullYear();
    const defaultNamHoc = `${yearNow}-${yearNow + 1}`;

    try {
      const res = await fetch("/getNamHoc");
      const json = await res.json();
      if (json.success && Array.isArray(json.NamHoc)) {
        json.NamHoc.forEach((item) => {
          const opt = document.createElement("option");
          opt.value = item.NamHoc;
          opt.textContent = item.NamHoc;
          selectEl.appendChild(opt);
        });

        const found = Array.from(selectEl.options).find((o) => o.value === defaultNamHoc);
        if (found) {
          selectEl.value = defaultNamHoc;
        }
      }
    } catch (e) {
      console.error("[NCKH V3] Lấy năm học thất bại:", e);
    }
  }

  function validatePayload(payload, hasSecondaryMembers, config) {
    const missing = [];
    if (!payload.tenCongTrinh) missing.push("Tên công trình");
    if (!payload.phanLoai) missing.push("Phân loại");
    if (!payload.namHoc) missing.push("Năm học");
    if (!payload.tongSoTiet || Number(payload.tongSoTiet) <= 0) missing.push("Tổng số tiết");
    if (!payload.xepLoai) missing.push("Xếp loại");
    if (payload.loaiNckh !== "BAIBAO" && !payload.ngayNghiemThu) missing.push("Ngày nghiệm thu");
    if (config.showMaSo && !payload.maSo) missing.push(config.maSoLabel || "Mã số");
    if (config.mode === "fixed" && !payload.vaiTro) missing.push("Vai trò");

    const hasTacGia = (payload.tacGiaIds || []).length > 0 || (payload.tacGiaNgoai || []).length > 0;
    if (!hasTacGia) {
      missing.push("Vai trò chính");
    }

    if (!hasSecondaryMembers) {
      payload.thanhVienIds = [];
      payload.thanhVienNgoai = [];
    }

    return {
      isValid: missing.length === 0,
      missing,
    };
  }

  window.NCKH_V3_TypeInputCommon.init = async function init(initOptions) {
    const meta = window.NCKH_V3_SELECTED_TYPE_META || {};
    const config = { ...meta, ...initOptions };

    const api = createApi(config.slug);
    const formEl = document.getElementById("typeInputForm");
    if (!formEl) return;

    const permissionState =
      (window.NCKH_V3.permissions && window.NCKH_V3.permissions.getPermissionState()) || {
        canInput: true,
      };

    if (!permissionState.canInput) {
      await Swal.fire({
        icon: "warning",
        title: "Không có quyền",
        text: "Bạn không có quyền nhập dữ liệu NCKH.",
      });
      return;
    }

    const metadataResult = await api.getMetadata();
    if (!metadataResult.success) {
      Swal.fire("Thất bại", metadataResult.message || "Không thể tải metadata", "error");
      return;
    }

    const { khoaList, giangVienList, phanLoaiOptions } = metadataResult.data;
    const byId = new Map((giangVienList || []).map((gv) => [Number(gv.id), gv]));

    const baiBaoGroupEl = document.getElementById("baiBaoGroup");
    const phanLoaiEl = document.getElementById("phanLoai");
    const namHocEl = document.getElementById("namHoc");
    const soNamThucHienEl = document.getElementById("soNamThucHien");
    const xepLoaiEl = document.getElementById("xepLoai");
    const ngayNghiemThuEl = document.getElementById("ngayNghiemThu");
    const maSoEl = document.getElementById("maSo");
    const vaiTroHoiDongEl = document.getElementById("vaiTroHoiDong");

    const tacGiaInput = document.getElementById("tacGiaInput");
    const tacGiaSuggestions = document.getElementById("tacGia-suggestions");
    const tacGiaTags = document.getElementById("tacGiaTags");
    const tacGiaNgoaiToggle = document.getElementById("tacGiaNgoaiToggle");
    const tacGiaDonVi = document.getElementById("tacGiaDonVi");
    const addTacGiaBtn = document.getElementById("addTacGiaBtn");

    const hasSecondaryMembers = config.hasSecondaryMembers !== false;
    const thanhVienInput = document.getElementById("thanhVienInput");
    const thanhVienSuggestions = document.getElementById("thanhVien-suggestions");
    const thanhVienTags = document.getElementById("thanhVienTags");
    const thanhVienNgoaiToggle = document.getElementById("thanhVienNgoaiToggle");
    const thanhVienDonVi = document.getElementById("thanhVienDonVi");
    const addThanhVienBtn = document.getElementById("addThanhVienBtn");

    const state = {
      tacGiaIds: [],
      thanhVienIds: [],
      tacGiaNgoai: [],
      thanhVienNgoai: [],
    };

    const phanLoaiMap = new Map((phanLoaiOptions || []).map((item) => [item.PhanLoai, Number(item.SoGio)]));
    const phanLoaiPlaceholder = phanLoaiEl?.options?.[0]?.textContent || "-- Chọn phân loại --";
    const allPhanLoaiOptions = Array.isArray(phanLoaiOptions) ? phanLoaiOptions : [];

    let rerenderPhanLoaiForCurrentContext = () => {
      renderPhanLoaiOptions(phanLoaiEl, allPhanLoaiOptions, phanLoaiPlaceholder);
    };

    if (phanLoaiEl && config.loaiNckh === "BAIBAO" && baiBaoGroupEl) {
      const getOptionsByGroup = (group) => {
        const normalizedGroup = String(group || "TAP_CHI");
        return allPhanLoaiOptions.filter((item) => classifyBaiBaoOption(item.PhanLoai) === normalizedGroup);
      };

      const applyBaiBaoGroup = () => {
        const activeGroup = baiBaoGroupEl.value || "TAP_CHI";
        const filteredOptions = getOptionsByGroup(activeGroup);
        renderPhanLoaiOptions(phanLoaiEl, filteredOptions, phanLoaiPlaceholder);
      };

      rerenderPhanLoaiForCurrentContext = applyBaiBaoGroup;
      baiBaoGroupEl.addEventListener("change", applyBaiBaoGroup);
      applyBaiBaoGroup();
    } else {
      rerenderPhanLoaiForCurrentContext();
    }


    await loadNamHoc(namHocEl);

    const renderTags = (container, internalIds, externalList, removeInternal, removeExternal, emptyText) => {
      if (!container) return;

      if ((!internalIds || internalIds.length === 0) && (!externalList || externalList.length === 0)) {
        container.innerHTML = `<span style="color: #999; font-style: italic;">${emptyText}</span>`;
        return;
      }

      const internalHtml = (internalIds || []).map((id, index) => {
        const gv = byId.get(Number(id));
        const displayName = gv ? gv.TenNhanVien : String(id);
        return `<span class="member-tag">${displayName}<button type="button" class="member-tag-remove" data-remove-type="internal" data-index="${index}">&times;</button></span>`;
      });

      const externalHtml = (externalList || []).map((item, index) => {
        const displayName = item.donVi ? `${item.ten} - ${item.donVi}` : item.ten;
        return `<span class="member-tag">${displayName}<button type="button" class="member-tag-remove" data-remove-type="external" data-index="${index}">&times;</button></span>`;
      });

      container.innerHTML = [...internalHtml, ...externalHtml].join("");

      container.querySelectorAll(".member-tag-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
          const index = Number(btn.getAttribute("data-index"));
          const kind = btn.getAttribute("data-remove-type");
          if (kind === "internal") {
            removeInternal(index);
          } else {
            removeExternal(index);
          }
        });
      });
    };

    const rerenderTacGia = () => {
      renderTags(
        tacGiaTags,
        state.tacGiaIds,
        state.tacGiaNgoai,
        (index) => {
          state.tacGiaIds.splice(index, 1);
          rerenderTacGia();
        },
        (index) => {
          state.tacGiaNgoai.splice(index, 1);
          rerenderTacGia();
        },
        "Chưa có dữ liệu"
      );
    };

    const rerenderThanhVien = () => {
      if (!hasSecondaryMembers) return;

      renderTags(
        thanhVienTags,
        state.thanhVienIds,
        state.thanhVienNgoai,
        (index) => {
          state.thanhVienIds.splice(index, 1);
          rerenderThanhVien();
        },
        (index) => {
          state.thanhVienNgoai.splice(index, 1);
          rerenderThanhVien();
        },
        "Chưa có thành viên"
      );
    };

    rerenderTacGia();
    rerenderThanhVien();

    const toggleExternalMode = (checkbox, donViInput, addBtn, suggestionContainer) => {
      if (!checkbox || !donViInput || !addBtn) return;

      if (checkbox.checked) {
        donViInput.disabled = false;
        addBtn.style.display = "inline-block";
        if (suggestionContainer) {
          suggestionContainer.innerHTML = "";
          suggestionContainer.classList.remove("show");
        }
      } else {
        donViInput.disabled = true;
        donViInput.value = "";
        addBtn.style.display = "none";
      }
    };

    if (addTacGiaBtn) addTacGiaBtn.style.display = "none";
    if (addThanhVienBtn) addThanhVienBtn.style.display = "none";

    if (tacGiaNgoaiToggle) {
      tacGiaNgoaiToggle.addEventListener("change", () => {
        toggleExternalMode(tacGiaNgoaiToggle, tacGiaDonVi, addTacGiaBtn, tacGiaSuggestions);
      });
    }

    if (thanhVienNgoaiToggle) {
      thanhVienNgoaiToggle.addEventListener("change", () => {
        toggleExternalMode(thanhVienNgoaiToggle, thanhVienDonVi, addThanhVienBtn, thanhVienSuggestions);
      });
    }

    const findByNameExact = (name) => {
      const normalized = String(name || "").trim().toLowerCase();
      if (!normalized) return null;
      return (giangVienList || []).find((gv) => String(gv.TenNhanVien || "").trim().toLowerCase() === normalized) || null;
    };

    const findByNameFirstMatch = (name) => {
      const normalized = String(name || "").trim().toLowerCase();
      if (!normalized) return null;
      return (giangVienList || []).find((gv) => String(gv.TenNhanVien || "").trim().toLowerCase().includes(normalized)) || null;
    };

    const addTacGiaInternal = (id) => {
      const nId = Number(id);
      if (!Number.isFinite(nId)) return;
      if (!state.tacGiaIds.includes(nId)) {
        if (config.mode === "fixed") {
          state.tacGiaIds = [nId];
          state.tacGiaNgoai = [];
        } else {
          state.tacGiaIds.push(nId);
        }
      }
      state.thanhVienIds = state.thanhVienIds.filter((x) => x !== nId);
      rerenderTacGia();
      rerenderThanhVien();
    };

    const addThanhVienInternal = (id) => {
      const nId = Number(id);
      if (!Number.isFinite(nId) || state.tacGiaIds.includes(nId)) return;
      if (!state.thanhVienIds.includes(nId)) {
        state.thanhVienIds.push(nId);
      }
      rerenderThanhVien();
    };

    setupAutocomplete(
      tacGiaInput,
      tacGiaSuggestions,
      giangVienList || [],
      (gv) => addTacGiaInternal(gv.id),
      () => !!(tacGiaNgoaiToggle && tacGiaNgoaiToggle.checked)
    );

    if (hasSecondaryMembers) {
      setupAutocomplete(
        thanhVienInput,
        thanhVienSuggestions,
        giangVienList || [],
        (gv) => addThanhVienInternal(gv.id),
        () => !!(thanhVienNgoaiToggle && thanhVienNgoaiToggle.checked)
      );
    }

    if (addTacGiaBtn && tacGiaInput) {
      addTacGiaBtn.addEventListener("click", () => {
        const isNgoai = !!(tacGiaNgoaiToggle && tacGiaNgoaiToggle.checked);
        if (isNgoai) {
          const name = String(tacGiaInput.value || "").trim();
          const unit = String((tacGiaDonVi && tacGiaDonVi.value) || "").trim();
          if (!name || !unit) {
            Swal.fire("Thiếu thông tin", "Người ngoài học viện cần tên và đơn vị công tác.", "warning");
            return;
          }

          if (config.mode === "fixed") {
            state.tacGiaNgoai = [{ ten: name, donVi: unit }];
            state.tacGiaIds = [];
          } else {
            state.tacGiaNgoai.push({ ten: name, donVi: unit });
          }

          tacGiaInput.value = "";
          tacGiaDonVi.value = "";
          rerenderTacGia();
          return;
        }

        const gv = findByNameExact(tacGiaInput.value) || findByNameFirstMatch(tacGiaInput.value);
        if (!gv) {
          Swal.fire("Không tìm thấy", "Vui lòng chọn từ danh sách gợi ý.", "warning");
          return;
        }
        addTacGiaInternal(gv.id);
        tacGiaInput.value = "";
      });
    }

    if (addThanhVienBtn && thanhVienInput) {
      addThanhVienBtn.addEventListener("click", () => {
        const isNgoai = !!(thanhVienNgoaiToggle && thanhVienNgoaiToggle.checked);
        if (isNgoai) {
          const name = String(thanhVienInput.value || "").trim();
          const unit = String((thanhVienDonVi && thanhVienDonVi.value) || "").trim();
          if (!name || !unit) {
            Swal.fire("Thiếu thông tin", "Người ngoài học viện cần tên và đơn vị công tác.", "warning");
            return;
          }

          state.thanhVienNgoai.push({ ten: name, donVi: unit });
          thanhVienInput.value = "";
          thanhVienDonVi.value = "";
          rerenderThanhVien();
          return;
        }

        const gv = findByNameExact(thanhVienInput.value) || findByNameFirstMatch(thanhVienInput.value);
        if (!gv) {
          Swal.fire("Không tìm thấy", "Vui lòng chọn từ danh sách gợi ý.", "warning");
          return;
        }

        addThanhVienInternal(gv.id);
        thanhVienInput.value = "";
      });
    }

    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        formEl.reset();
        state.tacGiaIds = [];
        state.thanhVienIds = [];
        state.tacGiaNgoai = [];
        state.thanhVienNgoai = [];
        rerenderTacGia();
        rerenderThanhVien();

        if (tacGiaNgoaiToggle) tacGiaNgoaiToggle.checked = false;
        if (thanhVienNgoaiToggle) thanhVienNgoaiToggle.checked = false;
        if (tacGiaDonVi) {
          tacGiaDonVi.disabled = true;
          tacGiaDonVi.value = "";
        }
        if (thanhVienDonVi) {
          thanhVienDonVi.disabled = true;
          thanhVienDonVi.value = "";
        }
        if (addTacGiaBtn) addTacGiaBtn.style.display = "none";
        if (addThanhVienBtn) addThanhVienBtn.style.display = "none";

        if (xepLoaiEl) xepLoaiEl.value = "Đạt";
        if (ngayNghiemThuEl) ngayNghiemThuEl.value = "";
        if (maSoEl) maSoEl.value = "";
        if (vaiTroHoiDongEl) vaiTroHoiDongEl.value = "chu_tich";

        rerenderPhanLoaiForCurrentContext();
      });
    }

    formEl.addEventListener("submit", async (event) => {
      event.preventDefault();

      const selectedPhanLoai = String((phanLoaiEl?.value || "")).trim();
      const tongSoTietByPhanLoai = Number(phanLoaiMap.get(selectedPhanLoai) || 0);

      if (selectedPhanLoai && tongSoTietByPhanLoai <= 0) {
        Swal.fire("Thiếu cấu hình", "Phân loại chưa có số tiết quy định hợp lệ.", "warning");
        return;
      }

      const payload = {
        tenCongTrinh: String((document.getElementById("tenCongTrinh")?.value || "")).trim(),
        loaiNckh: config.loaiNckh,
        phanLoai: selectedPhanLoai,
        namHoc: String((namHocEl?.value || "")).trim(),
        tongSoTiet: tongSoTietByPhanLoai,
        tongSoTiet: tongSoTietByPhanLoai,
        soNamThucHien: Number(soNamThucHienEl?.value || 1),
        tacGiaIds: ensureArrayUniqueNumbers(state.tacGiaIds),
        thanhVienIds: ensureArrayUniqueNumbers(state.thanhVienIds),
        tacGiaNgoai: [...state.tacGiaNgoai],
        thanhVienNgoai: [...state.thanhVienNgoai],
        xepLoai: xepLoaiEl ? xepLoaiEl.value : null,
        ngayNghiemThu: ngayNghiemThuEl ? ngayNghiemThuEl.value : null,
        maSo: maSoEl ? maSoEl.value : null,
        vaiTro: vaiTroHoiDongEl ? String(vaiTroHoiDongEl.value || "").trim() : null,
      };

      if (config.mode === "fixed") {
        payload.thanhVienIds = [];
        payload.thanhVienNgoai = [];
      }

      const validation = validatePayload(payload, hasSecondaryMembers, config);
      if (!validation.isValid) {
        Swal.fire("Thiếu thông tin", `Vui lòng bổ sung: ${validation.missing.join(", ")}`, "warning");
        return;
      }

      const confirmResult = await Swal.fire({
        icon: "question",
        title: "Xác nhận lưu dữ liệu",
        text: `Bạn có chắc muốn lưu ${config.label.toLowerCase()}?`,
        showCancelButton: true,
        confirmButtonText: "Lưu",
        cancelButtonText: "Hủy",
      });

      if (!confirmResult.isConfirmed) return;

      const result = await api.create(payload);
      if (!result.success) {
        Swal.fire("Thất bại", result.message || "Không thể lưu dữ liệu", "error");
        return;
      }

      await Swal.fire("Thành công", result.message || "Đã lưu dữ liệu", "success");
      if (resetBtn) {
        resetBtn.click();
      }
    });
  };
})();
```

## File: src/repositories/nckh_v3/stats.repo.js
```javascript
const TABLE_CHUNG = "nckh_chung";
const TABLE_SO_TIET = "nckh_so_tiet";

/**
 * Điều kiện chung: năm học + trạng thái phê duyệt.
 * Không chứa logic lọc khoa.
 */
const buildApprovedWhere = (namHoc) => {
  const where = `
    c.nam_hoc = ?
    AND c.khoa_duyet = 1
    AND c.vien_nc_duyet = 1
  `;
  const params = [namHoc];
  return { where, params };
};

// ──────────────────────────────────────────────
// 1. Thống kê theo Giảng viên
// ──────────────────────────────────────────────

const listLecturerSummary = async (connection, { namHoc, khoaId = "ALL", keyword = "" }) => {
  const { where, params } = buildApprovedWhere(namHoc);
  const normalizedKeyword = String(keyword || "").trim();
  const safeKhoaId = String(khoaId || "ALL").trim();

  let query = `
    SELECT
      nv.id_User AS lecturer_id,
      nv.TenNhanVien,
      nv.MaPhongBan,
      pb.id AS lecturer_khoa_id,
      pb.TenPhongBan AS lecturer_khoa_name,
      COUNT(DISTINCT c.id) AS cong_trinh_count,
      COALESCE(SUM(st.so_tiet), 0) AS tong_so_tiet_giang_vien
    FROM ${TABLE_SO_TIET} st
    INNER JOIN nhanvien nv ON nv.id_User = st.nhanvien_id
    INNER JOIN ${TABLE_CHUNG} c ON c.id = st.nckh_id
    INNER JOIN phongban pb ON pb.id = nv.phongban_id
    WHERE ${where}
  `;

  if (safeKhoaId !== "ALL") {
    query += " AND nv.phongban_id = ?";
    params.push(Number(safeKhoaId));
  }

  if (normalizedKeyword) {
    query += " AND nv.TenNhanVien LIKE ?";
    params.push(`%${normalizedKeyword}%`);
  }

  query += `
    GROUP BY
      nv.id_User,
      nv.TenNhanVien,
      nv.MaPhongBan,
      pb.id,
      pb.TenPhongBan
    ORDER BY tong_so_tiet_giang_vien DESC, nv.TenNhanVien ASC
  `;

  const [rows] = await connection.execute(query, params);
  return rows;
};

// ──────────────────────────────────────────────
// 2. Chi tiết công trình của 1 Giảng viên
//    Không lọc theo khoa — hiển thị toàn bộ.
// ──────────────────────────────────────────────

const listLecturerRecords = async (connection, { lecturerId, namHoc }) => {
  const { where, params } = buildApprovedWhere(namHoc);

  const query = `
    SELECT
      c.id,
      c.ten_cong_trinh,
      c.loai_nckh,
      c.phan_loai,
      c.nam_hoc,
      c.tong_so_tiet,
      c.ngay_nghiem_thu,
      c.xep_loai,
      c.ma_so,
      st.so_tiet AS so_tiet_giang_vien,
      st.vai_tro AS vai_tro_giang_vien,
      GROUP_CONCAT(
        DISTINCT CASE
          WHEN st2.vai_tro = 'tac_gia' THEN TRIM(COALESCE(nv2.TenNhanVien, st2.ten_ngoai))
          ELSE NULL
        END
        ORDER BY st2.id ASC
        SEPARATOR ', '
      ) AS tac_gia_chinh,
      GROUP_CONCAT(
        DISTINCT CASE
          WHEN st2.vai_tro = 'thanh_vien' THEN TRIM(COALESCE(nv2.TenNhanVien, st2.ten_ngoai))
          ELSE NULL
        END
        ORDER BY st2.id ASC
        SEPARATOR ', '
      ) AS thanh_vien
    FROM ${TABLE_SO_TIET} st
    INNER JOIN ${TABLE_CHUNG} c ON c.id = st.nckh_id
    LEFT JOIN ${TABLE_SO_TIET} st2 ON st2.nckh_id = c.id
    LEFT JOIN nhanvien nv2 ON nv2.id_User = st2.nhanvien_id
    WHERE st.nhanvien_id = ? AND ${where}
    GROUP BY
      c.id,
      c.ten_cong_trinh,
      c.loai_nckh,
      c.phan_loai,
      c.nam_hoc,
      c.tong_so_tiet,
      c.ngay_nghiem_thu,
      c.xep_loai,
      c.ma_so,
      st.so_tiet,
      st.vai_tro
    ORDER BY c.id DESC
  `;

  const [rows] = await connection.execute(query, [Number(lecturerId), ...params]);
  return rows;
};

// ──────────────────────────────────────────────
// 3. Thống kê theo Khoa (tổng hợp)
// ──────────────────────────────────────────────

const listFacultySummary = async (connection, { namHoc }) => {
  const query = `
    SELECT
      pb.id AS khoa_id,
      pb.MaPhongBan,
      pb.TenPhongBan,
      COUNT(DISTINCT st.nckh_id) AS cong_trinh_count,
      COALESCE(SUM(st.so_tiet), 0) AS tong_so_tiet
    FROM ${TABLE_SO_TIET} st
    INNER JOIN nhanvien nv ON nv.id_User = st.nhanvien_id
    INNER JOIN phongban pb ON pb.id = nv.phongban_id
    INNER JOIN ${TABLE_CHUNG} c ON c.id = st.nckh_id
    WHERE c.nam_hoc = ?
      AND c.khoa_duyet = 1
      AND c.vien_nc_duyet = 1
    GROUP BY pb.id, pb.MaPhongBan, pb.TenPhongBan
    ORDER BY tong_so_tiet DESC
  `;

  const [rows] = await connection.execute(query, [namHoc]);
  return rows;
};

// ──────────────────────────────────────────────
// 4. Danh sách công trình theo Khoa
// ──────────────────────────────────────────────

const listFacultyRecords = async (connection, { namHoc, khoaId }) => {
  const { where, params } = buildApprovedWhere(namHoc);
  const safeKhoaId = Number(khoaId);

  // Lọc công trình có ít nhất 1 giảng viên thuộc khoa này tham gia
  const query = `
    SELECT
      c.id,
      c.ten_cong_trinh,
      c.loai_nckh,
      c.phan_loai,
      c.nam_hoc,
      COALESCE(SUM(CASE WHEN st.nhanvien_id IS NOT NULL THEN st.so_tiet ELSE 0 END), 0) AS tong_so_tiet,
      c.ngay_nghiem_thu,
      c.xep_loai,
      c.ma_so,
      GROUP_CONCAT(
        DISTINCT CASE
          WHEN st.vai_tro = 'tac_gia' THEN TRIM(COALESCE(nv.TenNhanVien, st.ten_ngoai))
          ELSE NULL
        END
        ORDER BY st.id ASC
        SEPARATOR ', '
      ) AS tac_gia_chinh,
      GROUP_CONCAT(
        DISTINCT CASE
          WHEN st.vai_tro = 'thanh_vien' THEN TRIM(COALESCE(nv.TenNhanVien, st.ten_ngoai))
          ELSE NULL
        END
        ORDER BY st.id ASC
        SEPARATOR ', '
      ) AS thanh_vien
    FROM ${TABLE_CHUNG} c
    LEFT JOIN ${TABLE_SO_TIET} st ON st.nckh_id = c.id
    LEFT JOIN nhanvien nv ON nv.id_User = st.nhanvien_id
    WHERE ${where}
      AND EXISTS (
        SELECT 1 FROM ${TABLE_SO_TIET} st_sub
        INNER JOIN nhanvien nv_sub ON nv_sub.id_User = st_sub.nhanvien_id
        WHERE st_sub.nckh_id = c.id AND nv_sub.phongban_id = ?
      )
    GROUP BY
      c.id,
      c.ten_cong_trinh,
      c.loai_nckh,
      c.phan_loai,
      c.nam_hoc,
      c.ngay_nghiem_thu,
      c.xep_loai,
      c.ma_so
    ORDER BY c.id DESC
  `;

  const [rows] = await connection.execute(query, [...params, safeKhoaId]);
  return rows;
};

// ──────────────────────────────────────────────
// 5. Thống kê Học viện — Tổng quan
// ──────────────────────────────────────────────

const getInstituteOverview = async (connection, { namHoc }) => {
  const query = `
    SELECT
      COUNT(DISTINCT c.id) AS tong_cong_trinh,
      COALESCE(SUM(st.so_tiet), 0) AS tong_so_tiet
    FROM ${TABLE_CHUNG} c
    LEFT JOIN ${TABLE_SO_TIET} st ON st.nckh_id = c.id AND st.nhanvien_id IS NOT NULL
    WHERE c.nam_hoc = ?
      AND c.khoa_duyet = 1
      AND c.vien_nc_duyet = 1
  `;

  const [rows] = await connection.execute(query, [namHoc]);
  return rows[0] || { tong_cong_trinh: 0, tong_so_tiet: 0 };
};

const countInstituteLecturers = async (connection, { namHoc }) => {
  const query = `
    SELECT COUNT(DISTINCT st.nhanvien_id) AS tong_giang_vien_noi_bo
    FROM ${TABLE_SO_TIET} st
    INNER JOIN ${TABLE_CHUNG} c ON c.id = st.nckh_id
    WHERE c.nam_hoc = ?
      AND c.khoa_duyet = 1
      AND c.vien_nc_duyet = 1
      AND st.nhanvien_id IS NOT NULL
  `;

  const [rows] = await connection.execute(query, [namHoc]);
  return rows[0] || { tong_giang_vien_noi_bo: 0 };
};

const listInstituteByType = async (connection, { namHoc }) => {
  const query = `
    SELECT
      c.loai_nckh,
      COUNT(DISTINCT c.id) AS cong_trinh_count,
      COALESCE(SUM(st.so_tiet), 0) AS tong_so_tiet
    FROM ${TABLE_CHUNG} c
    LEFT JOIN ${TABLE_SO_TIET} st ON st.nckh_id = c.id AND st.nhanvien_id IS NOT NULL
    WHERE c.nam_hoc = ?
      AND c.khoa_duyet = 1
      AND c.vien_nc_duyet = 1
    GROUP BY c.loai_nckh
    ORDER BY tong_so_tiet DESC
  `;

  const [rows] = await connection.execute(query, [namHoc]);
  return rows;
};

// ──────────────────────────────────────────────
// 6. Danh sách công trình Học viện
// ──────────────────────────────────────────────

const listInstituteRecords = async (connection, { namHoc, khoaId = "ALL", loaiNckh = "ALL" }) => {
  const { where, params } = buildApprovedWhere(namHoc);
  const safeKhoaId = String(khoaId || "ALL");

  // --- Xử lý lọc theo khoa ---
  let selectTongSoTiet;
  let khoaWhere = "";

  if (safeKhoaId !== "ALL") {
    const numKhoaId = Number(safeKhoaId);

    // Chỉ tính tiết của giảng viên thuộc khoa đang lọc
    selectTongSoTiet = `COALESCE(SUM(CASE WHEN nv.phongban_id = ? THEN st.so_tiet ELSE 0 END), 0)`;

    khoaWhere = ` AND EXISTS (
      SELECT 1 FROM ${TABLE_SO_TIET} st_sub
      INNER JOIN nhanvien nv_sub ON nv_sub.id_User = st_sub.nhanvien_id
      WHERE st_sub.nckh_id = c.id AND nv_sub.phongban_id = ?
    )`;

    // Thêm tham số: 1 cho SUM CASE, 1 cho EXISTS
    params.unshift(numKhoaId); // cho SUM CASE (đặt trước WHERE params)
    // Lưu ý: params hiện tại = [numKhoaId, namHoc]
    // Sau WHERE sẽ push thêm numKhoaId cho EXISTS
  } else {
    selectTongSoTiet = `COALESCE(SUM(CASE WHEN st.nhanvien_id IS NOT NULL THEN st.so_tiet ELSE 0 END), 0)`;
  }

  let query = `
    SELECT
      c.id,
      c.ten_cong_trinh,
      c.loai_nckh AS loai_nckh,
      c.phan_loai,
      c.nam_hoc,
      ${selectTongSoTiet} AS tong_so_tiet,
      c.ngay_nghiem_thu,
      c.xep_loai,
      c.ma_so,
      GROUP_CONCAT(
        DISTINCT CASE
          WHEN st.vai_tro = 'tac_gia' THEN TRIM(COALESCE(nv.TenNhanVien, st.ten_ngoai))
          ELSE NULL
        END
        ORDER BY st.id ASC
        SEPARATOR ', '
      ) AS tac_gia_chinh,
      GROUP_CONCAT(
        DISTINCT CASE
          WHEN st.vai_tro = 'thanh_vien' THEN TRIM(COALESCE(nv.TenNhanVien, st.ten_ngoai))
          ELSE NULL
        END
        ORDER BY st.id ASC
        SEPARATOR ', '
      ) AS thanh_vien
    FROM ${TABLE_CHUNG} c
    LEFT JOIN ${TABLE_SO_TIET} st ON st.nckh_id = c.id
    LEFT JOIN nhanvien nv ON nv.id_User = st.nhanvien_id
    WHERE ${where}${khoaWhere}
  `;

  if (safeKhoaId !== "ALL") {
    params.push(Number(safeKhoaId)); // cho EXISTS
  }

  if (String(loaiNckh || "ALL") !== "ALL") {
    query += " AND c.loai_nckh = ?";
    params.push(loaiNckh);
  }

  query += `
    GROUP BY
      c.id,
      c.ten_cong_trinh,
      c.loai_nckh,
      c.phan_loai,
      c.nam_hoc,
      c.ngay_nghiem_thu,
      c.xep_loai,
      c.ma_so
    ORDER BY c.id DESC
  `;

  const [rows] = await connection.execute(query, params);
  return rows;
};

module.exports = {
  listLecturerSummary,
  listLecturerRecords,
  listFacultySummary,
  listFacultyRecords,
  getInstituteOverview,
  countInstituteLecturers,
  listInstituteByType,
  listInstituteRecords,
};
```

## File: src/services/nckh_v3/formula.service.js
```javascript
const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const cloneParticipantForYear = (participant, namThucHien) => ({
  ...participant,
  namThucHien,
});

const expandParticipantsByYears = (baseParticipants, soNamThucHien) => {
  const totalYears = Number(soNamThucHien || 1);
  
  // If the value is a literal year (e.g. 2024, 2025), just map it directly without looping
  if (totalYears > 1900) {
    return baseParticipants.map((item) => cloneParticipantForYear(item, totalYears));
  }

  if (totalYears <= 1) {
    return baseParticipants.map((item) => cloneParticipantForYear(item, 1));
  }

  const expanded = [];
  for (let nam = 1; nam <= totalYears; nam += 1) {
    baseParticipants.forEach((item) => {
      expanded.push(cloneParticipantForYear(item, nam));
    });
  }

  return expanded;
};

const quyDoiSoTietStandard = (T, tongSoNguoi, soDongTacGia = 1, soNamThucHien = 1) => {
  const totalHours = Number(T);
  const totalParticipants = Number(tongSoNguoi);
  const totalMainAuthors = Number(soDongTacGia);
  const totalYears = Number(soNamThucHien);

  if (totalParticipants <= 0) {
    throw new Error("Tổng số người phải lớn hơn 0");
  }

  if (totalMainAuthors <= 0) {
    throw new Error("Số tác giả chính phải lớn hơn 0");
  }

  if (totalYears <= 0) {
    throw new Error("Số năm thực hiện phải lớn hơn 0");
  }

  let tacGia = 0;
  let thanhVien = 0;

  if (totalMainAuthors === 1) {
    if (totalParticipants === 1) {
      tacGia = totalHours;
      thanhVien = 0;
    } else if (totalParticipants === 2) {
      tacGia = (2 * totalHours) / 3;
      thanhVien = totalHours / 3;
    } else if (totalParticipants === 3) {
      tacGia = totalHours / 2;
      thanhVien = totalHours / 4;
    } else {
      const base = (2 * totalHours) / (3 * totalParticipants);
      tacGia = totalHours / 3 + base;
      thanhVien = base;
    }
  } else {
    // Dong tac gia: chia bonus T/3 theo so tac gia chinh + base 2T/3 chia deu cho tat ca.
    const base = (2 * totalHours) / (3 * totalParticipants);
    const bonusEachMainAuthor = totalHours / (3 * totalMainAuthors);
    tacGia = bonusEachMainAuthor + base;
    thanhVien = base;
  }

  // If totalYears > 1900, it is a literal year, so duration is 1
  const duration = totalYears > 1900 ? 1 : totalYears;

  tacGia = tacGia / duration;
  thanhVien = thanhVien / duration;

  return {
    tacGia: round2(tacGia),
    thanhVien: round2(thanhVien),
  };
};

const quyDoiSoTietChiaDeu = (T, tongSoNguoi, soNamThucHien = 1) => {
  if (tongSoNguoi <= 0) {
    throw new Error("Tổng số người phải lớn hơn 0");
  }

  const duration = Number(soNamThucHien) > 1900 ? 1 : Number(soNamThucHien);
  return round2(Number(T) / Number(tongSoNguoi) / duration);
};

const quyDoiSoTietCoDinh = (T) => round2(Number(T));

const buildParticipantsWithHours = (
  tongSoTiet,
  tacGiaIds,
  thanhVienIds,
  tacGiaNgoai = [],
  thanhVienNgoai = [],
  soNamThucHien = 1
) => {
  const uniqueTacGia = [...new Set(tacGiaIds.map(Number))];
  const uniqueThanhVien = [...new Set(thanhVienIds.map(Number))]
    .filter((id) => !uniqueTacGia.includes(id));

  const ngoaiTacGia = Array.isArray(tacGiaNgoai) ? tacGiaNgoai : [];
  const ngoaiThanhVien = Array.isArray(thanhVienNgoai) ? thanhVienNgoai : [];

  const tongSoNguoi = uniqueTacGia.length + uniqueThanhVien.length + ngoaiTacGia.length + ngoaiThanhVien.length;
  if (tongSoNguoi === 0) {
    throw new Error("Danh sach nguoi tham gia khong duoc rong");
  }

  const totalTacGia = uniqueTacGia.length + ngoaiTacGia.length;
  if (totalTacGia === 0) {
    throw new Error("Phai co it nhat 1 tac gia");
  }

  const T = Number(tongSoTiet);
  const base = quyDoiSoTietStandard(T, tongSoNguoi, totalTacGia, soNamThucHien);

  const baseParticipants = [
    ...uniqueTacGia.map((id) => ({ nhanvienId: id, tenNgoai: null, donViNgoai: null, vaiTro: "tac_gia", soTiet: base.tacGia })),
    ...ngoaiTacGia.map((item) => ({ nhanvienId: null, tenNgoai: item.ten, donViNgoai: item.donVi || null, vaiTro: "tac_gia", soTiet: base.tacGia })),
    ...uniqueThanhVien.map((id) => ({ nhanvienId: id, tenNgoai: null, donViNgoai: null, vaiTro: "thanh_vien", soTiet: base.thanhVien })),
    ...ngoaiThanhVien.map((item) => ({ nhanvienId: null, tenNgoai: item.ten, donViNgoai: item.donVi || null, vaiTro: "thanh_vien", soTiet: base.thanhVien })),
  ];

  const participants = expandParticipantsByYears(baseParticipants, soNamThucHien);

  const sum = round2(participants.reduce((acc, item) => acc + Number(item.soTiet), 0));
  const delta = round2(T - sum);

  if (delta !== 0) {
    const lastThanhVienIndex = [...participants]
      .map((p, idx) => ({ p, idx }))
      .reverse()
      .find(({ p }) => p.vaiTro === "thanh_vien")?.idx;

    const targetIndex = lastThanhVienIndex !== undefined
      ? lastThanhVienIndex
      : participants.length - 1;

    participants[targetIndex].soTiet = round2(Number(participants[targetIndex].soTiet) + delta);
  }

  return participants;
};

const buildParticipantsWithEqualHours = (
  tongSoTiet,
  tacGiaIds,
  thanhVienIds,
  tacGiaNgoai = [],
  thanhVienNgoai = [],
  soNamThucHien = 1
) => {
  const uniqueTacGia = [...new Set((tacGiaIds || []).map(Number))];
  const uniqueThanhVien = [...new Set((thanhVienIds || []).map(Number))]
    .filter((id) => !uniqueTacGia.includes(id));

  const ngoaiTacGia = Array.isArray(tacGiaNgoai) ? tacGiaNgoai : [];
  const ngoaiThanhVien = Array.isArray(thanhVienNgoai) ? thanhVienNgoai : [];

  const tongSoNguoi = uniqueTacGia.length + uniqueThanhVien.length + ngoaiTacGia.length + ngoaiThanhVien.length;
  if (tongSoNguoi === 0) {
    throw new Error("Danh sách người tham gia không được rỗng");
  }

  const soTietMoiNguoi = quyDoiSoTietChiaDeu(Number(tongSoTiet), tongSoNguoi, soNamThucHien);

  const baseParticipants = [
    ...uniqueTacGia.map((id) => ({ nhanvienId: id, tenNgoai: null, donViNgoai: null, vaiTro: "tac_gia", soTiet: soTietMoiNguoi })),
    ...ngoaiTacGia.map((item) => ({ nhanvienId: null, tenNgoai: item.ten, donViNgoai: item.donVi || null, vaiTro: "tac_gia", soTiet: soTietMoiNguoi })),
    ...uniqueThanhVien.map((id) => ({ nhanvienId: id, tenNgoai: null, donViNgoai: null, vaiTro: "thanh_vien", soTiet: soTietMoiNguoi })),
    ...ngoaiThanhVien.map((item) => ({ nhanvienId: null, tenNgoai: item.ten, donViNgoai: item.donVi || null, vaiTro: "thanh_vien", soTiet: soTietMoiNguoi })),
  ];

  const participants = expandParticipantsByYears(baseParticipants, soNamThucHien);

  const sum = round2(participants.reduce((acc, item) => acc + Number(item.soTiet), 0));
  const delta = round2(Number(tongSoTiet) - sum);

  if (delta !== 0) {
    participants[participants.length - 1].soTiet = round2(Number(participants[participants.length - 1].soTiet) + delta);
  }

  return participants;
};

const buildParticipantsWithFixedHours = (tongSoTiet, tacGiaIds, tacGiaNgoai = [], vaiTro = "tac_gia") => {
  const uniqueTacGia = [...new Set((tacGiaIds || []).map(Number))];
  const ngoaiTacGia = Array.isArray(tacGiaNgoai) ? tacGiaNgoai : [];
  const tongSoNguoi = uniqueTacGia.length + ngoaiTacGia.length;

  if (tongSoNguoi !== 1) {
    throw new Error("Loại này chỉ cho phép đúng 1 thành viên hội đồng mỗi bản ghi");
  }

  const fixedHours = quyDoiSoTietCoDinh(Number(tongSoTiet));
  const normalizedRole = vaiTro || "tac_gia";

  return [
    ...uniqueTacGia.map((id) => ({ nhanvienId: id, tenNgoai: null, donViNgoai: null, vaiTro: normalizedRole, soTiet: fixedHours })),
    ...ngoaiTacGia.map((item) => ({ nhanvienId: null, tenNgoai: item.ten, donViNgoai: item.donVi || null, vaiTro: normalizedRole, soTiet: fixedHours })),
  ];
};

const buildParticipantsByMode = (
  mode,
  tongSoTiet,
  tacGiaIds,
  thanhVienIds,
  tacGiaNgoai = [],
  thanhVienNgoai = [],
  soNamThucHien = 1,
  vaiTro = null
) => {
  if (mode === "equal") {
    return buildParticipantsWithEqualHours(
      tongSoTiet,
      tacGiaIds,
      thanhVienIds,
      tacGiaNgoai,
      thanhVienNgoai,
      soNamThucHien
    );
  }

  if (mode === "fixed") {
    return buildParticipantsWithFixedHours(tongSoTiet, tacGiaIds, tacGiaNgoai, vaiTro);
  }

  return buildParticipantsWithHours(
    tongSoTiet,
    tacGiaIds,
    thanhVienIds,
    tacGiaNgoai,
    thanhVienNgoai,
    soNamThucHien
  );
};

module.exports = {
  round2,
  quyDoiSoTietStandard,
  quyDoiSoTietChiaDeu,
  quyDoiSoTietCoDinh,
  buildParticipantsWithHours,
  buildParticipantsWithEqualHours,
  buildParticipantsWithFixedHours,
  buildParticipantsByMode,
};
```

## File: src/views/nckh_v3/stats_lecturer.ejs
```ejs
<!DOCTYPE html>
<html lang="vi">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NCKH V3 - Thống Kê Giảng Viên</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
  <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />

  <link rel="stylesheet" href="/css/admin.css" />
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="stylesheet" href="/css/nckh_v3.css" />
  <link rel="stylesheet" href="/css/nckh_v3_stats.css" />
</head>

<body>
  <%- include('../header') %>

  <div class="stats-wrap">
    <!-- Page Header -->
    <div class="stats-page-header">
      <h1 class="stats-page-title">
        <span class="title-icon"><i class="bi bi-person-badge"></i></span>
        Thống kê NCKH theo giảng viên
      </h1>
      <nav class="stats-nav">
        <a href="/v3/nckh/thong-ke/khoa" class="nav-pill">
          <i class="bi bi-building"></i> Theo khoa
        </a>
        <a href="/v3/nckh/thong-ke/giang-vien" class="nav-pill active">
          <i class="bi bi-person"></i> Theo giảng viên
        </a>
        <a href="/v3/nckh/thong-ke/hoc-vien" class="nav-pill">
          <i class="bi bi-bank"></i> Theo học viện
        </a>
      </nav>
    </div>

    <!-- Toolbar -->
    <div class="stats-toolbar">
      <div class="tb-group">
        <label for="namHocFilter">Năm học</label>
        <select id="namHocFilter" class="form-select"></select>
      </div>
      <div class="tb-group">
        <label for="khoaFilter">Khoa / Phòng ban</label>
        <select id="khoaFilter" class="form-select">
          <option value="ALL">Tất cả khoa</option>
        </select>
      </div>
      <div class="tb-group" style="min-width: 300px;">
        <label for="keywordInput">Tìm giảng viên</label>
        <input id="keywordInput" class="form-control" placeholder="Nhập tên giảng viên..." />
      </div>
      <div class="tb-actions">
        <button id="loadDataBtn" class="btn btn-load">
          <i class="bi bi-search"></i> Hiển thị
        </button>
        <button id="exportExcelBtn" class="btn btn-export">
          <i class="bi bi-file-earmark-excel"></i> Xuất Excel
        </button>
      </div>
    </div>

    <!-- Charts -->
    <div class="row g-3 mb-4" id="chartSection" style="display: none;">
      <div class="col-lg-7">
        <div class="stats-chart-card">
          <div class="stats-chart-header">
            <h6 class="stats-chart-title"><i class="bi bi-bar-chart-fill me-2"></i>Top 15 giảng viên theo số tiết</h6>
          </div>
          <div class="stats-chart-body">
            <canvas id="lecturerBarChart"></canvas>
          </div>
        </div>
      </div>
      <div class="col-lg-5">
        <div class="stats-chart-card">
          <div class="stats-chart-header">
            <h6 class="stats-chart-title"><i class="bi bi-pie-chart-fill me-2"></i>Phân bổ công trình theo khoa</h6>
          </div>
          <div class="stats-chart-body stats-chart-body--doughnut">
            <canvas id="lecturerPieChart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Table -->
    <div class="stats-table-card table-responsive">
      <table class="table table-hover text-center align-middle">
        <thead>
          <tr>
            <th style="width: 60px">STT</th>
            <th class="sortable text-start" data-sort="tenNhanVien" style="cursor:pointer">
              Giảng viên <span class="sort-indicator"></span>
            </th>
            <th class="sortable" data-sort="maPhongBan" style="cursor:pointer; width: 130px">
              Khoa <span class="sort-indicator"></span>
            </th>
            <th style="width: 140px">Số công trình</th>
            <th style="width: 180px">Tổng số tiết giảng viên</th>
            <th style="width: 90px">Chi tiết</th>
          </tr>
        </thead>
        <tbody id="lecturerTableBody"></tbody>
      </table>
    </div>
  </div>

  <!-- Modal Chi Tiết -->
  <div class="modal fade stats-modal" id="recordDetailModal" tabindex="-1" aria-labelledby="recordDetailModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="recordDetailModalLabel">
            <i class="bi bi-journal-text me-2"></i>Chi tiết công trình
          </h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="stats-table-card table-responsive">
            <table class="table table-hover text-center align-middle">
              <thead>
                <tr>
                  <th style="width: 50px">STT</th>
                  <th>Loại NCKH</th>
                  <th class="text-start">Tên công trình</th>
                  <th class="text-start">Tác giả chính</th>
                  <th class="text-start">Thành viên</th>
                  <th>Tổng tiết công trình</th>
                  <th>Tiết của giảng viên</th>
                  <th>Vai trò</th>
                </tr>
              </thead>
              <tbody id="recordDetailTableBody"></tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
            <i class="bi bi-x-lg me-1"></i> Đóng
          </button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
  <script src="/js/nckh_v3/stats/common.js"></script>
  <script src="/js/nckh_v3/stats/lecturer.js"></script>
  <script>
    (function () {
      let currentSort = { key: null, direction: 'asc' };
      const sortKeyToColumnIndex = {
        'tenNhanVien': 1,
        'maPhongBan': 2
      };

      function compareRows(a, b, key, direction) {
        let idx = sortKeyToColumnIndex[key];
        let tdA = a.children[idx]?.innerText.trim().toLowerCase() || '';
        let tdB = b.children[idx]?.innerText.trim().toLowerCase() || '';
        if (tdA < tdB) return direction === 'asc' ? -1 : 1;
        if (tdA > tdB) return direction === 'asc' ? 1 : -1;
        return 0;
      }

      function updateSortIndicators() {
        document.querySelectorAll('th.sortable').forEach(th => {
          const indicator = th.querySelector('.sort-indicator');
          if (!indicator) return;
          if (th.dataset.sort === currentSort.key) {
            indicator.innerHTML = currentSort.direction === 'asc' ? '<i class="bi bi-caret-up-fill"></i>' : '<i class="bi bi-caret-down-fill"></i>';
          } else {
            indicator.innerHTML = '';
          }
        });
      }

      function sortTable(key) {
        const tableBody = document.getElementById('lecturerTableBody');
        if (!tableBody) return;
        let rows = Array.from(tableBody.querySelectorAll('tr'));
        let direction = 'asc';
        if (currentSort.key === key) {
          direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        }
        rows.sort((a, b) => compareRows(a, b, key, direction));
        rows.forEach(row => tableBody.appendChild(row));
        currentSort = { key, direction };
        updateSortIndicators();
      }

      document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', function () {
          const key = th.dataset.sort;
          sortTable(key);
        });
      });
      updateSortIndicators();
    })();
  </script>
</body>

</html>
```

## File: src/public/js/nckh_v3/stats/lecturer.js
```javascript
(function () {
  const state = { selectedLecturerId: null, rawLecturers: [], lecturers: [], records: [] };
  const el = { namHocFilter: null, khoaFilter: null, keywordInput: null, loadDataBtn: null, exportExcelBtn: null, lecturerTableBody: null, recordDetailTableBody: null, recordDetailModalLabel: null };
  let recordDetailModal = null, barInstance = null, pieInstance = null;

  const COLORS = ['#4f46e5','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16','#0ea5e9','#d946ef','#22c55e','#e11d48'];

  const api = {
    async getLecturers(namHoc, khoaId, keyword) { const r = await fetch(`/v3/nckh/stats/giang-vien?${new URLSearchParams({ namHoc, khoaId, keyword })}`); return r.json(); },
    async getLecturerRecords(lecturerId, namHoc, khoaId) { const r = await fetch(`/v3/nckh/stats/giang-vien/${lecturerId}/cong-trinh?${new URLSearchParams({ namHoc, khoaId })}`); return r.json(); },
  };

  function normalizeText(v) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }

  function cacheElements() {
    el.namHocFilter = document.getElementById("namHocFilter");
    el.khoaFilter = document.getElementById("khoaFilter");
    el.keywordInput = document.getElementById("keywordInput");
    el.loadDataBtn = document.getElementById("loadDataBtn");
    el.exportExcelBtn = document.getElementById("exportExcelBtn");
    el.lecturerTableBody = document.getElementById("lecturerTableBody");
    el.recordDetailTableBody = document.getElementById("recordDetailTableBody");
    el.recordDetailModalLabel = document.getElementById("recordDetailModalLabel");
    const m = document.getElementById("recordDetailModal");
    if (m) recordDetailModal = bootstrap.Modal.getOrCreateInstance(m);
  }

  function renderCharts() {
    const sec = document.getElementById("chartSection");
    if (!state.lecturers.length || !sec) { if (sec) sec.style.display = "none"; return; }
    sec.style.display = "";
    const ttOpts = { backgroundColor: "#1e293b", titleFont: { family: "Inter", weight: "bold" }, bodyFont: { family: "Inter" }, cornerRadius: 8, padding: 12 };

    // Bar - Top 15 lecturers by hours
    const sorted = [...state.lecturers].sort((a, b) => (Number(b.tongSoTietGiangVien) || 0) - (Number(a.tongSoTietGiangVien) || 0)).slice(0, 15);
    const barCtx = document.getElementById("lecturerBarChart");
    if (barCtx && sorted.length) {
      if (barInstance) barInstance.destroy();
      const gradient = barCtx.getContext("2d");
      barInstance = new Chart(barCtx, {
        type: "bar",
        data: {
          labels: sorted.map(r => r.tenNhanVien || "N/A"),
          datasets: [{
            label: "Tổng số tiết",
            data: sorted.map(r => Number(r.tongSoTietGiangVien) || 0),
            backgroundColor: sorted.map((_, i) => COLORS[i % COLORS.length]),
            borderWidth: 0,
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          indexAxis: "y",
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { ...ttOpts, callbacks: { label: ctx => ` ${ctx.parsed.x.toFixed(2).replace(".", ",")} tiết` } },
          },
          scales: {
            x: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.04)" }, title: { display: true, text: "Số tiết", font: { family: "Inter", size: 12 } }, ticks: { font: { family: "Inter" } } },
            y: { grid: { display: false }, ticks: { font: { family: "Inter", size: 11 }, autoSkip: false } },
          },
        },
      });
    }

    // Pie - by faculty
    const facultyMap = {};
    state.lecturers.forEach(r => {
      const k = r.maPhongBan || "Khác";
      facultyMap[k] = (facultyMap[k] || 0) + (r.soCongTrinh || 0);
    });
    const fLabels = Object.keys(facultyMap);
    const fData = Object.values(facultyMap);

    const pieCtx = document.getElementById("lecturerPieChart");
    if (pieCtx && fLabels.length) {
      if (pieInstance) pieInstance.destroy();
      pieInstance = new Chart(pieCtx, {
        type: "doughnut",
        data: { labels: fLabels, datasets: [{ data: fData, backgroundColor: COLORS.slice(0, fLabels.length), borderWidth: 2, borderColor: "#fff", hoverOffset: 6 }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: "55%",
          plugins: {
            legend: { position: "bottom", labels: { usePointStyle: true, padding: 10, font: { family: "Inter", size: 11 }, boxWidth: 10 } },
            tooltip: { ...ttOpts, callbacks: { label: ctx => { const t = ctx.dataset.data.reduce((a, b) => a + b, 0); return ` ${ctx.label}: ${ctx.parsed} (${t > 0 ? ((ctx.parsed / t) * 100).toFixed(1) : 0}%)`; } } },
          },
        },
      });
    }
  }

  function renderLecturers() {
    if (!el.lecturerTableBody) return;
    if (!state.lecturers.length) { el.lecturerTableBody.innerHTML = '<tr><td colspan="6" class="text-muted py-4">Không có dữ liệu</td></tr>'; return; }
    const esc = window.NCKH_V3_STATS.helpers.escapeHtml, fmt = window.NCKH_V3_STATS.helpers.formatHours;
    el.lecturerTableBody.innerHTML = state.lecturers.map((row, i) => {
      const ac = state.selectedLecturerId === row.lecturerId ? "table-warning" : "";
      return `<tr class="${ac}"><td>${i + 1}</td><td class="text-start">${esc(row.tenNhanVien)}</td><td>${esc(row.maPhongBan || "")}</td><td>${row.soCongTrinh}</td><td>${fmt(row.tongSoTietGiangVien)}</td><td><button class="btn btn-sm btn-outline-info" data-action="detail" data-id="${row.lecturerId}"><i class="bi bi-eye"></i></button></td></tr>`;
    }).join("");
  }

  function applyLecturerFilter() {
    const kw = normalizeText(el.keywordInput?.value || "");
    state.lecturers = kw ? state.rawLecturers.filter(r => normalizeText(r.tenNhanVien).includes(kw)) : [...state.rawLecturers];
    renderLecturers();
    renderCharts();
  }

  function renderRecords() {
    if (!el.recordDetailTableBody) return;
    if (!state.records.length) { el.recordDetailTableBody.innerHTML = '<tr><td colspan="9" class="text-muted py-4">Không có dữ liệu chi tiết</td></tr>'; return; }
    const esc = window.NCKH_V3_STATS.helpers.escapeHtml, fmt = window.NCKH_V3_STATS.helpers.formatHours;
    el.recordDetailTableBody.innerHTML = state.records.map((row, i) => `<tr><td>${i + 1}</td><td>${esc(row.loaiNckhLabel)}</td><td class="text-start">${esc(row.tenCongTrinh)}</td><td class="text-start">${esc(row.tacGiaChinh)}</td><td class="text-start">${esc(row.thanhVien)}</td><td>${fmt(row.tongSoTietCongTrinh)}</td><td>${fmt(row.soTietGiangVien)}</td><td>${window.NCKH_V3_STATS.helpers.formatRole(row.vaiTroGiangVien)}</td></tr>`).join("");
  }

  async function loadSummary() {
    const namHoc = String(el.namHocFilter?.value || "").trim();
    const khoaId = String(el.khoaFilter?.value || "ALL").trim();
    if (!namHoc) { await Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học", "warning"); return; }
    const result = await api.getLecturers(namHoc, khoaId, "");
    if (!result.success) throw new Error(result.message || "Không thể lấy thống kê giảng viên");
    state.rawLecturers = Array.isArray(result.data) ? result.data : [];
    state.selectedLecturerId = null; state.records = [];
    applyLecturerFilter();
  }

  async function loadLecturerRecords(lecturerId) {
    const namHoc = String(el.namHocFilter?.value || "").trim();
    const khoaId = String(el.khoaFilter?.value || "ALL").trim();
    const result = await api.getLecturerRecords(lecturerId, namHoc, khoaId);
    if (!result.success) throw new Error(result.message || "Không thể lấy danh sách công trình");
    state.selectedLecturerId = Number(lecturerId);
    state.records = Array.isArray(result.data) ? result.data : [];
    renderLecturers(); renderRecords();
    const sel = state.lecturers.find(item => Number(item.lecturerId) === Number(lecturerId));
    if (el.recordDetailModalLabel) el.recordDetailModalLabel.textContent = `Chi tiết công trình - ${sel?.tenNhanVien || "Giảng viên"}`;
    if (recordDetailModal) recordDetailModal.show();
  }

  async function initFilters() {
    const [yr, fl] = await Promise.all([window.NCKH_V3_STATS.api.getNamHoc(), window.NCKH_V3_STATS.api.getFilters()]);
    if (yr?.success) window.NCKH_V3_STATS.helpers.fillNamHocOptions(el.namHocFilter, yr.NamHoc || []);
    if (fl?.success) window.NCKH_V3_STATS.helpers.fillKhoaOptions(el.khoaFilter, fl.data?.khoaList || [], true);
  }

  function bindEvents() {
    el.loadDataBtn?.addEventListener("click", async () => { try { await loadSummary(); } catch (e) { await window.NCKH_V3_STATS.helpers.showError(e, "Không thể tải dữ liệu"); } });
    el.keywordInput?.addEventListener("input", () => { state.selectedLecturerId = null; state.records = []; applyLecturerFilter(); });
    el.exportExcelBtn?.addEventListener("click", () => {
      const namHoc = String(el.namHocFilter?.value || "").trim();
      if (!namHoc) { Swal.fire("Thiếu thông tin", "Vui lòng chọn năm học trước khi xuất Excel", "warning"); return; }
      const khoaId = String(el.khoaFilter?.value || "ALL").trim(), keyword = String(el.keywordInput?.value || "").trim();
      window.location.href = `/v3/nckh/export/stats/giang-vien?${new URLSearchParams({ namHoc, khoaId, keyword })}`;
    });
    el.lecturerTableBody?.addEventListener("click", async (event) => {
      const btn = event.target.closest("button[data-action='detail']"); if (!btn) return;
      const id = btn.getAttribute("data-id"); if (!id) return;
      try { await loadLecturerRecords(id); } catch (e) { await window.NCKH_V3_STATS.helpers.showError(e, "Không thể tải công trình của giảng viên"); }
    });
  }

  async function init() { cacheElements(); await initFilters(); bindEvents(); await loadSummary(); }
  window.addEventListener("DOMContentLoaded", () => { init().catch(async (e) => { await window.NCKH_V3_STATS.helpers.showError(e, "Không thể khởi tạo thống kê giảng viên"); }); });
})();
```

## File: src/services/nckh_v3/typeInput.service.js
```javascript
const createPoolConnection = require("../../config/databasePool");
const LogService = require("../logService");

const nckhChungRepo = require("../../repositories/nckh_v3/nckhChung.repo");
const nckhSoTietRepo = require("../../repositories/nckh_v3/nckhSoTiet.repo");
const nhanVienRepo = require("../../repositories/nckh_v3/nhanVien.repo");
const phongBanRepo = require("../../repositories/nckh_v3/phongBan.repo");
const responseMapper = require("../../mappers/nckh_v3/response.mapper");

const formulaService = require("./formula.service");
const validator = require("../../validators/nckh_v3/typeInput.validator");
const quyDinhService = require("./quyDinh.service");

const HOI_DONG_ROLES = new Set(["chu_tich", "phan_bien", "uy_vien"]);

const getPhanLoaiOptions = async (loaiNckh) => {
  return quyDinhService.getQuyDinhSoGioByLoai(loaiNckh);
};

const assertNhanVienExist = async (connection, participants) => {
  const ids = participants
    .filter((item) => item.nhanvienId !== null && item.nhanvienId !== undefined)
    .map((item) => Number(item.nhanvienId));

  if (ids.length === 0) return;

  const rows = await nhanVienRepo.getByIds(connection, ids);

  if (rows.length !== ids.length) {
    throw new Error("Có giảng viên không tồn tại trong danh sách tham gia");
  }
};


const createTypeInputService = ({ loaiNckh, mode, logLabel }) => {
  const assertRecordType = (record) => {
    if (!record || String(record.loai_nckh || "") !== String(loaiNckh)) {
      throw new Error("Không tìm thấy công trình");
    }
  };

  const create = async (payload, userContext) => {
    validator.validateMainPayload(payload);

    const tacGiaIds = Array.isArray(payload.tacGiaIds) ? payload.tacGiaIds : [];
    const thanhVienIds = Array.isArray(payload.thanhVienIds) ? payload.thanhVienIds : [];
    const tacGiaNgoai = Array.isArray(payload.tacGiaNgoai) ? payload.tacGiaNgoai : [];
    const thanhVienNgoai = Array.isArray(payload.thanhVienNgoai) ? payload.thanhVienNgoai : [];

    validator.validatePeopleInput(tacGiaIds, thanhVienIds, tacGiaNgoai, thanhVienNgoai);
    const soNamThucHien = Number(payload.soNamThucHien || 1);
    const vaiTroHoiDong = mode === "fixed" ? String(payload.vaiTro || "").trim() : null;

    if (mode === "fixed") {
      if (!vaiTroHoiDong) {
        throw new Error("Thiếu vai trò hội đồng");
      }
      if (!HOI_DONG_ROLES.has(vaiTroHoiDong)) {
        throw new Error("Vai trò hội đồng không hợp lệ");
      }
    }

    let connection;
    try {
      connection = await createPoolConnection();
      await connection.beginTransaction();

      const participants = formulaService.buildParticipantsByMode(
        mode,
        Number(payload.tongSoTiet),
        tacGiaIds,
        thanhVienIds,
        tacGiaNgoai,
        thanhVienNgoai,
        soNamThucHien,
        vaiTroHoiDong
      );

      await assertNhanVienExist(connection, participants);

      const nckhId = await nckhChungRepo.insert(connection, {
        tenCongTrinh: payload.tenCongTrinh,
        loaiNckh,
        phanLoai: payload.phanLoai,
        namHoc: payload.namHoc,
        tongSoTiet: Number(payload.tongSoTiet),
        khoaDuyet: 0,
        vienNcDuyet: 0,
        ngayNghiemThu: payload.ngayNghiemThu,
        xepLoai: payload.xepLoai,
        maSo: payload.maSo,
      });

      await nckhSoTietRepo.bulkInsert(connection, nckhId, participants);

      const total = formulaService.round2(await nckhSoTietRepo.sumHours(connection, nckhId));
      const expected = formulaService.round2(Number(payload.tongSoTiet));

      if (total !== expected) {
        throw new Error(`Tổng số tiết phân bổ (${total}) không khớp tổng số tiết công trình (${expected})`);
      }

      await connection.commit();

      try {
        await LogService.logChange(
          userContext.userId,
          userContext.userName,
          "NCKH V3",
          `Thêm ${logLabel}: \"${payload.tenCongTrinh}\" (ID: ${nckhId})`
        );
      } catch (err) {
        console.error("[NCKH V3] Log failed:", err.message);
      }

      return { id: nckhId };
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  };

  const update = async (id, payload, userContext) => {
    validator.validateMainPayload(payload);

    const tacGiaIds = Array.isArray(payload.tacGiaIds) ? payload.tacGiaIds : [];
    const thanhVienIds = Array.isArray(payload.thanhVienIds) ? payload.thanhVienIds : [];
    const tacGiaNgoai = Array.isArray(payload.tacGiaNgoai) ? payload.tacGiaNgoai : [];
    const thanhVienNgoai = Array.isArray(payload.thanhVienNgoai) ? payload.thanhVienNgoai : [];

    validator.validatePeopleInput(tacGiaIds, thanhVienIds, tacGiaNgoai, thanhVienNgoai);
    const soNamThucHien = Number(payload.soNamThucHien || 1);
    const vaiTroHoiDong = mode === "fixed" ? String(payload.vaiTro || "").trim() : null;

    if (mode === "fixed") {
      if (!vaiTroHoiDong) {
        throw new Error("Thiếu vai trò hội đồng");
      }
      if (!HOI_DONG_ROLES.has(vaiTroHoiDong)) {
        throw new Error("Vai trò hội đồng không hợp lệ");
      }
    }

    let connection;
    try {
      connection = await createPoolConnection();
      await connection.beginTransaction();

      const current = await nckhChungRepo.findById(connection, Number(id));
      assertRecordType(current);

      if (Number(current.vien_nc_duyet) === 1) {
        throw new Error("Không được sửa công trình đã được viện duyệt");
      }

      const participants = formulaService.buildParticipantsByMode(
        mode,
        Number(payload.tongSoTiet),
        tacGiaIds,
        thanhVienIds,
        tacGiaNgoai,
        thanhVienNgoai,
        soNamThucHien,
        vaiTroHoiDong
      );

      await assertNhanVienExist(connection, participants);

      await nckhChungRepo.updateById(connection, Number(id), {
        tenCongTrinh: payload.tenCongTrinh,
        loaiNckh,
        phanLoai: payload.phanLoai,
        namHoc: payload.namHoc,
        tongSoTiet: Number(payload.tongSoTiet),
        ngayNghiemThu: payload.ngayNghiemThu,
        xepLoai: payload.xepLoai,
        maSo: payload.maSo,
      });

      await nckhSoTietRepo.deleteByNckhId(connection, Number(id));
      await nckhSoTietRepo.bulkInsert(connection, Number(id), participants);


      const total = formulaService.round2(await nckhSoTietRepo.sumHours(connection, Number(id)));
      const expected = formulaService.round2(Number(payload.tongSoTiet));

      if (total !== expected) {
        throw new Error(`Tổng số tiết phân bổ (${total}) không khớp tổng số tiết công trình (${expected})`);
      }

      await connection.commit();

      try {
        await LogService.logChange(
          userContext.userId,
          userContext.userName,
          "NCKH V3",
          `Cập nhật ${logLabel} ID ${id}`
        );
      } catch (err) {
        console.error("[NCKH V3] Log failed:", err.message);
      }

      return { id: Number(id) };
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  };

  const remove = async (id, userContext) => {
    let connection;
    try {
      connection = await createPoolConnection();
      await connection.beginTransaction();

      const current = await nckhChungRepo.findById(connection, Number(id));
      assertRecordType(current);

      if (Number(current.khoa_duyet) === 1 || Number(current.vien_nc_duyet) === 1) {
        throw new Error("Không được xóa công trình đã duyệt");
      }

      await nckhSoTietRepo.deleteByNckhId(connection, Number(id));
      await nckhChungRepo.deleteById(connection, Number(id));

      await connection.commit();

      try {
        await LogService.logChange(
          userContext.userId,
          userContext.userName,
          "NCKH V3",
          `Xóa ${logLabel} ID ${id}`
        );
      } catch (err) {
        console.error("[NCKH V3] Log failed:", err.message);
      }

      return { id: Number(id) };
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  };

  const list = async (namHoc, khoaId) => {
    let connection;
    try {
      connection = await createPoolConnection();
      const rows = await nckhChungRepo.listByType(connection, loaiNckh, namHoc, khoaId);
      return responseMapper.mapListResponse(rows);
    } finally {
      if (connection) connection.release();
    }
  };

  const getById = async (id) => {
    let connection;
    try {
      connection = await createPoolConnection();
      const main = await nckhChungRepo.findById(connection, Number(id));
      if (!main || String(main.loai_nckh || "") !== String(loaiNckh)) {
        return null;
      }

      const participants = await nckhSoTietRepo.getByNckhId(connection, Number(id));
      return responseMapper.mapDetailResponse(main, participants);
    } finally {
      if (connection) connection.release();
    }
  };

  const getMetadata = async (khoaId = "ALL") => {
    let connection;
    try {
      connection = await createPoolConnection();

      const [khoaList, giangVienList, phanLoaiOptions] = await Promise.all([
        phongBanRepo.listKhoa(connection),
        nhanVienRepo.listByKhoaId(connection, khoaId),
        getPhanLoaiOptions(loaiNckh),
      ]);

      return { khoaList, giangVienList, phanLoaiOptions };
    } finally {
      if (connection) connection.release();
    }
  };

  return {
    create,
    update,
    remove,
    list,
    getById,
    getMetadata,
  };
};

module.exports = {
  createTypeInputService,
};
```

## File: src/public/js/nckh_v3/list/index.js
```javascript
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
        <tr data-id="${row.id}">
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
```

## File: src/services/nckh_v3/record.service.js
```javascript
const createPoolConnection = require("../../config/databasePool");
const LogService = require("../logService");

const { NCKH_TYPE_OPTIONS } = require("../../config/nckh_v3/types");
const { validateApprovalValue } = require("../../validators/nckh_v3/approval.validator");

const nckhChungRepo = require("../../repositories/nckh_v3/nckhChung.repo");
const nckhSoTietRepo = require("../../repositories/nckh_v3/nckhSoTiet.repo");
const phongBanRepo = require("../../repositories/nckh_v3/phongBan.repo");

const typeMetaByLoai = new Map(
  (NCKH_TYPE_OPTIONS || []).map((item) => [String(item.loaiNckh || ""), item])
);

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const HOI_DONG_ROLE_LABELS = {
  chu_tich: "Chủ tịch",
  phan_bien: "Phản biện",
  uy_vien: "Ủy viên",
};

const toParticipantDisplay = (participant) => {
  const isExternal = participant.nhanvien_id === null || participant.nhanvien_id === undefined;
  const soTiet = round2(Number(participant.so_tiet || 0)).toFixed(2);

  if (isExternal) {
    const ten = String(participant.ten_ngoai || "").trim() || "Không rõ tên";
    const donViNgoai = String(participant.don_vi_ngoai || "").trim() || "Chưa có";
    return {
      key: `ngoai:${ten.toLowerCase()}|${donViNgoai.toLowerCase()}|${participant.vai_tro || ""}`,
      nameOnly: ten,
      display: `${ten} - ${donViNgoai} (${soTiet} tiết)`,
      sortId: Number(participant.id || 0),
      hours: Number(participant.so_tiet || 0),
    };
  }

  const tenNhanVien = String(participant.TenNhanVien || "").trim() || "Không rõ tên";
  const khoa = String(participant.MaPhongBan || "").trim() || "Chưa có";
  const nhanVienId = Number(participant.nhanvien_id || 0);

  return {
    key: `noi:${nhanVienId}|${participant.vai_tro || ""}`,
    nameOnly: tenNhanVien,
    display: `${tenNhanVien} - ${khoa} (${soTiet} tiết)`,
    sortId: Number(participant.id || 0),
    hours: Number(participant.so_tiet || 0),
  };
};

const mergeParticipantsByRole = (participantRows, role) => {
  const map = new Map();

  for (const row of participantRows) {
    if (String(row.vai_tro || "") !== role) continue;

    const normalized = toParticipantDisplay(row);
    if (!map.has(normalized.key)) {
      map.set(normalized.key, normalized);
      continue;
    }

    const current = map.get(normalized.key);
    const nextHours = round2(Number(current.hours || 0) + Number(normalized.hours || 0));
    const displayBase = current.display.replace(/ \([0-9]+(?:\.[0-9]+)? tiết\)$/u, "");

    map.set(normalized.key, {
      ...current,
      hours: nextHours,
      sortId: Math.min(Number(current.sortId || 0), Number(normalized.sortId || 0)),
      display: `${displayBase} (${nextHours.toFixed(2)} tiết)`,
    });
  }

  return Array.from(map.values()).sort((a, b) => a.sortId - b.sortId);
};

const buildHoiDongSummary = (participantRows) => {
  const roleOrder = ["chu_tich", "phan_bien", "uy_vien"];
  const names = [];
  const displays = [];

  roleOrder.forEach((role) => {
    const label = HOI_DONG_ROLE_LABELS[role] || role;
    const merged = mergeParticipantsByRole(participantRows, role);
    merged.forEach((item) => {
      names.push(`${item.nameOnly} (${label})`);
      displays.push(`${item.display} - ${label}`);
    });
  });

  return {
    nameText: names.join(", "),
    displayText: displays.join("\n"),
  };
};

const toSummaryRecord = (row) => {
  const meta = typeMetaByLoai.get(String(row.loai_nckh || "")) || null;
  const rawId = row.id ?? row.ID;

  return {
    id: Number(rawId),
    loaiNckh: row.loai_nckh,
    typeSlug: meta ? meta.value : null,
    loaiNckhLabel: meta ? meta.label : row.loai_nckh,
    phanLoai: row.phan_loai || "",
    tenCongTrinh: row.ten_cong_trinh || "",
    maSo: row.ma_so || "",
    xepLoai: row.xep_loai || "",
    ngayNghiemThu: row.ngay_nghiem_thu || null,
    tacGiaChinh: row.tac_gia_chinh || "",
    thanhVien: row.thanh_vien || "",
    namHoc: row.nam_hoc,
    tongSoTiet: round2(Number(row.tong_so_tiet || 0)),
    khoaDuyet: Number(row.khoa_duyet || 0),
    vienNcDuyet: Number(row.vien_nc_duyet || 0),
    createdAt: row.created_at || null,
  };
};

const list = async (namHoc, khoaId) => {
  if (!namHoc) {
    throw new Error("Thiếu năm học");
  }

  const safeKhoaId = String(khoaId || "ALL").trim() || "ALL";

  let connection;
  try {
    connection = await createPoolConnection();
    const rows = await nckhChungRepo.listUnified(connection, String(namHoc).trim(), safeKhoaId);
    const records = rows.map(toSummaryRecord);

    if (!records.length) {
      return records;
    }

    const participants = await nckhSoTietRepo.getByNckhIds(connection, records.map((item) => item.id));
    const participantsByRecordId = new Map();

    for (const participant of participants) {
      const recordId = Number(participant.nckh_id || 0);
      if (!participantsByRecordId.has(recordId)) {
        participantsByRecordId.set(recordId, []);
      }
      participantsByRecordId.get(recordId).push(participant);
    }

    return records.map((record) => {
      const recordParticipants = participantsByRecordId.get(record.id) || [];
      if (record.loaiNckh === "HOIDONG") {
        const hoiDongSummary = buildHoiDongSummary(recordParticipants);
        return {
          ...record,
          tacGiaChinh: hoiDongSummary.nameText,
          thanhVien: "",
          tacGiaChinhDisplay: hoiDongSummary.displayText,
          thanhVienDisplay: "",
        };
      }

      const tacGia = mergeParticipantsByRole(recordParticipants, "tac_gia");
      const thanhVien = mergeParticipantsByRole(recordParticipants, "thanh_vien");

      return {
        ...record,
        tacGiaChinh: tacGia.map((item) => item.nameOnly).join(", "),
        thanhVien: thanhVien.map((item) => item.nameOnly).join(", "),
        tacGiaChinhDisplay: tacGia.map((item) => item.display).join("\n"),
        thanhVienDisplay: thanhVien.map((item) => item.display).join("\n"),
      };
    });
  } finally {
    if (connection) connection.release();
  }
};

const detail = async (id) => {
  let connection;
  try {
    connection = await createPoolConnection();

    const main = await nckhChungRepo.findById(connection, Number(id));
    if (!main) return null;

    const participants = await nckhSoTietRepo.getByNckhId(connection, Number(id));
    const meta = typeMetaByLoai.get(String(main.loai_nckh || "")) || null;

    const rawId = main.id ?? main.ID;

    return {
      id: Number(rawId),
      loaiNckh: main.loai_nckh,
      typeSlug: meta ? meta.value : null,
      loaiNckhLabel: meta ? meta.label : main.loai_nckh,
      phanLoai: main.phan_loai || "",
      tenCongTrinh: main.ten_cong_trinh || "",
      maSo: main.ma_so || "",
      xepLoai: main.xep_loai || "",
      ngayNghiemThu: main.ngay_nghiem_thu || null,
      namHoc: main.nam_hoc,
      tongSoTiet: round2(Number(main.tong_so_tiet || 0)),
      khoaDuyet: Number(main.khoa_duyet || 0),
      vienNcDuyet: Number(main.vien_nc_duyet || 0),
      participants: participants.map((item) => ({
        id: item.id,
        vaiTro: item.vai_tro,
        tenNhanVien: item.TenNhanVien || item.ten_ngoai || "",
        tenNgoai: item.ten_ngoai || null,
        donViNgoai: item.don_vi_ngoai || null,
        soTiet: round2(Number(item.so_tiet || 0)),
      })),
    };
  } finally {
    if (connection) connection.release();
  }
};

const updateKhoaApproval = async (id, value) => {
  const khoaDuyet = validateApprovalValue(value, "khoaDuyet");

  let connection;
  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    const current = await nckhChungRepo.findById(connection, Number(id));
    if (!current) throw new Error("Không tìm thấy công trình");

    if (khoaDuyet === 0 && Number(current.vien_nc_duyet) === 1) {
      throw new Error("Không thể bỏ duyệt khoa khi viện đã duyệt");
    }

    if (khoaDuyet === 0) {
      await nckhChungRepo.setKhoaApproval(connection, Number(id), 0, 0);
    } else {
      await nckhChungRepo.setKhoaApproval(connection, Number(id), 1);
    }

    await connection.commit();
    return { id: Number(id), khoaDuyet };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

const updateVienApproval = async (id, value) => {
  const vienNcDuyet = validateApprovalValue(value, "vienNcDuyet");

  let connection;
  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    const current = await nckhChungRepo.findById(connection, Number(id));
    if (!current) throw new Error("Không tìm thấy công trình");

    if (vienNcDuyet === 1 && Number(current.khoa_duyet) !== 1) {
      throw new Error("Không thể duyệt viện khi khoa chưa duyệt");
    }

    if (vienNcDuyet === 0) {
      await nckhChungRepo.setVienApproval(connection, Number(id), 0, 0);
    } else {
      await nckhChungRepo.setVienApproval(connection, Number(id), 1);
    }

    await connection.commit();
    return { id: Number(id), vienNcDuyet };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

const getFilters = async () => {
  let connection;
  try {
    connection = await createPoolConnection();
    const khoaList = await phongBanRepo.listKhoa(connection);
    return { khoaList };
  } finally {
    if (connection) connection.release();
  }
};

const updateBulkApprovals = async (updates) => {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error("Danh sách cập nhật không hợp lệ");
  }

  let connection;
  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    // Validate each update and check constraints
    for (const update of updates) {
      const { id, khoaDuyet, vienNcDuyet } = update;

      if (!id) {
        throw new Error("ID công trình không hợp lệ");
      }

      const current = await nckhChungRepo.findById(connection, Number(id));
      if (!current) {
        throw new Error(`Không tìm thấy công trình với ID ${id}`);
      }

      // Validate khoa approval constraints
      if (khoaDuyet === 0 && Number(current.vien_nc_duyet) === 1) {
        throw new Error(`Không thể bỏ duyệt khoa của công trình "${current.ten_cong_trinh}" khi viện đã duyệt`);
      }

      // Validate vien approval constraints
      if (vienNcDuyet === 1 && Number(current.khoa_duyet) !== 1) {
        throw new Error(`Không thể duyệt viện của công trình "${current.ten_cong_trinh}" khi khoa chưa duyệt`);
      }
    }

    // All validations passed, proceed with updates
    await nckhChungRepo.bulkUpdateApprovals(connection, updates);
    await connection.commit();

    return {
      success: true,
      message: `Cập nhật thành công ${updates.length} công trình`,
      count: updates.length,
    };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

const removeRecord = async (id, userContext) => {
  let connection;
  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    const current = await nckhChungRepo.findById(connection, Number(id));
    if (!current) {
      throw new Error("Không tìm thấy công trình");
    }

    if (Number(current.vien_nc_duyet) === 1) {
      throw new Error("Không được xóa công trình đã được Viện duyệt");
    }

    await nckhSoTietRepo.deleteByNckhId(connection, Number(id));
    await nckhChungRepo.deleteById(connection, Number(id));

    await connection.commit();

    try {
      await LogService.logChange(
        userContext.userId,
        userContext.userName,
        "NCKH V3",
        `Xóa công trình NCKH ID ${id} (Tên: "${current.ten_cong_trinh}") từ danh sách chung`
      );
    } catch (err) {
      console.error("[NCKH V3] Log failed:", err.message);
    }

    return { id: Number(id) };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  list,
  detail,
  removeRecord,
  updateKhoaApproval,
  updateVienApproval,
  updateBulkApprovals,
  getFilters,
};
```

## File: src/views/nckh_v3/list.ejs
```ejs
<!DOCTYPE html>
<html lang="vi">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NCKH V3 - Xem chung</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />
  <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />

  <link rel="stylesheet" href="/css/admin.css" />
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="stylesheet" href="/css/nckh_v3.css" />

  <style>
    .nckh-v3-list-wrap {
      padding: 16px;
      max-width: 1700px;
      margin: 0 auto;
    }

    .nckh-v3-list-toolbar {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .nckh-v3-list-toolbar .form-select,
    .nckh-v3-list-toolbar .form-control,
    .nckh-v3-list-toolbar .btn {
      margin-top: 0 !important;
      margin-bottom: 0 !important;
    }

    .nckh-v3-list-toolbar .toolbar-item {
      min-width: 180px;
    }

    .nckh-v3-list-toolbar .toolbar-item label {
      font-weight: 600;
      margin-bottom: 4px;
      font-size: 0.85rem;
      color: #495057;
      display: block;
    }

    .nckh-v3-list-toolbar .toolbar-item select {
      height: 42px;
    }

    .nckh-v3-list-toolbar .toolbar-item input {
      height: 42px;
    }

    .nckh-v3-list-toolbar .toolbar-action {
      display: flex;
      align-items: flex-end;
      gap: 8px;
    }

    .nckh-v3-list-toolbar .toolbar-action button {
      height: 42px;
      min-width: 140px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1.2;
    }

    .nckh-v3-list-table {
      width: 100%;
      overflow-x: auto; /* Just in case horizontal scrolling is needed, but vertical scrolling is natively on page */
    }

    .nckh-v3-list-table .table {
      margin-bottom: 0;
      min-width: 1500px;
    }

    .nckh-v3-list-table thead th {
      background: #f8f9fa;
      vertical-align: middle;
      white-space: nowrap;
    }

    .nckh-v3-list-table td, 
    .nckh-v3-list-table th {
      vertical-align: middle;
      padding: 8px;
    }

    .nckh-v3-list-table .col-main {
      min-width: 260px;
    }

    .nckh-v3-list-table .col-people {
      white-space: nowrap;
    }

    .nckh-v3-person-row {
      display: block;
      white-space: nowrap;
      line-height: 1.35;
    }

    .nckh-v3-person-row + .nckh-v3-person-row {
      margin-top: 2px;
    }

    .nckh-v3-checkbox {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .nckh-v3-checkbox:disabled {
      cursor: not-allowed;
      opacity: 0.45;
    }


  </style>
</head>

<body>
  <%- include('../header') %>

  <div class="nckh-v3-list-wrap">
    <div class="page-header d-flex justify-content-between align-items-center flex-wrap gap-2">
      <h1 class="page-title mb-0">Danh sách NCKH</h1>
      <div class="d-flex gap-2">
        <a href="/v3/nckh/import" class="btn btn-outline-success btn-sm"><i class="bi bi-cloud-upload"></i> Import</a>
        <a href="/v3/nckh/thong-ke/giang-vien" class="btn btn-outline-primary btn-sm">TK theo GV</a>
        <a href="/v3/nckh/thong-ke/khoa" class="btn btn-outline-primary btn-sm">TK theo Khoa</a>
        <a href="/v3/nckh/thong-ke/hoc-vien" class="btn btn-outline-primary btn-sm">TK theo HV</a>
      </div>
    </div>

    <div class="nckh-v3-list-toolbar">
      <div class="toolbar-item">
        <!-- <label for="namHocFilter">Năm học</label> -->
        <select id="namHocFilter" class="form-select"></select>
      </div>

      <div class="toolbar-item">
        <!-- <label for="khoaFilter">Khoa</label> -->
        <select id="khoaFilter" class="form-select">
          <option value="ALL">Tất cả khoa</option>
        </select>
      </div>

      <div class="toolbar-item" style="min-width: 260px;">
        <input
          id="workNameSearchInput"
          class="form-control"
          placeholder="Tên công trình"
        />
      </div>

      <div class="toolbar-item" style="min-width: 280px;">
        <input
          id="authorMemberSearchInput"
          class="form-control"
          placeholder="Tác giả / thành viên"
        />
      </div>

      <div class="toolbar-action">
        <button id="loadDataBtn" class="btn btn-primary">
          <i class="bi bi-search"></i> Hiển thị
        </button>
        <button id="submitApprovalsBtn" class="btn btn-success" style="display: none;">
          <i class="bi bi-check-circle"></i> Duyệt
        </button>
      </div>
    </div>

    <div class="nckh-v3-list-table">
      <table border="1" style="width: 100%; border-collapse: collapse; text-align: center;">
        <thead>
          <tr>
            <th>STT</th>
            <th class="sortable" data-sort="loai_nckh" style="cursor:pointer">Loại NCKH <span class="sort-indicator"></span></th>
            <th class="sortable" data-sort="phan_loai" style="cursor:pointer">Phân loại <span class="sort-indicator"></span></th>
            <th class="sortable text-start" data-sort="ten_cong_trinh" style="cursor:pointer">Tên công trình <span class="sort-indicator"></span></th>
            <th>Mã số / Số QĐ</th>
            <th>Xếp loại</th>
            <th>Ngày nghiệm thu</th>
            <th class="text-start">Tác giả chính/Chủ nhiệm</th>
            <th class="text-start">Thành viên</th>
            <th>Khoa</th>
            <th>Tổng số tiết</th>
            <th style="width: 64px;">
              <div style="font-size: 0.75rem; font-weight: bold; line-height: 1.3;">
                Khoa
                <br />
                <input
                  type="checkbox"
                  id="selectAllKhoaDuyet"
                  class="nckh-v3-checkbox"
                  title="Chọn tất cả khoa duyệt"
                />
              </div>
            </th>
            <th style="width: 64px;">
              <div style="font-size: 0.75rem; font-weight: bold; line-height: 1.3;">
                Viện NC
                <br />
                <input
                  type="checkbox"
                  id="selectAllVienDuyet"
                  class="nckh-v3-checkbox"
                  title="Chọn tất cả viện duyệt"
                />
              </div>
            </th>
            <th>Chi tiết</th>
            <th style="width: 64px;">Xóa</th>
          </tr>
        </thead>
        <tbody id="recordsTableBody"></tbody>
      </table>
    </div>

    <!-- <div class="nckh-v3-inline-note">
      Nút sửa đang tạm ẩn theo yêu cầu. Trang này chỉ phục vụ xem và duyệt.
    </div> -->
  </div>

  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>

  <script src="/js/nckh_v3/main/permissions.js"></script>
  <script src="/js/nckh_v3/list/index.js"></script>
  <script>
    (function () {

      // Sort logic
      let currentSort = { key: null, direction: 'asc' };
      const sortKeyToColumnIndex = {
        'loai_nckh': 1,
        'phan_loai': 2,
        'ten_cong_trinh': 3
      };

      function compareRows(a, b, key, direction) {
        let idx = sortKeyToColumnIndex[key];
        let tdA = a.children[idx]?.innerText.trim().toLowerCase() || '';
        let tdB = b.children[idx]?.innerText.trim().toLowerCase() || '';
        if (tdA < tdB) return direction === 'asc' ? -1 : 1;
        if (tdA > tdB) return direction === 'asc' ? 1 : -1;
        return 0;
      }

      function updateSortIndicators() {
        document.querySelectorAll('th.sortable').forEach(th => {
          const indicator = th.querySelector('.sort-indicator');
          if (!indicator) return;
          if (th.dataset.sort === currentSort.key) {
            indicator.innerHTML = currentSort.direction === 'asc' ? '<i class="bi bi-caret-up-fill"></i>' : '<i class="bi bi-caret-down-fill"></i>';
          } else {
            indicator.innerHTML = '';
          }
        });
      }

      function sortTable(key) {
        const tableBody = document.getElementById('recordsTableBody');
        if (!tableBody) return;
        let rows = Array.from(tableBody.querySelectorAll('tr'));
        let direction = 'asc';
        if (currentSort.key === key) {
          direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        }
        rows.sort((a, b) => compareRows(a, b, key, direction));
        rows.forEach(row => tableBody.appendChild(row));
        currentSort = { key, direction };
        updateSortIndicators();
      }

      document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', function () {
          const key = th.dataset.sort;
          sortTable(key);
        });
      });
      updateSortIndicators();
    })();
  </script>
</body>

</html>
```