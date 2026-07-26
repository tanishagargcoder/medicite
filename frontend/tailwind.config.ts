import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-manrope)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Wired to CSS variables so the accent picker re-themes the whole app.
        clinical: {
          50: "rgb(var(--c-50) / <alpha-value>)",
          100: "rgb(var(--c-100) / <alpha-value>)",
          200: "rgb(var(--c-200) / <alpha-value>)",
          300: "rgb(var(--c-300) / <alpha-value>)",
          400: "rgb(var(--c-400) / <alpha-value>)",
          500: "rgb(var(--c-500) / <alpha-value>)",
          600: "rgb(var(--c-600) / <alpha-value>)",
          700: "rgb(var(--c-700) / <alpha-value>)",
          800: "rgb(var(--c-800) / <alpha-value>)",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 16px -4px rgb(15 23 42 / 0.08)",
        float: "0 8px 30px -8px rgb(15 118 110 / 0.25)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "fade-in": "fade-in 0.5s ease-out both",
        "slide-in-right": "slide-in-right 0.35s ease-out both",
        "scale-in": "scale-in 0.3s ease-out both",
        "gradient-pan": "gradient-pan 12s ease infinite",
      },
    },
  },
  plugins: [],
};

export default config;
