/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        scada: {
          bg: "#070b11",
          panel: "#0c131d",
          card: "#101926",
          elevated: "#152233",
          border: "#1f3147",
          borderBright: "#2d4868",
          cyan: "#38bdf8",
          emerald: "#34d399",
          amber: "#fbbf24",
          crimson: "#fb7185",
          violet: "#a78bfa",
        },
      },
      fontFamily: {
        sans: ["Inter", "IBM Plex Sans", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "IBM Plex Mono", "Fira Code", "Consolas", "monospace"],
      },
      boxShadow: {
        "glow-cyan": "0 0 18px -4px rgba(56, 189, 248, 0.35)",
        "glow-emerald": "0 0 18px -4px rgba(52, 211, 153, 0.35)",
        "glow-amber": "0 0 18px -4px rgba(251, 191, 36, 0.35)",
        "glow-crimson": "0 0 20px -4px rgba(251, 113, 133, 0.45)",
      },
    },
  },
  plugins: [],
};
