/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Served from https://matthewbakerthompson.github.io/economicshocksimulator/
  base: "/economicshocksimulator/",
  plugins: [react()],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
