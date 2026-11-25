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
        heading: ["var(--font-heading)", "'Space Grotesk'", "sans-serif"],
        body: ["var(--font-body)", "'Plus Jakarta Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        // Pizza Sandy Shores signature Syndicate Noir / Tactical Dossier palette
        pizza: {
          yellow: "#FACC15",
          "yellow-hover": "#EAB308",
          red: "#DC2626",
          "red-hover": "#B91C1C",
          "red-dark": "#991B1B",
          dark: "#07080E",
          "dark-card": "#0B0D14",
          "dark-input": "#141724",
          cream: "#ECE8DF",
          border: "#1A1A1A",
        },
      },
      borderRadius: {
        none: "0px",
        sm: "8px",
        DEFAULT: "12px", // Default rounded class becomes soft and tactile (no sharp 4px corners)
        md: "12px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        full: "9999px",
      },
    },
  },
  plugins: [],
}
