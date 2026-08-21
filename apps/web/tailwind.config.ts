import type { Config } from "tailwindcss";

// Night-map teal is the whole brand palette. The site is deliberately monochrome:
// differentiation between surfaces, tiles and cards comes from the *step* of the
// ramp, never from a second hue, so the only colours that ever compete with it
// are the two status hues below and `accent` (the "active destination" orange).
const brand = {
  50: "#EAFBFD", 100: "#CFF3F8", 200: "#9FE6F0", 300: "#5DD6E8", 400: "#34C7DE",
  500: "#16B8D4", 600: "#0FA0BE", 700: "#087EA4", 800: "#0B4E6A", 900: "#0B1F33",
};

// The active/CTA accent — the one colour in the palette that is meant to compete
// with the brand ramp on purpose, for the thing the user should act on right now
// (a selected marker, a primary call to action).
const accent = {
  50: "#FFF3EA", 100: "#FFE0C7", 200: "#FFC79A", 300: "#FFAD6D", 400: "#FF9B54",
  500: "#FF8A3D", 600: "#F2761F", 700: "#D9620F", 800: "#B34F0C", 900: "#7A360A",
};

// The two exceptions. Error and success states carry meaning that a blue cannot
// encode — a delete button, a FAILED pipeline step and an over-budget total all
// have to read as "wrong" at a glance, so they keep a hue of their own.
const danger = {
  50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 300: "#fca5a5", 400: "#f87171",
  500: "#ef4444", 600: "#dc2626", 700: "#b91c1c", 800: "#991b1b", 900: "#7f1d1d",
};

const success = {
  50: "#f0fdf4", 100: "#dcfce7", 200: "#bbf7d0", 300: "#86efac", 400: "#4ade80",
  500: "#22c55e", 600: "#16a34a", 700: "#15803d", 800: "#166534", 900: "#14532d",
};

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand,
        accent,
        blush: danger,
        mint: success,
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
      },
      boxShadow: {
        panel: "0 18px 60px rgba(11, 31, 51, 0.14)",
        card: "0 1px 2px rgba(11, 31, 51, 0.05), 0 10px 30px -16px rgba(11, 31, 51, 0.22)",
        lift: "0 24px 48px -24px rgba(11, 31, 51, 0.4)",
        ink: "0 24px 60px -28px rgba(11, 31, 51, 0.65)",
        sm: "0 1px 2px rgba(11, 31, 51, 0.07)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
