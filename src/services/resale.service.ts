import { getEventImage } from '@/lib/utils/eventImages';
import type { ListForResaleResult, UserTicket } from '@/types/ticket';
import type { ResaleListing } from '@/types/resale';

const seedListings: ResaleListing[] = [
  {
    id: 'r1',
    eventName: 'Addis Vibes Festival',
    eventDate: 'March 15, 2026',
    eventTime: '8:00 PM',
    venue: 'Millennium Hall, Addis Ababa',
    ticketType: 'VIP',
    originalPrice: 3500,
    askingPrice: 4200,
    sellerRating: 4.8,
    sellerName: 'Abebe M.',
    listedAgo: '2h ago',
    image: getEventImage('Addis Vibes Festival'),
    verified: true,
  },
  {
    id: 'r2',
    eventName: 'Addis Vibes Festival',
    eventDate: 'March 15, 2026',
    eventTime: '8:00 PM',
    venue: 'Millennium Hall, Addis Ababa',
    ticketType: 'Regular',
    originalPrice: 2500,
    askingPrice: 2300,
    sellerRating: 4.6,
    sellerName: 'Hanna G.',
    listedAgo: '4h ago',
    image: getEventImage('Addis Vibes Festival'),
    verified: true,
  },
  {
    id: 'r3',
    eventName: 'Ethiopian Coffee Culture Night',
    eventDate: 'March 20, 2026',
    eventTime: '6:00 PM',
    venue: 'Sheraton Addis',
    ticketType: 'Regular',
    originalPrice: 1200,
    askingPrice: 950,
    sellerRating: 4.5,
    sellerName: 'Sara T.',
    listedAgo: '5h ago',
    image: getEventImage('Ethiopian Coffee Culture Night'),
    verified: true,
  },
  {
    id: 'r4',
    eventName: 'Contemporary Art Exhibition',
    eventDate: 'March 28, 2026',
    eventTime: '5:00 PM',
    venue: 'Addis Fine Art Gallery',
    ticketType: 'VIP',
    originalPrice: 800,
    askingPrice: 800,
    sellerRating: 4.9,
    sellerName: 'Daniel K.',
    listedAgo: '1d ago',
    image: getEventImage('Contemporary Art Exhibition'),
    verified: false,
  },
  {
    id: 'r5',
    eventName: 'Tech Summit Ethiopia 2026',
    eventDate: 'March 25, 2026',
    eventTime: '9:00 AM',
    venue: 'Hyatt Regency',
    ticketType: 'VIP',
    originalPrice: 3500,
    askingPrice: 3800,
    sellerRating: 4.7,
    sellerName: 'Mikael B.',
    listedAgo: '8h ago',
    image: getEventImage('Tech Summit Ethiopia 2026'),
    verified: true,
  },
];

const resaleListings = new Map<string, ResaleListing>(seedListings.map((listing) => [listing.id, listing]));
const genListingId = () => `my-${Date.now()}`;

export const resaleService = {
  initialListings: seedListings,

  async fetchListings(): Promise<ResaleListing[]> {
    return Array.from(resaleListings.values());
  },

  async createListing(ticket: UserTicket, askingPrice: number): Promise<ResaleListing> {
    const listing: ResaleListing = {
      id: genListingId(),
      eventName: ticket.eventName,
      eventDate: ticket.eventDate,
      eventTime: ticket.eventTime,
      venue: ticket.venue,
      ticketType: ticket.ticketType,
      originalPrice: askingPrice,
      askingPrice,
      sellerRating: 5,
      sellerName: 'You',
      listedAgo: 'just now',
      image: ticket.image || getEventImage(ticket.eventName),
      verified: true,
      ticket,
    };
    resaleListings.set(listing.id, listing);
    return listing;
  },

  async removeListing(listingId: string): Promise<{ success: true }> {
    resaleListings.delete(listingId);
    return { success: true };
  },

  async createTicketListingReference(ticketId: UserTicket['id'], price: number): Promise<ListForResaleResult> {
    const listingId = `listing_${Date.now()}`;
    return { ok: true, listingId };
  },
};

export const resaleKeys = {
  all: ['resale', 'listings'] as const,
  detail: (id: string) => ['resale', 'listings', id] as const,
};
