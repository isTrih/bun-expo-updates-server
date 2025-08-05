import * as path from "node:path";
import { defineConfig } from "rspress/config";

export default defineConfig({
  root: path.join(__dirname, "docs"),
  lang: "zh",
  title: "BunExpo Updates Server",
  icon: "/beu-icon.png",
  logo: {
    light: "/beu-light-logo.png",
    dark: "/beu-dark-logo.png",
  },
  themeConfig: {
    socialLinks: [
      {
        icon: "github",
        mode: "link",
        content: "https://github.com/isTrih/bun-expo-updates-server",
      },
    ],
    footer: {
      message:
        "Copyright © 2023-present isTrih Released under the GPLv3 license.",
    },
  },
  locales: [
    {
      lang: "zh",
      label: "简体中文",
      title: "BunExpo Updates Server",
    },
    {
      lang: "en",
      label: "English",
      title: "BunExpo Updates Server",
    },
  ],
});
