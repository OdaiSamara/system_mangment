import { useEffect, useState } from "react";
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import PageHeader from "../components/PageHeader.jsx";
import ErrorPopup from "../components/ErrorPopup.jsx";
import { getApiError } from "../api/http.js";
import { useAuth } from "../context/AuthContext.jsx";
import { authService } from "../services/authService.js";
import { showSuccess } from "../utils/alerts.js";
import { isValidOptionalPhoneNumber } from "../utils/phoneValidation.js";

function profileFields(user = {}) {
  return {
    name: user.name ?? "",
    email: user.email ?? "",
    mobile: user.mobile ?? "",
    whatsapp: user.whatsapp ?? "",
    gender: user.gender ?? "",
    birth_date: user.birth_date ? String(user.birth_date).slice(0, 10) : "",
  };
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState(() => profileFields(user));
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    authService.getCurrentUser()
      .then((profile) => {
        if (!active || !profile || typeof profile !== "object") return;
        setForm(profileFields(profile));
        updateUser(profile);
      })
      .catch((requestError) => {
        if (active) setError(getApiError(requestError));
      });
    return () => { active = false; };
  }, [updateUser]);

  async function saveProfile(event) {
    event.preventDefault();
    if (!isValidOptionalPhoneNumber(form.mobile) || !isValidOptionalPhoneNumber(form.whatsapp)) {
      setError("يجب أن يتكون رقم الهاتف ورقم واتساب، عند إدخالهما، من 10 أرقام بالضبط وأن يبدأ كل منهما بـ09.");
      return;
    }
    if (!user?.id) {
      setError("تعذر تحديد حساب المستخدم الحالي.");
      return;
    }

    setLoading(true);
    setError("");
    const payload = {
      name: form.name.trim(),
      mobile: form.mobile.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      gender: form.gender || null,
      birth_date: form.birth_date || null,
    };
    try {
      const savedProfile = await authService.updateProfile(user.id, payload);
      const nextUser = { ...user, ...payload, ...(savedProfile ?? {}) };
      setForm(profileFields(nextUser));
      updateUser(nextUser);
      await showSuccess("تم تحديث بيانات الملف الشخصي.");
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    if (passwordForm.password.length < 8) {
      setError("يجب ألا تقل كلمة المرور الجديدة عن 8 أحرف.");
      return;
    }
    if (passwordForm.password !== passwordForm.password_confirmation) {
      setError("تأكيد كلمة المرور غير مطابق.");
      return;
    }

    setPasswordLoading(true);
    setError("");
    try {
      await authService.changePassword(passwordForm);
      setPasswordForm({ current_password: "", password: "", password_confirmation: "" });
      await showSuccess("تم تغيير كلمة المرور.");
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <>
      <PageHeader title="الملف الشخصي" subtitle="عرض وتحديث بيانات حسابك" />
      <ErrorPopup message={error} onClose={() => setError("")} />
      <Paper component="form" onSubmit={saveProfile} variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography fontWeight={800} sx={{ mb: 2 }}>بيانات المستخدم</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" }, gap: 2 }}>
          <TextField
            required
            label="الاسم"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
          <TextField label="البريد الإلكتروني" type="email" value={form.email} disabled />
          <TextField
            label="رقم الهاتف"
            type="tel"
            value={form.mobile}
            onChange={(event) => setForm({ ...form, mobile: event.target.value })}
            inputProps={{ maxLength: 10, inputMode: "numeric" }}
          />
          <TextField
            label="رقم واتساب"
            type="tel"
            value={form.whatsapp}
            onChange={(event) => setForm({ ...form, whatsapp: event.target.value })}
            inputProps={{ maxLength: 10, inputMode: "numeric" }}
          />
          <TextField
            select
            label="الجنس"
            value={form.gender}
            onChange={(event) => setForm({ ...form, gender: event.target.value })}
          >
            <MenuItem value="">غير محدد</MenuItem>
            <MenuItem value="male">ذكر</MenuItem>
            <MenuItem value="female">أنثى</MenuItem>
          </TextField>
          <TextField
            type="date"
            label="تاريخ الميلاد"
            InputLabelProps={{ shrink: true }}
            value={form.birth_date}
            onChange={(event) => setForm({ ...form, birth_date: event.target.value })}
          />
        </Box>
        <Stack direction="row" sx={{ mt: 2 }}>
          <Button type="submit" variant="contained" startIcon={<SaveOutlinedIcon />} disabled={loading}>
            {loading ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </Button>
        </Stack>
      </Paper>
      <Paper component="form" onSubmit={changePassword} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mt: 2 }}>
        <Typography fontWeight={800} sx={{ mb: 2 }}>تغيير كلمة المرور</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,minmax(0,1fr))" }, gap: 2 }}>
          <TextField
            required
            label="كلمة المرور الحالية"
            type="password"
            autoComplete="current-password"
            value={passwordForm.current_password}
            onChange={(event) => setPasswordForm({ ...passwordForm, current_password: event.target.value })}
          />
          <TextField
            required
            label="كلمة المرور الجديدة (8 أحرف على الأقل)"
            type="password"
            autoComplete="new-password"
            value={passwordForm.password}
            onChange={(event) => setPasswordForm({ ...passwordForm, password: event.target.value })}
          />
          <TextField
            required
            label="تأكيد كلمة المرور الجديدة"
            type="password"
            autoComplete="new-password"
            value={passwordForm.password_confirmation}
            onChange={(event) => setPasswordForm({ ...passwordForm, password_confirmation: event.target.value })}
          />
        </Box>
        <Stack direction="row" sx={{ mt: 2 }}>
          <Button type="submit" variant="contained" disabled={passwordLoading}>
            {passwordLoading ? "جارٍ التغيير..." : "تغيير كلمة المرور"}
          </Button>
        </Stack>
      </Paper>
    </>
  );
}
