import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import observerPlugin from "mobx-react-observer/babel-plugin";

const __dirname = dirname(fileURLToPath(import.meta.url));

const mobxQueryDir = resolve(__dirname, "src/libs/mobx-query");

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          observerPlugin(),
          [
            "@babel/plugin-proposal-decorators",
            {
              version: "2023-05",
            },
          ],
        ],
      },
    }),
    dts({
      entryRoot: "src/libs/mobx-query",
      insertTypesEntry: true,
      tsconfigPath: "./tsconfig.app.json",
    }),
  ],
  build: {
    lib: {
      entry: resolve(mobxQueryDir, "./index.ts"),
      formats: ["es"],
      name: "mobx-query",
    },
    rollupOptions: {
      external: [
        "react",
        "react-dom",
        "mobx",
        "mobx-react-lite",
        "mobx-react-observer",
        "@tanstack/react-query",
        "@tanstack/react-query-devtools",
      ],
    },
  },
});
