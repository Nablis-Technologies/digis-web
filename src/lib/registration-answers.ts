import { apiFetch } from '@/lib/api';
import type { GiftFormQuestion } from '@/lib/gifts';
import type { GiftAnswer } from '@/lib/gift-recipient';

/** Respondent-only projection from EditableRegistrationAnswerSerializer. */
export interface RegistrationAnswer {
  id: string;
  question_key: string;
  question_label: string;
  question_type: string;
  options: GiftFormQuestion['options'];
  validation_rules: GiftFormQuestion['validation_rules'];
  response_scope: string;
  package_unit_number: number | null;
  admission_position: number | null;
  admission_slot_id: string | null;
  editable: boolean;
  /** Omitted for erased/expired answers; never render their labels or controls. */
  value?: GiftAnswer;
}

export interface RegistrationAnswers {
  registration_id: string;
  answers_editable_until: string | null;
  can_edit_answers: boolean;
  answers: RegistrationAnswer[];
}

// Never send the authenticated client to an arbitrary URL supplied as metadata.
export function isRegistrationAnswersPath(path: string): boolean {
  return /^\/registrations\/[a-zA-Z0-9-]+\/answers$/.test(path);
}

export const registrationAnswersService = {
  async fetch(path: string): Promise<RegistrationAnswers> {
    if (!isRegistrationAnswersPath(path)) throw new Error('Registration answers are unavailable for this ticket.');
    return (await apiFetch<RegistrationAnswers>(path)).data;
  },
  async revise(id: string, value: GiftAnswer, key: string): Promise<void> {
    await apiFetch(`registration_answers/${encodeURIComponent(id)}/revise`, {
      method: 'POST', headers: { 'Idempotency-Key': key },
      body: { value, source: 'attendee_correction' },
    });
  },
};

export function answerQuestion(answer: RegistrationAnswer): GiftFormQuestion {
  return { id: answer.id, key: answer.question_key, type: answer.question_type,
    response_scope: answer.response_scope, label: answer.question_label,
    // This projection does not serve required. Do not invent it; the command
    // validates corrections against the original published question schema.
    required: false, options: answer.options, validation_rules: answer.validation_rules };
}

export function isRetainedAnswer(answer: RegistrationAnswer): boolean {
  if (answer.value == null) return false;
  if (answer.question_type === 'checkbox') return typeof answer.value === 'boolean';
  if (answer.question_type === 'multiple_choice') return Array.isArray(answer.value) && answer.value.every(v => typeof v === 'string');
  return ['short_text', 'long_text', 'single_choice', 'date'].includes(answer.question_type) && typeof answer.value === 'string';
}

export function answerDisplayValue(answer: RegistrationAnswer): string {
  const label = (key: string) => answer.options?.find(option => option.key === key)?.label ?? key;
  if (typeof answer.value === 'boolean') return answer.value ? 'Yes' : 'No';
  if (Array.isArray(answer.value)) return answer.value.map(label).join(', ') || 'No options selected';
  return answer.question_type === 'single_choice' ? label(answer.value ?? '') : answer.value || 'No response';
}
