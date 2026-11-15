import { Globe } from 'lucide-react';
import Instagram from '@thesvg/react/instagram';
import YouTube from '@thesvg/react/youtube';
import TikTokBadge from '@thesvg/react/tiktok-badge';
import Spotify from '@thesvg/react/spotify';
import AppleMusic from '@thesvg/react/apple-music';
import SoundCloud from '@thesvg/react/soundcloud';

type BrandIconProps = { isDark?: boolean; className?: string };

const SIZE = 'w-[22px] h-[22px]';

/** Official brand logos from theSVG (`@thesvg/react`), imported per icon so the bundle stays small. */
export function BrandWebsite({ isDark, className }: BrandIconProps) {
  return <Globe className={className ?? SIZE} strokeWidth={1.75} style={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(20,18,40,0.85)' }} />;
}
export function BrandInstagram({ className }: BrandIconProps) { return <Instagram className={className ?? SIZE} />; }
export function BrandYouTube({ className }: BrandIconProps) { return <YouTube className={className ?? SIZE} />; }
export function BrandTikTok({ isDark, className }: BrandIconProps) { return <TikTokBadge className={className ?? SIZE} color={isDark ? '#ffffff' : '#000'} />; }
/** Black disc behind the logo so the sound bars read as black, not see-through. */
export function BrandSpotify({ className }: BrandIconProps) {
  return (
    <span className={`${className ?? SIZE} relative inline-flex`}>
      <span className="absolute inset-[6%] rounded-full bg-black" />
      <Spotify className="relative w-full h-full" color="#1ED760" />
    </span>
  );
}
export function BrandAppleMusic({ className }: BrandIconProps) { return <AppleMusic className={className ?? SIZE} />; }
export function BrandSoundCloud({ className }: BrandIconProps) { return <SoundCloud variant="mono" className={className ?? SIZE} color="#FF5500" />; }
