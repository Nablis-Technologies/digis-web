export type NotificationType = 'ticket' | 'transfer' | 'price' | 'event' | 'promo';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  /**
   * Optional in-app destination (a hash-router path such as `/claim/abc123`).
   * When present the notification is clickable and navigates here.
   */
  link?: string;
  /**
   * Set only for an incoming transfer whose wire carries `data.transfer_id`:
   * the recipient can accept it in place (#61). Absent for every other
   * notification — they are informational.
   */
  acceptTransferId?: string;
}
