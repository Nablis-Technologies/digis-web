export const EVENT_IMAGES: Record<string, string> = {
  'Addis Vibes Festival': 'https://i.ibb.co/gFTD6tn1/photo-2026-04-28-19-04-04.jpg',
  'Ethiopian Coffee Culture Night': 'https://i.ibb.co/VYwP0TWp/photo-2026-04-28-19-03-53.jpg',
  'Tech Summit Ethiopia 2026': 'https://i.ibb.co/Q749zRbh/photo-2026-04-28-19-04-24.jpg',
  'Contemporary Art Exhibition': 'https://i.postimg.cc/KvmzwgJ1/photo-2026-04-28-19-39-12.jpg',
};

export function getEventImage(name: string, fallback?: string): string {
  return EVENT_IMAGES[name] ?? fallback ?? '';
}
