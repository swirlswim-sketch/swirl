import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: "var(--color-blue)",
        deep: "var(--color-deep)",
        surface: "var(--color-surface)",
        mist: "var(--color-mist)",
        slate: "var(--color-slate)",
        gold: "var(--color-gold)",
        success: "var(--color-success)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 2px 12px rgba(0, 0, 0, 0.08)",
      },
      transitionTimingFunction: {
        badge: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionDuration: {
        sheet: "280ms",
        map: "1200ms",
        badge: "350ms",
        progress: "600ms",
        toast: "220ms",
      },
    },
  },
  plugins: [],
};
export default config;
