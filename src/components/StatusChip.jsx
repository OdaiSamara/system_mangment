import Chip from "@mui/material/Chip";

// Accept API status codes and localized labels.
const statusLabels = {
  under_study: "قيد الدراسة",
  wait_manager: "بانتظار مراجعة المدير",
  pending_manager: "بانتظار اعتماد المدير",
  pending: "قيد الدراسة",
  approved: "معتمدة",
  rejected: "مرفوضة",
  completed: "مكتملة",
  archived: "مؤرشفة",
  manager_approved: "موافقة المدير",
  manager_rejected: "رفض المدير",
  accountant_approved: "موافقة المحاسب",
  accountant_rejected: "رفض المحاسب",
  "قيد الدراسة": "قيد الدراسة",
  "موافقة المدير": "موافقة المدير",
  "رفض المدير": "رفض المدير",
  "موافقة المحاسب": "موافقة المحاسب",
  "رفض المحاسب": "رفض المحاسب",
  "مكتمل": "مكتمل",
  "مؤرشف": "مؤرشف",
  "معتمدة": "معتمدة",
  "مرفوضة": "مرفوضة",
};

const statusColors = {
  under_study: "warning",
  wait_manager: "warning",
  pending_manager: "warning",
  pending: "warning",
  approved: "success",
  completed: "success",
  manager_approved: "info",
  accountant_approved: "success",
  rejected: "error",
  manager_rejected: "error",
  accountant_rejected: "error",
  archived: "default",
  "قيد الدراسة": "warning",
  "موافقة المدير": "info",
  "رفض المدير": "error",
  "موافقة المحاسب": "success",
  "رفض المحاسب": "error",
  "مكتمل": "success",
  "مؤرشف": "default",
  "معتمدة": "success",
  "مرفوضة": "error",
};

export default function StatusChip({ status }) {
  const label = statusLabels[status] || status || "غير محدد";
  return (
    <Chip
      size="small"
      label={label}
      color={statusColors[status] || "default"}
      variant={["مؤرشف", "archived"].includes(status) ? "outlined" : "filled"}
      sx={{ fontWeight: 700, minWidth: 100 }}
    />
  );
}
