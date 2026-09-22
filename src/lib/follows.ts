import { apiFetch } from '@/lib/api';

/**
 * Follow / unfollow a followable entity.
 *
 * Backend: `POST|DELETE /:followable_type/:followable_id/follow`
 * (constraint: `venues|artists|organizations`) — bearer required, so callers
 * must gate on auth before calling.
 */
export type FollowableType = 'venues' | 'artists' | 'organizations';

export async function followEntity(type: FollowableType, id: string): Promise<void> {
  await apiFetch(`${type}/${id}/follow`, { method: 'POST' });
}

export async function unfollowEntity(type: FollowableType, id: string): Promise<void> {
  await apiFetch(`${type}/${id}/follow`, { method: 'DELETE' });
}
