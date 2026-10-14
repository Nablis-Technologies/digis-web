import { useEffect, useState, type CSSProperties } from 'react';
import { flatAvatarColor, initialsOf } from '@/lib/utils/avatarColor';
import { authService } from '@/lib/auth';
import type { AuthUser } from '@/types/auth';

// Memory cache for avatar blob URLs keyed by user ID + avatar_url timestamp/path
const avatarBlobCache = new Map<string, { blobUrl: string; etag?: string }>();

/**
 * Consistent profile avatar used across TopBar, UserProfile, and Settings.
 * Displays private user avatar photo via authenticated fetch (G-47), falling
 * back to initials on a hash-based color when no photo is attached or while loading.
 */
export function UserAvatar({
  user,
  size = 36,
  className = '',
  style = {} as CSSProperties,
}: {
  user: AuthUser | null;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(() => {
    if (!user?.id || !user?.profile?.avatar_url) return null;
    return avatarBlobCache.get(user.id)?.blobUrl ?? null;
  });

  const avatarUrl = user?.profile?.avatar_url;
  const userId = user?.id;

  useEffect(() => {
    if (!userId || !avatarUrl) {
      setPhotoUrl(null);
      return;
    }

    let isMounted = true;
    const cached = avatarBlobCache.get(userId);
    if (cached?.blobUrl) {
      setPhotoUrl(cached.blobUrl);
    }

    authService.getAvatarBlobUrl(cached?.etag).then((res) => {
      if (!isMounted) return;
      if (res.notModified && cached?.blobUrl) {
        setPhotoUrl(cached.blobUrl);
      } else if (res.url) {
        avatarBlobCache.set(userId, { blobUrl: res.url, etag: res.etag });
        setPhotoUrl(res.url);
      } else {
        setPhotoUrl(null);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [userId, avatarUrl]);

  if (!user) return null;

  const color = flatAvatarColor(user.name || user.email || 'U');
  const initials = initialsOf(user.name || user.email?.split('@')[0] || 'U');
  const lum = (() => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  })();
  const textColor = lum > 0.55 ? '#0a0a0a' : '#ffffff';
  const fontSize = Math.round(size * 0.38);

  const shared: CSSProperties = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.32),
    flexShrink: 0,
    overflow: 'hidden',
    ...style,
  };

  if (photoUrl) {
    return (
      <div
        className={`inline-flex items-center justify-center relative ${className}`}
        style={{ ...shared, background: color, boxShadow: `0 4px 14px -4px ${color}88` }}
      >
        <img
          src={photoUrl}
          alt={user.name || 'User avatar'}
          className="w-full h-full object-cover"
          onError={() => setPhotoUrl(null)}
        />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{ ...shared, background: color, boxShadow: `0 4px 14px -4px ${color}88` }}
    >
      <span style={{
        fontFamily: "'Zalando Sans Expanded', sans-serif",
        fontWeight: 700,
        fontSize,
        color: textColor,
        lineHeight: 1,
        letterSpacing: '-0.5px',
      }}>
        {initials}
      </span>
    </div>
  );
}
