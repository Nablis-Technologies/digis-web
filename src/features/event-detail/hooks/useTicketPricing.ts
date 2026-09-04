import type { Event, TicketTier } from "@/types";

export function useTicketPricing({
  ticketTypes,
  selectedTicketType,
  event,
  isDark,
}: {
  ticketTypes: TicketTier[];
  selectedTicketType: string | null;
  event: Event;
  isDark: boolean;
}) {
  const selectedTicket = selectedTicketType
    ? ticketTypes.find((t) => t.name === selectedTicketType) ?? null
    : null;
  const basePrice = selectedTicket?.priceMinor || 0;
  const totalPrice = basePrice;
  const minPrice = Math.min(...ticketTypes.map((t) => t.priceMinor));
  const isSoldOut = event.ticketsLeft === 0 || ticketTypes.every((t) => t.available === 0);
  const selectedTicketAccentRgb = selectedTicket?.isEarlyBird
    ? '52, 211, 153'
    : selectedTicket?.isCouples
      ? '251, 113, 133'
      : selectedTicket?.isElite
        ? '196, 181, 253'
        : selectedTicket?.isPremium
          ? '250, 200, 60'
          : '96, 165, 250';
  const selectedTicketAccentInk = selectedTicket?.isEarlyBird
    ? '4, 120, 87'
    : selectedTicket?.isCouples
      ? '190, 18, 60'
      : selectedTicket?.isElite
        ? '109, 40, 217'
        : selectedTicket?.isPremium
          ? '154, 106, 0'
          : '29, 78, 216';
  const selectedTicketAccentReadable = isDark ? selectedTicketAccentRgb : selectedTicketAccentInk;
  return { selectedTicket, basePrice, totalPrice, minPrice, isSoldOut, selectedTicketAccentRgb, selectedTicketAccentInk, selectedTicketAccentReadable };
}
