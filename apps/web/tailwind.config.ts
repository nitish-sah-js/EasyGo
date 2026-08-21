import type { Config } from "tailwindcss";

// Purple is brand / structure / identity. The site is deliberately monochrome
// within this ramp — surfaces, tiles and cards differentiate by *step*, never
// by a second hue — so the only colours that ever compete with it are the two
// status hues below and `accent` (orange: action / attention / travel).
// Anchored on the five named purples from the brand spec: 240046 (Primary
// Purple / Deep Hero start), 3C096C (Purple Glow start / Deep Hero mid),
// 5A189A (Primary Purple end / Vibrant Purple start), 7B2CBF (Vibrant Purple
// end), 9D4EDD (Purple Glow end — 3D glow, markers, floating elements).
const brand = {
  50: "#F3F0FA", 100: "#EDE7F6", 200: "#D8CFE3", 300: "#C9A9E9", 400: "#9D4EDD",
  500: "#7B2CBF", 600: "#5A189A", 700: "#3C096C", 800: "#2D0752", 900: "#240046",
};

// The active/CTA accent — action and attention, never brand structure.
// Anchored on Primary Orange (FF6D00 → FF9100) and Warm Orange/hover
// (FF7900 → FF9E00).
const accent = {
  50: "#FFF4E5", 100: "#FFE3C2", 200: "#FFC98A", 300: "#FFAD52", 400: "#FF9E00",
  500: "#FF9100", 600: "#FF7900", 700: "#FF6D00", 800: "#D65900", 900: "#A34400",
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
        panel: "0 18px 60px rgba(36, 0, 70, 0.14)",
        card: "0 1px 2px rgba(36, 0, 70, 0.05), 0 10px 30px -16px rgba(36, 0, 70, 0.22)",
        lift: "0 24px 48px -24px rgba(36, 0, 70, 0.4)",
        ink: "0 24px 60px -28px rgba(36, 0, 70, 0.65)",
        sm: "0 1px 2px rgba(36, 0, 70, 0.07)",
        // Warm glow for orange CTAs — a plain dark shadow reads as an error
        // state under a bright orange gradient, so it gets its own tint.
        glow: "0 12px 32px -10px rgba(255, 109, 0, 0.45)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      // The named gradients from the brand spec, exposed as `bg-{name}` utilities.
      backgroundImage: {
        "primary-purple": "linear-gradient(135deg, #240046, #5A189A)",
        "purple-glow": "linear-gradient(135deg, #3C096C, #9D4EDD)",
        "vibrant-purple": "linear-gradient(135deg, #5A189A, #7B2CBF)",
        "primary-orange": "linear-gradient(135deg, #FF6D00, #FF9100)",
        "warm-orange": "linear-gradient(135deg, #FF7900, #FF9E00)",
        "brand-gradient": "linear-gradient(135deg, #5A189A, #FF7900)",
        "hero-gradient": "linear-gradient(160deg, #240046 0%, #3C096C 55%, #5A189A 100%)",
        "subtle-purple": "linear-gradient(135deg, #F3F0FA, #EDE7F6)",
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
