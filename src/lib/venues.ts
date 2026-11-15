import { apiFetch } from '@/lib/api';

/** Public Events::Public::VenueDetailSerializer (`GET /venues/:id`).
 * Rails decimal coordinates are serialized as strings. */
export interface VenueDetail {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
  description?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  capacity?: number | null;
  follower_count?: number;
  amenities?: string[] | null;
  social_links?: Record<string, string> | null;
  profile_url?: string | null;
  gallery_urls?: { original: string; thumbnail?: string; medium?: string }[];
}

export async function fetchVenue(id: string, signal?: AbortSignal): Promise<VenueDetail> {
  const { data } = await apiFetch<VenueDetail>(`venues/${encodeURIComponent(id)}`, { signal });
  return data;
}

/** The venue serializer has no is_following; the authenticated following list
 * is the existing read contract. Explicit pages avoid its default 25-row cap. */
export async function fetchVenueFollowing(userId: string, venueId: string, signal?: AbortSignal): Promise<boolean> {
  for (let page = 1; ; page++) {
    const { data } = await apiFetch<{ followable_type: string; followable_id: string }[]>(
      `users/${encodeURIComponent(userId)}/following?page=${page}&per_page=100`, { signal },
    );
    if (data.some(f => f.followable_type === 'Events::Venue' && f.followable_id === venueId)) return true;
    if (data.length < 100) return false;
  }
}

export async function setVenueFollowing(id: string, following: boolean) {
  const { data } = await apiFetch<{ following: boolean; follower_count: number }>(
    `venues/${encodeURIComponent(id)}/follow`, { method: following ? 'POST' : 'DELETE' },
  );
  return data;
}
