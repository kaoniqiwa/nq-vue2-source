const genConfig = require("./script/rollup/config");

if (process.env.TARGET) {
  module.exports = genConfig(process.env.TARGET);
}
