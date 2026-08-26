import { getEventImage } from "@/lib/utils/eventImages";
import { EVENTS } from "@/lib/mock/events";
import { resaleService } from "@/services/resale.service";
import type { CompletedCheckoutOrder } from "@/services/checkout.service";
import type { CheckoutAnswers } from "@/types/checkout";
import type {
  ListForResaleResult,
  TicketActionResult,
  UserTicket,
} from "@/types/ticket";

/** Mock fixtures are dated relative to today so the Upcoming tab is never empty. */
const inDays = (days: number) =>
  new Date(Date.now() + days * 86400000).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" },
  );
const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86400000).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );

/**
 * Mock ticket store. The API adapter can replace this implementation without changing
 * checkout or ticket UI callers.
 */
const MOCK_USER_TICKETS: UserTicket[] = [
  {
    id: "0",
    eventId: "1",
    eventName: "Ethio Jsssazz Night",
    eventDate: inDays(0),
    eventTime: "9:00 PM",
    venue: "Hyatt Regency, Addis Ababa",
    ticketType: "VIP Gold Access",
    ticketLevel: "PREMIUM",
    qrCode: "TICKET-TEST-TODAY",
    gradient: "from-yellow-400 via-amber-500 to-orange-600",
    purchased: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    image:
      getEventImage("Ethio Jazz Night") ||
      getEventImage("Addis Vibes Festival"),
  },
  {
    id: "1",
    eventId: "1",
    eventName: "Addis Vibes Festival",
    eventDate: inDays(5),
    eventTime: "8:00 PM",
    venue: "Millennium Hall, Addis Ababa",
    ticketType: "VIP",
    qrCode: "TICKET-VIP-001",
    gradient: "from-yellow-500 via-pink-600 to-orange-500",
    purchased: daysAgo(18),
    image: getEventImage("Addis Vibes Festival"),
    customQuestions: [
      {
        id: "tshirt",
        type: "select",
        label: "T-shirt size",
        required: true,
        placeholder: "Choose a size",
        options: ["XS", "S", "M", "L", "XL", "XXL"],
      },
      {
        id: "diet",
        type: "checkbox",
        label: "Dietary preferences",
        helper: "Select all that apply",
        options: [
          "Vegetarian",
          "Vegan",
          "Gluten-free",
          "Halal",
          "No preference",
        ],
      },
      {
        id: "arrival",
        type: "select",
        label: "How are you arriving?",
        required: true,
        placeholder: "Select an option",
        options: [
          "Driving",
          "Rideshare / Taxi",
          "Public transport",
          "Walking",
        ],
      },
      {
        id: "notes",
        type: "textarea",
        label: "Anything the organizer should know?",
        placeholder:
          "Accessibility needs, plus-ones, requests…",
        maxLength: 240,
      },
    ],
    answers: {
      tshirt: "M",
      diet: ["Halal"],
      arrival: "Rideshare / Taxi",
      notes: "",
    },
    // This seeded ticket lets the edit flow be tested immediately in My Tickets.
    answersEditableUntil: new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ).toISOString(),
    // Seeded extras so the "Your extras" view is populated immediately.
    addOns: [
      {
        productId: "av-parking",
        type: "parking",
        name: "Reserved parking",
        unitPrice: 0,
        quantity: 1,
      },
      {
        productId: "av-tee",
        type: "merchandise",
        name: "Festival tee",
        unitPrice: 850,
        quantity: 2,
      },
    ],
  },
  {
    id: "2",
    eventId: "2",
    eventName: "Ethiopian Coffee Culture Night",
    eventDate: "March 20, 2026",
    eventTime: "6:00 PM",
    venue: "Sheraton Addis",
    ticketType: "Regular",
    qrCode: "TICKET-REG-002",
    gradient: "from-yellow-500 via-orange-600 to-red-500",
    purchased: "Feb 18, 2026",
    image: getEventImage("Ethiopian Coffee Culture Night"),
  },
  {
    id: "3",
    eventId: "8",
    eventName: "Monkey Business",
    eventDate: inDays(2),
    eventTime: "5:00 PM",
    venue: "Juventus Garden, Addis Ababa",
    ticketType: "Early Bird",
    ticketLevel: "STANDARD",
    qrCode: "TICKET-MB-1042",
    gradient: "from-lime-400 via-emerald-500 to-teal-600",
    purchased: daysAgo(26),
    image: "https://pazimo.com/uploads/1781125113695.JPG",
  },
  {
    id: "4",
    eventId: "9",
    eventName: "ESKSTA",
    eventDate: inDays(9),
    eventTime: "7:00 PM",
    venue: "Elmos Hotel, Addis Ababa",
    ticketType: "VIP",
    ticketLevel: "PREMIUM",
    qrCode: "TICKET-ESK-0777",
    gradient: "from-purple-500 via-fuchsia-600 to-rose-500",
    purchased: daysAgo(12),
    image: "https://pazimo.com/uploads/1780775874215.jpg",
    addOns: [
      {
        productId: "esk-table",
        type: "other",
        name: "Table service · 4 seats",
        unitPrice: 6000,
        quantity: 1,
      },
      {
        productId: "esk-valet",
        type: "parking",
        name: "Valet parking",
        unitPrice: 400,
        quantity: 1,
      },
    ],
  },
  {
    id: "5",
    eventId: "11",
    eventName: "Camping to Coast Vol 6",
    eventDate: inDays(21),
    eventTime: "9:00 AM",
    venue: "Langano Abijata Shala",
    ticketType: "Full Weekend Pass",
    ticketLevel: "PREMIUM",
    qrCode: "TICKET-C2C-3319",
    gradient: "from-cyan-400 via-sky-500 to-indigo-600",
    purchased: daysAgo(40),
    image: "https://pazimo.com/uploads/1780182419540.jpg",
    customQuestions: [
      {
        id: "transport",
        type: "select",
        label: "Transport from Addis?",
        required: true,
        placeholder: "Select an option",
        options: [
          "Bus with the group",
          "Own car",
          "Meeting you there",
        ],
      },
      {
        id: "tent",
        type: "select",
        label: "Tent",
        required: true,
        placeholder: "Choose one",
        options: [
          "Bringing my own",
          "Rent on site",
          "Sharing with a friend",
        ],
      },
      {
        id: "diet",
        type: "checkbox",
        label: "Dietary preferences",
        helper: "Select all that apply",
        options: [
          "Vegetarian",
          "Vegan",
          "Fasting",
          "No preference",
        ],
      },
      {
        id: "emergency",
        type: "text",
        label: "Emergency contact",
        placeholder: "Name and phone number",
      },
    ],
    answers: {
      transport: "Bus with the group",
      tent: "Rent on site",
      diet: ["Fasting"],
      emergency: "Selam T. · 0911 234 567",
    },
    answersEditableUntil: new Date(
      Date.now() + 7 * 86400000,
    ).toISOString(),
    addOns: [
      {
        productId: "c2c-tent",
        type: "other",
        name: "Two-person tent rental",
        unitPrice: 1800,
        quantity: 1,
      },
      {
        productId: "c2c-meals",
        type: "food",
        name: "Full board meal plan",
        unitPrice: 2400,
        quantity: 1,
      },
      {
        productId: "c2c-shuttle",
        type: "other",
        name: "Round-trip shuttle seat",
        unitPrice: 1500,
        quantity: 2,
      },
    ],
  },
  {
    id: "6",
    eventId: "3",
    eventName: "Tech Summit Ethiopia 2026",
    eventDate: inDays(34),
    eventTime: "9:00 AM",
    venue: "Hyatt Regency, Addis Ababa",
    ticketType: "Conference Pass",
    ticketLevel: "STANDARD",
    qrCode: "TICKET-TSE-2026-0158",
    gradient: "from-cyan-500 via-blue-600 to-indigo-700",
    purchased: daysAgo(5),
    image: getEventImage("Tech Summit Ethiopia 2026"),
    addOns: [
      {
        productId: "tse-workshop",
        type: "digital_addon",
        name: "Workshop track access",
        unitPrice: 1200,
        quantity: 1,
      },
      {
        productId: "tse-lunch",
        type: "food",
        name: "Two-day lunch pass",
        unitPrice: 900,
        quantity: 1,
      },
    ],
  },
  {
    id: "7",
    eventId: "4",
    eventName: "Contemporary Art Exhibition",
    eventDate: inDays(52),
    eventTime: "5:00 PM",
    venue: "Addis Fine Art Gallery",
    ticketType: "Regular",
    qrCode: "TICKET-CAE-0904",
    gradient: "from-violet-500 via-purple-600 to-fuchsia-600",
    purchased: daysAgo(2),
    image: getEventImage("Contemporary Art Exhibition"),
    addOns: [
      {
        productId: "cae-catalogue",
        type: "merchandise",
        name: "Printed exhibition catalogue",
        unitPrice: 650,
        quantity: 1,
      },
      {
        productId: "cae-fund",
        type: "donation",
        name: "Support emerging artists",
        unitPrice: 300,
        quantity: 1,
      },
    ],
  },
];

const userTickets = [...MOCK_USER_TICKETS];
const ticketId = () =>
  `ticket_${Date.now()}_${Math.floor(Math.random() * 1e4)}`;
const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function editDeadline(
  completedAt: string,
  hours?: number | null,
) {
  if (!hours || hours <= 0) return undefined;
  return new Date(
    Date.parse(completedAt) + hours * 60 * 60 * 1000,
  ).toISOString();
}

export const ticketsService = {
  async fetchUserTickets(): Promise<UserTicket[]> {
    return userTickets;
  },

  /** Called only after a successful payment; one ticket is created per purchased quantity. */
  issueTicketsForOrder(
    order: CompletedCheckoutOrder,
  ): UserTicket[] {
    const slug = (name: string) =>
      name
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    const event = EVENTS.find(
      (item) =>
        item.id === order.eventId ||
        slug(item.name) === order.eventId,
    );
    if (!event) return [];
    const addOns = order.addOns ?? [];
    const seats = order.seats ?? [];
    const created = Array.from(
      { length: order.quantity },
      (_, index) => {
        const seat = seats[index];
        return {
          id: ticketId(),
          eventId: event.id,
          eventName: event.name,
          eventDate: event.date,
          eventTime: event.time,
          venue: event.venue,
          ticketType: order.ticketType,
          qrCode: `DIGIS-${order.id}-${index + 1}`,
          gradient: "from-lime-400 via-lime-500 to-emerald-500",
          purchased: new Date(
            order.completedAt,
          ).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          image: event.image,
          customQuestions: order.customQuestions,
          answers: order.answers,
          answersEditableUntil: editDeadline(
            order.completedAt,
            order.answerEditWindowHours,
          ),
          // Extras belong to the order — attach them to the primary ticket so they surface in its detail view.
          addOns:
            index === 0 && addOns.length ? addOns : undefined,
          // Each assigned seat maps 1:1 to a generated ticket.
          seat: seat
            ? `${seat.section} · ${seat.row}${seat.seat}`
            : undefined,
        } satisfies UserTicket;
      },
    );
    userTickets.unshift(...created);
    return created;
  },

  /** Add a ticket received via a transfer/claim link into the current wallet. */
  addReceivedTicket(input: {
    id?: string;
    eventId?: string;
    eventName: string;
    eventDate: string;
    eventTime?: string;
    venue: string;
    ticketType: string;
    ticketLevel?: string;
    image?: string;
    seat?: string;
    qrCode?: string;
  }): UserTicket {
    const ticket: UserTicket = {
      id: ticketId(),
      eventId: input.eventId,
      eventName: input.eventName,
      eventDate: input.eventDate,
      eventTime: input.eventTime ?? "",
      venue: input.venue,
      ticketType: input.ticketType,
      ticketLevel: input.ticketLevel,
      qrCode: input.qrCode ?? `DIGIS-TRANSFER-${Date.now()}`,
      gradient: "from-lime-400 via-lime-500 to-emerald-500",
      purchased: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      image: input.image,
      seat: input.seat,
    };
    userTickets.unshift(ticket);
    return ticket;
  },

  /** Buy additional extras against an already-purchased ticket. */
  async purchaseTicketExtras(
    ticketId: string,
    items: import("@/types/event").SelectedEventProduct[],
  ): Promise<UserTicket> {
    await wait(1400);
    const ticket = userTickets.find(
      (item) => item.id === ticketId,
    );
    if (!ticket) throw new Error("Ticket not found.");
    const merged = (ticket.addOns ?? []).map((a) => ({ ...a }));
    items.forEach((item) => {
      if (item.quantity <= 0) return;
      const existing = merged.find(
        (a) => a.productId === item.productId,
      );
      if (existing) existing.quantity += item.quantity;
      else merged.push({ ...item });
    });
    ticket.addOns = merged;
    return ticket;
  },

  async updateTicketAnswers(
    ticketId: string,
    answers: CheckoutAnswers,
  ): Promise<UserTicket> {
    const ticket = userTickets.find(
      (item) => item.id === ticketId,
    );
    if (!ticket) throw new Error("Ticket not found.");
    if (
      !ticket.customQuestions?.length ||
      !ticket.answersEditableUntil
    )
      throw new Error(
        "This organizer did not enable answer edits.",
      );
    if (Date.parse(ticket.answersEditableUntil) <= Date.now())
      throw new Error(
        "The organizer’s answer-edit window has closed.",
      );
    ticket.answers = answers;
    return ticket;
  },

  async transferTicket(
    _ticketId: UserTicket["id"],
    _recipient: string,
  ): Promise<TicketActionResult> {
    return { ok: true };
  },
  async listForResale(
    ticketId: UserTicket["id"],
    price: number,
  ): Promise<ListForResaleResult> {
    return resaleService.createTicketListingReference(
      ticketId,
      price,
    );
  },
};

export const ticketKeys = {
  userTickets: ["tickets", "user"] as const,
};