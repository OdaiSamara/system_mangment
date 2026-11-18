
import axios from "axios";

const csrfEnabled = import.meta.env.VITE_CSRF_ENABLED === "true";
const csrfCookieUrl = import.meta.env.VITE_CSRF_COOKIE_URL?.trim();
const MAX_READ_RETRIES = 2;
const RETRYABLE_STATUSES = new Set([408, 429, 502, 503, 504]);
let csrfCookieRequest;

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  headers: {
    Accept: "application/json",
  },
  withCredentials: csrfEnabled,
  withXSRFToken: csrfEnabled,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  timeout: 15000,
});

async function ensureCsrfCookie() {
  if (!csrfEnabled) return;
  if (!csrfCookieUrl) {
    throw new Error("حماية CSRF مفعلة لكن VITE_CSRF_COOKIE_URL غير مضبوط.");
  }

  if (!csrfCookieRequest) {
    let csrfCookieEndpoint;
    try {
      csrfCookieEndpoint = new URL(csrfCookieUrl);
    } catch {
      throw new Error("يجب أن يكون VITE_CSRF_COOKIE_URL رابطًا كاملًا صالحًا.");
    }
    if (csrfCookieEndpoint.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(csrfCookieEndpoint.hostname)) {
      throw new Error("يجب أن يستخدم رابط إصدار CSRF اتصال HTTPS.");
    }

    csrfCookieRequest = axios.get(csrfCookieEndpoint.href, {
      withCredentials: true,
      timeout: 15000,
    }).catch((error) => {
      csrfCookieRequest = undefined;
      throw error;
    });
  }

  await csrfCookieRequest;
}

// إضافة رمز المصادقة عند الاتصال بالخادم الحقيقي
http.interceptors.request.use(async (config) => {
  if (["post", "put", "patch", "delete"].includes(config.method?.toLowerCase())) {
    await ensureCsrfCookie();
  }

  const token = localStorage.getItem("ain-alzaman-token");

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
ع});

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("ain-alzaman-token");
      localStorage.removeItem("ain-alzaman-user");
      window.dispatchEvent(new Event("ain-alzaman:unauthorized"));
    }

    const config = error.config;
    const method = config?.method?.toLowerCase();
    const isReadRequest = ["get", "head", "options"].includes(method);
    const isTransientFailure = !error.response || RETRYABLE_STATUSES.has(error.response.status);
    const isOnline = typeof navigator === "undefined" || navigator.onLine;

    if (config && isReadRequest && isTransientFailure && isOnline) {
      config.__readRetryCount = config.__readRetryCount ?? 0;
      if (config.__readRetryCount < MAX_READ_RETRIES) {
        const retryNumber = config.__readRetryCount + 1;
        config.__readRetryCount = retryNumber;
        await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** (retryNumber - 1))));
        return http.request(config);
      }
    }

    return Promise.reject(error);
  }
);

export function getApiError(error) {
  if (error.response?.status === 401) {
    return "بيانات الدخول غير صحيحة أو انتهت الجلسة. تحقق من البريد وكلمة المرور ثم حاول مجددًا.";
  }

  if (error.response?.status === 403) {
    return "ليس لديك صلاحية لتنفيذ هذه العملية.";
  }

  if (error.response?.status === 500) {
    return "حدث خطأ داخلي في الخادم. حاول مجددًا لاحقًا.";
  }

  if (error.response?.status === 408) {
    return "استغرق الخادم وقتًا طويلًا للرد. أُعيدت محاولة الاتصال؛ يرجى المحاولة بعد قليل.";
  }

  if (error.response?.status === 429) {
    return "طلبات كثيرة في وقت قصير. انتظر قليلًا ثم حاول مجددًا.";
  }

  if ([502, 503, 504].includes(error.response?.status)) {
    return "الخادم غير متاح مؤقتًا. أُعيدت محاولة الاتصال؛ يرجى المحاولة بعد قليل.";
  }

  if (error.response?.data?.message) {
    const validationErrors =
      error.response?.data?.errors ??
      (error.response?.status === 422 ? error.response?.data?.meta : null);
    if (validationErrors && typeof validationErrors === "object") {
      const firstError = Object.values(validationErrors).flat().find(Boolean);
      if (firstError) return `${error.response.data.message}: ${firstError}`;
    }
    return error.response.data.message;
  }

  if (!error.response && error.isAxiosError) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return "لا يوجد اتصال بالإنترنت حاليًا. تحقق من اتصالك ثم أعد المحاولة.";
    }
    if (["ECONNABORTED", "ETIMEDOUT"].includes(error.code)) {
      return "استغرق الخادم وقتًا طويلًا للرد. تحقق من الاتصال وحاول مجددًا.";
    }
    return "تعذر الاتصال بالخادم. تحقق من الاتصال بالإنترنت وحاول مجددًا.";
  }

  return error.message || "حدث خطأ غير متوقع. حاول مجددًا.";
}

export default http;
