import { readFile } from "node:fs/promises";
import path from "node:path";

// Shared look for link-preview images (Open Graph / Twitter, 1200x630),
// rendered by next/og. Brand colours: navy #0B2545, copper #C87D55.
export const OG_SIZE = { width: 1200, height: 630 };

let mark: string | undefined;
async function markDataUrl() {
  mark ??= `data:image/svg+xml;base64,${(await readFile(path.join(process.cwd(), "public/brand/gettradepros-mark.svg"))).toString("base64")}`;
  return mark;
}

export async function OgCard({ kicker, title, lines }: { kicker: string; title: string; lines: string[] }) {
  const logo = await markDataUrl();
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0B2545", color: "#fff", padding: "64px 72px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", background: "#fff", borderRadius: 20, padding: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- rendered to an image by next/og */}
          <img src={logo} width={76} height={74} />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: 4 }}>GETTRADEPROS</div>
          <div style={{ fontSize: 18, letterSpacing: 3, color: "#c9d3df" }}>CONNECTING YOU WITH TRUSTED TRADESPEOPLE</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 28, color: "#C87D55", fontWeight: 700, letterSpacing: 2 }}>{kicker.toUpperCase()}</div>
        <div style={{ fontSize: title.length > 40 ? 60 : 72, fontWeight: 700, lineHeight: 1.1 }}>{title}</div>
        {lines.map((l) => <div key={l} style={{ fontSize: 30, color: "#dbe2ea" }}>{l}</div>)}
      </div>
      <div style={{ display: "flex", height: 8, width: 160, background: "#C87D55", borderRadius: 4 }} />
    </div>
  );
}
