import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    include: ["src/**/__tests__/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/validators.ts",
        "src/lib/utils.ts",
        "src/components/admin/utils.ts",
        "src/components/admin/types.ts",
      ],
      exclude: ["src/**/__tests__/**", "src/test/**"],
    },
  },
});
