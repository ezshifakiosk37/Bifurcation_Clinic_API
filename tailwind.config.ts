import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        secondary: "var(--secondary)", // important!
        input: "var(--input)",
        ring: "var(--ring)",
      },
    },
  },
  plugins: [],
};

export default config;
