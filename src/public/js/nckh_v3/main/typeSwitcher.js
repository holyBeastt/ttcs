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
