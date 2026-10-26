import type { ClaimGiftInput, GiftConsentVersion, GiftFormQuestion, ResolvedGiftView } from '@/lib/gifts';

export type GiftAnswer = string | boolean | string[];
export interface GiftQuestionEntry {
  key: string;
  formVersionId: string;
  question: GiftFormQuestion;
  position?: number;
}
export interface GiftConsentEntry {
  key: string;
  document: GiftConsentVersion;
  position?: number;
  required: boolean;
}

/** A gift is one package; admission-slot questions/consents repeat per served admission. */
export function giftQuestionEntries(view: ResolvedGiftView): GiftQuestionEntry[] {
  return (view.forms ?? []).flatMap(form => form.questions.flatMap(question => {
    const positions = question.response_scope === 'admission_slot'
      ? Array.from({ length: view.product.admissions_per_unit }, (_, i) => i + 1)
      : [undefined];
    return positions.map(position => ({
      key: `${form.id}:${question.key}:${position ?? 'registration'}`,
      formVersionId: form.id, question, position,
    }));
  }));
}

export function giftConsentEntries(view: ResolvedGiftView): GiftConsentEntry[] {
  if (view.gift.status === 'pending_recipient_consent' && view.pending_consents) {
    return view.pending_consents.flatMap(requirement => {
      const document = view.consents?.find(doc => doc.id === requirement.consent_document_version_id);
      return document ? [{ key: requirement.id, document, required: requirement.required,
        position: requirement.admission_position ?? undefined }] : [];
    });
  }
  return (view.consents ?? []).flatMap(document => {
    const positions = document.acceptance_scope === 'admission_slot'
      ? Array.from({ length: view.product.admissions_per_unit }, (_, i) => i + 1)
      : [undefined];
    return positions.map(position => ({ key: `${document.id}:${position ?? 'buyer'}`, document, position, required: document.required }));
  });
}

/** Mirror only the constraints sent by the server; final validation stays on the API. */
export function giftAnswerError(question: GiftFormQuestion, value: GiftAnswer | undefined): string | undefined {
  const empty = value === undefined || (typeof value === 'string' && !value.trim()) || (Array.isArray(value) && !value.length);
  if (empty) return question.required ? `Enter ${question.label}.` : undefined;
  const rules = question.validation_rules ?? {};
  if (typeof value === 'string') {
    const length = Array.from(value.trim()).length;
    if (rules.min_length != null && length < rules.min_length) return `Use at least ${rules.min_length} characters.`;
    if (rules.max_length != null && length > rules.max_length) return `Use no more than ${rules.max_length} characters.`;
    if (question.type === 'date' && ((rules.min_date && value < rules.min_date) || (rules.max_date && value > rules.max_date))) return 'Choose a date within the allowed range.';
  }
  if (Array.isArray(value)) {
    if (rules.min_items != null && value.length < rules.min_items) return `Select at least ${rules.min_items} options.`;
    if (rules.max_items != null && value.length > rules.max_items) return `Select no more than ${rules.max_items} options.`;
  }
}

export function giftAnswerPayload(entries: GiftQuestionEntry[], values: Record<string, GiftAnswer>): NonNullable<ClaimGiftInput['answers']> {
  return entries.flatMap(entry => {
    const value = values[entry.key] ?? (entry.question.type === 'checkbox' ? false : undefined);
    if (value === undefined || value === '' || (Array.isArray(value) && !value.length)) return [];
    return [{ form_version_id: entry.formVersionId, question_key: entry.question.key, value,
      ...(entry.position ? { package_unit_number: 1, admission_position: entry.position } : {}) }];
  });
}
