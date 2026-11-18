import { getApiError } from "../api/http.js";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Autocomplete, Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PageHeader from "../components/PageHeader.jsx";
import ErrorPopup from "../components/ErrorPopup.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { initiativeService } from "../services/initiativeService.js";
import { catalogService } from "../services/catalogService.js";
import { showSuccess } from "../utils/alerts.js";

const today = (() => {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
})();
const makeReference = () => `AZ-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

export default function CreateInitiativePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ reference_number: makeReference(), title: "", category_id: "", location_id: "", description: "", execution_date: today, notes: "" });
  const [savedInitiative, setSavedInitiative] = useState(null);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [catalogReload, setCatalogReload] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingCatalogs(true);
    setCatalogError("");
    Promise.allSettled([catalogService.listCategories(), catalogService.listLocations()])
      .then(([categoryResult, locationResult]) => {
        if (!active) return;
        if (categoryResult.status === "fulfilled") setCategories(categoryResult.value);
        if (locationResult.status === "fulfilled") setLocations(locationResult.value);
        if (categoryResult.status === "rejected" || locationResult.status === "rejected") {
          const failed = [categoryResult, locationResult].find((result) => result.status === "rejected");
          setCatalogError(getApiError(failed.reason));
        }
      })
      .finally(() => { if (active) setLoadingCatalogs(false); });
    return () => { active = false; };
  }, [catalogReload]);

  const change = (key) => (event) => setForm((old) => ({ ...old, [key]: event.target.value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (!form.reference_number.trim() || !form.title.trim() || !form.category_id || !form.location_id || !form.execution_date) {
      setError("يرجى تعبئة رقم المرجع والعنوان والتصنيف والموقع وتاريخ التنفيذ.");
      return;
    }
    if (form.execution_date < today) {
      setError("يجب أن يكون تاريخ التنفيذ اليوم أو في المستقبل.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        reference_number: form.reference_number.trim(),
        title: form.title.trim(),
        category_id: Number(form.category_id),
        location_id: Number(form.location_id),
        description: form.description.trim(),
        execution_date: form.execution_date,
        notes: form.notes.trim(),
      };
      const saved = savedInitiative
        ? await initiativeService.update(savedInitiative.id, payload)
        : await initiativeService.create(payload);
      setSavedInitiative((current) => ({ ...current, ...saved }));
      await showSuccess(savedInitiative
        ? "تم حفظ معلومات المبادرة."
        : "تم حفظ معلومات المبادرة. يمكنك الآن إضافة احتياجاتها من الزر بجانب الاسم.");
      if (!savedInitiative && user?.role === "manager") {
        navigate("/initiatives");
      }
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open fullWidth maxWidth="lg" onClose={() => navigate("/initiatives")} scroll="paper">
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, fontSize: { xs: "1.1rem", sm: "1.25rem" } }}>
        إنشاء مبادرة جديدة
        <IconButton aria-label="إغلاق" onClick={() => navigate("/initiatives")}><CloseRoundedIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
      <PageHeader title="معلومات المبادرة" subtitle="احفظ معلومات المبادرة أولًا، ثم أضف احتياجاتها من الزر الذي سيظهر بجانب اسمها" />
      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2.5}>
          <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" sx={{ mb: 2 }}>معلومات المبادرة</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
              <TextField required label="رقم المرجع" value={form.reference_number} onChange={change("reference_number")} fullWidth disabled={Boolean(savedInitiative)} />
              <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: "stretch", gap: 1 }}>
                <TextField required label="عنوان المبادرة" value={form.title} onChange={change("title")} fullWidth />
                {savedInitiative?.id != null && <Button
                  type="button"
                  size="small"
                  variant="outlined"
                  startIcon={<ListAltOutlinedIcon />}
                  sx={{ flexShrink: 0, mt: { xs: 0, sm: 1 } }}
                  onClick={() => navigate(`/initiatives/${encodeURIComponent(savedInitiative.id)}?needs=1#needs`)}
                >
                  إضافة الاحتياجات
                </Button>}
              </Box>
              <Autocomplete
                options={categories}
                value={categories.find((category) => String(category.id) === form.category_id) ?? null}
                getOptionLabel={(category) => category.name ?? ""}
                isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                onChange={(_event, category) => setForm((current) => ({ ...current, category_id: category ? String(category.id) : "" }))}
                disabled={loadingCatalogs || !categories.length}
                noOptionsText="لا توجد تصنيفات مطابقة"
                renderInput={(params) => <TextField {...params} required label="التصنيف" />}
              />
              <Autocomplete
                options={locations}
                value={locations.find((location) => String(location.id) === form.location_id) ?? null}
                getOptionLabel={(location) => location.name ?? ""}
                isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                onChange={(_event, location) => setForm((current) => ({ ...current, location_id: location ? String(location.id) : "" }))}
                disabled={loadingCatalogs || !locations.length}
                noOptionsText="لا توجد مواقع مطابقة"
                renderInput={(params) => <TextField {...params} required label="موقع التنفيذ" />}
              />
              <TextField required label="تاريخ التنفيذ" type="date" inputProps={{ min: today }} value={form.execution_date} onChange={change("execution_date")} InputLabelProps={{ shrink: true }} />
              <TextField label="ملاحظات" value={form.notes} onChange={change("notes")} fullWidth />
              <TextField label="وصف المبادرة" value={form.description} onChange={change("description")} multiline minRows={4} sx={{ gridColumn: { md: "1 / -1" } }} />
            </Box>
            {loadingCatalogs && <Typography color="text.secondary" variant="body2" sx={{ mt: 2 }}>جارٍ تحميل التصنيفات والمواقع ووحدات القياس...</Typography>}
            {!loadingCatalogs && catalogError && <ErrorPopup message={catalogError} onClose={() => setCatalogError("")} action={<Button color="inherit" size="small" onClick={() => setCatalogReload((value) => value + 1)}>إعادة المحاولة</Button>} />}
            {!loadingCatalogs && !catalogError && (!categories.length || !locations.length) && <Alert severity="warning" sx={{ mt: 2 }} action={<Button color="inherit" size="small" onClick={() => setCatalogReload((value) => value + 1)}>إعادة المحاولة</Button>}>لا توجد تصنيفات أو مواقع متاحة. تحقق من استجابة API وصلاحيات الحساب قبل إنشاء المبادرة.</Alert>}
          </Paper>
          {savedInitiative && <Alert severity="success">تم حفظ المبادرة بالمعرّف: {savedInitiative.id}</Alert>}
          <ErrorPopup message={error} onClose={() => setError("")} />
          <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", gap: 1.5 }}>
            <Button type="submit" variant="contained" size="large" startIcon={<SaveOutlinedIcon />} disabled={saving || loadingCatalogs || !categories.length || !locations.length}>{saving ? "جارٍ الحفظ..." : "حفظ المعلومات"}</Button>
            <Button variant="text" size="large" onClick={() => navigate("/initiatives")} disabled={saving}>إلغاء</Button>
          </Box>
        </Stack>
      </Box>
      </DialogContent>
    </Dialog>
  );
}
