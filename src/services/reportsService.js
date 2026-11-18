import http from "../api/http.js";

export const reportsService = {
  async getSummary() {
    const response = await http.get("/reports/summary");
    return response.data.data;
  },

  async exportReport(params = {}) {
    const response = await http.get("/reports/export", {
      params,
      responseType: "blob",
    });

    return response.data;
  },
};