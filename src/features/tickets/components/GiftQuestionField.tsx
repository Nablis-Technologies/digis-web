import type { GiftFormQuestion } from '@/lib/gifts';
import type { GiftAnswer } from '@/lib/gift-recipient';
import { AppInput, AppTextArea } from '@/components/primitives/AppInput';
import { glassField } from '@/lib/ui/glass';

/** The six published RegistrationQuestion types, retaining option keys as values. */
export function GiftQuestionField({ id, question, value, error, onChange, isDark }: {
  id: string; question: GiftFormQuestion; value?: GiftAnswer; error?: string;
  onChange: (value: GiftAnswer) => void; isDark: boolean;
}) {
  const options = (question.options ?? []).filter(option => !question.validation_rules?.allowed_option_keys || question.validation_rules.allowed_option_keys.includes(option.key));
  const label = `${question.label}${question.required ? ' (required)' : ''}`;
  const style = glassField(isDark, { error: !!error });
  const fieldClass = 'w-full px-4 py-3 rounded-xl text-sm';
  const labelClass = 'block text-sm mb-2';
  const common = { id, label, value: typeof value === 'string' ? value : '', error,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    className: fieldClass, labelClassName: labelClass, errorClassName: 'text-sm text-red-400 mt-2', style };
  if (question.type === 'long_text') return <AppTextArea {...common} rows={3} />;
  if (question.type === 'short_text' || question.type === 'date') return <AppInput {...common} type={question.type === 'date' ? 'date' : 'text'} min={question.validation_rules?.min_date} max={question.validation_rules?.max_date} />;
  if (question.type === 'single_choice') return <div>
    <label htmlFor={id} className={labelClass}>{label}</label>
    <select id={id} value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)}
      aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className={fieldClass} style={style}>
      <option value="">Select an option</option>
      {options.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
    </select>
    {error && <p id={`${id}-error`} role="alert" className="text-sm text-red-400 mt-2">{error}</p>}
  </div>;
  if (question.type === 'multiple_choice') return <fieldset aria-describedby={error ? `${id}-error` : undefined} className="space-y-2">
    <legend className={labelClass}>{label}</legend>
    {options.map(option => <label key={option.key} className="min-h-11 flex items-center gap-3 text-sm">
      <input type="checkbox" checked={Array.isArray(value) && value.includes(option.key)} style={{ accentColor: isDark ? '#d6f905' : '#17161c' }} aria-invalid={!!error}
        onChange={e => onChange(e.target.checked ? [...(Array.isArray(value) ? value : []), option.key] : (Array.isArray(value) ? value : []).filter(key => key !== option.key))} />
      {option.label}
    </label>)}
    {error && <p id={`${id}-error`} role="alert" className="text-sm text-red-400">{error}</p>}
  </fieldset>;
  if (question.type === 'checkbox') return <div>
    <label className="min-h-11 flex items-center gap-3 text-sm" htmlFor={id}>
      <input id={id} type="checkbox" checked={value === true} style={{ accentColor: isDark ? '#d6f905' : '#17161c' }} onChange={e => onChange(e.target.checked)} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} />{label}
    </label>
    {error && <p id={`${id}-error`} role="alert" className="text-sm text-red-400">{error}</p>}
  </div>;
  return <p role="alert" className="text-sm">This question type is unavailable. Please try again later.</p>;
}
