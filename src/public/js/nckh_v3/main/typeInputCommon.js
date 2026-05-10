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
