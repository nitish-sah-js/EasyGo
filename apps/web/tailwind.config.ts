import type { Config } from "tailwindcss";

// Material Blue is the whole brand palette. The site is deliberately monochrome:
// differentiation between surfaces, tiles and cards comes from the *step* of the
// ramp, never from a second hue, so the only colour that ever competes with the
// blue is a status signal.
const brand = {
  50: "#e3f2fd", 100: "#bbdefb", 200: "#90caf9", 300: "#64b5f6", 400: "#42a5f5",
  500: "#2196f3", 600: "#1e88e5", 700: "#1976d2", 800: "#1565c0", 900: "#0d47a1",
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
        panel: "0 18px 60px rgba(13, 71, 161, 0.14)",
        card: "0 1px 2px rgba(13, 71, 161, 0.05), 0 10px 30px -16px rgba(13, 71, 161, 0.22)",
        lift: "0 24px 48px -24px rgba(13, 71, 161, 0.4)",
        ink: "0 24px 60px -28px rgba(13, 71, 161, 0.65)",
        sm: "0 1px 2px rgba(13, 71, 161, 0.07)",
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
