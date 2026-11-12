import { useState } from 'react';
import { env } from '@/config/env';
import { cn } from '@/lib/utils';

function getAvatarUrl(user) {
  if (!user?.avatarVersion) return null;
  return `${env.apiBaseUrl}/avatars/${encodeURIComponent(user.id)}?v=${user.avatarVersion}`;
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? parts[0][0] + parts.at(-1)[0] : (parts[0] ?? '?').slice(0, 2);
  return initials.toUpperCase();
}

/** Round profile picture with an initials fallback. */
export function UserAvatar({ user, className }) {
  const url = getAvatarUrl(user);
  const [failedUrl, setFailedUrl] = useState(null);
  const showImage = url && failedUrl !== url;

  return (
    <span
      className={cn(
        'relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium text-muted-foreground',
        className,
      )}
    >
      {showImage ? (
        <img
          src={url}
          alt={`${user.name} profile picture`}
          className="size-full object-cover"
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <span aria-hidden="true">{getInitials(user?.name)}</span>
      )}
    </span>
  );
}
