
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";

import { useAuth } from "./context/AuthContext.jsx";
import DashboardLayout from "./layouts/DashboardLayout.jsx";

// تحميل الصفحات عند الحاجة
const DashboardPage = lazy(
  () => import("./pages/DashboardPage.jsx")
);

const InitiativesPage = lazy(
  () => import("./pages/InitiativesPage.jsx")
);

const CreateInitiativePage = lazy(
  () => import("./pages/CreateInitiativePage.jsx")
);

const InitiativeDetailsPage = lazy(
  () => import("./pages/InitiativeDetailsPage.jsx")
);

const PlaceholderPage = lazy(
  () => import("./pages/PlaceholderPage.jsx")
);

const LoginPage = lazy(
  () => import("./pages/LoginPage.jsx")
);

const TrashedInitiativesPage = lazy(
  () => import("./pages/TrashedInitiativesPage.jsx")
);

const InvoicesPage = lazy(() => import("./pages/InvoicesPage.jsx"));
const ReportsPage = lazy(() => import("./pages/ReportsPage.jsx"));
const AdminPage = lazy(() => import("./pages/AdminPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));

// التحقق من تسجيل الدخول وصلاحيات الدور
function RequireAuth({ children, allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to="/initiatives" replace />;
  }

  return children;
}

// شاشة التحميل أثناء تحميل الصفحات
function PageLoader() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "40vh",
      }}
    >
      <CircularProgress />
    </Box>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* صفحة تسجيل الدخول */}
        <Route
          path="/login"
          element={<LoginPage />}
        />

        {/* المسارات التي تتطلب تسجيل الدخول */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route
            path="profile"
            element={<ProfilePage />}
          />

          {/* الصفحة الرئيسية */}
          <Route
            index
            element={
              <Navigate to="/initiatives" replace />
            }
          />

          {/* لوحة التحكم: منفذ المبادرة والمدير */}
          <Route
            path="dashboard"
            element={
              <RequireAuth allowedRoles={["user", "manager"]}>
                <DashboardPage />
              </RequireAuth>
            }
          />

          {/* قائمة المبادرات: منفذ المبادرة والمدير والمحاسب للعرض */}
          <Route
            path="initiatives"
            element={
              <RequireAuth
                allowedRoles={["user", "manager", "accountant"]}
              >
                <InitiativesPage />
              </RequireAuth>
            }
          />

          {/* إنشاء مبادرة: منفذ المبادرة والمدير */}
          <Route
            path="initiatives/new"
            element={
              <RequireAuth allowedRoles={["user", "manager"]}>
                <CreateInitiativePage />
              </RequireAuth>
            }
          />

          {/* تفاصيل المبادرة: منفذ المبادرة والمدير والمحاسب للعرض */}
          <Route
            path="initiatives/:id"
            element={
              <RequireAuth
                allowedRoles={["user", "manager", "accountant"]}
              >
                <InitiativeDetailsPage />
              </RequireAuth>
            }
          />

          {/* الفواتير: المدير والمحاسب للعرض والتنزيل */}
          <Route
            path="invoices"
            element={
              <RequireAuth allowedRoles={["manager", "accountant"]}>
                <InvoicesPage />
              </RequireAuth>
            }
          />

          {/* التقارير: المدير فقط */}
          <Route
            path="reports"
            element={
              <RequireAuth allowedRoles={["manager"]}>
                <ReportsPage />
              </RequireAuth>
            }
          />

          {/* المحذوفات: العرض للجميع والاستعادة للمدير فقط */}
          <Route
            path="archive"
            element={
              <RequireAuth allowedRoles={["manager"]}>
                <TrashedInitiativesPage />
              </RequireAuth>
            }
          />

          {/* إدارة البيانات المرجعية والمستخدمين وسجلات التدقيق: للمدير فقط */}
          <Route
            path="admin"
            element={
              <RequireAuth allowedRoles={["manager"]}>
                <AdminPage />
              </RequireAuth>
            }
          />

          {/* أي مسار غير معروف */}
          <Route
            path="*"
            element={
              <PlaceholderPage
                title="الصفحة غير موجودة"
                description="الصفحة التي تبحث عنها غير موجودة."
              />
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
