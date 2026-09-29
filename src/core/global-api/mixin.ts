import { mergeOptions } from "core/util";
import { GlobalAPI } from "src/types/global-api";
import { ComponentOptions } from "src/types/options";

export function initMixin(Vue: GlobalAPI) {
  /**
   * Vue.options = Object.create(null);
   * 将 mixin 合并到 Vue.options 上
   * @param mixin
   * @returns
   */
  Vue.mixin = function (mixin: ComponentOptions) {
    this.options = mergeOptions(this.options, mixin);
    return this;
  };
}
