import { useEffect, useState, type CSSProperties } from 'react';
import { placeholderSurface, placeholderInk, initialsOf } from '@/lib/utils/avatarAppearance';
import { useTheme } from '@/app/components/ThemeContext';
import { authService } from '@/lib/auth';
import type { AuthUser } from '@/types/auth';

// Memory cache for avatar blob URLs keyed by user ID + avatar_url timestamp/path
const avatarBlobCache = new Map<string, { blobUrl: string; etag?: string }>();

/**
 * Consistent profile avatar used across TopBar, UserProfile, and Settings.
 * Displays private user avatar photo via authenticated fetch (G-47), falling
 * back to initials on the theme's own surface when no photo is attached or
 * while loading — never an invented per-name colour.
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
  const { isDark } = useTheme();
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
      if (!isMounted) { if (res.url) URL.revokeObjectURL(res.url); return; }
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
  }, [userId, avatarUrl, user]);

  if (!user) return null;

  const initials = initialsOf(user.name || user.email?.split('@')[0] || 'U');
  const surface = placeholderSurface(isDark);
  const textColor = placeholderInk(isDark);
  const avatarShadow = isDark
    ? '0 4px 14px -4px rgba(0,0,0,0.5)'
    : '0 4px 14px -4px rgba(54,47,70,0.16)';
  const fontSize = Math.round(size * 0.38);

  const shared: CSSProperties = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.32),
    flexShrink: 0,
    overflow: 'hidden',
    ...style,
  };

  if (photoUrl && userId && avatarUrl) {
    return (
      <div
        className={`inline-flex items-center justify-center relative ${className}`}
        style={{ ...shared, background: surface, boxShadow: avatarShadow }}
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
      style={{ ...shared, background: surface, boxShadow: avatarShadow }}
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
