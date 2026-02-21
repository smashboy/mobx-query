import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
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
  ],
  build: {
    lib: {
      entry: {
        client: resolve(mobxQueryDir, "./client/index.js"),
        entity: resolve(mobxQueryDir, "./entity/index.js"),
        mutations: resolve(mobxQueryDir, "./mutations/index.js"),
        queries: resolve(mobxQueryDir, "./queries/index.js"),
        react: resolve(mobxQueryDir, "./react/index.js"),
        utils: resolve(mobxQueryDir, "./utils/index.js"),
      },
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
