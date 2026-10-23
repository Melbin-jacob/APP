// Structured JSON log lines on stdout, one event per line. The hosting
// platform's log drain ships them to the central log store / SIEM, where an
// intruder on the app server can't alter them. Never put secrets, passwords,
// tokens or raw personal data in here: ids and hashes only.
type Level = "info" | "warn" | "error";

export function logEvent(type: string, data: Record<string, unknown> = {}, level: Level = "info") {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, type, ...data });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
