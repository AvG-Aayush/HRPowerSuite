import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Convert import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [(async () => (await import("@replit/vite-plugin-cartographer")).cartographer())()]
      : []),
  ],
      base: process.env.VITE_BASE_PATH || "/HRPowerSuite",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: false, // Explicitly disable source maps to reduce memory usage
    rollupOptions: {
      external: ["express", "session", "connect-pg-simple"],
      maxParallelFileOps: 10, // Limit parallel file operations to reduce memory spikes
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
      
    },
  },
});