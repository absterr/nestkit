import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: process.env.BASE_URL,
    specPattern: "test/**/*.cy.ts",
    supportFile: false,
  },
});
