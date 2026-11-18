import { useEffect, useState } from "react";
import { Box, Button } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import StatCard from "../components/StatCard.jsx";
import PageHeader from "../components/PageHeader.jsx";
import ErrorPopup from "../components/ErrorPopup.jsx";
import InitiativesPage from "./InitiativesPage.jsx";
import { initiativeService } from "../services/initiativeService.js";
import { invoicesService } from "../services/invoicesService.js";
import { getApiError } from "../api/http.js";

export default function DashboardPage() {
  const { user } = useAuth();
  const canCreateInitiative = ["user", "manager"].includes(user?.role);
  const [initiativeCount, setInitiativeCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

useEffect(() => {
  let active = true;

  async function loadDashboard() {
    setError("");
    const initiativeSummary = user?.role === "manager"
      ? (async () => {
        const firstPage = await initiativeService.list({ per_page: 100, page: 1 }, user);
        const initiatives = [...(firstPage.items ?? [])];
        const lastPage = Number(firstPage.meta?.last_page) || 1;
        for (let page = 2; page <= lastPage; page += 1) {
          const result = await initiativeService.list({ per_page: 100, page }, user);
          initiatives.push(...(result.items ?? []));
        }
        const visibleInitiatives = initiatives.filter((initiative) => initiative.status !== "under_study");
        return {
          initiativeCount: visibleInitiatives.length,
          pendingCount: visibleInitiatives.filter((initiative) => ["wait_manager", "pending_manager"].includes(initiative.status)).length,
          completedCount: visibleInitiatives.filter((initiative) => initiative.status === "completed").length,
        };
      })()
      : Promise.all([
        initiativeService.list({ per_page: 1, page: 1 }, user),
        initiativeService.list({ status: "under_study", per_page: 1, page: 1 }, user),
        initiativeService.list({ status: "wait_manager", per_page: 1, page: 1 }, user),
        initiativeService.list({ status: "pending_manager", per_page: 1, page: 1 }, user),
        initiativeService.list({ status: "completed", per_page: 1, page: 1 }, user),
      ]).then(([all, underStudy, waitingForManager, pendingManager, completed]) => {
        const resultCount = (result) => Number(result?.meta?.total ?? (Array.isArray(result) ? result.length : result?.items?.length ?? 0));
        return {
          initiativeCount: resultCount(all),
          pendingCount: resultCount(underStudy) + resultCount(waitingForManager) + resultCount(pendingManager),
          completedCount: resultCount(completed),
        };
      });
    const results = await Promise.allSettled([
      initiativeSummary,
      invoicesService.list({ per_page: 1, page: 1 }),
    ]);
    if (!active) return;

    const resultCount = (result) => Number(result?.meta?.total ?? (Array.isArray(result) ? result.length : result?.items?.length ?? 0));
    if (results[0].status === "fulfilled") {
      setInitiativeCount(results[0].value.initiativeCount);
      setPendingCount(results[0].value.pendingCount);
      setCompletedCount(results[0].value.completedCount);
    }
    if (results[1].status === "fulfilled") setInvoiceCount(resultCount(results[1].value));
    const failed = results.find((result) => result.status === "rejected");
    if (failed) setError(getApiError(failed.reason));
  }

  loadDashboard();

  return () => {
    active = false;
  };
}, [reload, user]);


  return (
    <>
      <PageHeader
        title="لوحة التحكم"
        subtitle="نظرة عامة على طلبات المبادرات والمشتريات"
        action={canCreateInitiative ? <Button component={Link} to="/initiatives/new" variant="contained" startIcon={<AddRoundedIcon />}>إنشاء مبادرة</Button> : null}
      />
      <ErrorPopup message={error} onClose={() => setError("")} action={<Button color="inherit" size="small" onClick={() => setReload((value) => value + 1)}>إعادة المحاولة</Button>} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }, gap: 2 }}>
        <StatCard title="إجمالي المبادرات" value={initiativeCount} icon={<AssignmentOutlinedIcon />} tone="blue" hint="جميع الطلبات المتاحة" />
        <StatCard title="قيد الدراسة" value={pendingCount} icon={<PendingActionsOutlinedIcon />} tone="amber" hint="بانتظار المراجعة" />
        <StatCard title="مكتملة" value={completedCount} icon={<TaskAltRoundedIcon />} tone="teal" hint="الطلبات المكتملة" />
        <StatCard title="المرفقات والفواتير" value={invoiceCount} icon={<ReceiptLongOutlinedIcon />} tone="purple" hint="الفواتير والمرفقات المسجلة" />
      </Box>

      <Box sx={{ mt: 3 }}>
        <InitiativesPage showPageHeader={false} />
      </Box>
    </>
  );
}
