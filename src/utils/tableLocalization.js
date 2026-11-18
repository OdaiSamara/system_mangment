const FIELD_LABELS = {
  id: "المعرّف",
  name: "الاسم",
  username: "اسم المستخدم",
  email: "البريد الإلكتروني",
  email_verified_at: "تاريخ تأكيد البريد الإلكتروني",
  mobile: "رقم الهاتف",
  phone: "رقم الهاتف",
  whatsapp: "رقم واتساب",
  gender: "الجنس",
  birth_date: "تاريخ الميلاد",
  role: "الصلاحية",
  status: "الحالة",
  action: "الإجراء",
  model: "النموذج",
  model_type: "نوع السجل",
  model_id: "معرّف السجل",
  auditable_type: "نوع السجل",
  auditable_id: "معرّف السجل",
  user_id: "معرّف المستخدم",
  ip: "عنوان IP",
  ip_address: "عنوان IP",
  created_by: "أضيف بواسطة",
  created_by_name: "أضيف بواسطة",
  updated_by: "عُدّل بواسطة",
  updated_by_name: "عُدّل بواسطة",
  deleted_by: "حُذف بواسطة",
  deleted_by_name: "حُذف بواسطة",
  restored_by: "استُعيد بواسطة",
  restored_by_name: "استُعيد بواسطة",
  created_at: "تاريخ الإضافة",
  updated_at: "تاريخ التعديل",
  deleted_at: "تاريخ الحذف",
  restored_at: "تاريخ الاستعادة",
  is_active: "نشط",
  is_locked: "مقفل",
  reference: "رقم المرجع",
  reference_number: "رقم المرجع",
  title: "العنوان",
  description: "الوصف",
  notes: "ملاحظات",
  category: "التصنيف",
  category_id: "معرّف التصنيف",
  category_name: "التصنيف",
  field: "المجال",
  location: "الموقع",
  location_id: "معرّف الموقع",
  location_name: "الموقع",
  execution_date: "تاريخ التنفيذ",
  date: "التاريخ",
  item_name: "اسم العنصر",
  quantity: "الكمية",
  unit: "وحدة القياس",
  unit_id: "معرّف وحدة القياس",
  amount: "القيمة",
  total: "الإجمالي",
  total_cost: "التكلفة الإجمالية",
  invoice_number: "رقم الفاتورة",
  invoice_date: "تاريخ الفاتورة",
  initiative: "المبادرة",
  initiative_id: "معرّف المبادرة",
  currency: "العملة",
  currency_id: "معرّف العملة",
  attachment: "المرفق",
  attachment_name: "اسم المرفق",
  file_name: "اسم الملف",
  code: "الرمز",
  symbol: "رمز العرض",
  password: "كلمة المرور",
  old_values: "القيم السابقة",
  new_values: "القيم الجديدة",
  changes: "التغييرات",
  __trashResourceLabel: "نوع السجل",
};

const FIELD_WORDS = {
  account: "الحساب",
  active: "نشط",
  address: "العنوان",
  amount: "القيمة",
  approved: "معتمد",
  at: "تاريخ",
  by: "بواسطة",
  category: "التصنيف",
  code: "الرمز",
  cost: "التكلفة",
  count: "العدد",
  created: "الإضافة",
  currency: "العملة",
  date: "التاريخ",
  deleted: "الحذف",
  description: "الوصف",
  email: "البريد الإلكتروني",
  execution: "التنفيذ",
  file: "الملف",
  id: "المعرّف",
  initiative: "المبادرة",
  invoice: "الفاتورة",
  is: "",
  item: "العنصر",
  location: "الموقع",
  locked: "مقفل",
  model: "النموذج",
  name: "الاسم",
  new: "جديد",
  notes: "ملاحظات",
  number: "الرقم",
  old: "سابق",
  price: "السعر",
  quantity: "الكمية",
  reference: "المرجع",
  restored: "الاستعادة",
  role: "الصلاحية",
  status: "الحالة",
  symbol: "الرمز",
  title: "العنوان",
  total: "الإجمالي",
  type: "النوع",
  unit: "الوحدة",
  updated: "التعديل",
  user: "المستخدم",
  values: "القيم",
};

const VALUE_LABELS = {
  under_study: "قيد الدراسة",
  wait_manager: "بانتظار مراجعة المدير",
  pending_manager: "بانتظار اعتماد المدير",
  pending: "قيد الانتظار",
  approved: "معتمد",
  rejected: "مرفوض",
  completed: "مكتمل",
  archived: "مؤرشف",
  manager_approved: "موافقة المدير",
  manager_rejected: "رفض المدير",
  accountant_approved: "موافقة المحاسب",
  accountant_rejected: "رفض المحاسب",
  requester: "منفذ المبادرة",
  male: "ذكر",
  female: "أنثى",
  user: "منفذ المبادرة",
  accountant: "محاسب",
  manager: "مدير",
  admin: "مدير النظام",
  create: "إنشاء",
  created: "إنشاء",
  update: "تعديل",
  updated: "تعديل",
  delete: "حذف",
  deleted: "حذف",
  restore: "استعادة",
  restored: "استعادة",
  force_deleted: "حذف نهائي",
  login: "تسجيل الدخول",
  logged_in: "تسجيل الدخول",
  logout: "تسجيل الخروج",
  logged_out: "تسجيل الخروج",
  role_changed: "تغيير الصلاحية",
  active_changed: "تغيير حالة الحساب",
  locked: "مقفل",
  unlocked: "غير مقفل",
  active: "نشط",
  inactive: "غير نشط",
  draft: "مسودة",
  paid: "مدفوعة",
  unpaid: "غير مدفوعة",
  true: "نعم",
  false: "لا",
};

const MODEL_LABELS = {
  Initiative: "مبادرة",
  InitiativeItem: "عنصر مبادرة",
  Invoice: "فاتورة",
  User: "مستخدم",
  Currency: "عملة",
  Category: "تصنيف",
  Location: "موقع",
  Unit: "وحدة قياس",
  AuditLog: "سجل تدقيق",
};

export function isApiLinkField(field) {
  const parts = String(field)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[_\s.-]+/)
    .filter(Boolean);
  return parts.some((part) => (
    ["api", "url", "uri", "href", "link", "links", "endpoint", "endpoints", "route"].includes(part)
  ));
}

export function getTableFieldLabel(field) {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  const words = String(field)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => FIELD_WORDS[word.toLowerCase()]);
  return words.length && words.every((word) => word !== undefined)
    ? words.filter(Boolean).join(" ")
    : "بيانات إضافية";
}

export function localizeTableValue(value, field = "") {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value !== "object") {
    const text = String(value);
    if (/(?:^|\/)api(?:\/|$)/i.test(text)) return "—";
    if (VALUE_LABELS[text.toLowerCase()]) return VALUE_LABELS[text.toLowerCase()];
    if (/[\u0600-\u06FF]/.test(text)) return text;
    if (field === "role") return "صلاحية أخرى";
    if (field === "status") return "حالة أخرى";
    if (field === "action") return "إجراء آخر";
    if (field === "model" || field === "model_type" || field === "auditable_type") {
      const modelName = text.split(/[\\/]/).pop()?.split(".").pop();
      return MODEL_LABELS[modelName] ?? "سجل";
    }
    return text;
  }
  if (Array.isArray(value)) {
    return value.map((item) => localizeTableValue(item, field)).join("، ");
  }

  const label = value.name ?? value.title ?? value.username ?? value.user_name
    ?? value.email ?? value.code ?? value.symbol ?? value.id;
  if (label != null) return localizeTableValue(label);

  return Object.entries(value)
    .filter(([key]) => !isApiLinkField(key))
    .map(([key, nestedValue]) => `${getTableFieldLabel(key)}: ${localizeTableValue(nestedValue, key)}`)
    .join("، ") || "—";
}
