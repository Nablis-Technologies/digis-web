import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, UserPlus } from 'lucide-react';
import { AppButton } from '@/components/primitives/AppButton';
import { useAuth } from '@/features/auth/context/AuthContext';
import { fetchFollowing, followModel, setEntityFollowing, type FollowableType, type FollowRecord } from '@/lib/follows';
import { toastError, toastWarning } from '@/lib/feedback';
import { glassEdge } from '@/lib/ui/glass';

export function EntityFollowButton({ type, id, label, isDark, secondary = false, compact = false, onCountChange }: {
  type: FollowableType; id?: string; label: string; isDark: boolean; secondary?: boolean; compact?: boolean; onCountChange?: (count: number) => void;
}) {
  const { user, isAuthenticated } = useAuth();
  const client = useQueryClient();
  const key = ['following', user?.id];
  const follows = useQuery({ queryKey: key, queryFn: ({ signal }) => fetchFollowing(user!.id, signal), enabled: isAuthenticated && !!user?.id && !!id, retry: false });
  const following = follows.data?.some(row => row.followable_type === followModel[type] && row.followable_id === id) === true;
  const mutation = useMutation({
    mutationKey: ['follow', user?.id, type, id],
    mutationFn: (input: { userId: string; type: FollowableType; id: string; following: boolean }) => setEntityFollowing(input.type, input.id, input.following),
    onSuccess: (result, input) => {
      client.setQueryData<FollowRecord[]>(['following', input.userId], rows => {
        const remaining = (rows ?? []).filter(row => !(row.followable_type === followModel[input.type] && row.followable_id === input.id));
        return result.following ? [...remaining, { followable_type: followModel[input.type], followable_id: input.id }] : remaining;
      });
      onCountChange?.(result.follower_count);
    },
    onError: error => toastError(error, 'Couldn’t update your follow. Please try again.'),
  });
  const pending = useIsMutating({ mutationKey: ['follow', user?.id, type, id] }) > 0;
  if (!id) return null;
  const loading = isAuthenticated && follows.isPending;
  const caption = pending ? 'Updating…' : loading ? 'Loading follow…' : follows.isError ? 'Retry follow' : following ? 'Following' : label;
  const quiet = secondary || following;
  const style = { background: quiet ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)') : '#d6f905', color: quiet && isDark ? '#fff' : '#0a0a0a', ...(quiet ? glassEdge(isDark) : {}) };
  return <div className={compact ? "shrink-0" : "flex-1 min-w-0"}>
    <AppButton disabled={loading || pending} onClick={() => {
      if (!isAuthenticated) { toastWarning('Sign in to follow.'); return; }
      if (follows.isError) { void follows.refetch(); return; }
      if (follows.isSuccess && user?.id) mutation.mutate({ userId: user.id, type, id, following: !following });
    }} className={compact ? "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold" : "w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm"}
      style={compact && !quiet ? { ...glassEdge(isDark), background: isDark ? 'rgba(214,249,5,0.12)' : '#d6f905', color: isDark ? '#d6f905' : '#0a0a0a' } : style}>
      {following ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}{caption}
    </AppButton>
    {follows.isError && <p role="alert" className="text-xs mt-2">Couldn’t load your follow status.</p>}
  </div>;
}
