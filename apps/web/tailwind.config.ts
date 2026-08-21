import type { Config } from "tailwindcss";

// Pastel brand palette. Each hue keeps its source swatch at the 200 step; the
// darker steps are derived from the same hue so text and icons can reach
// WCAG AA against the pastel surfaces above them.
const palette = {
  butter: {
    50: "#fdfcf2", 100: "#fbfae4", 200: "#fbf8cc", 300: "#f0e875", 400: "#e8de54",
    500: "#ded335", 600: "#c5ba26", 700: "#9d9520", 800: "#79731b", 900: "#555116",
  },
  peach: {
    50: "#fdf7f1", 100: "#fceee3", 200: "#fde4cf", 300: "#f5ac70", 400: "#ee964e",
    500: "#e5812e", 600: "#cc6d1f", 700: "#a2581b", 800: "#7d4517", 900: "#583213",
  },
  blush: {
    50: "#fef1f2", 100: "#fde2e4", 200: "#ffcfd2", 300: "#fb6a74", 400: "#f54753",
    500: "#ed2633", 600: "#d31724", 700: "#a8151f", 800: "#81121a", 900: "#5b1015",
  },
  orchid: {
    50: "#fcf3fa", 100: "#f9e7f5", 200: "#f1c0e8", 300: "#e184d0", 400: "#d666c1",
    500: "#ca4ab2", 600: "#b1399b", 700: "#8d2f7c", 800: "#6d2660", 900: "#4e1e45",
  },
  lavender: {
    50: "#f6f3fc", 100: "#eee7f9", 200: "#cfbaf0", 300: "#a884e1", 400: "#9166d6",
    500: "#7b4aca", 600: "#6739b1", 700: "#532f8d", 800: "#42266d", 900: "#301e4e",
  },
  periwinkle: {
    50: "#f2f7fc", 100: "#e5eefa", 200: "#a3c4f3", 300: "#7ba9ea", 400: "#5b93e1",
    500: "#3d7dd6", 600: "#2d69be", 700: "#265597", 800: "#1f4375", 900: "#193152",
  },
  sky: {
    50: "#f2fafd", 100: "#e4f5fb", 200: "#90dbf4", 300: "#77d0ee", 400: "#57c2e6",
    500: "#38b3db", 600: "#289cc2", 700: "#227d9b", 800: "#1c6177", 900: "#174554",
  },
  aqua: {
    50: "#f2fcfd", 100: "#e4f9fb", 200: "#8eecf5", 300: "#75e5f0", 400: "#55dbe7",
    500: "#36cfdd", 600: "#26b7c4", 700: "#21929c", 800: "#1b7179", 900: "#165055",
  },
  mint: {
    50: "#f2fdfa", 100: "#e4fbf6", 200: "#98f5e1", 300: "#77eed4", 400: "#57e6c7",
    500: "#38dbb8", 600: "#28c2a1", 700: "#229b81", 800: "#1c7764", 900: "#175447",
  },
  leaf: {
    50: "#f2fdf3", 100: "#e3fce6", 200: "#b9fbc0", 300: "#72f37f", 400: "#50ec60",
    500: "#31e243", 600: "#22c932", 700: "#1da02a", 800: "#197b22", 900: "#14571b",
  },
};

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ...palette,
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
        panel: "0 18px 60px rgba(48, 30, 78, 0.14)",
        card: "0 1px 2px rgba(48, 30, 78, 0.05), 0 10px 30px -16px rgba(48, 30, 78, 0.22)",
        lift: "0 24px 48px -24px rgba(48, 30, 78, 0.4)",
        ink: "0 24px 60px -28px rgba(48, 30, 78, 0.65)",
        sm: "0 1px 2px rgba(48, 30, 78, 0.07)",
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
