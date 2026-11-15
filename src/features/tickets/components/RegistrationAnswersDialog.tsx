import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { GiftQuestionField } from './GiftQuestionField';
import { giftAnswerError, type GiftAnswer } from '@/lib/gift-recipient';
import { answerDisplayValue, answerQuestion, isRetainedAnswer, registrationAnswersService, type RegistrationAnswer } from '@/lib/registration-answers';
import { randomUuid } from '@/lib/api';
import { mapApiError, toApiError } from '@/lib/errors';
import { glassControl } from '@/lib/ui/glass';

export function RegistrationAnswersDialog({ path, onClose }: { path: string; onClose: () => void }) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const query = useQuery({ queryKey: ['registration-answers', user?.id, path],
    queryFn: () => registrationAnswersService.fetch(path), enabled: !!user,
    retry: false, staleTime: 0, gcTime: 0 });
  const [editing, setEditing] = useState<RegistrationAnswer | null>(null);
  const [draft, setDraft] = useState<GiftAnswer>('');
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [locked, setLocked] = useState(false);
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const button = 'min-h-11 rounded-xl px-4 py-2 text-sm cursor-pointer';
  const canSave = !!editing && query.data?.can_edit_answers && query.data.answers.find(answer => answer.id === editing.id)?.editable && !locked;
  const beginEdit = (answer: RegistrationAnswer) => {
    if (pending) return;
    setEditing(answer); setDraft(answer.value ?? ''); setError(undefined); setSaved(false); setLocked(false); attempt.current = null;
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || !canSave || pending) return;
    const message = giftAnswerError(answerQuestion(editing), draft);
    if (message) { setError(message); return; }
    const signature = JSON.stringify([editing.id, draft]);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: randomUuid() };
    setPending(true); setError(undefined); setSaved(false);
    try {
      await registrationAnswersService.revise(editing.id, draft, attempt.current.key);
      if (!active.current) return;
      setEditing(null); setSaved(true); attempt.current = null;
      // Revision responses contain audit metadata, not the effective value.
      // Read the authoritative answer set again after the command succeeds.
      await query.refetch();
    } catch (failure) {
      if (!active.current) return;
      const api = toApiError(failure);
      setError(mapApiError(failure));
      if (['correction_window_closed', 'answer_erased', 'retention_expired', 'not_authorized', 'revision_conflict'].includes(api.code ?? '') || api.status === 403 || api.status === 404) {
        setLocked(true);
      }
    } finally {
      if (active.current) setPending(false);
    }
  };
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-sm" />
      <Dialog.Content className="fixed z-[121] inset-x-3 bottom-3 mx-auto max-w-lg rounded-2xl p-5 sm:p-6 max-h-[85dvh] overflow-y-auto shadow-xl"
        style={{ background: isDark ? '#101115' : '#f8f7fa', color: isDark ? '#f4f4f0' : '#17161c', fontFamily: "'Inter', sans-serif" }}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
        <Dialog.Title className="text-xl font-medium">Registration answers</Dialog.Title>
        <Dialog.Close asChild><AppButton aria-label="Close registration answers" className="shrink-0 size-11 grid place-items-center cursor-pointer"><X className="size-5" /></AppButton></Dialog.Close>
        </div>
        <Dialog.Description className="text-sm mt-2 mb-5" style={{ color: isDark ? '#aaa9ae' : '#6d6976' }}>
          Your submitted details. Available corrections are determined by the event.
        </Dialog.Description>
        {query.isPending && <p role="status">Loading your answers…</p>}
        {query.isError ? <div role="alert" className="space-y-3">
          <p>{mapApiError(query.error, 'Could not load your registration answers.')}</p>
          <AppButton className={button} style={glassControl(isDark)} onClick={() => void query.refetch()}>Retry loading answers</AppButton>
        </div> : query.data && <>
          {query.data.answers_editable_until && <p className="text-sm mb-4">Correction deadline: {new Date(query.data.answers_editable_until).toLocaleString()}</p>}
          {!query.data.can_edit_answers && <p className="text-sm mb-4">These answers are read-only.</p>}
          {saved && <p role="status" className="text-sm mb-4">Answer saved.</p>}
          {!query.data.answers.some(isRetainedAnswer) && <p>No retained answers are available.</p>}
          <div className="space-y-3">
            {query.data.answers.filter(isRetainedAnswer).map(answer => <section key={answer.id} className="py-4 first:pt-0 space-y-3">
              {answer.response_scope !== 'registration' && answer.package_unit_number != null && <p className="text-xs" style={{ color: isDark ? '#aaa9ae' : '#6d6976' }}>Ticket {answer.package_unit_number}{answer.admission_position != null ? ` · Admission ${answer.admission_position}` : ''}</p>}
              {editing?.id === answer.id ? <form onSubmit={save} className="space-y-3">
                <fieldset disabled={pending} className="space-y-3">
                <GiftQuestionField id={`answer-${answer.id}`} question={answerQuestion(answer)} value={draft} error={error} isDark={isDark}
                  onChange={value => { setDraft(value); setError(undefined); }} />
                {locked && <p className="text-sm">This answer can no longer be changed. Refresh to check its current status.</p>}
                <div className="flex gap-2 flex-wrap">
                  <AppButton type="submit" disabled={!canSave || pending} loading={pending} className={button} style={glassControl(isDark, 'accent')}>Save answer</AppButton>
                  <AppButton type="button" disabled={pending} className={button} onClick={() => { setEditing(null); setError(undefined); }}>Cancel</AppButton>
                  {locked && <AppButton type="button" className={button} onClick={() => { setEditing(null); void query.refetch(); }}>Refresh answers</AppButton>}
                </div>
                </fieldset>
              </form> : <>
                <h3 className="text-sm font-medium">{answer.question_label}</h3>
                <p className="text-sm whitespace-pre-wrap break-words">{answerDisplayValue(answer)}</p>
                {query.data.can_edit_answers && answer.editable && <AppButton disabled={pending} className={button} style={glassControl(isDark)} aria-label={`Edit ${answer.question_label}`} onClick={() => beginEdit(answer)}>Edit answer</AppButton>}
              </>}
            </section>)}
          </div>
        </>}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
