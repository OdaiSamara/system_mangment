import { getApiError } from "../api/http.js";
import { useCallback, useEffect, useState } from "react";
import { Alert, Button } from "@mui/material";
import RestoreOutlinedIcon from "@mui/icons-material/RestoreOutlined";
import PageHeader from "../components/PageHeader.jsx";
import ErrorPopup from "../components/ErrorPopup.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { initiativeService } from "../services/initiativeService.js";
import DataTable from "../components/DataTable.jsx";

export default function TrashedInitiativesPage() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [reload, setReload] = useState(0);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await initiativeService.listTrashed({ per_page: 100, page: 1 });
      setItems(Array.isArray(result) ? result : result?.items ?? []);
    } catch (e) {
      setError(getApiError(e));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load, reload]);
  async function restore(item) {
    setBusyId(item.id); setError(""); setNotice("");
    try { await initiativeService.restore(item.id); setNotice("تمت استعادة المبادرة بنجاح."); setReload(x => x + 1); }
    catch (e) { setError(getApiError(e)); }
    finally { setBusyId(null); }
  }
  return <>
    <PageHeader title="المحذوفات" subtitle="عرض المبادرات المحذوفة حذفًا ناعمًا" />
    {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice("")}>{notice}</Alert>}
    <ErrorPopup message={error} onClose={() => setError("")} />
    <DataTable
      loading={loading}
      items={items}
      includeAllFields
      filename="المبادرات-المحذوفة"
      emptyMessage="لا توجد مبادرات محذوفة."
      columns={[
        { id: "reference_number", label: "رقم الطلب", value: (item) => item.reference_number ?? item.id },
        { id: "title", label: "اسم المبادرة", value: (item) => item.title ?? item.name },
        { id: "deleted_at", label: "تاريخ الحذف" },
        { id: "status", label: "الحالة" },
      ]}
      actions={(item) => isManager
        ? <Button size="small" variant="outlined" startIcon={<RestoreOutlinedIcon />} disabled={busyId === item.id} onClick={() => restore(item)}>
          {busyId === item.id ? "جارٍ الاستعادة..." : "استعادة"}
        </Button>
        : <span>للمدير فقط</span>}
    />
  </>;
}
