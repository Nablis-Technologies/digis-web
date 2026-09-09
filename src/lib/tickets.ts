import { getEventImage } from "@/lib/utils/eventImages";
import { EVENTS } from "@/lib/mock/events";
import { apiFetch } from "@/lib/api";
import { isoToDisplayDate, isoToDisplayTime } from "@/lib/mappers";
import { resaleModule } from "@/lib/resale";
import type { CheckoutAnswers } from "@/types/checkout";
import type {
  ListForResaleResult,
  TicketActionResult,
  UserTicket,
} from "@/types/ticket";

/**
 * Minimal shape issueTicketsForOrder needs. NOT the backend Order wire type —
 * this is the mock wallet side-effect input (ADR-0003: tickets are issued
 * server-side after payment; the frontend reads them from a future GET /tickets).
 */
export interface IssuableOrder {
  id: string;
  eventId?: string;
  ticketType: string;
  quantity: number;
  seats?: import("@/types/event").SelectedSeat[];
  addOns?: import("@/types/event").SelectedEventProduct[];
  answers?: CheckoutAnswers;
  customQuestions?: import("@/types/checkout").CustomQuestion[];
  answerEditWindowHours?: number | null;
  completedAt: string;
}

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
        unitPrice: 85000,
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
        unitPrice: 600000,
        quantity: 1,
      },
      {
        productId: "esk-valet",
        type: "parking",
        name: "Valet parking",
        unitPrice: 40000,
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
        unitPrice: 180000,
        quantity: 1,
      },
      {
        productId: "c2c-meals",
        type: "food",
        name: "Full board meal plan",
        unitPrice: 240000,
        quantity: 1,
      },
      {
        productId: "c2c-shuttle",
        type: "other",
        name: "Round-trip shuttle seat",
        unitPrice: 150000,
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
        unitPrice: 120000,
        quantity: 1,
      },
      {
        productId: "tse-lunch",
        type: "food",
        name: "Two-day lunch pass",
        unitPrice: 90000,
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
        unitPrice: 65000,
        quantity: 1,
      },
      {
        productId: "cae-fund",
        type: "donation",
        name: "Support emerging artists",
        unitPrice: 30000,
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

/**
 * Backend wire shape — Ticketing::TicketWalletSerializer (GET /tickets).
 * `qr_token` is only present for the caller's own ACTIVE tickets.
 */
export interface TicketWalletWire {
  id: string;
  status: string;
  unit_number: number;
  admissions_per_unit_snapshot: number;
  credential_mode: string;
  event: { id: string; slug: string; title: string; timezone: string; currency: string };
  product: { id: string; name: string; type: string };
  ticket_type: {
    id: string;
    admissions_per_unit: number;
    entry_validation_mode: string;
    resale_enabled?: boolean;
    resale_price_cap_type?: string | null;
    resale_fixed_cap_minor?: number | null;
    resale_fixed_cap_currency?: string | null;
    resale_percentage_cap_bps?: number | null;
    resale_cutoff_seconds_before_start?: number;
    max_completed_resales?: number;
  } | null;
  event_dates: {
    id: string;
    name: string | null;
    starts_at: string;
    ends_at: string | null;
    status: string;
    venue: { id: string; name: string; city: string } | null;
  }[];
  admission_slots: { id: string; position: number; assignment_status: string }[];
  credentials: {
    id: string;
    admission_slot_id: string | null;
    entry_limit: number | null;
    status: string;
    issued_at: string;
    lookup_code: string | null;
    qr_token: string | null;
  }[];
  /** Purchased extras projected from the ticket's order (sibling order items
   *  whose type != ticket) — #29 resolved 2026-09-08. */
  add_ons?: {
    id: string;
    name: string;
    type: string;
    quantity: number;
    unit_amount_minor: number;
  }[];
}

/** Map the wallet wire projection onto the UI's UserTicket shape. */
export function mapWalletTicket(w: TicketWalletWire): UserTicket {
  const firstCredential = w.credentials[0];
  const firstDate = w.event_dates[0];
  const tt = w.ticket_type;
  return {
    id: w.id,
    eventId: w.event.id,
    eventSlug: w.event.slug,
    eventName: w.event.title,
    eventDate: isoToDisplayDate(firstDate?.starts_at),
    eventTime: isoToDisplayTime(firstDate?.starts_at),
    eventStartsAt: firstDate?.starts_at,
    venue: firstDate?.venue?.name ?? "",
    ticketType: w.product.name,
    status: w.status,
    // QR secret is delivered only for active tickets — never render a fake code.
    qrCode: w.status === "active" ? (firstCredential?.qr_token ?? "") : "",
    purchased: isoToDisplayDate(firstCredential?.issued_at ?? firstDate?.starts_at),
    // Purchased extras projected onto the wallet ticket (#29 resolved).
    ...(w.add_ons?.length
      ? {
          addOns: w.add_ons.map((a) => ({
            productId: a.id,
            type: (a.type as import("@/types/event").SelectedEventProduct["type"]) ?? "other",
            name: a.name,
            unitPrice: a.unit_amount_minor,
            quantity: a.quantity,
          })),
        }
      : {}),
    // Resale policy arrives on the wallet ticket_type projection (#25 resolved);
    // absent policy renders as not-resaleable rather than assumed open.
    ...(tt && typeof tt.resale_enabled === "boolean"
      ? {
          resalePolicy: {
            enabled: tt.resale_enabled,
            capType: (tt.resale_price_cap_type as 'none' | 'percentage' | 'fixed' | null) ?? null,
            fixedCapMinor: tt.resale_fixed_cap_minor ?? null,
            fixedCapCurrency: tt.resale_fixed_cap_currency ?? null,
            percentageCapBps: tt.resale_percentage_cap_bps ?? null,
            cutoffSecondsBeforeStart: tt.resale_cutoff_seconds_before_start ?? 0,
            maxCompletedResales: tt.max_completed_resales ?? 0,
          },
        }
      : {}),
  };
}

export const ticketsService = {
  /**
   * Reset the store to its seed state — mirrors the backend's wipable,
   * re-seedable Postgres state. Tests and dev reloads call this for a clean slate.
   */
  resetToSeed(): void {
    userTickets.length = 0;
    userTickets.push(...MOCK_USER_TICKETS.map((t) => ({ ...t, addOns: t.addOns ? [...t.addOns] : undefined })));
  },

  /**
   * GET /tickets — the real owner wallet (Ticketing::TicketsController#index,
   * TicketWalletSerializer). This replaces the mock read path (ADR-0003): the
   * wallet now renders exactly what the backend says the user owns — an empty
   * list until tickets are actually issued. Unauthenticated callers surface as
   * an empty wallet (401 → the router's `= []` default).
   *
   * The wallet wire carries no artwork, so each distinct event's cover is
   * resolved via the public detail endpoint (one request per event, settled —
   * a failure falls back to the local name-matched image, never a blank).
   */
  async fetchUserTickets(): Promise<UserTicket[]> {
    const { data } = await apiFetch<TicketWalletWire[]>("tickets");
    const wires = (data ?? []).filter((w) => w.product.type === "ticket");
    // Only event tickets belong in "My Tickets". Parking passes are separate
    // credentialable units the backend mints for parking order items — they are
    // already projected as extras on the parent ticket (`add_ons`), so a parking
    // wire must not render as a second event-ticket card.
    const tickets = wires.map(mapWalletTicket);
    const slugs = [...new Set(wires.map((w) => w.event.slug).filter(Boolean))];
    if (slugs.length > 0) {
      const { eventsModule } = await import("@/lib/events");
      const covers = await Promise.allSettled(
        slugs.map(async (slug) => ({ slug, event: await eventsModule.fetchById(slug) })),
      );
      const bySlug = new Map<string, string>();
      covers.forEach((r) => {
        if (r.status === "fulfilled" && r.value.event?.image) bySlug.set(r.value.slug, r.value.event.image);
      });
      tickets.forEach((t, i) => {
        const slug = wires[i]?.event.slug;
        const cover = (slug && bySlug.get(slug)) || getEventImage(wires[i]?.event.title ?? "") || undefined;
        if (cover) t.image = cover;
      });
    }
    return tickets;
  },

  /** MOCK wallet side-effect (ADR-0003): mirror the tickets the backend issues
   *  after payment. Deleted at Phase 3 when GET /tickets lands. */
  issueTicketsForOrder(
    order: IssuableOrder,
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
    return resaleModule.createTicketListingReference(
      ticketId,
      price,
    );
  },
};

export const ticketKeys = {
  userTickets: ["tickets", "user"] as const,
};