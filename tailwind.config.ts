import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    fontFamily: {
      sans: ["Noto Sans KR", "Inter", "Pretendard", "sans-serif"],
    },
    extend: {
      screens: {
        xs: { max: "420px" },
        sm: { max: "640px" },
        md: { max: "768px" },
        lg: { max: "1024px" },
        xl: { max: "1280px" },
      },
      maxWidth: {
        mobile: "448px", // max-w-md와 동일
        app: "430px", // 앱 레이아웃/네비/플로팅 버튼 공통 최대 너비
      },
      fontFamily: {
        sans: ["Noto Sans KR", "Inter", "Pretendard", "sans-serif"],
        crimson: ["Crimson Text", "serif"],
        pretendard: ["Pretendard", "sans-serif"],
        noto: ["Noto Sans KR", "Inter", "Pretendard", "sans-serif"],
      },
      colors: {
        kakao: "#F7E600",
        naver: "#06BE34",
        "login-button": "#E77A50",
        "text-gray": "#8A8E8C",
        "text-placeholder": "#A3A7A5",
        "border-gray": "#D5D8D7",
        divider: "#E9EBEA",
        // New home page colors
        "grey-50": "#F5F6F5",
        "grey-100": "#E9EBEA",
        "grey-900": "#232624",
        "yellow-300": "#F4BC41",
        "orange-subscription": "#F47645",
        "orange-accent": "#EA8C4B",
        "red-gradient": "#E26155",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontSize: {
        "1.5xl": "1.375rem", // 22px - text-xl(20px)과 text-2xl(24px) 사이
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
