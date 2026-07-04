import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#09090B",
        card: "#111318",
        surface: "#171A22",
        border: "rgba(255,255,255,0.08)",
        brand: {
          DEFAULT: "#6E56CF",
          hover: "#7C69E3",
          light: "#6E56CF20",
        },
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#38BDF8",
        "primary-text": "#F5F5F5",
        "secondary-text": "#A1A1AA",
        muted: "#71717A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      spacing: {
        page: "40px",
        section: "32px",
        card: "24px",
      },
      borderRadius: {
        card: "20px",
        button: "14px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "expand": "expand 0.3s ease-out",
        "typing": "typing 0.1s steps(1)",
        "check-pop": "checkPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "line-fill": "lineFill 0.5s ease-out forwards",
        "progress-stripe": "progressStripe 1s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        expand: {
          "0%": { opacity: "0", maxHeight: "0" },
          "100%": { opacity: "1", maxHeight: "500px" },
        },
        checkPop: {
          "0%": { transform: "scale(0)" },
          "60%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)" },
        },
        lineFill: {
          "0%": { height: "0%" },
          "100%": { height: "100%" },
        },
        progressStripe: {
          "0%": { backgroundPosition: "1rem 0" },
          "100%": { backgroundPosition: "0 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
