import { apiFetch } from '@/lib/api';

/**
 * Follow / unfollow a followable entity.
 *
 * Backend: `POST|DELETE /:followable_type/:followable_id/follow`
 * (constraint: `venues|artists|organizations`) — bearer required, so callers
 * must gate on auth before calling.
 */
export type FollowableType = 'venues' | 'artists' | 'organizations';

export interface FollowRecord { followable_type: string; followable_id: string }

export const followModel = { venues: 'Events::Venue', artists: 'Events::Artist', organizations: 'Organizations::Organization' };

export async function fetchFollowing(userId: string, signal?: AbortSignal): Promise<FollowRecord[]> {
  const rows: FollowRecord[] = [];
  for (let page = 1; ; page++) {
    const { data } = await apiFetch<FollowRecord[]>(`users/${encodeURIComponent(userId)}/following?page=${page}&per_page=100`, { signal });
    rows.push(...data);
    if (data.length < 100) return rows;
  }
}

export async function setEntityFollowing(type: FollowableType, id: string, following: boolean) {
  const { data } = await apiFetch<{ following: boolean; follower_count: number }>(
    `${type}/${encodeURIComponent(id)}/follow`, { method: following ? 'POST' : 'DELETE' },
  );
  return data;
}

export async function followEntity(type: FollowableType, id: string): Promise<void> {
  await apiFetch(`${type}/${id}/follow`, { method: 'POST' });
}

export async function unfollowEntity(type: FollowableType, id: string): Promise<void> {
  await apiFetch(`${type}/${id}/follow`, { method: 'DELETE' });
}
