/**
 * Formats a given phone number string into E.164 format.
 * Defaults to US country code (+1) if none is provided.
 *
 * @param phone - The input phone number string
 * @returns The E.164 formatted string, or an empty string if invalid
 */
export function formatPhoneE164(phone: string | null | undefined): string {
  if (!phone) return "";

  // Remove all non-numeric characters
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 0) return "";

  // If it already starts with a country code (like 1 for US) and is 11 digits
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // If it's 10 digits (standard US), prepend +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it has a country code other than 1 and is longer
  if (digits.length > 10) {
    return `+${digits}`;
  }

  // Fallback for invalid lengths, return as is (but stripped) or empty
  return digits.length > 0 ? `+1${digits}` : "";
}

/**
 * Formats an E.164 or plain digit string into a US display format: (XXX) XXX-XXXX
 *
 * @param phone - The E.164 or digit string
 * @returns Formatted US phone string
 */
export function formatPhoneUS(phone: string | null | undefined): string {
  if (!phone) return "";

  const digits = phone.replace(/\D/g, "");
  
  let coreDigits = digits;
  if (digits.length === 11 && digits.startsWith("1")) {
    coreDigits = digits.substring(1);
  } else if (digits.length > 11) {
    // Return original if it's international
    return phone;
  }

  if (coreDigits.length === 10) {
    return `(${coreDigits.substring(0, 3)}) ${coreDigits.substring(3, 6)}-${coreDigits.substring(6, 10)}`;
  }

  return phone; // Fallback to original string if not exactly 10 US digits
}
