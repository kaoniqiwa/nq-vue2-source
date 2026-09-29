import type { Component } from "src/types/component";
import { isNative, warn } from "core/util";
import { __DEV__, makeMap } from "src/shared/util";

const allowedGlobals = makeMap(
  "Infinity,undefined,NaN,isFinite,isNaN," +
    "parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent," +
    "Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl," +
    "require" // for Webpack/Browserify
);

const warnNonPresent = (target: Component, key: string) => {
  warn(
    `Property or method "${key}" is not defined on the instance but ` +
      "referenced during render. Make sure that this property is reactive, " +
      "either in the data option, or for class-based components, by " +
      "initializing the property. " +
      "See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.",
    target
  );
};

const warnReservedPrefix = (target: Component, key: string) => {
  warn(
    `Property "${key}" must be accessed with "$data.${key}" because ` +
      'properties starting with "$" or "_" are not proxied in the Vue instance to ' +
      "prevent conflicts with Vue internals" +
      "See: https://vuejs.org/v2/api/#data",
    target
  );
};

const hasProxy = typeof Proxy !== "undefined" && isNative(Proxy);

/** 模板中访问的属性在 vm 上不存在时，走 has 陷阱给出提示 */
const hasHandler = {
  has(target: any, key: string) {
    const has = key in target;
    /**
     * _ 开头的内部属性（如 _data）且不在 $data 中的，视为合法访问，
     * 不报「未定义」警告
     */
    const isAllowed =
      allowedGlobals(key) ||
      (typeof key === "string" &&
        key.charAt(0) === "_" &&
        !(key in target.$data));
    if (!has && !isAllowed) {
      if (key in target.$data) warnReservedPrefix(target, key);
      else warnNonPresent(target, key);
    }
    return has || !isAllowed;
  },
};

/** 渲染函数被 with 剥离过（编译产物）时，用 get 陷阱兜底 */
const getHandler = {
  get(target: any, key: string) {
    if (typeof key === "string" && !(key in target)) {
      if (key in target.$data) warnReservedPrefix(target, key);
      else warnNonPresent(target, key);
    }
    return (target as any)[key];
  },
};

let initProxy: (vm: Component) => void;

if (__DEV__ && hasProxy) {
  /**
   * 开发环境：给 vm 套一层 Proxy，
   * 渲染时引用了未定义/未代理的属性会打印警告，而不是静默 undefined
   */
  initProxy = function (vm: Component) {
    const options: any = vm.$options;
    const handlers =
      options.render && Reflect.get(options.render, "_withStripped")
        ? getHandler
        : hasHandler;
    vm._renderProxy = new Proxy(vm, handlers as any);
  };
} else {
  /** 生产环境（或浏览器不支持 Proxy）：直接用 vm 自身 */
  initProxy = function (vm: Component) {
    vm._renderProxy = vm;
  };
}

export { initProxy };
