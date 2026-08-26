import { Globe } from 'lucide-react';
import { FaInstagram, FaSoundcloud, FaSpotify, FaTiktok, FaYoutube } from 'react-icons/fa6';
import { SiApplemusic } from 'react-icons/si';

type BrandIconProps = { isDark?: boolean; className?: string };

const SIZE = 'w-[22px] h-[22px]';
const HUE = {
  instagram: '#E4405F',
  youtube: '#FF0000',
  spotify: '#1ED760',
  appleMusic: '#FA243C',
  soundCloud: '#FF5500',
} as const;

/** Official brand glyphs from react-icons, kept as a small local adapter API. */
export function BrandWebsite({ isDark, className }: BrandIconProps) {
  return <Globe className={className ?? SIZE} strokeWidth={1.75} style={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(20,18,40,0.85)' }} />;
}
export function BrandInstagram({ className }: BrandIconProps) { return <FaInstagram className={className ?? SIZE} color={HUE.instagram} />; }
export function BrandYouTube({ className }: BrandIconProps) { return <FaYoutube className={className ?? SIZE} color={HUE.youtube} />; }
export function BrandTikTok({ isDark, className }: BrandIconProps) { return <FaTiktok className={className ?? SIZE} color={isDark ? '#ffffff' : '#010101'} />; }
export function BrandSpotify({ className }: BrandIconProps) { return <FaSpotify className={className ?? SIZE} color={HUE.spotify} />; }
export function BrandAppleMusic({ className }: BrandIconProps) { return <SiApplemusic className={className ?? SIZE} color={HUE.appleMusic} />; }
export function BrandSoundCloud({ className }: BrandIconProps) { return <FaSoundcloud className={className ?? SIZE} color={HUE.soundCloud} />; }
