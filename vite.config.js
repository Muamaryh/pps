import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react-vendor",
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: "firebase-vendor",
              test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
              priority: 25,
            },
            {
              name: "icons-vendor",
              test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
});
