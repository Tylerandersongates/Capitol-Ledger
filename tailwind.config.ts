import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#071225",
        paper: "#08182C",
        line: "#274464",
        civic: "#2B8DFF",
        rust: "#FF8A00",
        brass: "#F6D84B",
        aurora: "#57C7FF",
        vault: "#020916",
        mist: "#EAF2FF"
      },
      boxShadow: {
        panel: "0 24px 80px rgba(0, 0, 0, 0.36)",
        glow: "0 0 40px rgba(246, 216, 75, 0.22), 0 0 80px rgba(43, 141, 255, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
