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
