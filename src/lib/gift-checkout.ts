export interface GiftRecipientDraft {
  lineId: string;
  phone: string;
  email: string;
  note: string;
}
export interface GiftRecipientErrors { recipientPhone?: string; recipientEmail?: string; note?: string }
export function normalizeGiftPhone(phone: string): string {
  const value = phone.replace(/[\s()-]/g, '');
  if (value.startsWith('09')) return '+251' + value.slice(1);
  if (value.startsWith('9') && value.length === 9) return '+251' + value;
  return value;
}
export function validateGiftRecipient(row: GiftRecipientDraft, buyerPhone?: string): GiftRecipientErrors {
  const errors: GiftRecipientErrors = {};
  const phone = normalizeGiftPhone(row.phone.trim());
  if (!phone) errors.recipientPhone = 'Recipient phone number is required';
  else if (!/^\+\d{10,15}$/.test(phone)) errors.recipientPhone = 'Enter a valid phone number (e.g. +251 91 123 4567)';
  else if (buyerPhone && phone === normalizeGiftPhone(buyerPhone)) errors.recipientPhone = 'You cannot send a gift ticket to your own phone number';
  if (row.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) errors.recipientEmail = 'Enter a valid recipient email address.';
  if (row.note.length > 500) errors.note = 'Gift note cannot exceed 500 characters';
  return errors;
}

export function readGiftLineIds(key: string | undefined): string[] {
  if (!key) return [];
  try {
    const saved: unknown = JSON.parse(sessionStorage.getItem(key) ?? '[]');
    return Array.isArray(saved) && saved.every(value => typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value)) && new Set(saved).size === saved.length ? saved : [];
  } catch { return []; }
}
