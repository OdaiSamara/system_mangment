export function isValidOptionalPhoneNumber(value) {
  const phoneNumber = String(value ?? "").trim();
  return phoneNumber === "" || /^09[0-9]{8}$/.test(phoneNumber);
}
