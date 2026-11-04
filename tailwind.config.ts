import type { Config } from "tailwindcss";

// Palette taken from the reference UI: green primary, amber CTA, soft grey surfaces.
// Text and button shades meet WCAG AA contrast (4.5:1): brand-600/700 for
// text and buttons (500 is for decoration), ink-500 for secondary text.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#eef8ea", 100: "#d6efcb", 500: "#4caf2f", 600: "#2e8424", 700: "#2f7a1b" },
        accent: { 400: "#f5b82e", 500: "#e8a317", 600: "#c98a0c" },
        ink: { 900: "#1f2933", 700: "#3e4c59", 500: "#616e7c", 200: "#e4e7eb", 100: "#f5f7fa" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"], brand: ["var(--font-brand)", "var(--font-sans)", "sans-serif"] },
      boxShadow: { card: "0 1px 3px rgba(16,24,40,.08), 0 1px 2px rgba(16,24,40,.04)" },
    },
  },
  plugins: [],
} satisfies Config;
