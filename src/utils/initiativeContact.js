function getOwner(initiative = {}) {
  const createdBy = initiative.created_by;
  return initiative.user
    ?? initiative.requester
    ?? initiative.owner
    ?? (createdBy && typeof createdBy === "object" ? createdBy : null);
}

export function getInitiativeContact(initiative = {}) {
  const owner = getOwner(initiative);
  return {
    owner,
    name: owner?.name
      ?? initiative.user_name
      ?? initiative.requester_name
      ?? initiative.created_by_name
      ?? (typeof initiative.created_by === "string" ? initiative.created_by : ""),
    mobile: owner?.mobile ?? initiative.user_mobile ?? initiative.requester_mobile ?? initiative.mobile ?? "",
    whatsapp: owner?.whatsapp ?? initiative.user_whatsapp ?? initiative.requester_whatsapp ?? initiative.whatsapp ?? "",
    email: owner?.email ?? initiative.user_email ?? initiative.requester_email ?? initiative.email ?? "",
    gender: owner?.gender ?? initiative.user_gender ?? initiative.requester_gender ?? initiative.gender ?? "",
    birthDate: owner?.birth_date
      ?? owner?.birthDate
      ?? initiative.user_birth_date
      ?? initiative.requester_birth_date
      ?? initiative.birth_date
      ?? initiative.birthDate
      ?? "",
  };
}

export function getWhatsAppUrl(phone) {
  const number = String(phone ?? "").replace(/\D/g, "");
  return number ? `https://wa.me/${number}` : "";
}
