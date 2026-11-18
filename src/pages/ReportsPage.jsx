import { useCallback, useEffect, useMemo, useState } from "react";
import { Autocomplete, Box, Button, CircularProgress, Paper, TextField, Typography } from "@mui/material";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import StatCard from "../components/StatCard.jsx";
import DataTable from "../components/DataTable.jsx";
import ErrorPopup from "../components/ErrorPopup.jsx";
import { initiativeService } from "../services/initiativeService.js";
import { invoicesService } from "../services/invoicesService.js";
import { catalogService } from "../services/catalogService.js";
import { getApiError } from "../api/http.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatDate } from "../utils/dateFormat.js";

function listFrom(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

const STATUS_LABELS = {
  under_study: "قيد الدراسة",
  wait_manager: "بانتظار مراجعة المدير",
  pending_manager: "بانتظار اعتماد المدير",
  manager_approved: "موافقة المدير",
  manager_rejected: "رفض المدير",
  accountant_approved: "موافقة المحاسب",
  accountant_rejected: "رفض المحاسب",
  completed: "مكتملة",
  archived: "مؤرشفة",
};

function optionName(option) {
  return option.name ?? option.title ?? option.label ?? String(option.id);
}

function initiativeField(item) {
  return item.category?.name ?? item.category_name ?? item.field ?? "غير محدد";
}

function initiativeLocation(item) {
  return item.location?.name ?? item.location_name ?? item.location?.title
    ?? (typeof item.location === "string" ? item.location : "غير محدد");
}

function initiativeDate(item) {
  return String(item.execution_date ?? item.date ?? "").slice(0, 10);
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [initiatives, setInitiatives] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [filters, setFilters] = useState({ category: "", location: "", from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [initiativeResult, invoiceResult, categoryResult, locationResult] = await Promise.allSettled([
        (async () => {
          const all = [];
          let page = 1;
          let lastPage = 1;
          do {
            const result = await initiativeService.list({ per_page: 100, page }, user);
            all.push(...result.items);
            lastPage = Number(result.meta?.last_page) || 1;
            page += 1;
          } while (page <= lastPage);
          return all;
        })(),
        invoicesService.list({ per_page: 100, page: 1 }),
        catalogService.listCategories(),
        catalogService.listLocations(),
      ]);

      const failures = [];
      if (initiativeResult.status === "fulfilled") setInitiatives(listFrom(initiativeResult.value));
      else failures.push(getApiError(initiativeResult.reason));
      if (invoiceResult.status === "fulfilled") setInvoices(listFrom(invoiceResult.value));
      else failures.push(getApiError(invoiceResult.reason));
      if (categoryResult.status === "fulfilled") setCategories(listFrom(categoryResult.value));
      else failures.push(getApiError(categoryResult.reason));
      if (locationResult.status === "fulfilled") setLocations(listFrom(locationResult.value));
      else failures.push(getApiError(locationResult.reason));
      if (failures.length) setError(failures.join(" · "));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const invalidDateRange = Boolean(filters.from && filters.to && filters.from > filters.to);
  const reportItems = useMemo(() => initiatives.filter((item) => {
    if (filters.category) {
      const categoryId = item.category_id ?? item.category?.id;
      const categoryName = initiativeField(item);
      if (String(categoryId ?? "") !== filters.category
        && categoryName !== optionName(categories.find((category) => String(category.id) === filters.category) ?? {})) return false;
    }
    if (filters.location) {
      const locationId = item.location_id ?? item.location?.id;
      const locationName = initiativeLocation(item);
      if (String(locationId ?? "") !== filters.location
        && locationName !== optionName(locations.find((location) => String(location.id) === filters.location) ?? {})) return false;
    }
    const date = initiativeDate(item);
    if (filters.from && (!date || date < filters.from)) return false;
    if (filters.to && (!date || date > filters.to)) return false;
    return true;
  }), [initiatives, filters, categories, locations]);

  const statusRows = useMemo(() => {
    const counts = new Map();
    initiatives.forEach((item) => {
      const key = item.status || "unknown";
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].map(([status, count]) => ({ status, count }));
  }, [initiatives]);
  const approvedCount = initiatives.filter((item) => ["manager_approved", "accountant_approved", "completed"].includes(item.status)).length;
  const pendingCount = initiatives.filter((item) => ["under_study", "wait_manager", "pending_manager"].includes(item.status)).length;
  const categoryOptions = useMemo(() => [{ id: "", name: "كل المجالات" }, ...categories], [categories]);
  const locationOptions = useMemo(() => [{ id: "", name: "كل الأماكن" }, ...locations], [locations]);

  return <>
    <PageHeader title="التقارير" subtitle="ملخص المبادرات والفواتير المسجلة" />
    <ErrorPopup message={error} onClose={() => setError("")} />
    {loading ? <Box sx={{ minHeight: 220, display: "grid", placeItems: "center" }}><CircularProgress /></Box> : <>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }, gap: 2 }}>
        <StatCard title="إجمالي المبادرات" value={initiatives.length} icon={<AssignmentOutlinedIcon />} tone="blue" hint="المبادرات المتاحة للحساب" />
        <StatCard title="قيد الدراسة" value={pendingCount} icon={<PendingActionsOutlinedIcon />} tone="amber" hint="بانتظار قرار المدير" />
        <StatCard title="معتمدة أو مكتملة" value={approvedCount} icon={<TaskAltRoundedIcon />} tone="teal" hint="وصلت إلى مرحلة الاعتماد" />
        <StatCard title="إجمالي الفواتير" value={invoices.length} icon={<ReceiptLongOutlinedIcon />} tone="purple" hint="الفواتير المسجلة" />
      </Box>

      <Paper variant="outlined" sx={{ mt: 3, mb: 3, p: 2.5 }}>
        <Typography fontWeight={800} sx={{ mb: 2 }}>تقرير المبادرات حسب المجال والمكان والفترة</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(4, minmax(0, 1fr))" }, gap: 2 }}>
          <Autocomplete
            options={categoryOptions}
            value={categoryOptions.find((category) => String(category.id) === filters.category) ?? null}
            getOptionLabel={optionName}
            isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
            onChange={(_event, category) => setFilters((current) => ({ ...current, category: category ? String(category.id) : "" }))}
            noOptionsText="لا توجد مجالات مطابقة"
            renderInput={(params) => <TextField {...params} label="المجال" />}
          />
          <Autocomplete
            options={locationOptions}
            value={locationOptions.find((location) => String(location.id) === filters.location) ?? null}
            getOptionLabel={optionName}
            isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
            onChange={(_event, location) => setFilters((current) => ({ ...current, location: location ? String(location.id) : "" }))}
            noOptionsText="لا توجد أماكن مطابقة"
            renderInput={(params) => <TextField {...params} label="المكان" />}
          />
          <TextField type="date" label="من تاريخ" InputLabelProps={{ shrink: true }} value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
          <TextField type="date" label="إلى تاريخ" InputLabelProps={{ shrink: true }} value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
        </Box>
        {invalidDateRange && <Typography color="error" variant="body2" sx={{ mt: 1 }}>يجب أن يكون تاريخ البداية قبل تاريخ النهاية أو مساوياً له.</Typography>}
      </Paper>
      <DataTable
        key="initiative-report"
        items={invalidDateRange ? [] : reportItems}
        filename="تقرير-المبادرات"
        emptyMessage="لا توجد مبادرات مطابقة للفلاتر المحددة."
        includeAllFields
        columns={[
          { id: "reference_number", label: "رقم المرجع", value: (item) => item.reference_number ?? item.id },
          { id: "title", label: "اسم المبادرة", value: (item) => item.title ?? item.name },
          { id: "field", label: "المجال", value: initiativeField },
          { id: "location", label: "المكان", value: initiativeLocation },
          { id: "execution_date", label: "تاريخ التنفيذ", value: (item) => formatDate(initiativeDate(item)) },
          { id: "created_by", label: "منشئ المبادرة", value: (item) => item.created_by?.name ?? item.created_by_name ?? item.user?.name ?? item.user_name ?? "—" },
          { id: "status", label: "الحالة", value: (item) => STATUS_LABELS[item.status] ?? item.status ?? "غير محدد" },
        ]}
        actions={(item) => <Button component={Link} to={`/initiatives/${encodeURIComponent(item.id)}`} size="small" variant="outlined">عرض</Button>}
      />

      <Box sx={{ mt: 3 }}>
        <Typography fontWeight={800} sx={{ mb: 1.5 }}>توزيع المبادرات حسب الحالة</Typography>
        <DataTable
          key="status-report"
          items={statusRows}
          filename="توزيع-المبادرات-حسب-الحالة"
          columns={[
            { id: "status", label: "الحالة", value: (item) => STATUS_LABELS[item.status] ?? item.status },
            { id: "count", label: "عدد المبادرات" },
          ]}
        />
      </Box>
    </>}
  </>;
}
