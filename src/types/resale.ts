import type { UserTicket } from './ticket';

export interface ResaleListing {
  id: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  ticketType: string;
  originalPrice: number;
  askingPrice: number;
  sellerRating: number;
  sellerName: string;
  listedAgo: string;
  image: string;
  verified: boolean;
  ticket?: UserTicket;
}
