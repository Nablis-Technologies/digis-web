import { useRef } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useTheme } from '@/app/components/ThemeContext';
import { giftService, giftsInRecipientOrder, type GiftPurchaseStatus } from '@/lib/gifts';
import { randomUuid } from '@/lib/api';
import { mapApiError } from '@/lib/errors';
import { toastSuccess } from '@/lib/feedback';
import { isoToDisplayDate } from '@/lib/mappers';
import { AppButton } from '@/components/primitives/AppButton';
import { GlassReflection } from '@/components/primitives/GlassReflection';
import { glassControl } from '@/lib/ui/glass';

const STATUS: Record<string, string> = { pending_payment: 'Awaiting payment', ready: 'Ready to claim', pending_recipient_consent: 'Recipient consent pending', claimed: 'Claimed', expired: 'Expired', revoked: 'Revoked' };
const DELIVERY: Record<string, string> = { pending: 'Delivery pending', sent: 'Link sent', partial: 'Partially sent', failed: 'Delivery failed' };

/** Payer-only order confirmation. No recipient contact or bearer tokens are stored. */
export function GiftOrderPage({ orderId }: { orderId: string }) {
  const { isAuthenticated, user } = useAuth();
  const { isDark } = useTheme();
  const client = useQueryClient();
  const queryKey = ['order-gifts', user?.id, orderId];
  const query = useQuery({ queryKey, queryFn: () => giftService.fetchOrderGifts(orderId),
    enabled: isAuthenticated && !!orderId, gcTime: 0,
    refetchInterval: query => query.state.data?.some(gift => gift.delivery_status === 'pending' || gift.status === 'pending_payment') ? 5000 : false,
  });
  const resendKeys = useRef(new Map<string, string>());
  const resend = useMutation({
    gcTime: 0,
    mutationFn: (id: string) => {
      if (!resendKeys.current.has(id)) resendKeys.current.set(id, randomUuid());
      return giftService.resendGift(orderId, id, resendKeys.current.get(id));
    },
    onSuccess: gift => {
      client.setQueryData<GiftPurchaseStatus[]>(queryKey, previous => previous?.map(item => item.id === gift.id ? gift : item));
      resendKeys.current.delete(gift.id);
      toastSuccess('Delivery request accepted. Check the delivery status for updates.');
    },
  });
  const button = 'min-h-11 px-4 py-3 rounded-2xl text-sm inline-flex items-center justify-center';
  const returnTo = `/orders/${encodeURIComponent(orderId)}/gifts`;
  return <main className="max-w-2xl mx-auto min-h-screen px-4 py-12 space-y-6" style={{ color: isDark ? '#f4f4f0' : '#17161c' }}>
    <Link to="/tickets" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">My tickets</Link>
    <h1 className="text-2xl" style={{ fontFamily: "'Zalando Sans Expanded', sans-serif" }}>Gift delivery</h1>
    {!isAuthenticated ? <section className="space-y-4"><p>Sign in with the purchasing account to view this order’s gifts.</p>
      <Link to="/login" state={{ returnTo }} className={button} style={glassControl(isDark)}>Sign in</Link>
      <Link to="/signup" state={{ returnTo }} className={button} style={glassControl(isDark)}>Create account</Link>
    </section> : <>
      <AppButton onClick={() => void query.refetch()} disabled={query.isFetching} className={button} style={glassControl(isDark)}>Refresh delivery status</AppButton>
      {query.isPending && <p role="status">Loading gifts…</p>}
      {query.isError && <div role="alert"><p>{mapApiError(query.error, 'Couldn’t load gift delivery. Please try again.')}</p><AppButton onClick={() => void query.refetch()} disabled={query.isFetching} className={button} style={glassControl(isDark)}>Retry</AppButton></div>}
      {query.isSuccess && query.data.length === 0 && <p>No gifts are included in this order.</p>}
      {giftsInRecipientOrder(orderId, query.data ?? []).map((gift, index) => <article key={gift.id} aria-label={`Gift ${gift.id}`} className="relative overflow-hidden rounded-3xl p-5" style={{ background: 'var(--card)' }}>
        <GlassReflection isDark={isDark} />
        <div className="relative z-10 space-y-3">
          <h2 className="text-lg">Gift {index + 1}</h2>
          <p className="text-xs break-all" style={{ color: isDark ? '#aaa9ae' : '#6d6976' }}>Reference: {gift.id}</p>
          <p>{STATUS[gift.status] ?? gift.status}</p><p>{DELIVERY[gift.delivery_status] ?? gift.delivery_status}</p>
          {gift.delivered_at && <p className="text-sm">Sent {isoToDisplayDate(gift.delivered_at)}</p>}
          {gift.claimed_at && <p className="text-sm">Claimed {isoToDisplayDate(gift.claimed_at)}</p>}
          <p className="text-sm">Expires {isoToDisplayDate(gift.expires_at)}</p>
          {['ready', 'claimed'].includes(gift.status) && new Date(gift.expires_at).getTime() > Date.now() && <AppButton onClick={() => resend.mutate(gift.id)} disabled={resend.isPending} className={button} style={glassControl(isDark)}>Resend link</AppButton>}
          {resend.isError && resend.variables === gift.id && <p role="alert" className="text-sm text-red-400">{mapApiError(resend.error, 'Couldn’t request delivery. Please try again.')}</p>}
        </div>
      </article>)}
    </>}
  </main>;
}
