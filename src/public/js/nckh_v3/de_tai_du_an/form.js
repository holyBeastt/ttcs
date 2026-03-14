window.NCKH_V3_DeTaiDuAn = window.NCKH_V3_DeTaiDuAn || {};

window.NCKH_V3_DeTaiDuAn.form = {
  editingId: null,

  clearForm() {
    document.getElementById("deTaiForm").reset();
    this.editingId = null;
    document.getElementById("submitBtn").textContent = "Them de tai";
  },

  async submitForm(event) {
    event.preventDefault();

    const payload = window.NCKH_V3_DeTaiDuAn.mapper.formToPayload();

    let result;
    if (this.editingId) {
      result = await window.NCKH_V3_DeTaiDuAn.api.update(this.editingId, payload);
    } else {
      result = await window.NCKH_V3_DeTaiDuAn.api.create(payload);
    }

    if (!result.success) {
      alert(result.message || "Thao tac that bai");
      return;
    }

    alert(result.message || "Thanh cong");
    this.clearForm();
    await window.NCKH_V3_DeTaiDuAn.grid.loadData();
  },

  async edit(id) {
    const result = await window.NCKH_V3_DeTaiDuAn.api.getDetail(id);
    if (!result.success) {
      alert(result.message || "Khong the lay chi tiet");
      return;
    }

    this.editingId = id;
    window.NCKH_V3_DeTaiDuAn.mapper.detailToForm(result.data);
    document.getElementById("submitBtn").textContent = "Cap nhat de tai";
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  bindEvents() {
    document.getElementById("deTaiForm").addEventListener("submit", this.submitForm.bind(this));
    document.getElementById("resetBtn").addEventListener("click", () => this.clearForm());
  },
};
