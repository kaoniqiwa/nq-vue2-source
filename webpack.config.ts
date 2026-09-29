import { getConfig } from "./script/webpack/config";
import { Configuration } from "webpack";

module.exports = function (
  env: NodeJS.ProcessEnv,
  args: { [key: string]: any }
) {
  let res: Configuration = {};
  if (env.target) {
    return getConfig(env.target);
  }

  return res;
};
