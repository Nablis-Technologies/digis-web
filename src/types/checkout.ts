import type { AppliedPromo } from './promo';
import type { SelectedEventProduct, SelectedSeat } from './event';

export type CustomQuestion = {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox';
  label: string;
  helper?: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  maxLength?: number;
};

export type CheckoutStep = 'seat' | 'date' | 'review' | 'extras' | 'details' | 'questions' | 'payment' | 'otp' | 'processing' | 'pending' | 'success';
export type PaymentMethod = 'telebirr' | 'cbebirr' | 'card';

export interface ContactDetails {
  name: string;
  email: string;
  phone: string;
  contactMethod: 'email' | 'phone';
}

export type CheckoutAnswers = Record<string, unknown>;

/** Organizer-controlled period after purchase during which responses can be changed. */
export type AnswerEditWindowHours = number | null;

export interface CheckoutOrder {
  eventId?: string;
  ticketType: string;
  basePrice: number;
  quantity: number;
  addOns?: SelectedEventProduct[];
  /** Assigned seats, when the event uses a seat map. Length matches quantity. */
  seats?: SelectedSeat[];
  promoApplied: AppliedPromo | null;
  contactDetails: ContactDetails;
  answers: CheckoutAnswers;
  customQuestions?: CustomQuestion[];
  answerEditWindowHours?: AnswerEditWindowHours;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discountAmount: number;
  discountTotal: number;
  serviceFee: number;
  total: number;
  step: CheckoutStep;
}
