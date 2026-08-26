import type { CheckoutAnswers, CheckoutOrder, ContactDetails, CustomQuestion, PaymentMethod } from '@/types/checkout';
import { ticketsService } from '@/services/tickets.service';
import type { AppliedPromo } from '@/types/promo';

export type CheckoutOrderInput = {
  eventId?: string;
  ticketType: string;
  basePrice: number;
  quantity: number;
  addOns?: import('@/types/event').SelectedEventProduct[];
  seats?: import('@/types/event').SelectedSeat[];
  promoApplied: AppliedPromo | null;
  contactDetails: ContactDetails;
  answers: CheckoutAnswers;
  customQuestions?: CustomQuestion[];
  answerEditWindowHours?: number | null;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discountAmount: number;
  discountTotal: number;
  serviceFee: number;
  total: number;
};

export type CompletedCheckoutOrder = CheckoutOrder & {
  id: string;
  status: 'completed';
  completedAt: string;
};

const completedOrders: CompletedCheckoutOrder[] = [];
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const genOrderId = () => `order_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;

export const checkoutService = {
  createOrder(input: CheckoutOrderInput): CheckoutOrder {
    return {
      ...input,
      step: 'payment',
    };
  },

  async completeOrder(order: CheckoutOrder): Promise<CompletedCheckoutOrder> {
    await wait(2200);
    const completed: CompletedCheckoutOrder = {
      ...order,
      step: 'success',
      id: genOrderId(),
      status: 'completed',
      completedAt: new Date().toISOString(),
    };
    completedOrders.unshift(completed);
    ticketsService.issueTicketsForOrder(completed);
    return completed;
  },

  async fetchCompletedOrders(): Promise<CompletedCheckoutOrder[]> {
    return completedOrders;
  },
};

export const checkoutKeys = {
  completed: ['checkout', 'completed'] as const,
  detail: (id: string) => ['checkout', 'completed', id] as const,
};
