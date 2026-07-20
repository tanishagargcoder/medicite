import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        clinical: {
          50: "#f0f7f7",
          100: "#daecec",
          500: "#0f766e",
          600: "#0d6259",
          700: "#0b4f48",
        },
      },
    },
  },
  plugins: [],
};

export default config;
