import http from "../api/http.js";

function normalizeList(body) {
  let value = body;
  for (let depth = 0; depth < 5; depth += 1) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];
    if (Array.isArray(value.items)) return value.items;
    if (Array.isArray(value.data)) return value.data;
    value = value.data;
  }
  return [];
}

function getInitiativeId(invoice) {
  return invoice.initiative_id
    ?? invoice.initiativeId
    ?? invoice.initiative?.id
    ?? invoice.initiative?.initiative_id;
}

export const invoicesService = {
  async list(params = {}) {
    const response = await http.get("/invoices", { params });
    return normalizeList(response.data);
  },

  async listAll(params = {}) {
    const perPage = 100;
    const invoices = [];
    const seenPages = new Set();
    let page = 1;
    let lastPage = null;

    while (lastPage === null || page <= lastPage) {
      const response = await http.get("/invoices", { params: { ...params, page, per_page: perPage } });
      const body = response.data ?? {};
      const pageInvoices = normalizeList(body);
      const meta = body.meta
        ?? body.data?.meta
        ?? body.data?.data?.meta
        ?? (body.last_page != null ? body : null);
      const reportedLastPage = Number(meta?.last_page);
      if (Number.isFinite(reportedLastPage) && reportedLastPage > 0) lastPage = reportedLastPage;

      const pageKey = pageInvoices.map((invoice) => invoice.id).join(",");
      if (pageInvoices.length && seenPages.has(pageKey)) {
        throw new Error("تعذر تحميل جميع الفواتير لأن الخادم أعاد الصفحة نفسها.");
      }
      seenPages.add(pageKey);
      invoices.push(...pageInvoices);

      if (lastPage === null && pageInvoices.length < perPage) break;
      page += 1;
    }

    return invoices;
  },

  async listTrashed(params = {}) {
    const perPage = 100;
    const invoices = [];
    const seenPages = new Set();
    let page = 1;
    let lastPage = null;

    while (lastPage === null || page <= lastPage) {
      const response = await http.get("/invoices/trashed", {
        params: { ...params, page, per_page: perPage },
      });
      const body = response.data ?? {};
      const pageInvoices = normalizeList(body);
      const meta = body.meta
        ?? body.data?.meta
        ?? body.data?.data?.meta
        ?? (body.last_page != null ? body : null);
      const reportedLastPage = Number(meta?.last_page);
      if (Number.isFinite(reportedLastPage) && reportedLastPage > 0) lastPage = reportedLastPage;

      const pageKey = pageInvoices.map((invoice) => invoice.id).join(",");
      if (pageInvoices.length && seenPages.has(pageKey)) {
        throw new Error("تعذر تحميل جميع الفواتير المحذوفة لأن الخادم أعاد الصفحة نفسها.");
      }
      seenPages.add(pageKey);
      invoices.push(...pageInvoices);

      if (lastPage === null && pageInvoices.length < perPage) break;
      page += 1;
    }

    return invoices;
  },

  async listForInitiative(initiativeId) {
    const invoices = await this.listAll({ initiative_id: initiativeId });
    return invoices.filter((invoice) => {
      const relatedId = getInitiativeId(invoice);
      return relatedId != null && String(relatedId) === String(initiativeId);
    });
  },

  async listForInitiatives(initiativeIds) {
    const uniqueIds = [...new Set(initiativeIds.filter((id) => id != null).map(String))];
    const invoices = [];
    const seenInvoiceIds = new Set();
    const batchSize = 8;

    for (let index = 0; index < uniqueIds.length; index += batchSize) {
      const batch = uniqueIds.slice(index, index + batchSize);
      const batchInvoices = await Promise.all(
        batch.map((initiativeId) => this.listForInitiative(initiativeId))
      );

      for (const invoice of batchInvoices.flat()) {
        const key = invoice.id == null
          ? JSON.stringify(invoice)
          : String(invoice.id);
        if (!seenInvoiceIds.has(key)) {
          seenInvoiceIds.add(key);
          invoices.push(invoice);
        }
      }
    }

    return invoices;
  },

  async getById(id) {
    const response = await http.get(`/invoices/${id}`);
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },

  async upload({ initiativeId, invoiceNumber, invoiceDate, amount, currencyId, description = "", notes = "", file }) {
    if (!file) {
      throw new Error("يجب إرفاق ملف الفاتورة قبل الحفظ.");
    }

    const formData = new FormData();
    formData.append("initiative_id", String(initiativeId));
    formData.append("invoice_number", invoiceNumber);
    formData.append("invoice_date", invoiceDate);
    formData.append("amount", String(amount));
    formData.append("currency_id", String(currencyId));
    formData.append("description", description);
    formData.append("notes", notes);
    formData.append("attachment", file);
    const response = await http.post("/invoices", formData);
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },

  async downloadAttachment(id) {
    const response = await http.get(`/invoices/${id}/attachment`, { responseType: "blob" });
    return response.data;
  },

  async update(id, payload) {
    let response;
    if (typeof File !== "undefined" && payload.attachment instanceof File) {
      const formData = new FormData();
      for (const [key, value] of Object.entries(payload)) {
        if (value != null && key !== "attachment") formData.append(key, String(value));
      }
      formData.append("attachment", payload.attachment);
      formData.append("_method", "PATCH");
      response = await http.post(`/invoices/${id}`, formData);
    } else {
      response = await http.patch(`/invoices/${id}`, payload);
    }
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },

  async restore(id) {
    const response = await http.post(`/invoices/${id}/restore`);
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },

  async setStatus(id, status) {
    const response = await http.patch(`/invoices/${id}/status`, { status });
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },

  async remove(id) {
    await http.delete(`/invoices/${id}`);
    return true;
  },
};
