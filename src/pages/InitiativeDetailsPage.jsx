import { getApiError } from "../api/http.js";
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Paper, Stack,
  TextField, Typography,
} from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import PageHeader from "../components/PageHeader.jsx";
import ErrorPopup from "../components/ErrorPopup.jsx";
import InvoiceEditDialog from "../components/InvoiceEditDialog.jsx";
import UserContactActions from "../components/UserContactActions.jsx";
import StatusChip from "../components/StatusChip.jsx";
import { initiativeService } from "../services/initiativeService.js";
import { invoicesService } from "../services/invoicesService.js";
import { catalogService } from "../services/catalogService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { confirmAction, showSuccess } from "../utils/alerts.js";
import { formatDate } from "../utils/dateFormat.js";
import { getInitiativeContact } from "../utils/initiativeContact.js";
import DataTable from "../components/DataTable.jsx";

function Detail({ label, value }) {
  return <Box><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={700} sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>{value || "—"}</Typography></Box>;
}

function listFrom(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (value?.data && typeof value.data === "object") return listFrom(value.data);
  return [];
}

function mergeRecords(...lists) {
  const records = new Map();
  for (const record of lists.flat()) {
    const key = record?.id ?? JSON.stringify(record);
    records.set(String(key), record);
  }
  return [...records.values()];
}

function actorName(actor) {
  if (actor && typeof actor === "object") {
    return actor.name ?? actor.username ?? actor.email ?? actor.id ?? "—";
  }
  return actor ?? "—";
}

function localDateString() {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

export default function InitiativeDetailsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [needs, setNeeds] = useState([]);
  const [needsLoaded, setNeedsLoaded] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [units, setUnits] = useState([]);
  const [currencyError, setCurrencyError] = useState("");
  const [unitError, setUnitError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [busy, setBusy] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ invoice_number: "", invoice_date: localDateString(), amount: "", currency_id: "", description: "", notes: "" });
  const [attachment, setAttachment] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", notes: "", execution_date: "" });
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceBeingEdited, setInvoiceBeingEdited] = useState(null);
  const [needDialogOpen, setNeedDialogOpen] = useState(false);
  const [needForm, setNeedForm] = useState({ item_name: "", quantity: "1", unit_id: "", notes: "" });
  const role = user?.role === "requester" ? "user" : user?.role;

  const loadRelated = useCallback(async (initiative = {}) => {
    setNeedsLoaded(false);
    const embeddedNeeds = listFrom(
      initiative.items ?? initiative.initiative_items ?? initiative.initiativeItems ?? initiative.needs,
    );
    const embeddedInvoices = listFrom(initiative.invoices);
    const [itemsResult, invoicesResult, currencyResult, unitsResult] = await Promise.allSettled([
      initiativeService.listItems(id),
      invoicesService.listForInitiative(id),
      catalogService.listCurrencies(),
      catalogService.listUnits(),
    ]);
    if (itemsResult.status === "fulfilled") {
      setNeeds(mergeRecords(embeddedNeeds, listFrom(itemsResult.value)));
      setNeedsLoaded(true);
    } else {
      setNeeds(embeddedNeeds);
      setNeedsLoaded(embeddedNeeds.length > 0);
    }
    if (invoicesResult.status === "fulfilled") {
      setInvoices(mergeRecords(embeddedInvoices, listFrom(invoicesResult.value)));
    } else {
      setInvoices(embeddedInvoices);
    }
    if (currencyResult.status === "fulfilled") {
      setCurrencies(currencyResult.value);
      setCurrencyError(currencyResult.value.length ? "" : "أعاد GET /currencies قائمة فارغة؛ أضف عملة فعالة في الخادم.");
    } else {
      setCurrencies([]);
      setCurrencyError(getApiError(currencyResult.reason));
    }
    if (unitsResult.status === "fulfilled") {
      setUnits(unitsResult.value);
      setUnitError(unitsResult.value.length ? "" : "لا توجد وحدات قياس فعالة.");
    } else {
      setUnits([]);
      setUnitError(getApiError(unitsResult.reason));
    }

    const failed = [itemsResult, invoicesResult].find((result) => result.status === "rejected");
    if (failed) setError(getApiError(failed.reason));
  }, [id]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await initiativeService.getById(decodeURIComponent(id));
      setItem(result);
      setEditForm({ title: result.title ?? result.name ?? "", description: result.description ?? "", notes: result.notes ?? "", execution_date: String(result.execution_date ?? "").slice(0, 10) });
      await loadRelated(result);
    } catch (err) {
      setError(getApiError(err));
    } finally { setLoading(false); }
  }, [id, loadRelated]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (searchParams.get("edit") === "1") setEditing(true); }, [searchParams]);
  useEffect(() => {
    if (searchParams.get("invoice") === "1") setInvoiceDialogOpen(true);
    if (searchParams.get("needs") === "1") setNeedDialogOpen(true);
  }, [searchParams]);

  async function changeInitiativeStatus(status) {
    setBusy(true); setError(""); setNotice("");
    try {
      const updated = await initiativeService.setStatus(id, status);
      if (updated && typeof updated === "object") setItem((old) => ({ ...old, ...updated, status: updated.status ?? status }));
      else setItem((old) => ({ ...old, status }));
      await showSuccess(status === "wait_manager"
        ? "تم إرسال المبادرة إلى المدير للمراجعة."
        : "تم تحديث حالة المبادرة.");
    } catch (err) {
      setError(getApiError(err));
    } finally { setBusy(false); }
  }

  async function uploadInvoice(event) {
    event.preventDefault();
    if (!attachment) { setError("يرجى اختيار ملف الفاتورة قبل الحفظ."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      await invoicesService.upload({ initiativeId: id, ...invoiceForm, invoiceNumber: invoiceForm.invoice_number, invoiceDate: invoiceForm.invoice_date, currencyId: invoiceForm.currency_id, file: attachment });
      setInvoiceForm({ invoice_number: "", invoice_date: localDateString(), amount: "", currency_id: "", description: "", notes: "" });
      setAttachment(null);
      await loadRelated();
      setInvoiceDialogOpen(false);
      await showSuccess("تم حفظ الفاتورة بنجاح.");
    } catch (err) {
      setError(getApiError(err));
    } finally { setBusy(false); }
  }

  async function addNeed(event) {
    event.preventDefault();
    if (!canAddNeed) {
      setNeedDialogOpen(false);
      setError("لا يمكن إضافة احتياجات بعد إرسال المبادرة لاعتماد المدير.");
      return;
    }
    const quantity = Number(needForm.quantity);
    if (!needForm.item_name.trim() || !Number.isInteger(quantity) || quantity <= 0) {
      setError("أدخل اسم الاحتياج وكمية صحيحة أكبر من صفر.");
      return;
    }
    if (!needForm.unit_id) {
      setError("يرجى اختيار وحدة القياس.");
      return;
    }
    setBusy(true); setError("");
    try {
      await initiativeService.createItem({
        initiative_id: id,
        item_name: needForm.item_name.trim(),
        quantity,
        unit_id: Number(needForm.unit_id),
        notes: needForm.notes.trim(),
      });
      setNeedForm({ item_name: "", quantity: "1", unit_id: "", notes: "" });
      setNeedDialogOpen(false);
      await loadRelated();
      await showSuccess("تمت إضافة الاحتياج.");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setBusy(false);
    }
  }

  function selectAttachment(event) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setAttachment(null);
      return;
    }

    if (!/\.(jpe?g|png|pdf)$/i.test(file.name)) {
      setAttachment(null);
      setError("يسمح بإرفاق ملفات PDF أو JPG أو JPEG أو PNG فقط.");
      event.target.value = "";
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAttachment(null);
      setError("يجب ألا يتجاوز حجم المرفق 2 ميجابايت.");
      event.target.value = "";
      return;
    }

    setError("");
    setAttachment(file);
  }

  async function downloadAttachment(invoice) {
    try {
      const blob = await invoicesService.downloadAttachment(invoice.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = invoice.attachment_name || invoice.file_name || `invoice-${invoice.id}`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (err) {
      setError(getApiError(err));
    }
  }

  async function saveInitiativeEdits(event) {
    event.preventDefault();
    if (!canEditInitiative) return;
    if (editForm.execution_date < localDateString()) {
      setError("يجب أن يكون تاريخ التنفيذ اليوم أو في المستقبل.");
      return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const updated = await initiativeService.update(id, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        notes: editForm.notes.trim(),
        execution_date: editForm.execution_date,
      });
      setItem(old => ({ ...old, ...updated, title: updated?.title ?? editForm.title.trim(), description: updated?.description ?? editForm.description.trim(), notes: updated?.notes ?? editForm.notes.trim(), execution_date: updated?.execution_date ?? editForm.execution_date }));
      setEditing(false);
      await showSuccess("تم حفظ التعديلات بنجاح.");
    } catch (err) {
      setError(getApiError(err));
    } finally { setBusy(false); }
  }

  async function deleteInitiative() {
    const confirmation = await confirmAction("ستُنقل هذه المبادرة إلى قائمة المحذوفات.", "حذف المبادرة");
    if (!confirmation.isConfirmed) return;
    setBusy(true); setError("");
    try {
      await initiativeService.remove(id);
      await showSuccess("تم نقل المبادرة إلى المحذوفات.");
      navigate("/initiatives", { replace: true });
    } catch (err) {
      setError(getApiError(err));
    } finally { setBusy(false); }
  }

  async function rejectInitiative(event) {
    event.preventDefault();
    const reason = rejectionReason.trim();
    if (!reason) {
      setError("يرجى إدخال سبب رفض المبادرة.");
      return;
    }

    const previousNotes = item.notes ?? "";
    const updatedNotes = [previousNotes.trim(), `سبب الرفض: ${reason}`]
      .filter(Boolean)
      .join("\n");
    setBusy(true); setError(""); setNotice("");
    try {
      await initiativeService.update(id, { notes: updatedNotes });
      let updated;
      try {
        updated = await initiativeService.setStatus(id, "manager_rejected");
      } catch (statusError) {
        try {
          await initiativeService.update(id, { notes: previousNotes });
        } catch (rollbackError) {
          throw new Error(
            `${getApiError(statusError)} كما تعذر التراجع عن حفظ سبب الرفض: ${getApiError(rollbackError)}`
          );
        }
        throw statusError;
      }

      setItem((current) => ({
        ...current,
        ...updated,
        notes: updated?.notes ?? updatedNotes,
        status: updated?.status ?? "manager_rejected",
      }));
      setRejectionReason("");
      setRejectionDialogOpen(false);
      await showSuccess("تم رفض المبادرة وحفظ سبب الرفض.");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function updateInvoiceStatus(invoice, status) {
    setBusy(true); setError("");
    try {
      await invoicesService.setStatus(invoice.id, status);
      await loadRelated();
      await showSuccess(status === "approved" ? "تم اعتماد الفاتورة." : "تم رفض الفاتورة.");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteInvoice(invoice) {
    const confirmation = await confirmAction(
      `سيتم نقل الفاتورة "${invoice.invoice_number ?? invoice.id}" إلى المحذوفات.`,
      "حذف الفاتورة"
    );
    if (!confirmation.isConfirmed) return;

    setBusy(true);
    setError("");
    try {
      await invoicesService.remove(invoice.id);
      await loadRelated();
      await showSuccess("تم نقل الفاتورة ومرفقها إلى المحذوفات.");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Typography>جارٍ تحميل تفاصيل المبادرة...</Typography>;
  if (error && !item) return <ErrorPopup message={error} />;
  if (!item) return <ErrorPopup message="لم يتم العثور على المبادرة المطلوبة." />;
  const ownerId = item.user_id ?? item.requester_id ?? item.created_by_id ?? item.created_by?.id ?? item.user?.id;
  const ownerContact = getInitiativeContact(item);
  const isOwner = ownerId != null && String(ownerId) === String(user?.id);
  if (user?.role === "manager" && item.status === "under_study" && !isOwner) {
    return <Navigate to="/initiatives" replace />;
  }
  if (
    user?.role === "accountant"
    && !["manager_approved", "accountant_approved", "completed"].includes(item.status)
  ) {
    return <Navigate to="/initiatives" replace />;
  }

  const expiryValue = item.expiry_date ?? item.expires_at ?? item.expiration_date ?? item.end_date ?? item.execution_date ?? item.date;
  const isExpired = expiryValue ? String(expiryValue).slice(0, 10) < localDateString() : false;
  const canManagerApprove = role === "manager"
    && (
      ["wait_manager", "pending_manager"].includes(item.status)
      || (item.status === "under_study" && isOwner)
    )
    && !isExpired;
  const isManagerApproved = ["manager_approved", "accountant_approved", "completed"].includes(item.status);
  const canUploadInvoice = (role === "manager" || (role === "user" && isOwner)) && isManagerApproved && !isExpired;
  const canEditInitiative = !isExpired && (
    role === "manager" || (role === "user" && isOwner && item.status === "under_study")
  );
  const canDeleteInitiative = !isExpired && (
    role === "manager" || (role === "user" && isOwner && item.status === "under_study")
  );
  const canAddNeed = !isExpired
    && isOwner
    && item.status === "under_study"
    && ["user", "manager"].includes(role);
  const canSubmitForManagerReview = role === "user" && canAddNeed && needsLoaded && needs.length > 0;
  const invoiceTotals = invoices.reduce((totals, invoice) => {
    const currency = invoice.currency?.code ?? invoice.currency?.symbol ?? "";
    const amount = Number(invoice.amount);
    if (Number.isFinite(amount)) totals[currency] = (totals[currency] ?? 0) + amount;
    return totals;
  }, {});
  const invoiceCost = Object.keys(invoiceTotals).length
    ? Object.entries(invoiceTotals).map(([currency, amount]) => `${amount.toFixed(2)} ${currency}`.trim()).join("، ")
    : null;
  const totalCost = invoiceCost ?? item.total_cost ?? item.total_amount ?? null;
  const formattedTotalCost = totalCost == null
    ? "—"
    : typeof totalCost === "string"
      ? totalCost
      : `${totalCost} ${item.currency?.code ?? item.currency?.symbol ?? ""}`.trim();

  return <>
    <PageHeader title="تفاصيل المبادرة" subtitle={`رقم الطلب: ${item.reference_number ?? item.referenceNumber ?? item.id ?? "—"}`} action={<Button component={Link} to="/initiatives" startIcon={<ArrowForwardRoundedIcon />}>العودة للمبادرات</Button>} />
    {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}
    <ErrorPopup message={error} onClose={() => setError("")} />
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Box><Typography variant="h6">{item.title ?? item.name ?? "مبادرة دون اسم"}</Typography><Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>{item.category?.name ?? item.category_name ?? item.category?.title ?? "غير محدد"}</Typography></Box>
        <StatusChip status={item.status} />
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: "wrap" }}>
          {canManagerApprove && <>
          <Button variant="contained" disabled={busy} onClick={() => changeInitiativeStatus("manager_approved")}>اعتماد المدير</Button>
            <Button color="error" variant="outlined" disabled={busy} onClick={() => setRejectionDialogOpen(true)}>رفض المبادرة</Button>
        </>}
        {canEditInitiative && <Button variant="outlined" startIcon={<EditOutlinedIcon />} disabled={busy} onClick={() => setEditing(v => !v)}>{editing ? "إغلاق التعديل" : "تعديل المبادرة"}</Button>}
        {canDeleteInitiative && <Button color="error" variant="outlined" startIcon={<DeleteOutlineRoundedIcon />} disabled={busy} onClick={deleteInitiative}>حذف المبادرة</Button>}
      </Stack>
      {isExpired && <Alert severity="info" sx={{ mt: 2 }}>انتهى تاريخ التنفيذ؛ المبادرة للعرض فقط ولا يمكن تعديلها أو إضافة احتياجات أو فواتير أو تغيير حالتها.</Alert>}
      {editing && canEditInitiative && <Box component="form" onSubmit={saveInitiativeEdits} sx={{ mt: 3, p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>تعديل بيانات المبادرة</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
          <TextField required label="عنوان المبادرة" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
          <TextField required type="date" inputProps={{ min: localDateString() }} label="تاريخ التنفيذ" InputLabelProps={{ shrink: true }} value={editForm.execution_date} onChange={e => setEditForm(f => ({ ...f, execution_date: e.target.value }))} />
          <TextField label="الملاحظات" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
          <TextField multiline minRows={3} label="وصف المبادرة" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} sx={{ gridColumn: { sm: "1 / -1" } }} />
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button type="submit" variant="contained" startIcon={<SaveOutlinedIcon />} disabled={busy}>حفظ التعديلات</Button>
          <Button variant="outlined" startIcon={<CancelOutlinedIcon />} onClick={() => setEditing(false)} disabled={busy}>إلغاء</Button>
        </Stack>
      </Box>}
      <Divider sx={{ my: 3 }} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" }, gap: 3 }}>
        <Detail label="رقم المرجع" value={item.reference_number ?? item.id} />
        <Detail label="تاريخ التنفيذ" value={formatDate(item.execution_date ?? item.date)} />
        <Detail label="موقع التنفيذ" value={item.location?.name ?? item.location_name ?? item.location?.title ?? item.location} />
        <Detail label="منشئ الطلب" value={actorName(item.created_by?.name ?? item.user?.name ?? item.createdBy)} />
        <Detail label="معرف المستخدم" value={ownerId} />
        <Detail label="هاتف المنفذ" value={ownerContact.mobile} />
        <Detail label="واتساب المنفذ" value={ownerContact.whatsapp} />
        <Detail label="بريد المنفذ" value={ownerContact.email} />
        <Detail label="جنس المنفذ" value={ownerContact.gender === "male" ? "ذكر" : ownerContact.gender === "female" ? "أنثى" : ownerContact.gender} />
        <Detail label="تاريخ ميلاد المنفذ" value={formatDate(ownerContact.birthDate)} />
        <Box sx={{ gridColumn: "1 / -1" }}>
          <Typography variant="caption" color="text.secondary">التواصل مع منفذ المبادرة</Typography>
          <UserContactActions initiative={item} size="medium" />
        </Box>
        <Detail label="تاريخ الإنشاء" value={formatDate(item.created_at)} />
        <Detail label="آخر تعديل" value={formatDate(item.updated_at)} />
        <Detail label="أضيف بواسطة" value={actorName(item.created_by?.name ?? item.created_by_name ?? item.created_by ?? item.user?.name)} />
        <Detail label="عُدّل بواسطة" value={actorName(item.updated_by?.name ?? item.updated_by_name ?? item.updated_by)} />
        <Detail label="حُذف بواسطة" value={actorName(item.deleted_by?.name ?? item.deleted_by_name ?? item.deleted_by)} />
        <Detail label="استُعيد بواسطة" value={actorName(item.restored_by?.name ?? item.restored_by_name ?? item.restored_by)} />
        <Detail label="تاريخ الحذف" value={formatDate(item.deleted_at)} />
        <Detail label="تاريخ الاستعادة" value={formatDate(item.restored_at)} />
        <Detail label="القيم المجمعة للفواتير" value={formattedTotalCost} />
        <Box sx={{ gridColumn: "1 / -1" }}><Detail label="ملاحظات" value={item.notes} /></Box>
        <Box sx={{ gridColumn: "1 / -1" }}><Detail label="وصف المبادرة" value={item.description} /></Box>
      </Box>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 4, mb: 1.5 }}>
        <Typography id="needs" variant="h6">الاحتياجات المطلوبة</Typography>
        {canAddNeed && <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setNeedDialogOpen(true)}>إضافة احتياج</Button>}
      </Stack>
      {!canAddNeed && <Alert severity="info" sx={{ mb: 2 }}>
        {isExpired
          ? "انتهى تاريخ التنفيذ؛ لا يمكن إضافة احتياجات جديدة."
          : item.status !== "under_study"
            ? "يتوقف خيار إضافة الاحتياجات بعد إرسال المبادرة للمراجعة أو اعتمادها من المدير."
            : "إضافة الاحتياجات متاحة لمنشئ المبادرة فقط أثناء حالة «قيد الدراسة»."}
      </Alert>}
      <DataTable
        key={`needs-${item.id}`}
        items={needs}
        filename={`احتياجات-المبادرة-${item.id}`}
        emptyMessage="لا توجد احتياجات مسجلة لهذه المبادرة."
        includeAllFields
        columns={[
          { id: "id", label: "المعرّف" },
          { id: "item_name", label: "اسم المادة", value: (need) => need.item_name ?? need.name },
          { id: "quantity", label: "الكمية" },
          { id: "unit", label: "الوحدة", value: (need) => need.unit?.name ?? need.unit_name },
          { id: "notes", label: "ملاحظات", value: (need) => need.notes ?? need.note },
          { id: "created_by", label: "أضيف بواسطة", value: (need) => actorName(need.created_by_name ?? need.created_by) },
          { id: "updated_by", label: "عُدّل بواسطة", value: (need) => actorName(need.updated_by_name ?? need.updated_by) },
          { id: "deleted_by", label: "حُذف بواسطة", value: (need) => actorName(need.deleted_by_name ?? need.deleted_by) },
          { id: "restored_by", label: "استُعيد بواسطة", value: (need) => actorName(need.restored_by_name ?? need.restored_by) },
          ...["created_at", "updated_at", "deleted_at", "restored_at"].map((key) => ({
            id: key,
            label: { created_at: "تاريخ الإضافة", updated_at: "تاريخ التعديل", deleted_at: "تاريخ الحذف", restored_at: "تاريخ الاستعادة" }[key],
            value: (need) => formatDate(need[key]),
          })),
        ]}
      />
      {role === "user" && isOwner && item.status === "under_study" && needsLoaded && needs.length === 0 && !isExpired && (
        <Alert severity="info" sx={{ mt: 2 }}>
          أضف احتياجًا واحدًا على الأقل حتى يظهر زر إرسال المبادرة للمدير للمراجعة.
        </Alert>
      )}
      {canSubmitForManagerReview && <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
        <Button
          variant="contained"
          startIcon={<SendRoundedIcon />}
          disabled={busy}
          onClick={() => changeInitiativeStatus("wait_manager")}
        >
          إرسال المبادرة للمدير للمراجعة
        </Button>
      </Stack>}

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 4, mb: 1.5 }}>
        <Typography variant="h6">الفواتير والمرفقات</Typography>
        {canUploadInvoice && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setInvoiceDialogOpen(true)}>إضافة فاتورة</Button>}
      </Stack>
      {((role === "user" || role === "manager") && !canUploadInvoice) && <Alert severity="info" sx={{ mb: 2 }}>
        {isExpired
          ? "انتهى تاريخ التنفيذ؛ لا يمكن إضافة فواتير جديدة."
          : !isManagerApproved
            ? "تتاح إضافة الفواتير بعد اعتماد المدير للمبادرة."
            : "إضافة الفواتير متاحة لمنشئ المبادرة فقط."}
      </Alert>}
      <DataTable
        key={`invoices-${item.id}`}
        items={invoices}
        filename={`فواتير-المبادرة-${item.id}`}
        emptyMessage="لا توجد فواتير مسجلة لهذه المبادرة."
        columns={[
          { id: "id", label: "المعرّف" },
          { id: "invoice_number", label: "رقم الفاتورة" },
          { id: "invoice_date", label: "التاريخ", value: (invoice) => formatDate(invoice.invoice_date) },
          { id: "amount", label: "القيمة", value: (invoice) => `${invoice.amount ?? "—"} ${invoice.currency?.code ?? invoice.currency?.symbol ?? ""}` },
          { id: "status", label: "الحالة" },
          { id: "created_by", label: "أضيف بواسطة", value: (invoice) => actorName(invoice.created_by_name ?? invoice.created_by) },
          { id: "updated_by", label: "عُدّل بواسطة", value: (invoice) => actorName(invoice.updated_by_name ?? invoice.updated_by) },
          { id: "deleted_by", label: "حُذف بواسطة", value: (invoice) => actorName(invoice.deleted_by_name ?? invoice.deleted_by) },
          { id: "restored_by", label: "استُعيد بواسطة", value: (invoice) => actorName(invoice.restored_by_name ?? invoice.restored_by) },
          ...["created_at", "updated_at", "deleted_at", "restored_at"].map((key) => ({
            id: key,
            label: { created_at: "تاريخ الإضافة", updated_at: "تاريخ التعديل", deleted_at: "تاريخ الحذف", restored_at: "تاريخ الاستعادة" }[key],
            value: (invoice) => formatDate(invoice[key]),
          })),
        ]}
        actions={(invoice) => <>
          <Button size="small" variant="outlined" startIcon={<DownloadOutlinedIcon />} onClick={() => downloadAttachment(invoice)}>تنزيل</Button>
          {role === "manager" && <>
            <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} disabled={busy} onClick={() => setInvoiceBeingEdited(invoice)}>تعديل</Button>
            <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} disabled={busy} onClick={() => deleteInvoice(invoice)}>حذف</Button>
          </>}
          {!isExpired && role === "manager" && invoice.status === "pending" && <>
            <Button size="small" variant="outlined" disabled={busy} onClick={() => updateInvoiceStatus(invoice, "approved")}>اعتماد</Button>
            <Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => updateInvoiceStatus(invoice, "rejected")}>رفض</Button>
          </>}
        </>}
      />

      <InvoiceEditDialog
        invoice={invoiceBeingEdited}
        open={Boolean(invoiceBeingEdited)}
        onClose={() => setInvoiceBeingEdited(null)}
        onSaved={async () => {
          await loadRelated();
          await showSuccess("تم تعديل الفاتورة.");
        }}
      />
      {canAddNeed && <Dialog open={needDialogOpen} onClose={() => !busy && setNeedDialogOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={addNeed}>
          <DialogTitle>إضافة احتياج للمبادرة</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField required label="اسم المادة" value={needForm.item_name} onChange={(event) => setNeedForm((form) => ({ ...form, item_name: event.target.value }))} />
              <TextField required type="number" label="الكمية" inputProps={{ min: 1, step: 1 }} value={needForm.quantity} onChange={(event) => setNeedForm((form) => ({ ...form, quantity: event.target.value }))} />
              <Autocomplete
                options={units}
                value={units.find((unit) => String(unit.id) === needForm.unit_id) ?? null}
                getOptionLabel={(unit) => unit.name ?? ""}
                isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                onChange={(_event, unit) => setNeedForm((form) => ({ ...form, unit_id: unit ? String(unit.id) : "" }))}
                disabled={!units.length}
                noOptionsText="لا توجد وحدات قياس مطابقة"
                renderInput={(params) => <TextField {...params} required label="وحدة القياس" helperText={unitError} />}
              />
              <TextField label="ملاحظات" value={needForm.notes} onChange={(event) => setNeedForm((form) => ({ ...form, notes: event.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={() => setNeedDialogOpen(false)} disabled={busy}>إلغاء</Button>
            <Button type="submit" variant="contained" disabled={busy || !units.length}>{busy ? "جارٍ الحفظ..." : "حفظ الاحتياج"}</Button>
          </DialogActions>
        </Box>
      </Dialog>}
      <Dialog open={rejectionDialogOpen} onClose={() => !busy && setRejectionDialogOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={rejectInitiative}>
          <DialogTitle>رفض المبادرة</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography color="text.secondary">أدخل سبب الرفض. سيُحفظ مع ملاحظات المبادرة.</Typography>
              <TextField
                required
                autoFocus
                multiline
                minRows={3}
                label="سبب الرفض"
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={() => setRejectionDialogOpen(false)} disabled={busy}>إلغاء</Button>
            <Button type="submit" variant="contained" color="error" disabled={busy || !rejectionReason.trim()}>
              {busy ? "جارٍ حفظ الرفض..." : "تأكيد الرفض"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog open={invoiceDialogOpen && canUploadInvoice} onClose={() => !busy && setInvoiceDialogOpen(false)} fullWidth maxWidth="md">
        <Box component="form" onSubmit={uploadInvoice}>
        <DialogTitle>إضافة فاتورة</DialogTitle>
        <DialogContent dividers>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
          <TextField required label="رقم الفاتورة" value={invoiceForm.invoice_number} onChange={(e) => setInvoiceForm((f) => ({ ...f, invoice_number: e.target.value }))} />
          <TextField required label="تاريخ الفاتورة" type="date" InputLabelProps={{ shrink: true }} value={invoiceForm.invoice_date} onChange={(e) => setInvoiceForm((f) => ({ ...f, invoice_date: e.target.value }))} />
          <TextField required label="القيمة" type="number" inputProps={{ min: 0.01, step: "0.01" }} value={invoiceForm.amount} onChange={(e) => setInvoiceForm((f) => ({ ...f, amount: e.target.value }))} />
          <Autocomplete
            options={currencies}
            value={currencies.find((currency) => String(currency.id) === invoiceForm.currency_id) ?? null}
            getOptionLabel={(currency) => `${currency.name ?? ""}${currency.code ? ` (${currency.code})` : currency.symbol ? ` ${currency.symbol}` : ""}`}
            isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
            onChange={(_event, currency) => setInvoiceForm((form) => ({ ...form, currency_id: currency ? String(currency.id) : "" }))}
            disabled={!currencies.length}
            noOptionsText="لا توجد عملات مطابقة"
            renderInput={(params) => <TextField {...params} required label="العملة" helperText={!currencies.length ? currencyError || "جارٍ تحميل العملات..." : ""} />}
          />
          <TextField label="وصف الفاتورة" value={invoiceForm.description} onChange={(e) => setInvoiceForm((f) => ({ ...f, description: e.target.value }))} />
          <TextField label="ملاحظات" value={invoiceForm.notes} onChange={(e) => setInvoiceForm((f) => ({ ...f, notes: e.target.value }))} />
          <Button component="label" variant="outlined" startIcon={<UploadFileOutlinedIcon />} sx={{ justifyContent: "flex-start" }}>{attachment?.name ?? "إرفاق ملف الفاتورة (إلزامي)"}<input hidden type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={selectAttachment} /></Button>
          <Typography variant="caption" color={attachment ? "success.main" : "text.secondary"} sx={{ gridColumn: "1 / -1" }}>
            {attachment ? "تم اختيار ملف الفاتورة." : "يجب إرفاق ملف بصيغة PDF أو JPG أو PNG، وبحجم لا يتجاوز 2 ميجابايت."}
          </Typography>
        </Box>
        {!currencies.length && <Alert severity={currencyError ? "error" : "info"} sx={{ mt: 2 }} action={<Button color="inherit" size="small" onClick={loadRelated}>إعادة المحاولة</Button>}>{currencyError || "جارٍ تحميل العملات..."}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={() => setInvoiceDialogOpen(false)} disabled={busy}>إلغاء</Button>
          <Button type="submit" variant="contained" disabled={busy || !currencies.length || !attachment}>{busy ? "جارٍ الحفظ..." : "حفظ الفاتورة"}</Button>
        </DialogActions>
        </Box>
      </Dialog>
    </Paper>
  </>;
}
