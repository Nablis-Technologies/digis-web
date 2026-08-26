import cbeLogo from '@/assets/provider-logos/cbe.png';
import boaLogo from '@/assets/provider-logos/boa.png';
import telebirrLogo from '@/assets/provider-logos/telebirr.png';
import type { PayoutMethodKind } from '@/types';

const PROVIDER_LOGOS: Record<PayoutMethodKind, { src: string; alt: string }> = {
  telebirr: { src: telebirrLogo, alt: 'Telebirr' },
  cbe: { src: cbeLogo, alt: 'Commercial Bank of Ethiopia' },
  boa: { src: boaLogo, alt: 'Bank of Abyssinia' },
};

/** Official provider logo assets shared by payment and payout surfaces. */
export function ProviderLogo({ kind, size = 40 }: { kind: PayoutMethodKind; size?: number }) {
  const logo = PROVIDER_LOGOS[kind];
  return (
    <div
      className="rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: '#ffffff' }}
    >
      <img src={logo.src} alt={logo.alt} className="w-[72%] h-[72%] object-contain" />
    </div>
  );
}
