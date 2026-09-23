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
        blue: "rgb(var(--color-blue) / <alpha-value>)",
        deep: "rgb(var(--color-deep) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        mist: "rgb(var(--color-mist) / <alpha-value>)",
        slate: "rgb(var(--color-slate) / <alpha-value>)",
        gold: "rgb(var(--color-gold) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
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
