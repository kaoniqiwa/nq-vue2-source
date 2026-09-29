import { mergeOptions } from "core/util";
import { getComponentName } from "core/vdom/create-component";
import { Component } from "src/types/component";
import { GlobalAPI } from "src/types/global-api";
import { ComponentOptions } from "src/types/options";

export function initExtend(Vue: GlobalAPI) {
  Vue.cid = 0;
  /**
   * cid:constructor id
   * 组件复用时，区分组件
   * <hello></hello>
   * <hello></hello>
   */
  let cid = 1;

  /**
   * extendOptions类似 componentOptions，但 不包含 el 配置.el 是实例上的配置
   * extendOptions还可以是 Vue 类或者子类
   *
   */
  Vue.extend = function (extendOptions) {
    extendOptions = extendOptions || {};
    const Super = this;
    // const SuperId = Super.cid;
    const name =
      getComponentName(extendOptions) || getComponentName(Super.options);

    /** Vue 子类 */
    const Sub = function VueComponent(
      this: Component,
      options: ComponentOptions
    ) {
      this._init(options);
    };
    // Sub.prototype = Object.create(Super.prototype);
    // Sub.prototype.constructor = Sub;
    Object.setPrototypeOf(Sub.prototype, Super.prototype);
    Sub.cid = cid++;
    /**
     * 类似于 Vue.options 会被合并到 vue 实例上
     * Sub.options 合并所有父类的 options 和用户 options
     * Sub.options最终在创建 Sub 实例是，被合并到 Sub 类的实例的 $options 上
     */
    Sub.options = mergeOptions(Super.options, extendOptions);
    Sub["super"] = Super;

    if (name) {
      Sub.options.components = Sub.options.components || {};
      Sub.options.components[name] = Sub;
    }
    Sub.extend = Super.extend;

    return Sub as unknown as typeof Component;
  };
}
