import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Autocomplete,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import ErrorPopup from "./ErrorPopup.jsx";
import { getApiError } from "../api/http.js";
import { catalogService } from "../services/catalogService.js";
import { invoicesService } from "../services/invoicesService.js";

function invoiceDate(value) {
  return String(value ?? "").slice(0, 10);
}

export default function InvoiceEditDialog({ invoice, open, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [attachment, setAttachment] = useState(null);

  useEffect(() => {
    if (!open || !invoice) return;
    setForm({
      invoice_number: invoice.invoice_number ?? "",
      invoice_date: invoiceDate(invoice.invoice_date),
      amount: invoice.amount ?? "",
      currency_id: invoice.currency_id ?? invoice.currency?.id ?? "",
      description: invoice.description ?? "",
      notes: invoice.notes ?? "",
    });
    setAttachment(null);
    setError("");

    let active = true;
    setLoadingCurrencies(true);
    catalogService.listCurrencies()
      .then((items) => {
        if (active) setCurrencies(items);
      })
      .catch((cause) => {
        if (active) setError(getApiError(cause));
      })
      .finally(() => {
        if (active) setLoadingCurrencies(false);
      });

    return () => {
      active = false;
    };
  }, [invoice, open]);

  function change(field) {
    return (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  }

  const currencyOptions = [...currencies];
  if (form?.currency_id && !currencyOptions.some((currency) => String(currency.id) === String(form.currency_id))) {
    currencyOptions.push({
      id: form.currency_id,
      name: invoice?.currency?.name ?? invoice?.currency?.code ?? invoice?.currency?.symbol ?? `العملة ${form.currency_id}`,
    });
  }

  function selectAttachment(event) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
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

  async function save(event) {
    event.preventDefault();
    if (!invoice || !form) return;

    const amount = Number(form.amount);
    if (!form.invoice_number.trim()) {
      setError("يرجى إدخال رقم الفاتورة.");
      return;
    }
    if (!form.invoice_date) {
      setError("يرجى إدخال تاريخ الفاتورة.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("يرجى إدخال قيمة أكبر من صفر.");
      return;
    }
    if (!form.currency_id) {
      setError("يرجى اختيار العملة.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const updated = await invoicesService.update(invoice.id, {
        ...form,
        amount,
        ...(attachment ? { attachment } : {}),
      });
      onClose();
      await onSaved(updated);
    } catch (cause) {
      setError(getApiError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => !busy && onClose()} fullWidth maxWidth="sm">
      <Box component="form" noValidate onSubmit={save}>
        <DialogTitle>تعديل الفاتورة</DialogTitle>
        <DialogContent dividers>
          <ErrorPopup message={error} onClose={() => setError("")} />
          {form && <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField required label="رقم الفاتورة" value={form.invoice_number} onChange={change("invoice_number")} />
            <TextField required type="date" label="تاريخ الفاتورة" InputLabelProps={{ shrink: true }} value={form.invoice_date} onChange={change("invoice_date")} />
            <TextField required type="number" inputProps={{ min: 0.01, step: "0.01" }} label="القيمة" value={form.amount} onChange={change("amount")} />
            <Autocomplete
              options={currencyOptions}
              value={currencyOptions.find((currency) => String(currency.id) === String(form.currency_id)) ?? null}
              getOptionLabel={(currency) => `${currency.name ?? ""}${currency.code ? ` (${currency.code})` : currency.symbol ? ` ${currency.symbol}` : ""}`}
              isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
              onChange={(_event, currency) => setForm((current) => ({ ...current, currency_id: currency ? String(currency.id) : "" }))}
              disabled={loadingCurrencies}
              loading={loadingCurrencies}
              noOptionsText="لا توجد عملات مطابقة"
              renderInput={(params) => (
                <TextField
                  {...params}
                  required
                  label="العملة"
                  helperText={loadingCurrencies ? "جارٍ تحميل العملات..." : !currencies.length ? "تعذر تحميل قائمة العملات؛ ستبقى العملة الحالية محفوظة." : ""}
                />
              )}
            />
            <TextField label="وصف الفاتورة" value={form.description} onChange={change("description")} />
            <TextField label="ملاحظات" value={form.notes} onChange={change("notes")} />
            <Button component="label" variant="outlined" startIcon={<UploadFileOutlinedIcon />} sx={{ justifyContent: "flex-start" }}>
              {attachment?.name ?? "استبدال المرفق (اختياري)"}
              <input hidden type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={selectAttachment} />
            </Button>
          </Stack>}
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={onClose} disabled={busy}>إلغاء</Button>
          <Button type="submit" variant="contained" disabled={busy || !form}>
            {busy ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
