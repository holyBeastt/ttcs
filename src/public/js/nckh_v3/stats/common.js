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
  };

  window.NCKH_V3_STATS = {
    api,
    helpers,
  };
})();
