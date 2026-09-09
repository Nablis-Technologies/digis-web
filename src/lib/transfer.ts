import { apiFetch } from '@/lib/api';
import { mapWalletTicket, type TicketWalletWire } from '@/lib/tickets';
import { getEventImage } from '@/lib/utils/eventImages';
import type { UserTicket } from '@/types/ticket';

export type TransferStatus = 'pending' | 'accepted' | 'expired' | 'declined' | 'cancelled';

/** Recipient-safe landing projection — Ticketing::PublicTicketTransferSerializer. */
export interface PublicTransferWire {
  id: string;
  status: string;
  expires_at: string;
  event: { id: string; slug: string; title: string; timezone: string; currency: string };
  ticket: {
    id: string;
    status: string;
    unit_number: number;
    product: { id: string; name: string; type: string };
  };
  recipient: { phone: string; email_present: boolean };
}

export interface PublicTransfer {
  id: string;
  status: TransferStatus;
  expiresAt: string;
  event: { id: string; slug: string; title: string; timezone: string; currency: string };
  ticket: { id: string; status: string; unitNumber: number; product: { id: string; name: string; type: string } };
  recipient: { phone: string; emailPresent: boolean };
  /** Cover resolved the same way the wallet does (public detail → local fallback). */
  image?: string;
}

export interface InitiateTransferInput {
  ticketId: string;
  phone: string;
  note?: string;
}

export interface InitiateTransferResult {
  transferId: string;
  /** The secret the recipient must present to land + accept — goes in the claim link. */
  token: string;
}

export interface AcceptedTransfer {
  /** The claimed ticket (PublicTicketViewSerializer → wallet mapping, incl. QR). */
  ticket: UserTicket;
  /** Backend-signed public ticket view URL — durable cross-device fallback. */
  ticketViewUrl: string;
  user: { id: string } | null;
  accessToken?: string;
  refreshToken?: string;
}

/** The shareable claim route for a live transfer: `/claim/:id?token=<secret>`. */
export function buildClaimLink(transferId: string, token: string): string {
  const params = new URLSearchParams({ token });
  return `/claim/${transferId}?${params.toString()}`;
}

async function resolveTransferImage(slug: string | undefined, title: string): Promise<string | undefined> {
  if (slug) {
    try {
      const { eventsModule } = await import('@/lib/events');
      const event = await eventsModule.fetchById(slug);
      if (event?.image) return event.image;
    } catch {
      /* fall through to the local name-matched cover */
    }
  }
  return getEventImage(title) || undefined;
}

export const transferService = {
  /**
   * POST /tickets/:ticket_id/transfers (authenticated). Opens a pending package
   * transfer bound to the recipient phone; returns the transfer id + the bearer
   * secret the sender shares. Ownership only changes when the recipient accepts
   * with a phone OTP.
   */
  async initiate(input: InitiateTransferInput): Promise<InitiateTransferResult> {
    const { data } = await apiFetch<{ transfer: { id: string }; token: string }>(
      `tickets/${input.ticketId}/transfers`,
      {
        method: 'POST',
        body: {
          phone: input.phone,
          ...(input.note ? { reason: input.note } : {}),
        },
      },
    );
    return { transferId: data.transfer.id, token: data.token };
  },

  /**
   * GET /public/ticket_transfers/:id?token= — recipient-safe landing. 404
   * `invalid_transfer` for a wrong/expired token.
   */
  async fetchPublic(id: string, token: string): Promise<PublicTransfer> {
    const { data } = await apiFetch<PublicTransferWire>(
      `public/ticket_transfers/${id}?token=${encodeURIComponent(token)}`,
    );
    const mapped: PublicTransfer = {
      id: data.id,
      status: data.status as TransferStatus,
      expiresAt: data.expires_at,
      event: data.event,
      ticket: {
        id: data.ticket.id,
        status: data.ticket.status,
        unitNumber: data.ticket.unit_number,
        product: data.ticket.product,
      },
      recipient: { phone: data.recipient.phone, emailPresent: data.recipient.email_present },
    };
    mapped.image = await resolveTransferImage(data.event.slug, data.event.title);
    return mapped;
  },

  /**
   * POST /public/ticket_transfers/:id/request_otp — sends a transfer-scoped OTP
   * to the recipient phone (purpose `ticket_transfer`). Returns the challenge
   * to verify against.
   */
  async requestOtp(id: string, token: string, phone: string): Promise<{ challengeId: string; expiresAt: string }> {
    const { data } = await apiFetch<{ challenge_id: string; expires_at: string }>(
      `public/ticket_transfers/${id}/request_otp`,
      { method: 'POST', body: { phone, token } },
    );
    return { challengeId: data.challenge_id, expiresAt: data.expires_at };
  },

  /**
   * POST /phone_verifications/:challenge_id/verify — trades the OTP code for a
   * short-lived signed proof the accept step requires.
   */
  async verifyOtp(challengeId: string, code: string): Promise<{ verificationToken: string }> {
    const { data } = await apiFetch<{ verification_token: string }>(
      `phone_verifications/${challengeId}/verify`,
      { method: 'POST', body: { code } },
    );
    return { verificationToken: data.verification_token };
  },

  /**
   * POST /public/ticket_transfers/:id/accept_guest — claims the ticket into the
   * recipient's (shadow) identity, rotates the credential generation, and
   * returns the wallet-shaped ticket + a signed public view URL.
   */
  async accept(input: {
    id: string;
    token: string;
    phone: string;
    verificationToken: string;
    password?: string;
    passwordConfirmation?: string;
  }): Promise<AcceptedTransfer> {
    const { data } = await apiFetch<{
      ticket: TicketWalletWire;
      ticket_view_url: string;
      user?: { id: string } | null;
      access_token?: string;
      refresh_token?: string;
    }>(`public/ticket_transfers/${input.id}/accept_guest`, {
      method: 'POST',
      body: {
        token: input.token,
        phone: input.phone,
        verification_token: input.verificationToken,
        ...(input.password
          ? { password: input.password, password_confirmation: input.passwordConfirmation ?? input.password }
          : {}),
      },
    });
    return {
      ticket: mapWalletTicket(data.ticket),
      ticketViewUrl: data.ticket_view_url,
      user: data.user ?? null,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  },
};