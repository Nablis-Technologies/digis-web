import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Gift, HeartHandshake } from 'lucide-react';
import { useTheme } from '@/app/components/ThemeContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { giftService, type ClaimGiftInput } from '@/lib/gifts';
import { giftAnswerError, giftAnswerPayload, giftConsentEntries, giftQuestionEntries, type GiftAnswer } from '@/lib/gift-recipient';
import { randomUuid } from '@/lib/api';
import { ApiError, mapApiError } from '@/lib/errors';
import { ticketKeys } from '@/lib/tickets';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassControl } from '@/lib/ui/glass';
import { primaryButtonSurface } from '@/lib/ui/disabledStyles';
import { isoToDisplayDate } from '@/lib/mappers';
import { GiftQuestionField } from '@/features/tickets/components/GiftQuestionField';
import { TicketQRCode } from '@/features/tickets/components/TicketQRCode';

interface ClaimGiftPageProps {
  id: string;
  token: string;
  onRequestAuth?: () => void;
  onNavigateHome: () => void;
  onNavigateTickets: () => void;
}

export function ClaimGiftPage({ id, token, onRequestAuth, onNavigateHome, onNavigateTickets }: ClaimGiftPageProps) {
  const { isDark } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  // Capabilities never enter cache keys; recipient-only responses leave cache on unmount.
  const queryKey = ['gift', id, user?.id];
  const query = useQuery({ queryKey, queryFn: () => giftService.resolveGift(id, token),
    enabled: !!id && !!token, retry: false, staleTime: 0, gcTime: 0 });
  const view = query.data;
  const [answers, setAnswers] = useState<Record<string, GiftAnswer>>({});
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Retry the exact uncertain request with the same command and consent identities.
  const attempt = useRef<{ signature: string; key: string; input: ClaimGiftInput } | null>(null);
  // CompleteGift preserves accepted answers on a consent-only continuation.
  const questions = view && view.gift.status !== 'pending_recipient_consent' ? giftQuestionEntries(view) : [];
  const consents = view ? giftConsentEntries(view) : [];
  const missingConsentDocument = view?.gift.status === 'pending_recipient_consent' && view.pending_consents?.some(
    requirement => !view.consents?.some(document => document.id === requirement.consent_document_version_id),
  );
  const unsupportedQuestion = questions.some(({ question }) => !['short_text', 'long_text', 'single_choice', 'multiple_choice', 'checkbox', 'date'].includes(question.type));
  const mutation = useMutation({
    gcTime: 0,
    mutationFn: () => giftService.claimGift(id, attempt.current!.input, attempt.current!.key),
    onSuccess: data => {
      queryClient.setQueryData(queryKey, data);
      if (data.gift.status === 'claimed') void queryClient.invalidateQueries({ queryKey: ticketKeys.userTickets });
      // A successful partial step is a new subsequent intent, even if inputs match.
      attempt.current = null;
    },
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!view || mutation.isPending || missingConsentDocument || unsupportedQuestion) return;
    const nextErrors: Record<string, string> = {};
    for (const entry of questions) {
      const message = giftAnswerError(entry.question, answers[entry.key] ?? (entry.question.type === 'checkbox' ? false : undefined));
      if (message) nextErrors[entry.key] = message;
    }
    for (const entry of consents) if (entry.required && !accepted[entry.key]) nextErrors[entry.key] = 'Accept this required consent to continue.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const submission = { answers: giftAnswerPayload(questions, answers), consents: consents.filter(entry => accepted[entry.key]).map(entry => ({
      consent_document_version_id: entry.document.id, content_sha256: entry.document.content_sha256,
      ...(entry.position ? { package_unit_number: 1, admission_position: entry.position } : {}),
    })) };
    const signature = JSON.stringify(submission);
    if (attempt.current?.signature !== signature) attempt.current = {
      signature, key: randomUuid(), input: { token, answers: submission.answers,
        consents: submission.consents.map(consent => ({ ...consent, request_uuid: randomUuid(), idempotency_key: randomUuid(), acceptance_method: 'checkbox' })),
      },
    };
    mutation.mutate();
  }

  const muted = isDark ? '#aaa9ae' : '#6d6976';
  const buttonClass = 'min-h-11 px-5 py-3 rounded-2xl text-sm font-medium';
  const authRequired = mutation.error instanceof ApiError && mutation.error.code === 'gift_recipient_authentication_required';
  const claimed = view?.gift.status === 'claimed';
  const qr = claimed && view?.ticket?.credential_status === 'active' ? view.ticket.qr_token : null;

  return <main className="min-h-screen px-4 py-12 sm:px-6 flex justify-center" style={{ color: isDark ? '#f4f4f0' : '#17161c' }}>
    <div className="w-full max-w-lg space-y-6">
      {query.isLoading && <p role="status" className="text-center">Loading your gift…</p>}
      {(!token || query.isError) && <section className="relative overflow-hidden rounded-3xl p-6" style={{ background: 'var(--card)' }}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 space-y-4">
          <h1 className="text-2xl" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>Gift unavailable</h1>
          <p role="alert">{!token ? 'Open the original gift link to continue.' : mapApiError(query.error, 'Couldn’t load your gift. Please try again.')}</p>
          {token && <AppButton onClick={() => void query.refetch()} disabled={query.isFetching} className={buttonClass} style={glassControl(isDark)}>Retry</AppButton>}
          <AppButton onClick={onNavigateHome} className={buttonClass} style={glassControl(isDark)}>Browse events</AppButton>
        </div>
      </section>}
      {view && token && !query.isError && <>
        <header className="text-center space-y-3">
          <Gift className="w-8 h-8 mx-auto" style={{ color: isDark ? '#d6f905' : '#17161c' }} />
          <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>{claimed ? 'Your ticket is ready' : 'You received a gift'}</h1>
          <p className="text-sm" style={{ color: muted }}>{claimed ? 'Use your ticket at the event entrance.' : 'Complete your details and required consents to claim your ticket.'}</p>
        </header>
        <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8" style={{ background: 'var(--card)' }}>
          <GlassReflection isDark={isDark} />
          <div className="relative z-10 space-y-6">
            <div><h2 className="text-xl break-words">{view.event.title}</h2><p className="text-sm mt-1" style={{ color: muted }}>{view.product.name}</p>
              {view.product.description && <p className="text-sm mt-2 break-words">{view.product.description}</p>}
            </div>
            {view.gift.note && <blockquote className="rounded-2xl p-4 flex gap-3 text-sm" style={glassControl(isDark, 'accent')}>
              <HeartHandshake className="w-5 h-5 shrink-0" /><p className="whitespace-pre-wrap break-words">{view.gift.note}</p>
            </blockquote>}
            {claimed ? <div className="space-y-4 text-center">
              {qr ? <div role="img" aria-label="Ticket QR code" className="mx-auto w-60 h-60 rounded-2xl bg-white p-5"><TicketQRCode code={qr} /></div>
                : <><p role="status">Your entry code is not available yet.</p><AppButton onClick={() => void query.refetch()} disabled={query.isFetching} className={buttonClass} style={glassControl(isDark)}>Refresh ticket</AppButton></>}
              {view.ticket?.lookup_code && <p className="text-sm">{view.ticket.lookup_code}</p>}
              {isAuthenticated && <AppButton onClick={onNavigateTickets} className={buttonClass} style={glassControl(isDark)}>View in My Tickets</AppButton>}
            </div> : <form onSubmit={submit} noValidate className="space-y-6">
              <fieldset disabled={mutation.isPending} className="space-y-6">
                {questions.map(entry => <div key={entry.key}>
                  {entry.position && view.product.admissions_per_unit > 1 && <p className="text-sm mb-2" style={{ color: muted }}>Attendee {entry.position}</p>}
                  <GiftQuestionField id={entry.key} question={entry.question} value={answers[entry.key]} error={errors[entry.key]} isDark={isDark}
                    onChange={value => {
                      setAnswers(previous => ({ ...previous, [entry.key]: value }));
                      setErrors(previous => ({ ...previous, [entry.key]: '' }));
                    }} />
                </div>)}
                {consents.map(entry => <div key={entry.key} className="space-y-2">
                  <h3 className="font-medium">{entry.document.title}{entry.position && view.product.admissions_per_unit > 1 ? ` — attendee ${entry.position}` : ''}</h3>
                  <p className="text-sm whitespace-pre-wrap break-words" style={{ color: muted }}>{entry.document.body}</p>
                  <label className="min-h-11 flex items-start gap-3 py-2 text-sm">
                    <input type="checkbox" checked={!!accepted[entry.key]} className="mt-1" style={{ accentColor: isDark ? '#d6f905' : '#17161c' }} aria-invalid={!!errors[entry.key]}
                      aria-describedby={errors[entry.key] ? `${entry.key}-error` : undefined}
                      onChange={event => {
                        setAccepted(previous => ({ ...previous, [entry.key]: event.target.checked }));
                        setErrors(previous => ({ ...previous, [entry.key]: '' }));
                      }} />
                    <span>I agree to {entry.document.title}{entry.required ? ' (required)' : ' (optional)'}</span>
                  </label>
                  {errors[entry.key] && <p id={`${entry.key}-error`} role="alert" className="text-sm text-red-400">{errors[entry.key]}</p>}
                </div>)}
                {(missingConsentDocument || unsupportedQuestion) && <p role="alert" className="text-sm">Some required gift details are unavailable. Refresh the gift before continuing.</p>}
                {mutation.isError && <p role="alert" className="text-sm text-red-400">{mapApiError(mutation.error, 'Couldn’t claim your gift. Please try again.')}</p>}
                {authRequired && onRequestAuth && <AppButton type="button" onClick={onRequestAuth} className={buttonClass} style={glassControl(isDark)}>Sign in to claim</AppButton>}
                <AppButton type="submit" disabled={mutation.isPending || !!missingConsentDocument || unsupportedQuestion} className={`${buttonClass} w-full`}
                  style={primaryButtonSurface(!mutation.isPending && !missingConsentDocument && !unsupportedQuestion, isDark)}>{mutation.isPending ? 'Claiming ticket…' : 'Claim my ticket'}</AppButton>
              </fieldset>
            </form>}
            <p className="text-xs" style={{ color: muted }}>Expires {isoToDisplayDate(view.gift.expires_at)}</p>
          </div>
        </section>
      </>}
    </div>
  </main>;
}
