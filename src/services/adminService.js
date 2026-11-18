import http from "../api/http.js";

export const lookupResources = {
  currencies: { label: "العملات", path: "currencies", fields: ["name", "code", "symbol", "notes"] },
  categories: { label: "التصنيفات", path: "categories", fields: ["name", "notes"] },
  locations: { label: "المواقع", path: "locations", fields: ["name", "notes"] },
  units: { label: "وحدات القياس", path: "units", fields: ["name", "notes"] },
};

export const trashResources = {
  currencies: { label: "العملات", path: "currencies" },
  categories: { label: "التصنيفات", path: "categories" },
  locations: { label: "المواقع", path: "locations" },
  units: { label: "وحدات القياس", path: "units" },
  initiatives: { label: "المبادرات", path: "initiatives" },
  invoices: { label: "الفواتير", path: "invoices" },
  "initiative-items": { label: "عناصر المبادرات", path: "initiative-items" },
  "audit-logs": { label: "سجلات التدقيق", path: "audit-logs" },
};

function normalizeList(body) {
  let value = body;
  for (let i = 0; i < 6; i += 1) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.data)) return value.data;
    value = value.data;
  }
  return [];
}

export const adminService = {
  async listLookup(resource) {
    const { path } = lookupResources[resource];
    const response = await http.get(`/${path}`, { params: { page: 1, per_page: 100 } });
    return normalizeList(response.data);
  },
  async saveLookup(resource, id, payload) {
    const { path } = lookupResources[resource];
    const response = id == null
      ? await http.post(`/${path}`, payload)
      : await http.patch(`/${path}/${id}`, payload);
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },
  async deleteLookup(resource, id) {
    const { path } = lookupResources[resource];
    await http.delete(`/${path}/${id}`);
  },
  async listUsers(params = {}) {
    const response = await http.get("/users", { params: { page: 1, per_page: 100, ...params } });
    const items = normalizeList(response.data);
    const body = response.data ?? {};
    const meta = body.meta ?? body.data?.meta ?? body.data?.data?.meta;
    return { items, total: Number(meta?.total ?? items.length) };
  },
  async createUser(payload) {
    const response = await http.post("/users", payload);
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },
  async updateUser(id, payload) {
    const response = await http.put(`/users/${id}`, payload);
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },
  async setUserRole(id, role) {
    const response = await http.patch(`/users/${id}/role`, { role });
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },
  async setUserPassword(id, password, password_confirmation) {
    const response = await http.patch(`/users/${id}/password`, { password, password_confirmation });
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },
  async setUserActive(id, is_active) {
    const response = await http.patch(`/users/${id}/active`, { is_active });
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },
  async setUserLocked(id, is_locked) {
    const response = await http.patch(`/users/${id}/lock`, { is_locked });
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },
  async deleteUser(id) {
    await http.delete(`/users/${id}`);
  },
  async listAuditLogs(trashed = false, params = {}) {
    const path = trashed ? "/audit-logs/trashed" : "/audit-logs";
    const queryParams = { page: 1, per_page: 100, ...params };
    delete queryParams.model_id;
    for (const [key, value] of Object.entries(queryParams)) {
      if (value == null || (typeof value === "string" && !value.trim())) {
        delete queryParams[key];
      }
    }
    const response = await http.get(path, { params: queryParams });
    return normalizeList(response.data);
  },
  async deleteAuditLog(id) {
    await http.delete(`/audit-logs/${id}`);
  },
  async restore(resource, id) {
    const path = trashResources[resource]?.path;
    if (!path) throw new Error("نوع السجل غير مدعوم للاستعادة.");
    const response = await http.post(`/${path}/${id}/restore`);
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },
  async listTrashed(resource, params = {}) {
    const path = trashResources[resource]?.path;
    if (!path) throw new Error("نوع السجل غير مدعوم.");
    const response = await http.get(`/${path}/trashed`, { params: { page: 1, per_page: 100, ...params } });
    return normalizeList(response.data);
  },
};
