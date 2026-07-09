import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  server: {
    port: 3000
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@supabase")) return "supabase";
          if (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase")) return "firebase";
          if (id.includes("node_modules/recharts")) return "charts";
          if (id.includes("node_modules/jspdf") || id.includes("node_modules/jspdf-autotable")) return "reports";
          if (id.includes("node_modules/pdfjs-dist") || id.includes("node_modules/tesseract.js") || id.includes("node_modules/@tesseract.js-data")) return "invoice-extraction";
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "react";
        }
      }
    },
    chunkSizeWarningLimit: 750
  }
});
