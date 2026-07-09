/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary:   "#3D52A0",
        secondary: "#7091E6",
        accent:    "#8697C4",
        surface:   "#ADBBDA",
        canvas:    "#EDE8F5",
        ink:       "#1C2340"
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"]
      },
      borderRadius: { xl2: "1.25rem" },
      boxShadow: {
        soft: "0 1px 2px rgba(28,35,64,.05), 0 8px 24px -12px rgba(61,82,160,.25)",
        lift: "0 2px 4px rgba(28,35,64,.06), 0 16px 40px -16px rgba(61,82,160,.35)"
      }
    }
  },
  plugins: []
};
