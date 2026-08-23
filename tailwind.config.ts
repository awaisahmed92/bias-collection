import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17130e",
        cream: "#faf7f1",
        sand: "#efe8dc",
        line: "#e3d9ca",
        clay: "#b08968",
        claydark: "#8f6b4f",
        gold: "#9c7c2e",
        off: "#f5f1e9",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: { luxe: "0.28em" },
    },
  },
  plugins: [],
} satisfies Config;
