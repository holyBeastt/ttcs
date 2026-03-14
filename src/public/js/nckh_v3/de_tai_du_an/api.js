window.NCKH_V3_DeTaiDuAn = window.NCKH_V3_DeTaiDuAn || {};

window.NCKH_V3_DeTaiDuAn.api = {
  async getMetadata(khoaId = "ALL") {
    const response = await fetch(`/v3/nckh/de-tai-du-an/metadata?khoaId=${encodeURIComponent(khoaId)}`);
    return response.json();
  },

  async list(namHoc, khoaId) {
    const response = await fetch(`/v3/nckh/de-tai-du-an/list/${encodeURIComponent(namHoc)}/${encodeURIComponent(khoaId)}`);
    return response.json();
  },

  async getDetail(id) {
    const response = await fetch(`/v3/nckh/de-tai-du-an/${id}`);
    return response.json();
  },

  async create(payload) {
    const response = await fetch("/v3/nckh/de-tai-du-an", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  async update(id, payload) {
    const response = await fetch(`/v3/nckh/de-tai-du-an/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.json();
  },

  async remove(id) {
    const response = await fetch(`/v3/nckh/de-tai-du-an/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },

  async approveKhoa(id, khoaDuyet) {
    const response = await fetch(`/v3/nckh/de-tai-du-an/${id}/khoa-duyet`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ khoaDuyet }),
    });
    return response.json();
  },

  async approveVien(id, vienNcDuyet) {
    const response = await fetch(`/v3/nckh/de-tai-du-an/${id}/vien-duyet`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vienNcDuyet }),
    });
    return response.json();
  },
};
