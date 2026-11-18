const arabicDateFormatter = new Intl.DateTimeFormat("ar", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDate(value) {
  if (!value) return "—";

  const raw = String(value);
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);

  return Number.isNaN(date.getTime()) ? raw : arabicDateFormatter.format(date);
}

export function getDateField(record, field) {
  const camelCaseField = field.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
  return record?.[field]
    ?? record?.[camelCaseField]
    ?? record?.timestamps?.[field]
    ?? record?.timestamps?.[camelCaseField]
    ?? null;
}
