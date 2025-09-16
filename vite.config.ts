import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import observerPlugin from "mobx-react-observer/babel-plugin";

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
});
