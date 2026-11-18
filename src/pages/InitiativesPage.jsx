import { getApiError } from "../api/http.js";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  Alert,
  Box,
  Button,
  Chip,
  Checkbox,
  Divider,
  CircularProgress,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Popover,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import AddCardOutlinedIcon from "@mui/icons-material/AddCardOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import RestoreOutlinedIcon from "@mui/icons-material/RestoreOutlined";

import PageHeader from "../components/PageHeader.jsx";
import UserContactActions from "../components/UserContactActions.jsx";
import ActionDropdown from "../components/ActionDropdown.jsx";
import ErrorPopup from "../components/ErrorPopup.jsx";
import SyncedHorizontalScrollbars from "../components/SyncedHorizontalScrollbars.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import StatusChip from "../components/StatusChip.jsx";
import { initiativeService } from "../services/initiativeService.js";
import { invoicesService } from "../services/invoicesService.js";
import { confirmAction, showSuccess } from "../utils/alerts.js";
import { exportExcel } from "../utils/exportExcel.js";
import { formatDate } from "../utils/dateFormat.js";
import { getInitiativeContact } from "../utils/initiativeContact.js";

// تحويل الحالات القادمة من API إلى التسميات العربية المستخدمة في الواجهة
const STATUS_LABELS = {
  under_study: "قيد الدراسة",
  wait_manager: "بانتظار مراجعة المدير",
  pending_manager: "بانتظار اعتماد المدير",
  manager_approved: "موافقة المدير",
  manager_rejected: "رفض المدير",
  accountant_approved: "موافقة المحاسب",
  accountant_rejected: "رفض المحاسب",
  completed: "مكتمل",
  archived: "مؤرشف",
};

const MANAGER_APPROVED_STATUSES = ["manager_approved", "accountant_approved", "completed"];

const TABLE_COLUMNS = [
  { id: "contact", label: "التواصل", defaultVisible: true },
  { id: "id", label: "المعرّف", defaultVisible: true },
  { id: "reference", label: "رقم المرجع", defaultVisible: true },
  { id: "name", label: "اسم المبادرة", defaultVisible: true },
  { id: "createdBy", label: "منفذ المبادرة", defaultVisible: true },
  { id: "ownerMobile", label: "هاتف المنفذ", defaultVisible: true },
  { id: "ownerWhatsapp", label: "واتساب المنفذ", defaultVisible: true },
  { id: "ownerEmail", label: "بريد المنفذ", defaultVisible: true },
  { id: "ownerGender", label: "جنس المنفذ", defaultVisible: true },
  { id: "ownerBirthDate", label: "تاريخ ميلاد المنفذ", defaultVisible: true },
  { id: "field", label: "المجال", defaultVisible: true },
  { id: "location", label: "مكان التنفيذ", defaultVisible: true },
  { id: "date", label: "تاريخ التنفيذ", defaultVisible: true },
  { id: "createdOn", label: "تاريخ الإنشاء", defaultVisible: true },
  { id: "updatedOn", label: "تاريخ التعديل", defaultVisible: true },
  { id: "deletedAt", label: "تاريخ الحذف", defaultVisible: true },
  { id: "restoredAt", label: "تاريخ الاستعادة", defaultVisible: true },
  { id: "updatedBy", label: "عُدّل بواسطة", defaultVisible: true },
  { id: "deletedBy", label: "حُذف بواسطة", defaultVisible: true },
  { id: "restoredBy", label: "استُعيد بواسطة", defaultVisible: true },
  { id: "description", label: "الوصف", defaultVisible: true },
  { id: "notes", label: "ملاحظات", defaultVisible: true },
  { id: "totalCost", label: "القيم المجمعة", defaultVisible: true },
  { id: "status", label: "الحالة", defaultVisible: true },
];

const DELETION_RESTORATION_COLUMN_IDS = new Set([
  "deletedAt",
  "restoredAt",
  "updatedBy",
  "deletedBy",
  "restoredBy",
]);

const INITIAL_VISIBLE_COLUMNS = TABLE_COLUMNS
  .filter((column) => column.defaultVisible)
  .map((column) => column.id);

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || "غير محدد";
}

function auditActor(item, action) {
  const actor = item[`${action}_by_name`] ?? item[`${action}_by`];
  if (actor && typeof actor === "object") {
    return actor.name ?? actor.username ?? actor.email ?? actor.id ?? "—";
  }
  return actor ?? "—";
}

// توحيد شكل بيانات المبادرات القادمة من الخادم
function normalizeInitiative(item) {
  const contact = getInitiativeContact(item);
  const invoices = Array.isArray(item.invoices) ? item.invoices : [];
  const totalsByCurrency = invoices.reduce((totals, invoice) => {
    const currency = invoice.currency?.code
      ?? invoice.currency?.symbol
      ?? (invoice.currency_id != null ? `العملة ${invoice.currency_id}` : "غير محددة");
    const amount = Number(invoice.amount);
    if (Number.isFinite(amount)) totals[currency] = (totals[currency] ?? 0) + amount;
    return totals;
  }, {});
  const totalCost = item.total_cost ?? item.total_amount;
  const cost = totalCost != null
    ? `${totalCost} ${item.currency?.code ?? item.currency?.symbol ?? ""}`.trim()
    : "—";
  const invoiceCost = Object.keys(totalsByCurrency).length
    ? Object.entries(totalsByCurrency).map(([currency, amount]) => `${amount.toFixed(2)} ${currency}`.trim()).join("، ")
    : null;
  return {
    ...item,
    id: item.id,
    name: item.title ?? item.name ?? "مبادرة دون اسم",
    field:
      item.category?.name ??
      item.category_name ??
      item.field ??
      "غير محدد",
    location:
      item.location?.name ??
      item.location_name ??
      item.location ??
      "غير محدد",
    date: formatDate(item.execution_date ?? item.date ?? item.created_at),
    status: getStatusLabel(item.status),
    statusCode: item.status,
    createdBy: contact.name || "—",
    ownerMobile: contact.mobile || "—",
    ownerWhatsapp: contact.whatsapp || "—",
    ownerEmail: contact.email || "—",
    ownerGender: contact.gender === "male" ? "ذكر" : contact.gender === "female" ? "أنثى" : contact.gender || "—",
    ownerBirthDate: contact.birthDate ? formatDate(contact.birthDate) : "—",
    createdOn: formatDate(item.created_at),
    updatedOn: formatDate(item.updated_at),
    deletedAt: formatDate(item.deleted_at),
    restoredAt: formatDate(item.restored_at),
    updatedBy: auditActor(item, "updated"),
    deletedBy: auditActor(item, "deleted"),
    restoredBy: auditActor(item, "restored"),
    totalCost: invoices.length ? invoiceCost ?? cost : cost,
  };
}

function attachInvoices(initiatives, invoices) {
  const invoicesByInitiative = new Map();
  for (const invoice of invoices) {
    const initiativeId = invoice.initiative_id
      ?? invoice.initiativeId
      ?? invoice.initiative?.id
      ?? invoice.initiative?.initiative_id;
    if (initiativeId == null) continue;
    const key = String(initiativeId);
    invoicesByInitiative.set(key, [...(invoicesByInitiative.get(key) ?? []), invoice]);
  }

  return initiatives.map((initiative) => {
    const relatedInvoices = invoicesByInitiative.get(String(initiative.id)) ?? [];
    const embeddedInvoices = Array.isArray(initiative.invoices) ? initiative.invoices : [];
    const mergedInvoices = new Map();
    for (const invoice of [...embeddedInvoices, ...relatedInvoices]) {
      mergedInvoices.set(invoice.id ?? JSON.stringify(invoice), invoice);
    }
    return { ...initiative, invoices: [...mergedInvoices.values()] };
  });
}

function isInitiativeExpired(item) {
  const endDate = item.expiry_date ?? item.expires_at ?? item.expiration_date ?? item.end_date ?? item.execution_date ?? item.date;
  return Boolean(endDate && String(endDate).slice(0, 10) < new Date().toISOString().slice(0, 10));
}

async function getVisibleInitiatives(initiatives, user) {
  if (user?.role !== "manager") return initiatives;

  return initiatives.filter((item) => (
    item.status !== "under_study"
    || String(
      item.user_id
      ?? item.requester_id
      ?? item.created_by_id
      ?? item.created_by?.id
      ?? item.user?.id
      ?? ""
    ) === String(user.id)
  ));
}

function getColumnSearchValue(item, columnId) {
  switch (columnId) {
    case "id":
      return item.id ?? "";
    case "reference":
      return item.reference_number ?? item.id ?? "";
    case "name":
      return item.name;
    case "field":
      return item.field;
    case "location":
      return item.location;
    case "createdBy":
      return item.createdBy;
    case "ownerMobile":
      return item.ownerMobile;
    case "ownerWhatsapp":
      return item.ownerWhatsapp;
    case "ownerEmail":
      return item.ownerEmail;
    case "ownerGender":
      return item.ownerGender;
    case "ownerBirthDate":
      return item.ownerBirthDate;
    case "contact":
      return [item.ownerMobile, item.ownerWhatsapp, item.ownerEmail].filter((value) => value && value !== "—").join(" ");
    case "date":
      return item.date;
    case "createdOn":
      return item.createdOn;
    case "updatedOn":
      return item.updatedOn;
    case "deletedAt":
      return item.deletedAt;
    case "restoredAt":
      return item.restoredAt;
    case "updatedBy":
      return item.updatedBy;
    case "deletedBy":
      return item.deletedBy;
    case "restoredBy":
      return item.restoredBy;
    case "description":
      return item.description;
    case "notes":
      return item.notes;
    case "totalCost":
      return item.totalCost;
    case "status":
      return item.status;
    default:
      return "";
  }
}

export default function InitiativesPage({ showPageHeader = true }) {
  const { user } = useAuth();
  const isAccountant = user?.role === "accountant";
  const canCreateInitiative = ["user", "manager"].includes(user?.role);
  const [items, setItems] = useState([]);
  const [viewMode, setViewMode] = useState("active");
  const [search, setSearch] = useState("");
  const [columnSearch, setColumnSearch] = useState({});
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState(INITIAL_VISIBLE_COLUMNS);
  const [columnsMenuAnchor, setColumnsMenuAnchor] = useState(null);
  const [columnMenu, setColumnMenu] = useState({ anchorEl: null, columnId: "" });
  const [sort, setSort] = useState({ field: "", direction: "asc" });
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const trashedPage = viewMode === "deleted" ? page : 1;
  const trashedPageSize = viewMode === "deleted" ? rowsPerPage : 100;

  function getListParams(currentPage = page, perPage = rowsPerPage) {
    const params = { page: currentPage, per_page: perPage };
    if (search.trim()) params.search = search.trim();
    return params;
  }

  async function deleteInitiative(item) {
    const confirmation = await confirmAction(`سيتم نقل مبادرة "${item.name}" إلى المحذوفات.`, "حذف المبادرة");
    if (!confirmation.isConfirmed) return;
    try {
      await initiativeService.remove(item.id);
      await showSuccess("تم نقل المبادرة إلى المحذوفات.");
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function restoreInitiative(item) {
    setRestoringId(item.id);
    setError("");
    try {
      await initiativeService.restore(item.id);
      await showSuccess("تمت استعادة المبادرة بنجاح.");
      if (items.length === 1 && page > 1) setPage((currentPage) => currentPage - 1);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setRestoringId(null);
    }
  }

  async function exportResults() {
    setExporting(true);
    setError("");
    try {
      const params = getListParams(1, 100);
      const firstPage = viewMode === "deleted"
        ? await initiativeService.listTrashed(params)
        : await initiativeService.list(params, user);
      const allItems = [...(Array.isArray(firstPage) ? firstPage : firstPage.items ?? [])];
      const lastPage = Number(firstPage.meta?.last_page) || Math.ceil(
        Number(firstPage.meta?.total ?? allItems.length) / 100
      );
      for (let currentPage = 2; currentPage <= lastPage; currentPage += 1) {
        const result = viewMode === "deleted"
          ? await initiativeService.listTrashed({ ...params, page: currentPage })
          : await initiativeService.list({ ...params, page: currentPage }, user);
        allItems.push(...(Array.isArray(result) ? result : result.items ?? []));
      }
      const invoices = await invoicesService.listAll();
      const visibleItems = viewMode === "deleted" ? allItems : await getVisibleInitiatives(allItems, user);
      const rows = attachInvoices(visibleItems, invoices)
        .filter((item) => !isAccountant || MANAGER_APPROVED_STATUSES.includes(item.status))
        .filter((item) => viewMode === "deleted"
          || (viewMode === "expired" ? isInitiativeExpired(item) : !isInitiativeExpired(item)))
        .map(normalizeInitiative)
        .filter((item) => shownColumns.every((column) => {
          const filter = columnSearch[column.id]?.trim().toLocaleLowerCase();
          return !filter || String(getColumnSearchValue(item, column.id) ?? "").toLocaleLowerCase().includes(filter);
        }))
        .map((item) => shownColumns.map((column) => getColumnSearchValue(item, column.id)));
      exportExcel("المبادرات", shownColumns.map((column) => column.label), rows);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitiatives() {
      setLoading(true);
      setError("");

      try {
        let result;
        let data;
        let costError = "";
        if (viewMode === "deleted") {
          result = await initiativeService.listTrashed({ page: trashedPage, per_page: trashedPageSize });
          data = await getVisibleInitiatives(Array.isArray(result) ? result : result?.items ?? [], user);
        } else {
          const params = getListParams(1, 100);
          const firstPage = await initiativeService.list(params, user);
          const allItems = [...(firstPage.items ?? [])];
          const lastPage = Number(firstPage.meta?.last_page) || 1;
          for (let currentPage = 2; currentPage <= lastPage; currentPage += 1) {
            const nextPage = await initiativeService.list({ ...params, page: currentPage }, user);
            allItems.push(...(nextPage.items ?? []));
          }
          const accessibleItems = await getVisibleInitiatives(allItems, user);
          const visibleItems = accessibleItems.filter((item) => (
            (isAccountant && MANAGER_APPROVED_STATUSES.includes(item.status))
            || (!isAccountant && (viewMode === "expired"
              ? isInitiativeExpired(item)
              : !isInitiativeExpired(item)))
          ));
          try {
            const invoices = isAccountant
              ? await invoicesService.listForInitiatives(visibleItems.map((item) => item.id))
              : await invoicesService.listAll();
            data = attachInvoices(visibleItems, invoices);
          } catch (invoiceError) {
            if (isAccountant) throw invoiceError;
            costError = `تعذر تحميل الفواتير لحساب التكلفة الإجمالية: ${getApiError(invoiceError)}`;
            data = attachInvoices(visibleItems, []);
          }
          result = { items: data, meta: { total: data.length } };
        }

        if (active) {
          setItems(data.map(normalizeInitiative));
          setTotalCount(Number(result?.meta?.total ?? data.length));
          setError(costError);
        }
      } catch (err) {
        if (active) {
          if (isAccountant) {
            setItems([]);
            setTotalCount(0);
          }
          setError(
            getApiError(err)
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadInitiatives();

    return () => {
      active = false;
    };
  }, [refreshKey, user?.id, user?.role, search, trashedPage, trashedPageSize, viewMode]);

  const availableColumns = viewMode === "deleted"
    ? TABLE_COLUMNS
    : TABLE_COLUMNS.filter((column) => !DELETION_RESTORATION_COLUMN_IDS.has(column.id));
  const shownColumns = availableColumns.filter((column) => visibleColumns.includes(column.id));
  const activeColumnFilters = shownColumns.filter((column) => columnSearch[column.id]?.trim());
  const modeItems = viewMode === "active"
    ? items.filter((item) => !isInitiativeExpired(item))
    : items;
  const currentItems = viewMode !== "deleted"
    ? modeItems.slice((page - 1) * rowsPerPage, page * rowsPerPage)
    : modeItems;
  const filteredItems = currentItems.filter((item) => activeColumnFilters.every((column) => {
    const value = String(getColumnSearchValue(item, column.id) ?? "").toLocaleLowerCase();
    return value.includes(columnSearch[column.id].trim().toLocaleLowerCase());
  }));
  const sortedItems = sort.field
    ? [...filteredItems].sort((first, second) => {
      const sortValue = (item) => {
        if (sort.field === "reference") return item.reference_number ?? item.id ?? "";
        if (sort.field === "status") return item.statusCode ?? item.status ?? "";
        if (sort.field === "createdOn") return item.created_at ?? item.createdOn ?? "";
        if (sort.field === "updatedOn") return item.updated_at ?? item.updatedOn ?? "";
        if (sort.field === "deletedAt") return item.deleted_at ?? item.deletedAt ?? "";
        if (sort.field === "totalCost") return item.total_cost ?? item.total_amount ?? item.totalCost ?? "";
        return item[sort.field] ?? "";
      };
      const firstValue = String(sortValue(first)).toLocaleLowerCase();
      const secondValue = String(sortValue(second)).toLocaleLowerCase();
      const result = firstValue.localeCompare(secondValue, "ar", { numeric: true });
      return sort.direction === "asc" ? result : -result;
    })
    : filteredItems;

  function toggleColumn(columnId) {
    if (visibleColumns.includes(columnId)) {
      setVisibleColumns(visibleColumns.filter((id) => id !== columnId));
      setColumnSearch((current) => ({ ...current, [columnId]: "" }));
    } else {
      setVisibleColumns([...visibleColumns, columnId]);
    }
  }

  function sortByColumn(columnId, direction) {
    setSort({ field: columnId, direction });
    setColumnMenu({ anchorEl: null, columnId: "" });
  }

  function renderCell(item, columnId) {
    switch (columnId) {
      case "id":
        return item.id ?? "—";
      case "reference":
        return item.reference_number ?? item.id ?? "—";
      case "name":
        return <Button
          component={Link}
          to={`/initiatives/${encodeURIComponent(item.id)}`}
          color="inherit"
          sx={{ p: 0, minWidth: 0, fontWeight: 700, textAlign: "right", justifyContent: "flex-start" }}
        >
          {item.name}
        </Button>;
      case "field":
        return <Chip size="small" label={item.field} variant="outlined" />;
      case "location":
        return item.location;
      case "createdBy":
        return item.createdBy;
      case "ownerMobile":
        return item.ownerMobile;
      case "ownerWhatsapp":
        return item.ownerWhatsapp;
      case "ownerEmail":
        return item.ownerEmail;
      case "ownerGender":
        return item.ownerGender;
      case "ownerBirthDate":
        return item.ownerBirthDate;
      case "contact":
        return <UserContactActions initiative={item} />;
      case "date":
        return item.date;
      case "createdOn":
        return item.createdOn;
      case "updatedOn":
        return item.updatedOn;
      case "deletedAt":
        return item.deletedAt;
      case "restoredAt":
        return item.restoredAt;
      case "updatedBy":
        return item.updatedBy;
      case "deletedBy":
        return item.deletedBy;
      case "restoredBy":
        return item.restoredBy;
      case "description":
        return item.description || "—";
      case "notes":
        return item.notes || "—";
      case "totalCost":
        return item.totalCost;
      case "status":
        return <StatusChip status={item.statusCode ?? item.status} />;
      default:
        return "—";
    }
  }

  return (
    <>
      {showPageHeader && (
        <PageHeader
          title="المبادرات"
          subtitle="إدارة طلبات المبادرات ومتابعة حالاتها"
          action={<Stack direction="row" spacing={1} flexWrap="wrap">
            {canCreateInitiative && <Button component={Link} to="/initiatives/new" variant="contained" startIcon={<AddRoundedIcon />}>مبادرة جديدة</Button>}
          </Stack>}
        />
      )}

      <ErrorPopup
        message={error}
        onClose={() => setError("")}
        action={<Button color="inherit" size="small" onClick={() => setRefreshKey((key) => key + 1)}>إعادة المحاولة</Button>}
      />

      <Paper variant="outlined" sx={{ overflow: "hidden" }}>
        <Box sx={{ p: { xs: 1.5, md: 2 }, borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={viewMode}
            onChange={(_event, nextMode) => {
              setViewMode(nextMode);
              setPage(1);
              setSearch("");
              setColumnSearch({});
              setSort({ field: "", direction: "asc" });
            }}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="تصنيف المبادرات"
            sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
          >
            <Tab value="active" label="المبادرات النشطة" />
            {user?.role === "manager" && <Tab value="deleted" label="المبادرات المحذوفة" />}
            <Tab value="expired" label="المبادرات المنتهية" />
          </Tabs>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h6">قائمة المبادرات</Typography>
              <Typography variant="body2" color="text.secondary">
                {isAccountant
                  ? "المبادرات التي وافق عليها المدير"
                  : viewMode === "active"
                  ? "بحث وفرز وتصفية المبادرات النشطة"
                  : viewMode === "deleted"
                    ? "عرض المبادرات المحذوفة واستعادتها"
                    : "المبادرات التي تجاوزت تاريخ التنفيذ؛ للعرض فقط"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                بحث الأعمدة يطبّق على السجلات المحمّلة في الصفحة الحالية
              </Typography>
            </Box>
          </Stack>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", sm: "center" }}
            sx={{ mt: 2 }}
          >
            {viewMode !== "deleted" && <TextField
              size="small"
              type="search"
              placeholder="ابحث بالاسم أو رقم المرجع أو المجال"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              sx={{ flex: 1, maxWidth: { sm: 480 } }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>,
              }}
              inputProps={{ "aria-label": "ابحث بالاسم أو رقم المرجع أو المجال" }}
            />}
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", justifyContent: { xs: "flex-end", sm: "flex-start" } }}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<ViewColumnOutlinedIcon />}
                endIcon={<ExpandMoreRoundedIcon />}
                aria-haspopup="menu"
                aria-expanded={Boolean(columnsMenuAnchor)}
                aria-label={`إظهار أو إخفاء الأعمدة، ${shownColumns.length} من ${availableColumns.length} ظاهرة`}
                onClick={(event) => setColumnsMenuAnchor(event.currentTarget)}
                sx={{ whiteSpace: "nowrap" }}
              >
                الأعمدة ({shownColumns.length}/{availableColumns.length})
              </Button>
              <Menu
                anchorEl={columnsMenuAnchor}
                open={Boolean(columnsMenuAnchor)}
                onClose={() => setColumnsMenuAnchor(null)}
                MenuListProps={{ "aria-label": "اختيار الأعمدة الظاهرة" }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle2" fontWeight={800}>الأعمدة الظاهرة</Typography>
                  <Typography variant="caption" color="text.secondary">
                    اختر البيانات التي تريد عرضها في الجدول
                  </Typography>
                </Box>
                <Divider />
                <Stack direction="row" spacing={1} sx={{ px: 1.5, py: 0.75 }}>
                  <Button
                    size="small"
                    onClick={() => setVisibleColumns((current) => [
                      ...new Set([...current, ...availableColumns.map((column) => column.id)]),
                    ])}
                  >
                    إظهار الكل
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setVisibleColumns((current) => [
                        ...current.filter((id) => !availableColumns.some((column) => column.id === id)),
                        ...availableColumns.filter((column) => column.defaultVisible).map((column) => column.id),
                      ]);
                      setColumnSearch({});
                    }}
                  >
                    الافتراضي
                  </Button>
                </Stack>
                <Divider />
                {availableColumns.map((column) => (
                  <MenuItem
                    key={column.id}
                    dense
                    onClick={() => toggleColumn(column.id)}
                    sx={{ minWidth: 230 }}
                  >
                    <FormControlLabel
                      sx={{ m: 0, width: "100%" }}
                      control={<Checkbox size="small" checked={visibleColumns.includes(column.id)} />}
                      label={column.label}
                    />
                  </MenuItem>
                ))}
              </Menu>
              <Button
                variant="outlined"
                startIcon={<DownloadOutlinedIcon />}
                onClick={exportResults}
                disabled={exporting || loading}
              >
                {exporting ? "جارٍ التصدير..." : "تصدير Excel"}
              </Button>
            </Box>
          </Stack>
        </Box>
        {loading ? (
          <Box
            sx={{
              minHeight: 220,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <CircularProgress />
            <Typography color="text.secondary">
              جارٍ تحميل المبادرات...
            </Typography>
          </Box>
        ) : (
          <SyncedHorizontalScrollbars>
          <TableContainer>
            <Table sx={{ minWidth: 1500 }}>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ whiteSpace: "nowrap" }}>{isAccountant ? "عرض المبادرة" : "الإجراءات"}</TableCell>
                  {shownColumns.map((column) => (
                    <TableCell key={column.id} sx={{ whiteSpace: "nowrap" }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="body2" fontWeight={800}>{column.label}</Typography>
                        <Tooltip title={`بحث وفرز ${column.label}`}>
                          <IconButton
                            size="small"
                            aria-label={`بحث وفرز ${column.label}`}
                            color={columnSearch[column.id]?.trim() || sort.field === column.id ? "primary" : "default"}
                            onClick={(event) => setColumnMenu({
                              anchorEl: event.currentTarget,
                              columnId: column.id,
                            })}
                          >
                            <FilterListOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {sortedItems.map((item) => {
                  const ownerId = item.user_id ?? item.requester_id ?? item.created_by_id
                    ?? item.created_by?.id ?? item.user?.id;
                  const isOwner = ownerId != null && user?.id != null && String(ownerId) === String(user.id);
                  const isExpired = isInitiativeExpired(item);
                  const canEdit = !isExpired && (user?.role === "manager" || (isOwner && item.statusCode === "under_study"));
                  const canDelete = !isExpired && (user?.role === "manager" || (isOwner && item.statusCode === "under_study"));
                  const canAddNeed = item.statusCode === "under_study";
                  const canAddInvoice = !isExpired
                    && ["manager_approved", "accountant_approved", "completed"].includes(item.statusCode)
                    && (user?.role === "manager" || isOwner);
                  return (
                  <TableRow hover key={item.id}>
                    <TableCell align="center">
                      <ActionDropdown label={isAccountant ? "عرض المبادرة" : "الإجراءات"}>
                        {viewMode === "deleted"
                          ? user?.role === "manager" && <Button size="small" variant="outlined" startIcon={<RestoreOutlinedIcon />} disabled={restoringId === item.id} onClick={() => restoreInitiative(item)}>
                            {restoringId === item.id ? "جارٍ الاستعادة..." : "استعادة"}
                          </Button>
                          : isAccountant
                            ? <Button component={Link} to={`/initiatives/${encodeURIComponent(item.id)}`} size="small" variant="outlined" startIcon={<VisibilityOutlinedIcon />}>عرض</Button>
                            : <>
                            <Button component={Link} to={`/initiatives/${encodeURIComponent(item.id)}`} size="small" variant="outlined" startIcon={<VisibilityOutlinedIcon />}>عرض</Button>
                            {!isExpired && <Button component={Link} to={`/initiatives/${encodeURIComponent(item.id)}?edit=1`} size="small" variant="outlined" startIcon={<EditOutlinedIcon />} disabled={!canEdit}>تعديل</Button>}
                            {!isExpired && <Button component={Link} to={`/initiatives/${encodeURIComponent(item.id)}?needs=1#needs`} size="small" variant="outlined" startIcon={<ListAltOutlinedIcon />} disabled={!canAddNeed}>الاحتياجات</Button>}
                            {!isExpired && canAddInvoice && <Button component={Link} to={`/initiatives/${encodeURIComponent(item.id)}?invoice=1`} size="small" variant="outlined" startIcon={<AddCardOutlinedIcon />}>فاتورة</Button>}
                            {!isExpired && user?.role === "manager" && <Button component={Link} to={`/admin?tab=5&model=App%5CModels%5CInitiative&model_id=${encodeURIComponent(item.id)}&user_id=${encodeURIComponent(ownerId ?? "")}`} size="small" variant="outlined" startIcon={<ReceiptLongOutlinedIcon />}>السجلات</Button>}
                            {!isExpired && canDelete && <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => deleteInitiative(item)}>حذف</Button>}
                          </>}
                      </ActionDropdown>
                    </TableCell>
                    {shownColumns.map((column) => (
                      <TableCell key={column.id} sx={{
                        whiteSpace: ["description", "notes"].includes(column.id) ? "normal" : "nowrap",
                        maxWidth: ["description", "notes"].includes(column.id) ? 260 : undefined,
                        fontWeight: column.id === "reference" ? 700 : undefined,
                        color: column.id === "reference" ? "primary.main" : undefined,
                      }}>
                        {renderCell(item, column.id)}
                      </TableCell>
                    ))}
                  </TableRow>
                  );
                })}

                {!sortedItems.length && (
                  <TableRow>
                    <TableCell colSpan={shownColumns.length + 1} align="center">
                      <Box sx={{ py: 5 }}>
                        <Typography fontWeight={700}>
                          {error
                            ? "تعذر عرض المبادرات"
                            : currentItems.length
                              ? "لا توجد نتائج مطابقة لبحث الأعمدة في هذه الصفحة"
                              : "لا توجد نتائج"}
                        </Typography>

                        <Typography
                          color="text.secondary"
                          variant="body2"
                          sx={{ mt: 1 }}
                        >
                          {error
                            ? "تحقق من إعدادات الاتصال ثم أعد المحاولة."
                            : items.length
                              ? "جرّب تعديل كلمات البحث أو الانتقال إلى صفحة أخرى."
                              : "لا توجد مبادرات متاحة وفق معايير البحث الحالية."}
                        </Typography>

                        {!error && user?.role === "accountant" && (
                          <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                            لا توجد مبادرات وافق عليها المدير.
                          </Typography>
                        )}

                        {!error && (
                          <Button
                            sx={{ mt: 1 }}
                            startIcon={<RefreshRoundedIcon />}
                            onClick={() => {
                              setSearch("");
                              setColumnSearch({});
                              setPage(1);
                            }}
                          >
                            مسح الفلاتر
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          </SyncedHorizontalScrollbars>
        )}
      </Paper>
      <Popover
        open={Boolean(columnMenu.anchorEl)}
        anchorEl={columnMenu.anchorEl}
        onClose={() => setColumnMenu({ anchorEl: null, columnId: "" })}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        {columnMenu.columnId && (
          <Box sx={{ p: 2, width: 260 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
              {TABLE_COLUMNS.find((column) => column.id === columnMenu.columnId)?.label}
            </Typography>
            <TextField
              autoFocus
              type="search"
              size="small"
              label="بحث في هذا العمود"
              value={columnSearch[columnMenu.columnId] ?? ""}
              onChange={(event) => setColumnSearch((current) => ({
                ...current,
                [columnMenu.columnId]: event.target.value,
              }))}
              fullWidth
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button
                size="small"
                variant={sort.field === columnMenu.columnId && sort.direction === "asc" ? "contained" : "outlined"}
                startIcon={<ArrowUpwardRoundedIcon />}
                onClick={() => sortByColumn(columnMenu.columnId, "asc")}
                fullWidth
              >
                تصاعدي
              </Button>
              <Button
                size="small"
                variant={sort.field === columnMenu.columnId && sort.direction === "desc" ? "contained" : "outlined"}
                startIcon={<ArrowDownwardRoundedIcon />}
                onClick={() => sortByColumn(columnMenu.columnId, "desc")}
                fullWidth
              >
                تنازلي
              </Button>
            </Stack>
            {columnSearch[columnMenu.columnId]?.trim() && (
              <Button
                size="small"
                sx={{ mt: 1 }}
                onClick={() => setColumnSearch((current) => ({
                  ...current,
                  [columnMenu.columnId]: "",
                }))}
              >
                مسح البحث
              </Button>
            )}
          </Box>
        )}
      </Popover>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mt: 2, px: 1 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">عرض</Typography>
          <TextField
            select
            size="small"
            value={rowsPerPage}
            onChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(1);
            }}
            sx={{ width: 90 }}
            inputProps={{ "aria-label": "عدد المبادرات في الصفحة" }}
          >
            {[10, 25, 50, 100].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
          </TextField>
          <Typography variant="body2" color="text.secondary">سجلًا</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {activeColumnFilters.length
              ? `تطابق ${filteredItems.length} من ${currentItems.length} سجلًا معروضًا · إجمالي ${totalCount} مبادرة`
            : totalCount
              ? `عرض ${(page - 1) * rowsPerPage + 1}–${Math.min(page * rowsPerPage, totalCount)} من ${totalCount} مبادرة`
              : "لا توجد مبادرات"}
        </Typography>
        {totalCount > rowsPerPage && (
          <Pagination
            count={Math.ceil(totalCount / rowsPerPage)}
            page={page}
            onChange={(_event, nextPage) => setPage(nextPage)}
            disabled={loading}
            color="primary"
            shape="rounded"
          />
        )}
      </Stack>
    </>
  );
}
