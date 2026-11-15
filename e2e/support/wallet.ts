import type { TicketWalletWire } from '../../src/lib/tickets';

export const ACTIVE_TICKET: TicketWalletWire = {
  id: 'older-ticket', status: 'active', unit_number: 1, admissions_per_unit_snapshot: 1, credential_mode: 'group',
  event: { id: 'event-one', slug: 'test-event', title: 'Earlier Purchase', timezone: 'Africa/Addis_Ababa', currency: 'ETB' },
  product: { id: 'product-one', name: 'General Admission', type: 'ticket' }, ticket_type: null,
  event_dates: [{ id: 'date-one', name: null, starts_at: '2030-12-31T18:00:00Z', ends_at: null, status: 'scheduled', venue: null }],
  admission_slots: [],
  credentials: [{ id: 'credential-one', admission_slot_id: null, entry_limit: 1, status: 'active', issued_at: '2026-10-01T10:00:00Z', lookup_code: 'LOOKUP-ONE', qr_token: 'digis:v1:server-issued-test-credential' }],
};
