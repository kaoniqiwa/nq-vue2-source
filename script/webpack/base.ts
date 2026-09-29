import Config from "webpack-chain";
import path from "path";
import { BannerPlugin, DefinePlugin } from "webpack";

import { version } from "../../package.json";
const VERSION = process.env.VERSION || version;

function resolve(dir: string) {
  return path.resolve(process.cwd(), dir);
}
const config = new Config();

config.resolve.alias
  .set("core", resolve("src/core"))
  .set("src", resolve("src"))
  .set("compiler", resolve("src/compiler"))
  .set("web", resolve("src/platforms/web"))
  .set("shared", resolve("src/shared"))
  .end()
  .extensions.add(".js")
  .add(".ts")
  .end();

config.module
  .rule("typescript")
  .test(/\.tsx?/)
  .exclude.add(resolve("node_modules"))
  .end()
  .use("tsLoader")
  .loader("ts-loader")
  .end();

/** 定义全局常量,webpack 会处理全局常量值 eval('kaoniqiwa') ,所以需要 JSON.stringify()*/
config.plugin("definePlugin").use(DefinePlugin, [
  {
    VERSION: JSON.stringify(VERSION),
    __WEEX__: JSON.stringify(false),
    /**
     * webpack 5 会自动从 mode 中为 process.env.NODE_ENV 赋值
     * 指令:webpack --node-env hello
     * 虽然在命令行中设置了 node-env，但是 webpack 读取 mode 的值为  process.env.NODE_ENV赋值
     * 且赋值后，就不能在 DefinePlugin 中更改相同变量名的值了
     * 解决办法:设置 webpack 不会自动读取配置 mode 给  process.env.NODE_ENV 赋值
     * module.exports = {
     *  optimization:{nodeEnv:false}
     * }
     */
    // "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
    author: JSON.stringify("kaoniqiwa"),
    "process.env.VBIND_PROP_SHORTHAND": JSON.stringify(false),
  },
]);

// config.optimization.set("nodeEnv", true).end();

const banner =
  "/*!\n" +
  ` * Vue.js v${VERSION}\n` +
  ` * (c) 2023-${new Date().getFullYear()} Evan You\n` +
  " * Released under the MIT License.\n" +
  " */";

config.plugin("BannerPlugin").use(BannerPlugin).end();
config.plugin("BannerPlugin").tap((args) => [...args, { banner }]);

export default config;
