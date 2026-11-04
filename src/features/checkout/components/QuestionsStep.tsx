import { ClipboardList } from 'lucide-react';
import type { CheckoutQuestion } from '../hooks/useCheckoutFlow';
import { GiftQuestionField } from '@/features/tickets/components/GiftQuestionField';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassControl, glassEdge } from '@/lib/ui/glass';
import { QuestionField } from './QuestionField';

export function QuestionsStep({
  questions, answers, setAnswers, questionErrors, setQuestionErrors, isDark, loading, loadError, onRetry,
}: any) {
  const textPrimary = isDark ? '#fff' : '#1a1a1a';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,46,0.55)';
  const accent = isDark ? '#d6f905' : '#0a0a0a';

  const clearQErr = (id: string) =>
    setQuestionErrors((prev: Record<string, string>) => {
      if (!prev[id]) return prev;
      const next = { ...prev }; delete next[id]; return next;
    });

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
          style={{
            background: isDark ? 'rgba(217,255,0,0.08)' : 'rgba(214,249,5,0.08)',
            ...glassEdge(isDark),
          }}>
          <ClipboardList className="w-5 h-5" strokeWidth={1.6} style={{ color: accent }} />
        </div>
        <h3 className="text-[20px] font-light mb-1"
          style={{ fontFamily: "'Zalando Sans Expanded', sans-serif", color: textPrimary }}>
          A few questions from the organizer
        </h3>
        <p className="text-[12px]"
          style={{ fontFamily: "'Inter', sans-serif", color: textMuted }}>
          This helps them prepare for your arrival.
        </p>
      </div>

      <div className="relative space-y-4 rounded-2xl overflow-hidden p-4"
        style={{
          background: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(26,26,46,0.02)',
        }}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 space-y-4">
        {loading && <p role="status">Loading organizer questions…</p>}
        {loadError && <div role="alert" className="space-y-3"><p>{loadError}</p><AppButton onClick={onRetry} className="px-4 py-3 rounded-xl" style={glassControl(isDark)}>Retry questions</AppButton></div>}
        {!loading && !loadError && questions.length === 0 && <p>No additional questions are required.</p>}
        {!loading && !loadError && questions.map((q: CheckoutQuestion) => q.published ? (
          <GiftQuestionField key={q.id} id={q.id} question={q.published} value={answers[q.id]} error={questionErrors[q.id]} isDark={isDark}
            onChange={value => { setAnswers((prev: Record<string, unknown>) => ({ ...prev, [q.id]: value })); clearQErr(q.id); }} />
        ) : (
          <QuestionField
            key={q.id}
            question={q}
            value={answers[q.id]}
            error={questionErrors[q.id]}
            onChange={(v: any) => {
              setAnswers((prev: any) => ({ ...prev, [q.id]: v }));
              clearQErr(q.id);
            }}
            isDark={isDark}
          />
        ))}
        </div>
      </div>
    </div>
  );
}
