import type { SVGProps } from "react";

// Minimal inline icon set (no icon-font requests, CSP-friendly). Category rows
// store an icon key; unknown keys fall back to the wrench.
const PATHS: Record<string, string> = {
  // Trades: one distinct pictogram each (see prisma/categories.ts).
  faucet: "M4 9h9a3 3 0 0 1 3 3v2h3v-2a6 6 0 0 0-6-6H4M8 6V3M5 3h6M4 6v6M17.5 17v.5M17.5 20.5v.5",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  thermometer: "M10 4a2 2 0 1 1 4 0v10.5a4 4 0 1 1-4 0V4ZM12 17v-6M17 5h3M17 9h3",
  hardhat: "M2 18h20M4 18v-2a8 8 0 0 1 16 0v2M9 9V5h6v4M9 9a6 6 0 0 0-3 2M15 9a6 6 0 0 1 3 2",
  wrench: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5Z",
  roller: "M4 3h13v5H4zM17 5h3v6h-8v3m-1 0h2v7h-2z",
  roof: "M2 12 12 4l10 8M5 10v10h14V10M10 20v-5h4v5",
  sprout: "M12 22V12m0 0C12 7 8 4 3 4c0 5 4 8 9 8Zm0 0c0-5 4-8 9-8 0 5-4 8-9 8ZM7 22h10",
  tree: "M12 22v-6m0 0-4-4m4 4 4-4M12 2 5 12h4l-3 4h12l-3-4h4L12 2Z",
  road: "M5 21 9 3M19 21 15 3M12 4v2.5M12 10.5v3M12 17.5V20",
  brick: "M3 5h18v14H3zM3 9.7h18M3 14.3h18M9 5v4.7m6 0V14.3m-6 0V19",
  shovel: "M14 4l6 6m-3-3-8 8m-2-2 4 4-3 3a3 3 0 0 1-4-4l3-3Z",
  drop: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11ZM9 14a3 3 0 0 0 3 3",
  hammer: "M13 4.5 15.5 2 22 8.5 19.5 11M13 4.5l6.5 6.5M13 4.5 10 7.5l2.5 2.5M19.5 11l-3 3-2.5-2.5M12.5 10l1.5 1.5L5 20.5a2.1 2.1 0 0 1-3-3Z",
  cabinet: "M4 3h16v18H4zM4 9h16M4 15h16M10 6h4M10 12h4M10 18h4",
  trowel: "M13 3 21 11 14 13 11 10ZM11 10l-7.5 7.5a1.4 1.4 0 0 0 2 2L13 12",
  tiles: "M3 3h18v18H3zM3 12h18M12 3v18M7.5 3v9M16.5 12v9",
  insulation: "M3 11 12 3l9 8M5 9v12h14V9M8 14l2-1.5 2 1.5 2-1.5 2 1.5M8 18l2-1.5 2 1.5 2-1.5 2 1.5",
  door: "M6 21V3h12v18M3 21h18M14.5 12h.01",
  window: "M4 3h16v18H4zM12 3v18M4 12h16",
  gutter: "M2 9 12 3l10 6M3 11h18v2H3zM18 13v8M18 21h3",
  garage: "M3 21V9l9-6 9 6v12M7 21v-8h10v8M7 15h10M7 18h10",
  fence: "M5 21V7l2-3 2 3v14m6 0V7l2-3 2 3v14M3 10h18M3 16h18",
  crane: "M6 21V4h2M6 4l14 3v1M8 4v17M4 21h6M17 8v5M15.5 13h3v2.5h-3zM8 8l-2 2M8 12l-2 2M8 16l-2 2",
  washer: "M5 2h14v20H5zM5 7h14M8 4.5h.01M11 4.5h.01M12 18a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  lock: "M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4M12 15v2.5",
  bug: "M12 8a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0v-4a3 3 0 0 1 3-3Zm0 0V5m-3 6H5m14 0h-4M9 15H5m14 0h-4M9 5l-2-2m8 2 2-2",
  spray: "M9 3h6v4H9zM7 7h10l1 14H6L7 7Zm3 4v6m4-6v6",
  snowflake: "M12 2v20M3.5 7l17 10M20.5 7l-17 10M9 4l3 2 3-2M9 20l3-2 3 2",
  trash: "M3 6h18M8 6V4h8v2M5 6l1 15h12l1-15M10 10v7M14 10v7",
  box: "M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5l9 4.5 9-4.5M12 12v9M7.5 5.2l9 4.5",
  car: "M5 11l1.6-4.2A2 2 0 0 1 8.5 5.5h7a2 2 0 0 1 1.9 1.3L19 11M3 17v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4M3 17h1.5M9.5 17h5M19.5 17H21M4.5 17a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0M14.5 17a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0M6.5 14h.01M17.5 14h.01",
  towtruck: "M8 16V11h6V6h4l4 5v5h-1M8 11 3 5M3 5H1.5M3 5v4a1.5 1.5 0 0 1-3 0M8 16H7M13 16h3M7 16.5a2 2 0 1 0 4 0 2 2 0 1 0-4 0M16 16.5a2 2 0 1 0 4 0 2 2 0 1 0-4 0M15 8v3",
  torch: "M12 22a7 7 0 0 0 7-7c0-5-4-7-5-11-2 2-3 4-3 6-1-1-2-2-2-4-3 3-4 6-4 9a7 7 0 0 0 7 7Z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1",
  shield: "M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3ZM9 12l2 2 4-4",
  sign: "M5 21V3M5 5h13v8H5M9 9h5M3 21h5",
  // Interface
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

// Older icon keys (stored on category rows before the trade icons were
// redrawn) map onto the current set, so a database not yet re-seeded still works.
const ALIASES: Record<string, string> = {
  plumbing: "faucet", electrical: "bolt", fan: "thermometer", tools: "wrench", handyman: "wrench", painting: "roller",
  roofing: "roof", garden: "sprout", layers: "tiles", home: "roof", appliance: "washer", key: "lock", pest: "bug",
  cleaning: "spray", snow: "snowflake", moving: "box", flame: "torch", security: "shield",
};


export function Icon({ name, ...props }: { name: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d={PATHS[name] ?? PATHS[ALIASES[name] ?? "wrench"] ?? PATHS.wrench} />
    </svg>
  );
}
