import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14161A",
        paper: "#F7F5F1",
        paperdim: "#EFEBE3",
        rule: "#E1DCD1",
        muted: "#6B6B63",
        brass: "#B8862E",
        brassdim: "#8F6A24",
        confirmed: "#3F6B4F",
        pending: "#B8862E",
        rejected: "#A6412C",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        widest2: "0.22em",
      },
    },
  },
  plugins: [],
};

export default config;
