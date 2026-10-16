/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        heading: ["'Outfit'", "'Space Grotesk'", "sans-serif"],
        body: ["'Plus Jakarta Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        // Pizza Sandy Shores signature Yellow & Red brutalism palette
        pizza: {
          yellow: "#FACC15",
          "yellow-hover": "#EAB308",
          red: "#DC2626",
          "red-hover": "#B91C1C",
          "red-dark": "#991B1B",
          dark: "#0F1015",
          "dark-card": "#181A22",
          "dark-input": "#222531",
          cream: "#FFF9F2",
          border: "#1A1A1A",
        },
      },
      boxShadow: {
        brutal: "4px 4px 0px 0px #000000",
        "brutal-sm": "2px 2px 0px 0px #000000",
        "brutal-md": "3px 3px 0px 0px #000000",
        "brutal-lg": "6px 6px 0px 0px #000000",
        "brutal-xl": "8px 8px 0px 0px #000000",
        "brutal-yellow": "4px 4px 0px 0px #FACC15",
        "brutal-red": "4px 4px 0px 0px #DC2626",
      },
      borderRadius: {
        brutal: "6px",
      },
    },
  },
  plugins: [],
}
