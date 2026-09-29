import { isFunction, toArray } from "src/shared/util";
import { GlobalAPI } from "src/types/global-api";

/** 将 Vue 传入插件中，插件不需要依赖 Vue, 防止 Vue 迭代导致版本错误 */
export function initUse(Vue: GlobalAPI) {
  Vue.use = function (this: GlobalAPI, plugin: any) {
    /** 维护插件列表，避免同一个插件被重复安装 */
    const installedPlugins =
      this._installedPlugins || (this._installedPlugins = []);
    if (installedPlugins.indexOf(plugin) > -1) {
      return this;
    }

    /** 排除插件本身后的剩余参数 */
    const args = toArray(arguments, 1);
    /** 插件需要注入 Vue */
    args.unshift(this);

    if (isFunction(plugin.install)) {
      plugin.install.apply(plugin, args);
    } else if (isFunction(plugin)) {
      plugin.apply(null, args);
    }
    installedPlugins.push(plugin);

    return this;
  };
}
