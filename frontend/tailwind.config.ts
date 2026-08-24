import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wida: {
          primary: "#6e4fdc",
          secondary: "#9168ea",
          accent: "#e6c8fe",
          link: "#9168ea",
          bg: "#0d0614",
          surface: "#170b24",
          "surface-hover": "#231238",
          border: "#2e1847",
          text: "#ffffff",
          "text-muted": "#a395b8",
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ec4899",
          "sidebar-bg": "#0b0512",
          "sidebar-hover": "#231238",
          "sidebar-border": "#231238",
        }
      },
      borderRadius: {
        'wida': '8px',
      },
      fontFamily: {
        sha: ["'Noto Kufi Arabic'", "'SHA'", "sans-serif"],
      }
    },
  },
  plugins: [],
};
export default config;
