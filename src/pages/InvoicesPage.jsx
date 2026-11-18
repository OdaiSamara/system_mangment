import { getApiError } from "../api/http.js";
import { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, IconButton, InputAdornment, Menu, MenuItem, Pagination, Paper, Popover, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Tooltip, Typography } from "@mui/material";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import SwapVertRoundedIcon from "@mui/icons-material/SwapVertRounded";
import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader.jsx";
import ErrorPopup from "../components/ErrorPopup.jsx";
import ActionDropdown from "../components/ActionDropdown.jsx";
import SyncedHorizontalScrollbars from "../components/SyncedHorizontalScrollbars.jsx";
import InvoiceEditDialog from "../components/InvoiceEditDialog.jsx";
import { invoicesService } from "../services/invoicesService.js";
import { initiativeService } from "../services/initiativeService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { confirmAction, showSuccess } from "../utils/alerts.js";
import { formatDate, getDateField } from "../utils/dateFormat.js";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RestoreOutlinedIcon from "@mui/icons-material/RestoreOutlined";
import { exportExcel } from "../utils/exportExcel.js";
import { localizeTableValue } from "../utils/tableLocalization.js";

const ACCOUNTANT_VISIBLE_STATUSES = ["manager_approved", "accountant_approved", "completed"];

const INVOICE_COLUMNS = [
  { id: "id", label: "المعرّف" },
  { id: "invoice_number", label: "رقم الفاتورة" },
  { id: "initiative", label: "رقم المبادرة" },
  { id: "initiative_id", label: "معرّف المبادرة" },
  { id: "invoice_date", label: "التاريخ" },
  { id: "amount", label: "القيمة" },
  { id: "currency", label: "العملة" },
  { id: "currency_id", label: "معرّف العملة" },
  { id: "description", label: "الوصف" },
  { id: "notes", label: "ملاحظات" },
  { id: "attachment", label: "المرفق" },
  { id: "status", label: "الحالة" },
  { id: "created_by", label: "أضيف بواسطة" },
  { id: "updated_by", label: "عُدّل بواسطة" },
  { id: "deleted_by", label: "حُذف بواسطة" },
  { id: "restored_by", label: "استُعيد بواسطة" },
  { id: "created_at", label: "تاريخ الإنشاء" },
  { id: "updated_at", label: "تاريخ التعديل" },
  { id: "deleted_at", label: "تاريخ الحذف" },
  { id: "restored_at", label: "تاريخ الاستعادة" },
];

function getInitiativeId(invoice) {
  return invoice.initiative_id
    ?? invoice.initiativeId
    ?? invoice.initiative?.id
    ?? invoice.initiative?.initiative_id;
}

function isActiveInitiative(initiative) {
  return !initiative.deleted_at
    && !initiative.deletedAt
    && !initiative.trashed_at
    && !initiative.trashedAt
    && initiative.is_deleted !== true
    && initiative.is_trashed !== true;
}

function getColumnValue(invoice, columnId) {
  switch (columnId) {
    case "initiative":
      return invoice.initiative?.reference_number
        ?? invoice.initiative?.title
        ?? getInitiativeId(invoice)
        ?? "";
    case "amount":
      return invoice.amount ?? "";
    case "status":
      return localizeTableValue(invoice.status, "status");
    case "currency":
      return invoice.currency?.name ?? invoice.currency?.code ?? invoice.currency?.symbol ?? "";
    case "attachment":
      return invoice.attachment_name ?? invoice.file_name ?? "";
    case "created_by":
    case "updated_by":
    case "deleted_by":
    case "restored_by":
      return actorName(invoice[`${columnId}_name`] ?? invoice[columnId]);
    case "invoice_date":
    case "created_at":
    case "updated_at":
    case "deleted_at":
    case "restored_at":
      return getDateField(invoice, columnId) ?? "";
    default:
      return invoice[columnId] ?? "";
  }
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const [viewMode, setViewMode] = useState("active");
  const [invoiceBeingViewed, setInvoiceBeingViewed] = useState(null);
  const [invoiceBeingEdited, setInvoiceBeingEdited] = useState(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [columnSearch, setColumnSearch] = useState({});
  const [columnMenu, setColumnMenu] = useState({ anchorEl: null, columnId: "" });
  const [columnsMenuAnchor, setColumnsMenuAnchor] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(() => INVOICE_COLUMNS.map((column) => column.id));
  const [sort, setSort] = useState({ field: "", direction: "asc" });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const canManageInvoices = user?.role === "manager";
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (viewMode === "deleted") {
        if (!canManageInvoices) {
          setItems([]);
          return;
        }
        setItems(await invoicesService.listTrashed());
        return;
      }

      if (user?.role !== "accountant") {
        setItems(await invoicesService.listAll());
        return;
      }

      const initiatives = [];
      let page = 1;
      let lastPage = 1;
      do {
        const result = await initiativeService.list({ page, per_page: 100 }, user);
        initiatives.push(...result.items.filter((initiative) => (
          isActiveInitiative(initiative)
          && ACCOUNTANT_VISIBLE_STATUSES.includes(initiative.status)
        )));
        lastPage = Number(result.meta?.last_page) || 1;
        page += 1;
      } while (page <= lastPage);

      const embeddedInvoices = initiatives.flatMap((initiative) => (
        Array.isArray(initiative.invoices) ? initiative.invoices : []
      ));
      const relatedInvoices = await invoicesService.listForInitiatives(
        initiatives.map((initiative) => initiative.id)
      );
      const uniqueInvoices = new Map();
      for (const invoice of [...embeddedInvoices, ...relatedInvoices]) {
        uniqueInvoices.set(invoice.id ?? JSON.stringify(invoice), invoice);
      }
      setItems([...uniqueInvoices.values()]);
    }
    catch (e) { setError(getApiError(e)); }
    finally { setLoading(false); }
  }, [user, viewMode, canManageInvoices]);
  useEffect(() => { load(); }, [load]);
  async function download(invoice) {
    setDownloading(invoice.id); setError("");
    try {
      const blob = await invoicesService.downloadAttachment(invoice.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = invoice.attachment_name || invoice.file_name || `invoice-${invoice.id}`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (e) { setError(getApiError(e)); }
    finally { setDownloading(null); }
  }
  async function deleteInvoice(invoice) {
    const confirmation = await confirmAction(
      `سيتم نقل الفاتورة "${invoice.invoice_number ?? invoice.id}" ومرفقها إلى المحذوفات.`,
      "حذف الفاتورة"
    );
    if (!confirmation.isConfirmed) return;

    setDeleting(invoice.id); setError("");
    try {
      await invoicesService.remove(invoice.id);
      await load();
      await showSuccess("تم نقل الفاتورة ومرفقها إلى المحذوفات.");
    } catch (e) { setError(getApiError(e)); }
    finally { setDeleting(null); }
  }
  async function restoreInvoice(invoice) {
    setRestoring(invoice.id); setError("");
    try {
      await invoicesService.restore(invoice.id);
      await load();
      await showSuccess("تمت استعادة الفاتورة بنجاح.");
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setRestoring(null);
    }
  }
  const filteredItems = items.filter((invoice) => {
    const globalValue = globalSearch.trim().toLocaleLowerCase();
    if (globalValue && !INVOICE_COLUMNS.some((column) => (
      String(getColumnValue(invoice, column.id)).toLocaleLowerCase().includes(globalValue)
    ))) return false;

    return INVOICE_COLUMNS.every((column) => {
      const filter = columnSearch[column.id]?.trim().toLocaleLowerCase();
      return !filter || String(getColumnValue(invoice, column.id)).toLocaleLowerCase().includes(filter);
    });
  });
  const sortedItems = sort.field
    ? [...filteredItems].sort((first, second) => {
      const firstValue = getColumnValue(first, sort.field);
      const secondValue = getColumnValue(second, sort.field);
      const numericFirst = Number(firstValue);
      const numericSecond = Number(secondValue);
      const bothNumeric = firstValue !== "" && secondValue !== ""
        && Number.isFinite(numericFirst) && Number.isFinite(numericSecond);
      const comparison = bothNumeric
        ? numericFirst - numericSecond
        : String(firstValue).localeCompare(String(secondValue), "ar", { numeric: true });
      return sort.direction === "asc" ? comparison : -comparison;
    })
    : filteredItems;
  const shownColumns = INVOICE_COLUMNS.filter((column) => visibleColumns.includes(column.id));
  const pageCount = Math.max(1, Math.ceil(sortedItems.length / rowsPerPage));
  const pageItems = sortedItems.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  function exportResults() {
    exportExcel(
      viewMode === "deleted" ? "الفواتير-المحذوفة" : "الفواتير",
      shownColumns.map((column) => column.label),
      sortedItems.map((invoice) => shownColumns.map((column) => {
        const value = getColumnValue(invoice, column.id);
        if (column.id === "amount") return `${value ?? ""} ${invoice.currency?.code ?? invoice.currency?.symbol ?? ""}`.trim();
        return column.id === "invoice_date" || column.id.endsWith("_at") ? formatDate(value) : value;
      })),
    );
  }

  function openColumnMenu(event, columnId) {
    setColumnMenu({ anchorEl: event.currentTarget, columnId });
  }

  function sortByColumn(direction) {
    setSort({ field: columnMenu.columnId, direction });
    setColumnMenu({ anchorEl: null, columnId: "" });
    setPage(1);
  }

  function toggleColumnSort(columnId) {
    setSort((current) => ({
      field: columnId,
      direction: current.field === columnId && current.direction === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  }

  function toggleColumnVisibility(columnId) {
    setVisibleColumns((current) => current.includes(columnId)
      ? current.filter((id) => id !== columnId)
      : [...current, columnId]);
  }

  return <>
    <PageHeader
      title="الفواتير والمرفقات"
      subtitle="عرض القيم المجمعة للفواتير ومرفقاتها وإدارتها"
      action={canManageInvoices && <Button component={Link} to="/initiatives" variant="contained">اختيار مبادرة لإضافة فاتورة</Button>}
    />
    <ErrorPopup message={error} onClose={() => setError("")} />
    <Paper variant="outlined" sx={{ mb: 2 }}>
      <Tabs
        value={viewMode}
        onChange={(_event, nextMode) => {
          setViewMode(nextMode);
          setGlobalSearch("");
          setColumnSearch({});
          setSort({ field: "", direction: "asc" });
          setPage(1);
        }}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="عرض الفواتير النشطة أو المحذوفة"
      >
        <Tab value="active" label="الفواتير النشطة" />
        {canManageInvoices && <Tab value="deleted" label="الفواتير المحذوفة" />}
      </Tabs>
    </Paper>
    <Paper variant="outlined" sx={{ overflow: "hidden" }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
          <TextField
            size="small"
            type="search"
            fullWidth
            placeholder="بحث في جميع أعمدة الفواتير"
            value={globalSearch}
            onChange={(event) => { setGlobalSearch(event.target.value); setPage(1); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }}
            inputProps={{ "aria-label": "بحث في جميع أعمدة الفواتير" }}
          />
          <Button
            variant="outlined"
            startIcon={<ViewColumnOutlinedIcon />}
            endIcon={<ExpandMoreRoundedIcon />}
            aria-haspopup="menu"
            aria-expanded={Boolean(columnsMenuAnchor)}
            onClick={(event) => setColumnsMenuAnchor(event.currentTarget)}
            sx={{ whiteSpace: "nowrap", alignSelf: { xs: "stretch", sm: "center" } }}
          >
            الأعمدة ({visibleColumns.length}/{INVOICE_COLUMNS.length})
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadOutlinedIcon />}
            onClick={exportResults}
            disabled={loading || !shownColumns.length}
            sx={{ whiteSpace: "nowrap", alignSelf: { xs: "stretch", sm: "center" } }}
          >
            تصدير Excel
          </Button>
          <Menu
            anchorEl={columnsMenuAnchor}
            open={Boolean(columnsMenuAnchor)}
            onClose={() => setColumnsMenuAnchor(null)}
            MenuListProps={{ "aria-label": "اختيار أعمدة الفواتير الظاهرة" }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2" fontWeight={800}>الأعمدة الظاهرة</Typography>
              <Typography variant="caption" color="text.secondary">اختر الأعمدة التي تريد عرضها</Typography>
            </Box>
            <Divider />
            <Stack direction="row" spacing={1} sx={{ px: 1.5, py: 0.75 }}>
              <Button size="small" onClick={() => setVisibleColumns(INVOICE_COLUMNS.map((column) => column.id))}>إظهار الكل</Button>
              <Button size="small" onClick={() => setVisibleColumns([])}>إخفاء الكل</Button>
            </Stack>
            <Divider />
            {INVOICE_COLUMNS.map((column) => (
              <MenuItem key={column.id} dense onClick={() => toggleColumnVisibility(column.id)} sx={{ minWidth: 230 }}>
                <FormControlLabel
                  sx={{ m: 0, width: "100%" }}
                  control={<Checkbox size="small" checked={visibleColumns.includes(column.id)} />}
                  label={column.label}
                />
              </MenuItem>
            ))}
          </Menu>
        </Stack>
      </Box>
      {loading ? <Box sx={{ minHeight: 200, display: "grid", placeItems: "center" }}><CircularProgress /></Box> : <SyncedHorizontalScrollbars><TableContainer><Table sx={{ minWidth: 1300 }}>
        <TableHead><TableRow>
          <TableCell sx={{ whiteSpace: "nowrap" }}>الإجراءات</TableCell>
          {shownColumns.map((column) => (
            <TableCell key={column.id} sx={{ whiteSpace: "nowrap" }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="body2" fontWeight={800}>{column.label}</Typography>
                <Tooltip title={`فرز ${column.label}`}>
                  <IconButton
                    size="small"
                    aria-label={`فرز ${column.label}${sort.field === column.id ? ` ${sort.direction === "asc" ? "تصاعدي" : "تنازلي"}` : ""}`}
                    color={sort.field === column.id ? "primary" : "default"}
                    onClick={() => toggleColumnSort(column.id)}
                  >
                    {sort.field === column.id
                      ? sort.direction === "asc" ? <ArrowUpwardRoundedIcon fontSize="small" /> : <ArrowDownwardRoundedIcon fontSize="small" />
                      : <SwapVertRoundedIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
                <Tooltip title={`بحث وفرز ${column.label}`}>
                  <IconButton
                    size="small"
                    aria-label={`بحث وفرز ${column.label}`}
                    color={columnSearch[column.id]?.trim() ? "primary" : "default"}
                    onClick={(event) => openColumnMenu(event, column.id)}
                  >
                    <FilterListOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </TableCell>
          ))}
        </TableRow></TableHead>
        <TableBody>{pageItems.map((invoice) => <TableRow key={invoice.id} hover>
          <TableCell sx={{ minWidth: 150, textAlign: "center" }}><ActionDropdown label="الإجراءات">
            <Button
              size="small"
              variant="outlined"
              onClick={() => setInvoiceBeingViewed(invoice)}
            >
              عرض
            </Button>
            {viewMode === "deleted" ? (
              canManageInvoices && <Button
                size="small"
                variant="outlined"
                startIcon={<RestoreOutlinedIcon />}
                disabled={restoring === invoice.id}
                onClick={() => restoreInvoice(invoice)}
              >
                {restoring === invoice.id ? "جارٍ الاستعادة..." : "استعادة"}
              </Button>
            ) : <>
              <Button size="small" variant="outlined" startIcon={<DownloadOutlinedIcon />} disabled={downloading === invoice.id} onClick={() => download(invoice)}>{downloading === invoice.id ? "جارٍ التنزيل" : "تنزيل"}</Button>
              {canManageInvoices && <>
                <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => setInvoiceBeingEdited(invoice)}>تعديل</Button>
                <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} disabled={deleting === invoice.id} onClick={() => deleteInvoice(invoice)}>{deleting === invoice.id ? "جارٍ الحذف" : "حذف"}</Button>
              </>}
            </>}
          </ActionDropdown></TableCell>
          {shownColumns.map((column) => {
            const value = getColumnValue(invoice, column.id);
            let content = value || "—";
            if (column.id === "invoice_date" || column.id.endsWith("_at")) {
              content = formatDate(value);
            } else if (column.id === "amount") {
              content = <>{value || "—"} {invoice.currency?.code ?? invoice.currency?.symbol ?? ""}</>;
            }
            return <TableCell key={column.id}>{content}</TableCell>;
          })}
        </TableRow>)}
        {!pageItems.length && <TableRow><TableCell colSpan={shownColumns.length + 1} align="center"><Typography color="text.secondary" sx={{ py: 4 }}>{items.length ? "لا توجد نتائج مطابقة للبحث." : viewMode === "deleted" ? "لا توجد فواتير محذوفة." : "لا توجد فواتير نشطة."}</Typography></TableCell></TableRow>}</TableBody>
      </Table></TableContainer></SyncedHorizontalScrollbars>}
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ p: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" color="text.secondary">عرض</Typography>
          <TextField
            select
            size="small"
            value={rowsPerPage}
            onChange={(event) => { setRowsPerPage(Number(event.target.value)); setPage(1); }}
            sx={{ width: 90 }}
            inputProps={{ "aria-label": "عدد الفواتير في الصفحة" }}
          >
            {[10, 25, 50, 100].map((size) => <MenuItem key={size} value={size}>{size}</MenuItem>)}
          </TextField>
          <Typography variant="body2" color="text.secondary">{sortedItems.length} فاتورة</Typography>
        </Stack>
        {pageCount > 1 && <Pagination count={pageCount} page={page} onChange={(_event, value) => setPage(value)} color="primary" shape="rounded" size="small" siblingCount={0} boundaryCount={1} />}
      </Stack>
    </Paper>
    <Popover
      open={Boolean(columnMenu.anchorEl)}
      anchorEl={columnMenu.anchorEl}
      onClose={() => setColumnMenu({ anchorEl: null, columnId: "" })}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
    >
      <Box sx={{ p: 2, width: 280 }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
          بحث وفرز {INVOICE_COLUMNS.find((column) => column.id === columnMenu.columnId)?.label ?? ""}
        </Typography>
        <TextField
          autoFocus
          size="small"
          fullWidth
          label="بحث في العمود"
          value={columnSearch[columnMenu.columnId] ?? ""}
          onChange={(event) => {
            setColumnSearch((current) => ({ ...current, [columnMenu.columnId]: event.target.value }));
            setPage(1);
          }}
        />
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button size="small" startIcon={<ArrowUpwardRoundedIcon />} onClick={() => sortByColumn("asc")}>تصاعدي</Button>
          <Button size="small" startIcon={<ArrowDownwardRoundedIcon />} onClick={() => sortByColumn("desc")}>تنازلي</Button>
        </Stack>
      </Box>
    </Popover>
    <InvoiceDetailsDialog
      invoice={invoiceBeingViewed}
      onClose={() => setInvoiceBeingViewed(null)}
      onDownload={download}
      downloading={downloading === invoiceBeingViewed?.id}
    />
    <InvoiceEditDialog
      invoice={invoiceBeingEdited}
      open={Boolean(invoiceBeingEdited)}
      onClose={() => setInvoiceBeingEdited(null)}
      onSaved={async () => {
        await load();
        await showSuccess("تم تعديل الفاتورة.");
      }}
    />
  </>;
}

function InvoiceDetailsDialog({ invoice, onClose, onDownload, downloading }) {
  if (!invoice) return null;

  const detailRows = [
    ["رقم الفاتورة", invoice.invoice_number],
    ["تاريخ الفاتورة", formatDate(invoice.invoice_date)],
    ["القيمة", `${invoice.amount ?? "—"} ${invoice.currency?.code ?? invoice.currency?.symbol ?? ""}`.trim()],
    ["الحالة", localizeTableValue(invoice.status, "status")],
    ["رقم المبادرة", invoice.initiative?.reference_number ?? getInitiativeId(invoice)],
    ["الوصف", invoice.description],
    ["الملاحظات", invoice.notes],
    ["اسم المرفق", invoice.attachment_name ?? invoice.file_name],
    ["أضيف بواسطة", actorName(invoice.created_by_name ?? invoice.created_by)],
    ["تاريخ الإضافة", formatDate(invoice.created_at)],
    ["عُدّل بواسطة", actorName(invoice.updated_by_name ?? invoice.updated_by)],
    ["تاريخ التعديل", formatDate(invoice.updated_at)],
  ];

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontSize: { xs: "1.1rem", sm: "1.25rem" } }}>تفاصيل الفاتورة</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
          {detailRows.map(([label, value]) => (
            <Box key={label}>
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography sx={{ mt: 0.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {value || "—"}
              </Typography>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", justifyContent: "flex-start" }}>
        <Button
          startIcon={<DownloadOutlinedIcon />}
          disabled={downloading}
          onClick={() => onDownload(invoice)}
        >
          {downloading ? "جارٍ التنزيل..." : "تنزيل المرفق"}
        </Button>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}

function actorName(actor) {
  if (actor && typeof actor === "object") {
    return actor.name ?? actor.username ?? actor.email ?? actor.id ?? "—";
  }
  return actor ?? "—";
}
