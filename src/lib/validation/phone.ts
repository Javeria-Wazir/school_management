/**
 * Normalise a phone number to international format (+923001234567) for WhatsApp links.
 * Accepts +92 300 1234567, 0092-300-1234567 and local numbers such as 0300 1234567, which get the
 * school's country code. Returns `null` for a blank value and throws a message for an invalid one.
 */
export function normalizePhone(raw: string | null | undefined, countryCode: string): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  let digits = value.replace(/[\s().-]/g, "");
  if (digits.startsWith("00")) digits = `+${digits.slice(2)}`;
  else if (digits.startsWith("0")) digits = `+${countryCode}${digits.slice(1)}`;
  else if (!digits.startsWith("+")) throw new Error("Phone number: start with + and the country code, or with 0 for a local number");
  if (!/^\+[1-9][0-9]{7,14}$/.test(digits)) throw new Error("Phone number is not valid (e.g. +923001234567 or 03001234567)");
  return digits;
}
