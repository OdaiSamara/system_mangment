import http from "../api/http.js";

const TOKEN_KEY = "ain-alzaman-token";
const USER_KEY = "ain-alzaman-user";

export const authService = {
  async login({ email, password }) {
    const response = await http.post("/login", {
      email,
      password,
      device_name: "Ain Alzaman Web",
    });

    const result = response.data.data;

    if (!result?.token || !result?.user) {
      throw new Error("استجابة تسجيل الدخول من الخادم غير مكتملة.");
    }

    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));

    return { user: result.user };
  },

  async logout() {
    try {
      await http.post("/logout");
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },

  async getCurrentUser() {
    const response = await http.get("/user");
    return response.data?.data ?? response.data;
  },

  async updateProfile(id, payload) {
    const response = await http.put(`/users/${id}`, payload);
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },

  async changePassword(payload) {
    const response = await http.patch("/user/password", payload);
    return response.data?.data?.data ?? response.data?.data ?? response.data;
  },
};
