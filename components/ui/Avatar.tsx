interface AvatarProps {
  displayName: string | null;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}

export default function Avatar({ displayName, avatarUrl, size = 36, className }: AvatarProps) {
  const initial = (displayName?.trim()?.[0] ?? "?").toUpperCase();

  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={avatarUrl}
        alt={displayName ?? "Avatar"}
        width={size}
        height={size}
        className={`rounded-pill object-cover ${className ?? ""}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-pill bg-mist font-body text-[14px] font-semibold text-slate ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}
