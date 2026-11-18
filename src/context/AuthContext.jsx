
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { authService } from "../services/authService.js";

const AuthContext = createContext(null);
const VALID_ROLES = ["user", "requester", "manager", "accountant"];

function normalizeUser(user) {
  if (!user) return null;
  return { ...user, role: user.role === "requester" ? "user" : user.role };
}

function readSavedUser() {
  try {
    if (!localStorage.getItem("ain-alzaman-token")) {
      localStorage.removeItem("ain-alzaman-user");
      return null;
    }

    const saved = localStorage.getItem("ain-alzaman-user");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && VALID_ROLES.includes(parsed.role)) return normalizeUser(parsed);
    }
  } catch { /* ignore invalid local session */ }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSavedUser);

  useEffect(() => {
    let active = true;
    const clearUser = () => setUser(null);
    window.addEventListener("ain-alzaman:unauthorized", clearUser);

    // تحقق من صلاحية الجلسة وجلب الدور الحالي من الخادم عند إعادة فتح التطبيق.
    if (localStorage.getItem("ain-alzaman-token")) {
      authService.getCurrentUser()
        .then((profile) => {
          if (!active || !profile || typeof profile !== "object") return;
          const normalized = normalizeUser(profile);
          setUser(normalized);
          localStorage.setItem("ain-alzaman-user", JSON.stringify(profile));
        })
        .catch((error) => {
          // يحذف interceptor الجلسة عند 401؛ أما تعذر الشبكة فلا يمحو الجلسة المحفوظة.
          if (error.response?.status === 401 && active) setUser(null);
        });
    }

    return () => {
      active = false;
      window.removeEventListener("ain-alzaman:unauthorized", clearUser);
    };
  }, []);

  const login = async (credentials) => {
    const result = await authService.login(credentials);
    const normalized = normalizeUser(result.user);
    setUser(normalized);
    return normalized;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  };

  const updateUser = useCallback((updatedUser) => {
    const normalized = normalizeUser(updatedUser);
    if (!normalized) return;
    setUser(normalized);
    localStorage.setItem("ain-alzaman-user", JSON.stringify(updatedUser));
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, updateUser }),
    [user, updateUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
