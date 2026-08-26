/** Where a seller's resale proceeds get paid out. */
export type PayoutMethodKind = 'telebirr' | 'cbe' | 'boa';

export interface PayoutMethod {
  id: string;
  kind: PayoutMethodKind;
  /** Account holder name as it appears at the bank / wallet. */
  holderName: string;
  /**
   * For Telebirr this is the phone number; for a bank (CBE / BoA) it's the
   * account number. Stored in full but only ever shown masked in the UI.
   */
  accountNumber: string;
  isDefault: boolean;
}

export interface AddPayoutMethodInput {
  kind: PayoutMethodKind;
  holderName: string;
  accountNumber: string;
}
