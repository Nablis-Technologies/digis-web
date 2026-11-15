import { apiFetch } from '@/lib/api';

/**
 * Public organization profile — `GET /organizations/:id`. Exposes the fields the
 * event payload's summary omits (description, follower/event counts, socials,
 * and `is_following` for a signed-in caller).
 */
export interface OrganizationProfile {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  social_links?: Record<string, string> | null;
  organizer_type?: string | null;
  category?: string | null;
  city?: string | null;
  region?: string | null;
  events_count?: number;
  follower_count?: number;
  verified?: boolean;
  is_following?: boolean;
}

export async function fetchOrganizationProfile(id: string): Promise<OrganizationProfile> {
  const { data } = await apiFetch<OrganizationProfile>(`organizations/${id}`);
  return data;
}
