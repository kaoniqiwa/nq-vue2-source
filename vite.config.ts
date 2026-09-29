import { defineConfig } from "vite";
import path from "path";

const r = (p: string) => path.resolve(__dirname, p);

export default defineConfig({
  resolve: {
    /**数组形式，正则匹配，顺序有意义 */
    alias: [
      /**对应源码里 41 处 src/ 前缀的裸导入,如 'src/types/component' */
      { find: /^src\//, replacement: r("src") + path.sep },
      /**对应 script/rollup/alias.js */
      { find: /^core\//, replacement: r("src/core") + path.sep },
      { find: /^compiler\//, replacement: r("src/compiler") + path.sep },
      { find: /^shared\//, replacement: r("src/shared") + path.sep },
      { find: /^web\//, replacement: r("src/platforms/web") + path.sep },
      {
        find: /^vue$/,
        replacement: r("src/platforms/web/entry-runtime-with-compiler.ts"),
      },
    ],
  },
  define: {
    /**对应 script/rollup/config.js 里的 replace() 插件 */
    "process.env.NODE_ENV": JSON.stringify("development"),
    "process.env.VBIND_PROP_SHORTHAND": JSON.stringify(false),
  },
  server: {
    port: 5173,
    open: "/dev/",
  },
});
