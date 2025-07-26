import type { Config } from "tailwindcss"

const config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(217, 91%, 60%)",
          foreground: "hsl(var(--primary-foreground))",
          50: "hsl(217, 91%, 95%)",
          100: "hsl(217, 91%, 90%)",
          200: "hsl(217, 91%, 80%)",
          300: "hsl(217, 91%, 70%)",
          400: "hsl(217, 91%, 60%)",
          500: "hsl(217, 91%, 50%)",
          600: "hsl(217, 91%, 40%)",
          700: "hsl(217, 91%, 30%)",
          800: "hsl(217, 91%, 20%)",
          900: "hsl(217, 91%, 10%)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom blue theme colors
        "blue-accent": {
          50: "hsl(217, 91%, 95%)",
          100: "hsl(217, 91%, 90%)",
          200: "hsl(217, 91%, 80%)",
          300: "hsl(217, 91%, 70%)",
          400: "hsl(217, 91%, 60%)",
          500: "hsl(217, 91%, 50%)",
          600: "hsl(217, 91%, 40%)",
          700: "hsl(217, 91%, 30%)",
          800: "hsl(217, 91%, 20%)",
          900: "hsl(217, 91%, 10%)",
        },
        "cyan-accent": {
          50: "hsl(188, 94%, 95%)",
          100: "hsl(188, 94%, 90%)",
          200: "hsl(188, 94%, 80%)",
          300: "hsl(188, 94%, 70%)",
          400: "hsl(188, 94%, 60%)",
          500: "hsl(188, 94%, 50%)",
          600: "hsl(188, 94%, 40%)",
          700: "hsl(188, 94%, 30%)",
          800: "hsl(188, 94%, 20%)",
          900: "hsl(188, 94%, 10%)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px hsl(217, 91%, 60%)" },
          "50%": { boxShadow: "0 0 30px hsl(217, 91%, 70%), 0 0 40px hsl(217, 91%, 60%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "blue-gradient": "linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(188, 94%, 50%) 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
