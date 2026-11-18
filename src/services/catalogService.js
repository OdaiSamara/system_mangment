import http from "../api/http.js";

// API responses may be plain arrays, Laravel paginator objects, or wrapped in data.
function normalizeList(body) {
  let value = body;
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return null;
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.data)) return value.data;
    value = value.data;
  }
  return null;
}

async function listResource(resource) {
  const response = await http.get(`/${resource}`, { params: { per_page: 100, page: 1 } });
  const items = normalizeList(response.data);
  if (!items) {
    throw new Error(`استجابة GET /${resource} ليست قائمة JSON متوافقة مع عقد API.`);
  }
  return items.filter((item) => item && item.id != null);
}

export const catalogService = {
  listCategories: () => listResource("categories"),
  listLocations: () => listResource("locations"),
  listUnits: () => listResource("units"),
  listCurrencies: () => listResource("currencies"),
};
