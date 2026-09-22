import { apiFetch } from '@/lib/api';

/** Public event category (GET /categories → { id, name, slug }). */
export interface EventCategory {
  id: string;
  name: string;
  slug: string;
}

export async function fetchCategories(): Promise<EventCategory[]> {
  const { data } = await apiFetch<EventCategory[]>('categories');
  return Array.isArray(data) ? data : [];
}

export const categoryKeys = {
  all: ['categories'] as const,
};
