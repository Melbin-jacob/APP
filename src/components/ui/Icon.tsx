import type { SVGProps } from "react";

// Minimal inline icon set (no icon-font requests, CSP-friendly). Category rows
// store an icon key; unknown keys fall back to "tools".
const PATHS: Record<string, string> = {
  plumbing: "M12 2v6m0 0a4 4 0 0 1 4 4v2H8v-2a4 4 0 0 1 4-4Zm-6 12h12v3a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5v-3Z",
  electrical: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  security: "M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z",
  home: "M3 11 12 3l9 8v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V11Z",
  painting: "M4 3h13v5H4zM17 5h3v6h-8v3m-1 0h2v7h-2z",
  handyman: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5Z",
  cleaning: "M9 3h6v4H9zM7 7h10l1 14H6L7 7Zm3 4v6m4-6v6",
  garden: "M12 22V12m0 0C12 7 8 4 3 4c0 5 4 8 9 8Zm0 0c0-5 4-8 9-8 0 5-4 8-9 8Z",
  moving: "M1 6h13v10H1zM14 10h4l3 3v3h-7M5 19a2 2 0 1 0 0-.01M17 19a2 2 0 1 0 0-.01",
  pest: "M12 8a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0v-4a3 3 0 0 1 3-3Zm0 0V5m-3 6H5m14 0h-4M9 15H5m14 0h-4M9 5l-2-2m8 2 2-2",
  garage: "M3 21V9l9-6 9 6v12M7 21v-8h10v8M7 17h10",
  roofing: "M2 12 12 4l10 8M5 10v10h14V10",
  fan: "M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12 10c0-4 1-7 4-7 2 0 2 3 0 5l-2 2m-2 4c0 4-1 7-4 7-2 0-2-3 0-5l2-2m2-2c4 0 7 1 7 4 0 2-3 2-5 0l-2-2m-4 0c-4 0-7-1-7-4 0-2 3-2 5 0l2 2",
  tree: "M12 22v-6m0 0-4-4m4 4 4-4M12 2 5 12h4l-3 4h12l-3-4h4L12 2Z",
  layers: "M12 3 2 8l10 5 10-5-10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5",
  brick: "M3 5h18v14H3zM3 9.7h18M3 14.3h18M9 5v4.7m6 0V14.3m-6 0V19",
  shovel: "M14 4l6 6m-3-3-8 8m-2-2 4 4-3 3a3 3 0 0 1-4-4l3-3Z",
  drop: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z",
  window: "M4 3h16v18H4zM12 3v18M4 12h16",
  fence: "M5 21V7l2-3 2 3v14m6 0V7l2-3 2 3v14M3 10h18M3 16h18",
  appliance: "M6 2h12v20H6zM6 8h12M9 5h.01M12 15a3 3 0 1 0 0-.01",
  key: "M8 15a4 4 0 1 1 0-.01M11 12l9-9m-3 3 3 3m-6 0 2 2",
  snow: "M12 2v20M3.5 7l17 10M20.5 7l-17 10M9 4l3 2 3-2M9 20l3-2 3 2",
  flame: "M12 22a7 7 0 0 0 7-7c0-5-4-7-5-11-2 2-3 4-3 6-1-1-2-2-2-4-3 3-4 6-4 9a7 7 0 0 0 7 7Z",
  tools: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5Z",
  search: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm9 16-4.3-4.3",
  pin: "M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Zm0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  phone: "M5 3h3l2 5-2.5 1.5a11 11 0 0 0 5 5L14 12l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z",
  mail: "M3 5h18v14H3zM3 5l9 8 9-8",
  check: "M5 12l5 5L20 7",
  bulb: "M9 18h6m-5 3h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3Z",
  compass: "M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm4 6-2 6-6 2 2-6 6-2Z",
  mountain: "M3 20 9 9l4 6 3-4 5 9H3Zm13-13a2 2 0 1 0 0-.01",
};

export function Icon({ name, ...props }: { name: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d={PATHS[name] ?? PATHS.tools} />
    </svg>
  );
}
