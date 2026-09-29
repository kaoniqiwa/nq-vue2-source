/** 命令行 cross-env VERSON=1.1 */
const version = process.env.VERSION || require("../../package.json").version;
const path = require("path");
const aliases = require("./alias");

const replace = require("@rollup/plugin-replace");

const typescript = require("@rollup/plugin-typescript");
const serve = require("rollup-plugin-serve");
/**
 * rollup 自身不支持导入第三方库，需要安装 @rollup/plugin-node-resolve
 */
const nodeResolve = require("@rollup/plugin-node-resolve").nodeResolve;
/**
 * 如果第三方库导出的是 ESM 模块，则仅安装 @rollup/plugin-node-resolve 插件即可，
 * 但是导出为 CommonJS 模块的第三方库，需要安装 @rollup/plugin-commonjs ,
 * 该插件是将 CommonJS 转成 ESM
 */
const cjs = require("@rollup/plugin-commonjs");

const resolve = (p) => {
  const base = p.split("/")[0];
  if (aliases[base]) {
    return path.resolve(aliases[base], p.slice(base.length + 1));
  } else {
    return path.resolve(process.cwd(), p);
  }
};
const banner =
  "/*!\n" +
  ` * Vue.js v${version}\n` +
  ` * (c) 2014-${new Date().getFullYear()} Evan You\n` +
  " * Released under the MIT License.\n" +
  " */";

const builds = {
  "full-dev": {
    entry: resolve("web/entry-runtime-with-compiler.ts"),
    dest: resolve("dist/rollup/vue.js"),
    format: "umd",
    env: "development",
    banner,
  },
  "full-esm-browser-dev": {
    entry: resolve("web/entry-runtime-with-compiler-esm.ts"),
    dest: resolve("dist/rollup/vue.esm.browser.js"),
    format: "es",
    transpile: false,
    env: "development",
    banner,
  },
};

function genConfig(name) {
  const opts = builds[name];

  const config = {
    input: opts.entry,
    output: {
      file: opts.dest,
      format: opts.format,
      banner: opts.banner,
      name: opts.moduleName || "Vue",
      exports: "auto",
      sourcemap: true,
    },
    plugins: [
      process.env.NODE_ENV == "development"
        ? serve({
            openPage: "/public/index.html",
            port: 3000,
            contentBase: "",
          })
        : null,
      typescript({
        /**对于 typescript项目,rollup配置和webpack配置无法兼容，所以新建配置 */
        tsconfig: path.resolve(process.cwd(), "tsconfig.rollup.json"),
      }),
      /**
       * 通过 @rollup/plugin-replace 向前端注入全局变量，类似 webpack.DefinePlugin
       * 必须要 JSON.stringify()
       * 如果是 {author:'aaa'},rollup是将 "aaa" 作为变量名在node环境查找对应的值，然后将值和author绑定
       */
      replace({
        preventAssignment: true,
        "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
        author: JSON.stringify("kaoniqiwa"),
        "process.env.VBIND_PROP_SHORTHAND": JSON.stringify(false),
      }),
      nodeResolve(),
      cjs(),
    ],
  };
  return config;
}

module.exports = genConfig;
