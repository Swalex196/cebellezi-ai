/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          base: "#110a0b",       // Deep Imperial Charcoal (subtle burgundy undertone)
          card: "#1a1012",       // Majestic Palace Card
          border: "#2d1c1f",     // Ottoman Subtle Rose/Bronze Border
          highlight: "#3d2629"   // Active hover highlight rosewood
        },
        brand: {
          primary: "#c29b38",    // Palace Gold
          secondary: "#1d5c42",  // Sacred Ottoman Emerald
          accent: "#8a1523",     // Royal Ottoman Red
          warning: "#d4af37",    // Imperial Gold
          danger: "#a62c2c"      // Deep Crimson Red
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      }
    },
  },
  plugins: [],
}
