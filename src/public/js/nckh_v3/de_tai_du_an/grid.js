window.NCKH_V3_DeTaiDuAn = window.NCKH_V3_DeTaiDuAn || {};

window.NCKH_V3_DeTaiDuAn.grid = {
  rows: [],

  getFilterValues() {
    return {
      namHoc: document.getElementById("filterNamHoc").value,
      khoaId: document.getElementById("filterKhoaId").value || "ALL",
    };
  },

  renderRows() {
    const tbody = document.getElementById("deTaiTableBody");
    tbody.innerHTML = "";

    this.rows.forEach((row, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${row.tenCongTrinh}</td>
        <td>${row.phanLoai}</td>
        <td>${row.namHoc}</td>
        <td>${row.tongSoTiet}</td>
        <td>${row.tenPhongBan || ""}</td>
        <td>${row.khoaDuyet ? "Da duyet" : "Chua duyet"}</td>
        <td>${row.vienNcDuyet ? "Da duyet" : "Chua duyet"}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${row.id}">Sua</button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${row.id}">Xoa</button>
          <button class="btn btn-sm btn-outline-secondary" data-action="khoa" data-id="${row.id}" data-value="${row.khoaDuyet ? 0 : 1}">${row.khoaDuyet ? "Bo duyet khoa" : "Duyet khoa"}</button>
          <button class="btn btn-sm btn-outline-success" data-action="vien" data-id="${row.id}" data-value="${row.vienNcDuyet ? 0 : 1}">${row.vienNcDuyet ? "Bo duyet vien" : "Duyet vien"}</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  async loadData() {
    const { namHoc, khoaId } = this.getFilterValues();
    if (!namHoc) {
      this.rows = [];
      this.renderRows();
      return;
    }

    const result = await window.NCKH_V3_DeTaiDuAn.api.list(namHoc, khoaId);
    if (!result.success) {
      alert(result.message || "Khong the tai du lieu");
      return;
    }

    this.rows = result.data || [];
    this.renderRows();
  },

  async handleAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.getAttribute("data-action");
    const id = Number(button.getAttribute("data-id"));

    if (action === "edit") {
      await window.NCKH_V3_DeTaiDuAn.form.edit(id);
      return;
    }

    if (action === "delete") {
      if (!confirm("Ban chac chan muon xoa de tai nay?")) return;
      const result = await window.NCKH_V3_DeTaiDuAn.api.remove(id);
      if (!result.success) {
        alert(result.message || "Khong the xoa");
        return;
      }
      await this.loadData();
      return;
    }

    if (action === "khoa") {
      const value = Number(button.getAttribute("data-value"));
      const result = await window.NCKH_V3_DeTaiDuAn.api.approveKhoa(id, value);
      if (!result.success) {
        alert(result.message || "Khong the cap nhat duyet khoa");
        return;
      }
      await this.loadData();
      return;
    }

    if (action === "vien") {
      const value = Number(button.getAttribute("data-value"));
      const result = await window.NCKH_V3_DeTaiDuAn.api.approveVien(id, value);
      if (!result.success) {
        alert(result.message || "Khong the cap nhat duyet vien");
        return;
      }
      await this.loadData();
    }
  },

  bindEvents() {
    document.getElementById("reloadBtn").addEventListener("click", () => this.loadData());
    document.getElementById("deTaiTableBody").addEventListener("click", this.handleAction.bind(this));
  },
};
