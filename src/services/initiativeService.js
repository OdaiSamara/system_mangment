import http from "../api/http.js";

function normalizeList(items) {
  // Accept arrays and common Laravel response wrappers without assuming one envelope depth.
  let value = items;
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.data)) return value.data;
    value = value.data;
  }
  return [];
}

export const initiativeService = {
  async list(params = {}, user = null) {
    const queryParams = { ...params };
    const response = await http.get("/initiatives", { params: queryParams });
    const body = response.data ?? {};
    return {
      items: normalizeList(body),
      meta: body.meta
        ?? body.data?.meta
        ?? body.data?.data?.meta
        ?? (body.last_page != null ? body : null),
    };
  },

  async getById(id) {
    const response = await http.get(`/initiatives/${id}`);
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },

  async create(payload) {
    const response = await http.post("/initiatives", payload);
    return response.data.data;
  },

  async update(id, payload) {
    const response = await http.patch(`/initiatives/${id}`, payload);
    return response.data.data;
  },

  async listItems(initiativeId, params = {}) {
    const response = await http.get("/initiative-items", { params: { initiative_id: initiativeId, per_page: 100, page: 1, ...params } });
    return normalizeList(response.data?.data ?? response.data);
  },

  async createItem(payload) {
    const response = await http.post("/initiative-items", payload);
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },

  async setStatus(id, status) {
    const response = await http.patch(`/initiatives/${id}/status`, { status });
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },

  async remove(id) {
    await http.delete(`/initiatives/${id}`);
    return true;
  },

  async listTrashed(params = {}) {
    const response = await http.get("/initiatives/trashed", { params });
    const body = response.data ?? {};
    return { items: normalizeList(body), meta: body.meta ?? body.data?.meta ?? body.data?.data?.meta ?? null };
  },

  async restore(id) {
    const response = await http.post(`/initiatives/${id}/restore`);
    return response.data.data;
  },
};