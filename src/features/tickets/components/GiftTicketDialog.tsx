import { TransferTicket } from '@/features/tickets/components/TransferTicketDialog';

interface GiftTicketProps {
  ticket: {
    eventName: string;
    eventDate: string;
    venue: string;
    ticketType: string;
    image?: string;
  };
  /** Retained for event-level callers; gift extras are selected in checkout. */
  extras?: { id: string; name: string; description: string; price: number }[];
  onClose: () => void;
  onSend: () => void;
}

/**
 * Gift delivery deliberately reuses the transfer sheet rather than opening a
 * separate gift experience. The shared recipient, message, review and secure
 * link steps keep both ways of sending a ticket familiar.
 */
export function GiftTicket({ ticket, extras, onClose }: GiftTicketProps) {
  return (
    <TransferTicket
      mode="gift"
      ticket={ticket}
      giftExtras={extras}
      onClose={onClose}
      onTransfer={({ recipientName }) => ({
        shareLink: `${window.location.origin}${window.location.pathname}#gift/${encodeURIComponent(ticket.eventName)}?to=${encodeURIComponent(recipientName)}`,
        recipientHasAccount: false,
      })}
    />
  );
}
