/**
 * Timestamp formatting pinned to the household timezone.
 * Server and browser both render the same wall-clock time, so a chore done at
 * 4:27 PM ET always reads 4:27 PM ET — regardless of the viewer's device.
 */
export function formatInZone(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

/** Time only, e.g. "4:27 PM EDT". */
export function formatTimeInZone(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}
