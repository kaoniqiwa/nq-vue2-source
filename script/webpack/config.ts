import { merge } from "webpack-merge";
import { Configuration } from "webpack";
import path from "path";

function resolve(dir: string) {
  return path.resolve(process.cwd(), dir);
}
import config from "./base";

const builds: { [key: string]: Configuration } = {
  // Runtime+compiler development build (Browser)
  "full-dev": {
    mode: process.env.NODE_ENV == "production" ? "production" : "development",
    entry: "./src/platforms/web/entry-runtime-with-compiler.ts",
    output: {
      filename: "vue.js",
      path: resolve("dist/webpack"),
      libraryTarget: "umd",
      libraryExport: "default",
      library: "Vue",
      clean: {
        keep: /^((?!vue.js).)*/, // 保留出vue.js以外的文件
      },
    },
    devtool: "eval-source-map",
  },
};
export function getConfig(target: string) {
  const opts = builds[target];

  return merge(opts, config.toConfig());
}
