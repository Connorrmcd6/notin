import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/lib/db/client.ts",
        "src/lib/cache/**",
        "src/lib/google-calendar/**",
        "src/lib/api/client.ts",
        "src/lib/**/cached.ts",
      ],
    },
  },
});
