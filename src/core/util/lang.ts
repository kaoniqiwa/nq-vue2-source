import { Component, ObjectType } from "src/types/component";

export const unicodeRegExp =
  /a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD/;

export function def(obj: Object, key: string, val: any, enumerable?: boolean) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true,
  });
}

/**  字符串是否以 "$" 或者 "_" 开头 */
export function isReserved(str: string): boolean {
  const c = (str + "").charCodeAt(0);
  return c === 0x24 || c === 0x5f;
}
/**
 * bailRe=/[^a-zA-Z\u00B7\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u037D\u037F-\u1FFF\u200C-\u200D\u203F-\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD.$_\d]/
 */
const bailRE = new RegExp(`[^${unicodeRegExp.source}.$_\\d]`);
export function parsePath(path: string): any {
  /** 也就是 path 必须是 [a-zA-Z.$_\d]  */
  if (bailRE.test(path)) {
    return;
  }
  const segments = path.split(".");
  /**
   * 在 watcher 中会调用该函数，并将 vue 实例传入
   * 其实就是访问实例属性，从而触发依赖收集
   */
  return function (vm: Component) {
    /**
     * vm.a.b.c
     * 入口对象为 vm，
     * vm 当做普通对象看待
     */
    let obj: ObjectType = vm;
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return;

      obj = obj[segments[i]];
    }
    return obj;
  };
}
