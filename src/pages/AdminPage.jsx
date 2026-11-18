import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Chip, MenuItem, Paper, Stack, Tab, Tabs, TextField,
  Typography
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RestoreOutlinedIcon from "@mui/icons-material/RestoreOutlined";
import PageHeader from "../components/PageHeader.jsx";
import ErrorPopup from "../components/ErrorPopup.jsx";
import { getApiError } from "../api/http.js";
import { adminService, lookupResources, trashResources } from "../services/adminService.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useSearchParams } from "react-router-dom";
import { confirmAction, showSuccess } from "../utils/alerts.js";
import DataTable from "../components/DataTable.jsx";
import { getTableFieldLabel, isApiLinkField, localizeTableValue } from "../utils/tableLocalization.js";
import { isValidOptionalPhoneNumber } from "../utils/phoneValidation.js";
import { formatDate } from "../utils/dateFormat.js";

const SENSITIVE_AUDIT_FIELDS = new Set(["password", "password_confirmation", "token", "access_token"]);

function parseAuditValues(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function auditValueText(value, field = "") {
  const parsed = parseAuditValues(value);
  if (parsed == null || parsed === "") return "—";
  if (SENSITIVE_AUDIT_FIELDS.has(field.toLowerCase())) return "محجوب";
  if (Array.isArray(parsed)) {
    return parsed.map((item) => auditValueText(item, field)).join("، ");
  }
  if (typeof parsed === "object") {
    return Object.entries(parsed)
      .filter(([key]) => !isApiLinkField(key))
      .map(([key, item]) => `${getTableFieldLabel(key)}: ${auditValueText(item, key)}`)
      .join("، ") || "—";
  }
  if (/(?:_at|_date|^date$)/i.test(field)) return formatDate(parsed);
  return localizeTableValue(parsed, field);
}

function AuditValues({ value, field = "" }) {
  const parsed = parseAuditValues(value);
  if (parsed == null || parsed === "") return "—";
  if (Array.isArray(parsed)) {
    return (
      <Stack spacing={0.75}>
        {parsed.map((item, index) => (
          <Box key={index} sx={{ borderRight: 2, borderColor: "divider", pr: 1 }}>
            <AuditValues value={item} />
          </Box>
        ))}
      </Stack>
    );
  }
  if (typeof parsed === "object") {
    const entries = Object.entries(parsed).filter(([key]) => !isApiLinkField(key));
    if (!entries.length) return "—";
    return (
      <Stack spacing={0.75}>
        {entries.map(([key, item]) => (
          <Box key={key} sx={{ display: "grid", gridTemplateColumns: "minmax(90px, auto) minmax(0, 1fr)", gap: 1 }}>
            <Typography variant="caption" fontWeight={800} color="text.secondary">
              {getTableFieldLabel(key)}
            </Typography>
            <Typography component="div" variant="body2" sx={{ overflowWrap: "anywhere" }}>
              <AuditValues value={item} field={key} />
            </Typography>
          </Box>
        ))}
      </Stack>
    );
  }
  return auditValueText(parsed, field);
}

const roleOptions = [
  { value: "requester", label: "منفذ المبادرة" },
  { value: "accountant", label: "محاسب" },
  { value: "manager", label: "مدير" },
];

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
  role: "requester",
  mobile: "",
  whatsapp: "",
  gender: "",
  birth_date: "",
};

export default function AdminPage() {
  const { user, updateUser: updateAuthUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => {
    const requestedTab = Number(searchParams.get("tab"));
    return Number.isInteger(requestedTab) && requestedTab >= 0 && requestedTab <= 7 ? requestedTab : 0;
  });
  const [resource, setResource] = useState("currencies");
  const [trashResource, setTrashResource] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", symbol: "", notes: "" });
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [editingUser, setEditingUser] = useState(null);
  const [filters, setFilters] = useState(() => ({
    action: "",
    model: searchParams.get("model") ?? "",
    model_id: searchParams.get("model_id") ?? "",
    ip: "",
    user_id: searchParams.get("user_id") ?? "",
  }));
  const [userCount, setUserCount] = useState(null);

  function getAuditValues(item, field) {
    const camelField = field.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const kebabField = field.replaceAll("_", "-");
    return item[field] ?? item[kebabField] ?? item[camelField] ?? item.values?.[field] ?? null;
  }

  const isLookupTab = tab <= 3;
  const lookupKeys = ["currencies", "categories", "locations", "units"];
  const activeLookup = lookupKeys[tab] ?? resource;
  const fields = lookupResources[activeLookup]?.fields ?? [];

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let result = [];
      if (tab <= 3) {
        result = await adminService.listLookup(lookupKeys[tab]);
      } else if (tab === 4) {
        const userResult = await adminService.listUsers();
        result = userResult.items;
        setUserCount(userResult.total);
      } else if (tab === 5) {
        result = await adminService.listAuditLogs(false, filters);
      } else if (tab === 6) {
        result = await adminService.listAuditLogs(true);
      } else if (tab === 7) {
        if (trashResource === "all") {
          const resources = Object.entries(trashResources);
          const results = await Promise.allSettled(
            resources.map(([key]) => adminService.listTrashed(key)),
          );
          const failedResources = [];
          result = results.flatMap((resourceResult, index) => {
            const [key, resourceInfo] = resources[index];
            if (resourceResult.status === "rejected") {
              failedResources.push(`${resourceInfo.label}: ${getApiError(resourceResult.reason)}`);
              return [];
            }
            return resourceResult.value.map((item) => ({
              ...item,
              __trashResource: key,
              __trashResourceLabel: resourceInfo.label,
            }));
          });
          if (failedResources.length) {
            setError(`تعذر تحميل بعض أنواع السجلات المحذوفة:\n${failedResources.join("\n")}`);
          }
        } else {
          result = await adminService.listTrashed(trashResource);
        }
      }
      if (tab === 5 && (filters.model_id || filters.user_id)) {
        result = result.filter((item) => {
          const recordId = item.model_id ?? item.auditable_id ?? item.record_id;
          const actorId = item.user_id ?? item.user?.id;
          return (!filters.model_id || String(recordId ?? "") === String(filters.model_id))
            && (!filters.user_id || String(actorId ?? "") === String(filters.user_id));
        });
      }
      setItems(Array.isArray(result) ? result : []);
    } catch (e) {
      setItems([]);
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  }, [tab, reload, trashResource, filters.action, filters.model, filters.model_id, filters.ip, filters.user_id]);

  useEffect(() => { load(); }, [load]);

  function resetLookupForm() {
    setEditing(null);
    setForm({ name: "", code: "", symbol: "", notes: "" });
  }

  function startEditLookup(item) {
    setEditing(item.id);
    setForm({
      name: item.name ?? "",
      code: item.code ?? "",
      symbol: item.symbol ?? "",
      notes: item.notes ?? "",
    });
    setError("");
    setNotice("");
  }

  async function saveLookup(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const payload = {};
    for (const key of fields) {
      if (key === "notes") payload[key] = form[key].trim();
      else if (key in form) payload[key] = form[key].trim();
    }
    if (!payload.name) {
      setError("حقل الاسم مطلوب.");
      return;
    }
    if (activeLookup === "currencies" && !payload.code) {
      setError("رمز العملة مطلوب، ويجب أن يكون فريدًا.");
      return;
    }
    setLoading(true);
    try {
      await adminService.saveLookup(activeLookup, editing, payload);
      await showSuccess(editing == null ? "تمت الإضافة بنجاح." : "تم التعديل بنجاح.");
      resetLookupForm();
      setReload((v) => v + 1);
    } catch (e) {
      setError(getApiError(e));
    } finally { setLoading(false); }
  }

  async function deleteLookup(item) {
    const confirmation = await confirmAction(`هل تريد حذف "${item.name ?? item.id}"؟`, "حذف السجل");
    if (!confirmation.isConfirmed) return;
    setBusyId(item.id); setError(""); setNotice("");
    try {
      await adminService.deleteLookup(activeLookup, item.id);
      await showSuccess("تم حذف السجل.");
      setReload((v) => v + 1);
      if (String(editing) === String(item.id)) resetLookupForm();
    } catch (e) { setError(getApiError(e)); }
    finally { setBusyId(null); }
  }

  async function createUser(event) {
    event.preventDefault();
    setError(""); setNotice("");
    if (!userForm.name.trim() || (!editingUser && (!userForm.email.trim() || !userForm.password))) {
      setError("الاسم مطلوب، كما أن البريد الإلكتروني وكلمة المرور مطلوبان عند إنشاء المستخدم.");
      return;
    }
    if (userForm.password && userForm.password.length < 8) {
      setError("يجب ألا تقل كلمة المرور عن 8 أحرف.");
      return;
    }
    if (editingUser && userForm.password && userForm.password !== userForm.password_confirmation) {
      setError("تأكيد كلمة المرور غير مطابق.");
      return;
    }
    if (!isValidOptionalPhoneNumber(userForm.mobile) || !isValidOptionalPhoneNumber(userForm.whatsapp)) {
      setError("يجب أن يتكون رقم الهاتف ورقم واتساب، عند إدخالهما، من 10 أرقام بالضبط وأن يبدأ كل منهما بـ09.");
      return;
    }
    setLoading(true);
    try {
      if (editingUser) {
        const payload = {
          name: userForm.name.trim(),
          mobile: userForm.mobile.trim() || null,
          whatsapp: userForm.whatsapp.trim() || null,
          gender: userForm.gender || null,
          birth_date: userForm.birth_date || null,
        };
        const savedUser = await adminService.updateUser(editingUser.id, payload);
        if (String(editingUser.id) === String(user?.id)) {
          updateAuthUser({ ...editingUser, ...payload, ...(savedUser ?? {}) });
        }
        if (String(editingUser.id) !== String(user?.id)) {
          await adminService.setUserRole(editingUser.id, userForm.role);
        }
        if (userForm.password) {
          await adminService.setUserPassword(editingUser.id, userForm.password, userForm.password_confirmation);
        }
        await showSuccess("تم تحديث بيانات المستخدم.");
      } else {
        await adminService.createUser({
          name: userForm.name.trim(),
          email: userForm.email.trim(),
          password: userForm.password,
          role: userForm.role,
          mobile: userForm.mobile.trim() || null,
          whatsapp: userForm.whatsapp.trim() || null,
          gender: userForm.gender || null,
          birth_date: userForm.birth_date || null,
        });
        await showSuccess("تم إنشاء المستخدم.");
      }
      setEditingUser(null);
      setUserForm(emptyUserForm);
      setReload((v) => v + 1);
    } catch (e) { setError(getApiError(e)); }
    finally { setLoading(false); }
  }

  function startEditUser(item) {
    setEditingUser(item);
    setUserForm({
      ...emptyUserForm,
      name: item.name ?? "",
      email: item.email ?? "",
      role: item.role ?? "requester",
      password: "",
      password_confirmation: "",
      mobile: item.mobile ?? "",
      whatsapp: item.whatsapp ?? "",
      gender: item.gender ?? "",
      birth_date: item.birth_date ? String(item.birth_date).slice(0, 10) : "",
    });
  }

  async function setUserFlag(item, flag, value) {
    setBusyId(item.id); setError(""); setNotice("");
    try {
      if (flag === "active") await adminService.setUserActive(item.id, value);
      else await adminService.setUserLocked(item.id, value);
      await showSuccess("تم تحديث حالة الحساب.");
      setReload((v) => v + 1);
    } catch (e) { setError(getApiError(e)); }
    finally { setBusyId(null); }
  }

  async function deleteUser(item) {
    const confirmation = await confirmAction(`هل تريد حذف المستخدم "${item.name}"؟`, "حذف المستخدم");
    if (!confirmation.isConfirmed) return;
    setBusyId(item.id); setError(""); setNotice("");
    try {
      await adminService.deleteUser(item.id);
      await showSuccess("تم حذف المستخدم.");
      setReload((v) => v + 1);
    } catch (e) { setError(getApiError(e)); }
    finally { setBusyId(null); }
  }

  async function removeAudit(item) {
    const confirmation = await confirmAction("هل تريد حذف سجل التدقيق؟", "حذف السجل");
    if (!confirmation.isConfirmed) return;
    setBusyId(item.id); setError(""); setNotice("");
    try {
      await adminService.deleteAuditLog(item.id);
      await showSuccess("تم حذف سجل التدقيق.");
      setReload((v) => v + 1);
    } catch (e) { setError(getApiError(e)); }
    finally { setBusyId(null); }
  }

  async function restoreItem(item, resourceOverride = trashResource) {
    const itemResource = item.__trashResource ?? resourceOverride;
    const itemBusyId = item.__trashResource ? `${itemResource}:${item.id}` : item.id;
    setBusyId(itemBusyId); setError(""); setNotice("");
    try {
      await adminService.restore(itemResource, item.id);
      await showSuccess("تمت الاستعادة بنجاح.");
      setReload((v) => v + 1);
    } catch (e) { setError(getApiError(e)); }
    finally { setBusyId(null); }
  }

  const pageTitle = useMemo(() => {
    if (tab <= 3) return `إدارة ${lookupResources[lookupKeys[tab]].label}`;
    return ["", "", "", "", "إدارة المستخدمين", "سجلات التدقيق", "سجلات التدقيق المحذوفة", "استعادة المحذوفات"][tab];
  }, [tab]);

  return <>
    <PageHeader title={pageTitle} subtitle="إدارة البيانات والصلاحيات وفق مسارات API المتاحة" />
    <Paper variant="outlined" sx={{ mb: 2, overflowX: "auto" }}>
      <Tabs value={tab} onChange={(_, value) => { setTab(value); setError(""); setNotice(""); resetLookupForm(); setEditingUser(null); }} variant="scrollable" scrollButtons="auto">
        <Tab label="العملات" />
        <Tab label="التصنيفات" />
        <Tab label="المواقع" />
        <Tab label="وحدات القياس" />
        <Tab label="المستخدمون" />
        <Tab label="سجلات التدقيق" />
        <Tab label="تدقيق محذوف" />
        <Tab label="المحذوفات" />
      </Tabs>
    </Paper>
    {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}
    <ErrorPopup message={error} onClose={() => setError("")} />

    {isLookupTab && <>
      <Paper component="form" onSubmit={saveLookup} variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Typography fontWeight={800} sx={{ mb: 2 }}>{editing ? "تعديل سجل" : `إضافة ${lookupResources[activeLookup].label.slice(0, -1)} جديد`}</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: activeLookup === "currencies" ? "repeat(2,minmax(0,1fr))" : "1fr" }, gap: 2 }}>
          <TextField label="الاسم" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {activeLookup === "currencies" && <>
            <TextField label="رمز العملة (مثل USD أو SYP)" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} inputProps={{ maxLength: 12 }} />
            <TextField label="رمز العرض (اختياري)" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
          </>}
          <TextField label="ملاحظات (اختياري)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} multiline minRows={1} sx={{ gridColumn: { sm: "1 / -1" } }} />
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button type="submit" variant="contained" startIcon={editing ? <EditOutlinedIcon /> : <AddRoundedIcon />} disabled={loading}>{editing ? "حفظ التعديلات" : "إضافة"}</Button>
          {editing != null && <Button onClick={resetLookupForm}>إلغاء</Button>}
        </Stack>
      </Paper>
      <DataTable key={activeLookup} loading={loading} items={items} includeAllFields filename={lookupResources[activeLookup].label} columns={activeLookup === "currencies" ? [["name","الاسم"],["code","الرمز"],["symbol","رمز العرض"],["notes","ملاحظات"]] : [["name","الاسم"],["notes","ملاحظات"]]} actions={(item) => <>
        <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => startEditLookup(item)}>تعديل</Button>
        <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} disabled={busyId === item.id} onClick={() => deleteLookup(item)}>حذف</Button>
      </>} />
    </>}

    {tab === 4 && <>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Typography fontWeight={800}>عدد المستخدمين: {userCount ?? items.length}</Typography>
      </Paper>
      <Paper component="form" onSubmit={createUser} variant="outlined" sx={{ p: 2.5, mb: 2 }}>
        <Typography fontWeight={800} sx={{ mb: 2 }}>{editingUser ? `تعديل المستخدم: ${editingUser.name}` : "إنشاء مستخدم"}</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3,minmax(0,1fr))" }, gap: 2 }}>
          <TextField label="الاسم" required value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
            <TextField label="البريد الإلكتروني" type="email" required={!editingUser} disabled={Boolean(editingUser)} value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
            {!editingUser && <TextField label="كلمة المرور (8 أحرف على الأقل)" type="password" required value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />}
            {editingUser && <>
              <TextField label="كلمة المرور الجديدة (اختياري)" type="password" autoComplete="new-password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
              <TextField label="تأكيد كلمة المرور الجديدة" type="password" autoComplete="new-password" required={Boolean(userForm.password)} value={userForm.password_confirmation} onChange={(e) => setUserForm({ ...userForm, password_confirmation: e.target.value })} />
            </>}
            <TextField label="رقم الهاتف" type="tel" value={userForm.mobile} onChange={(e) => setUserForm({ ...userForm, mobile: e.target.value })} inputProps={{ maxLength: 10, inputMode: "numeric" }} />
            <TextField label="رقم واتساب" type="tel" value={userForm.whatsapp} onChange={(e) => setUserForm({ ...userForm, whatsapp: e.target.value })} inputProps={{ maxLength: 10, inputMode: "numeric" }} />
            <TextField select label="الجنس" value={userForm.gender} onChange={(e) => setUserForm({ ...userForm, gender: e.target.value })}>
              <MenuItem value="">غير محدد</MenuItem>
              <MenuItem value="male">ذكر</MenuItem>
              <MenuItem value="female">أنثى</MenuItem>
            </TextField>
            <TextField type="date" label="تاريخ الميلاد" InputLabelProps={{ shrink: true }} value={userForm.birth_date} onChange={(e) => setUserForm({ ...userForm, birth_date: e.target.value })} />
            <TextField select label="الدور" value={userForm.role} disabled={Boolean(editingUser && String(editingUser.id) === String(user?.id))} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>{roleOptions.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}</TextField>
          </Box>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button type="submit" variant="contained" disabled={loading}>{editingUser ? "حفظ المستخدم" : "إنشاء المستخدم"}</Button>
            {editingUser && <Button onClick={() => { setEditingUser(null); setUserForm(emptyUserForm); }}>إلغاء</Button>}
        </Stack>
      </Paper>
      <DataTable key="users" loading={loading} items={items} includeAllFields filename="المستخدمون" columns={[
        ["mobile","رقم الهاتف"],
        ["whatsapp","رقم واتساب"],
        { id: "gender", label: "الجنس", render: (value) => value === "male" ? "ذكر" : value === "female" ? "أنثى" : "—" },
        ["birth_date","تاريخ الميلاد"],
        ["name","الاسم"],
        ["email","البريد الإلكتروني"],
        {
          id: "role",
          label: "الصلاحية",
          render: (value) => <Chip size="small" label={roleOptions.find((option) => option.value === value)?.label ?? localizeTableValue(value, "role")} />,
        },
        { id: "is_active", label: "نشط", render: (value) => value ? "نعم" : "لا" },
        { id: "is_locked", label: "مقفل", render: (value) => value ? "نعم" : "لا" },
      ]} actions={(item) => <>
        <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={() => startEditUser(item)}>تعديل</Button>
        <Button size="small" variant="outlined" disabled={busyId === item.id} onClick={() => setUserFlag(item, "active", !item.is_active)}>{item.is_active ? "تعطيل" : "تفعيل"}</Button>
        <Button size="small" variant="outlined" disabled={busyId === item.id} onClick={() => setUserFlag(item, "locked", !item.is_locked)}>{item.is_locked ? "فك القفل" : "قفل"}</Button>
        {String(item.id) !== String(user?.id) && <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} disabled={busyId === item.id} onClick={() => deleteUser(item)}>حذف</Button>}
      </>} />
    </>}

    {(tab === 5 || tab === 6) && <>
      {tab === 5 && <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4,minmax(0,1fr))" }, gap: 1.5 }}>
          <TextField label="الإجراء" size="small" value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} />
          <TextField label="النموذج" size="small" value={filters.model} onChange={(e) => setFilters({ ...filters, model: e.target.value })} />
          <TextField label="معرّف السجل" size="small" value={filters.model_id} onChange={(e) => setFilters({ ...filters, model_id: e.target.value })} />
          <TextField label="عنوان IP" size="small" value={filters.ip} onChange={(e) => setFilters({ ...filters, ip: e.target.value })} />
          <TextField label="معرّف المستخدم" size="small" value={filters.user_id} onChange={(e) => setFilters({ ...filters, user_id: e.target.value })} />
        </Box>
        <Button sx={{ mt: 1 }} onClick={() => setReload((v) => v + 1)}>تطبيق الفلاتر</Button>
      </Paper>}
      <DataTable
        key={`audit-${tab}`}
        loading={loading}
        items={items}
        filename={tab === 5 ? "سجلات-التدقيق" : "سجلات-التدقيق-المحذوفة"}
        columns={[
          ["id","المعرّف"],
          ["action","الإجراء"],
          ["model","النموذج"],
          ["model_type","نوع النموذج"],
          ["model_id","معرّف السجل"],
          {
            id: "old_values",
            label: "القيم القديمة",
            value: (item) => getAuditValues(item, "old_values"),
            render: (value) => <Box sx={{ maxWidth: 420, minWidth: 220 }}><AuditValues value={value} /></Box>,
            exportValue: (item) => auditValueText(getAuditValues(item, "old_values")),
          },
          {
            id: "new_values",
            label: "القيم الجديدة",
            value: (item) => getAuditValues(item, "new_values"),
            render: (value) => <Box sx={{ maxWidth: 420, minWidth: 220 }}><AuditValues value={value} /></Box>,
            exportValue: (item) => auditValueText(getAuditValues(item, "new_values")),
          },
          ["user_id","معرّف المستخدم"],
          ["ip","عنوان الإنترنت"],
          ["created_at","التاريخ"],
        ]}
        actions={(item) => tab === 5 ? <Button size="small" variant="outlined" color="error" onClick={() => removeAudit(item)}>حذف</Button> : <Button size="small" variant="outlined" startIcon={<RestoreOutlinedIcon />} disabled={busyId === item.id} onClick={() => restoreItem(item, "audit-logs")}>استعادة</Button>}
      />
    </>}

    {tab === 7 && <>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <TextField select fullWidth label="نوع السجلات المحذوفة" value={trashResource} onChange={(e) => setTrashResource(e.target.value)}>
          <MenuItem value="all">كل الأنواع</MenuItem>
          {Object.entries(trashResources).map(([key, value]) => <MenuItem key={key} value={key}>{value.label}</MenuItem>)}
        </TextField>
      </Paper>
      <DataTable
        key={`trash-${trashResource}`}
        loading={loading}
        items={items}
        includeAllFields
        filename="المحذوفات"
        columns={[
          ...(trashResource === "all" ? [["__trashResourceLabel", "نوع السجل"]] : []),
          ["id", "المعرف"],
          ["name", "الاسم"],
          ["title", "العنوان"],
          ["reference_number", "رقم المرجع"],
          ["invoice_number", "رقم الفاتورة"],
          ["item_name", "اسم العنصر"],
          ["code", "الرمز"],
          ["deleted_at", "تاريخ الحذف"],
        ]}
        actions={(item) => {
          const itemBusyId = item.__trashResource ? `${item.__trashResource}:${item.id}` : item.id;
          return <Button size="small" variant="outlined" startIcon={<RestoreOutlinedIcon />} disabled={busyId === itemBusyId} onClick={() => restoreItem(item, item.__trashResource ?? trashResource)}>استعادة</Button>;
        }}
      />
    </>}
  </>;
}
