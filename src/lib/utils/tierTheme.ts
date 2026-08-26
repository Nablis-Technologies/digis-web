/**
 * Tier accent colors, kept in sync with the ticket-type cards on the event page
 * (see TicketTypeCard): emerald early-bird, rose couples, violet elite, gold VIP/
 * premium, blue standard. Tickets only carry the tier name as a string once
 * purchased/transferred, so we resolve the palette back from that name here.
 */
export interface TierTheme {
  /** "r,g,b" triplet for translucent backgrounds/borders. */
  rgb: string;
  /** Bright accent for dark surfaces. */
  bright: string;
  /** Deep, high-contrast "ink" accent for light surfaces. */
  ink: string;
  /** Premium tiers (VIP / Elite) show a sparkle and read as a headline tier. */
  premium: boolean;
}

export function tierTheme(ticketType?: string, ticketLevel?: string): TierTheme {
  const name = `${ticketType ?? ''} ${ticketLevel ?? ''}`.toLowerCase();

  if (name.includes('early'))
    return { rgb: '52,211,153', bright: '#34d399', ink: '#047857', premium: false };
  if (name.includes('couple'))
    return { rgb: '251,113,133', bright: '#fb7185', ink: '#be123c', premium: false };
  if (name.includes('elite'))
    return { rgb: '196,181,253', bright: '#c4b5fd', ink: '#6d28d9', premium: true };
  if (name.includes('vip') || name.includes('premium') || name.includes('platinum') || name.includes('gold'))
    return { rgb: '250,200,60', bright: '#fac83c', ink: '#9a6a00', premium: true };

  // Standard / general admission
  return { rgb: '96,165,250', bright: '#60a5fa', ink: '#1d4ed8', premium: false };
}
