import type { Config } from "tailwindcss";

/**
 * 다크 & 골드 프리미엄 테마
 * - slate 팔레트를 "어두운 배경용"으로 반전 재정의했습니다.
 *   (50~300 = 어두운 면/테두리, 400~900 = 밝은 글자색)
 * - brand = 골드, emerald/rose/amber/blue/violet 의 옅은 단계(50~200)는 어두운 틴트로,
 *   진한 단계(600~800)는 어두운 배경에서 잘 보이는 밝은 톤으로 조정했습니다.
 * - ink = 페이지/카드 배경용 블랙 계열
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070605",
          900: "#0c0b09",
          800: "#12110e",
          700: "#191713",
          600: "#221f19",
        },
        slate: {
          50: "#1a1813",
          100: "#211e18",
          200: "#2e2a21",
          300: "#3d372b",
          400: "#857c6b",
          500: "#a69d8b",
          600: "#c3baa7",
          700: "#dad2c1",
          800: "#ece5d7",
          900: "#f8f2e5",
        },
        brand: {
          50: "#2a2214",
          100: "#3a2f18",
          200: "#5c4a24",
          300: "#8c7035",
          400: "#c9a557",
          500: "#d6b264",
          600: "#e3c27e",
          700: "#eed39d",
          800: "#f5e3bc",
          900: "#1f180c",
        },
        emerald: {
          50: "#0f241b",
          100: "#133024",
          200: "#1f4f3b",
          500: "#34d399",
          600: "#55d6a6",
          700: "#79e2bb",
          800: "#a8eed3",
        },
        rose: {
          50: "#2a1316",
          100: "#38191d",
          200: "#5e2a31",
          500: "#f0707f",
          600: "#f38693",
          700: "#f6a1ab",
          800: "#f9c2c8",
        },
        amber: {
          50: "#2a2111",
          100: "#372b14",
          200: "#5e4a20",
          300: "#86692b",
          500: "#f0b94e",
          600: "#f1c46a",
          700: "#f4d088",
          800: "#f8dfae",
        },
        blue: {
          50: "#121b2c",
          100: "#182338",
          200: "#263b5e",
          700: "#9dbdf4",
        },
        violet: {
          50: "#1c1630",
          200: "#3a2c62",
          700: "#bea9f5",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", "system-ui", "sans-serif"],
      },
      keyframes: {
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
      },
      animation: {
        marquee: "marquee 40s linear infinite",
        shimmer: "shimmer 6s linear infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
