import { flatAvatarColor, initialsOf } from '@/lib/utils/avatarColor';
import type { AuthUser } from '@/types/auth';
import type { CSSProperties } from 'react';

/**
 * Consistent profile avatar used across TopBar, UserProfile, and Settings.
 * Shows initials on a hash-based avatar color. (No photo — the backend has no
 * profile photo field, see docs/BACKEND_GAPS.md.)
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
