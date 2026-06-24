// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

const isStatic = process.env.PUBLIC_STATIC_DATA === "true";

export default defineConfig({
  integrations: [react()],
  ...(isStatic ? {
    site: "https://cjbaxt.github.io",
    base: "/events-ledger/",
  } : {}),
  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        ignored: ["**/public/data/**"],
      },
      ...(!isStatic ? {
        proxy: {
          "/api": {
            target: "http://localhost:8001",
            changeOrigin: true,
          },
        },
      } : {}),
    },
  },
});
