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
        // Inklings brand background (matches logo)
        bg: {
          primary: "#1c1d2e",
          secondary: "#16172a",
          card: "#252640",
          elevated: "#2e3052",
        },
        // Rainbow palette (from wordmark)
        rainbow: {
          cyan: "#22d3ee",
          pink: "#ec4899",
          purple: "#a855f7",
          yellow: "#eab308",
          green: "#22c55e",
          orange: "#f97316",
          red: "#ef4444",
          blue: "#3b82f6",
        },
        // Text
        text: {
          primary: "#ffffff",
          secondary: "#a1a1aa",
          muted: "#71717a",
          subtle: "#52525b",
        },
        // Borders
        border: {
          DEFAULT: "#3d3f6a",
          hover: "#5558a0",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "bounce-gentle": "bounceGentle 2s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
        "gradient-shift": "gradientShift 3s ease infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        bounceGentle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      backgroundImage: {
        "rainbow-gradient": "linear-gradient(90deg, #22d3ee, #ec4899, #a855f7, #eab308, #22c55e, #f97316, #ef4444, #3b82f6)",
      },
    },
  },
  plugins: [],
};

export default config;
