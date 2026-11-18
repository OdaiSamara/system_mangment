
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const { API_PROXY_TARGET } = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    server: API_PROXY_TARGET
      ? {
          proxy: {
            "/api": {
              target: API_PROXY_TARGET,
              changeOrigin: true,
              secure: true,
            },
          },
        }
      : undefined,
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;

            if (
              id.includes("@mui") ||
              id.includes("@emotion") ||
              id.includes("stylis")
            ) {
              return "mui-vendor";
            }

            if (
              id.includes("react-dom") ||
              id.includes("react-router") ||
              id.includes("/react/")
            ) {
              return "react-vendor";
            }

            if (id.includes("axios")) {
              return "api-vendor";
            }
          },
        },
      },
    },
  };
});
