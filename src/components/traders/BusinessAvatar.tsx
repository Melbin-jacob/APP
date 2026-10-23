// Picture for a business: its uploaded logo, or else its initials on a colour
// picked from the name, so every listing looks distinct without stock photos.
// No hooks: usable from server and client components.

import { avatarColour, initials } from "@/lib/avatar";

type Props = { name: string; logoUrl?: string | null; className?: string; textClassName?: string; alt?: string };

export function BusinessAvatar({ name, logoUrl, className = "h-20 w-20 rounded-lg", textClassName = "text-2xl", alt = "" }: Props) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- uploaded logos are served by our own API
    return <img src={logoUrl} alt={alt} className={`${className} border border-ink-200 bg-white object-contain`} loading="lazy" />;
  }
  return (
    <span role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}
      className={`${className} ${avatarColour(name)} grid shrink-0 select-none place-items-center font-semibold tracking-wider`}>
      <span className={textClassName}>{initials(name)}</span>
    </span>
  );
}
