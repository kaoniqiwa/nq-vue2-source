// @ts-expect-error firebox support
export const nativeWatch = {}.watch;

export const hasProto = "__proto__" in {};

export const inBrowser = typeof window !== "undefined";

export const UA = inBrowser && window.navigator.userAgent.toLowerCase();
export const isIE = UA && /msie|trident/.test(UA);
export const isIOS = UA && /iphone|ipad|ipod|ios/.test(UA);

/** 浏览器内部函数 */
export function isNative(Ctor: any) {
  return typeof Ctor === "function" && /native code/.test(Ctor.toString());
}

/** Reflect.ownKeys = 所有字符串属性 + 所有 symbol 属性 */
export const hasSymbol =
  typeof Symbol !== "undefined" &&
  isNative(Symbol) &&
  typeof Reflect !== "undefined" &&
  isNative(Reflect.ownKeys);

let _Set: any;
if (typeof Set !== "undefined" && isNative(Set)) {
  _Set = Set;
} else {
  _Set = class Set implements SimpleSet {
    set: Record<string, boolean> = Object.create(null);

    has(key: string | number): boolean {
      return this.set[key];
    }
    add(key: string | number) {
      this.set[key] = true;
    }
    clear(): void {
      this.set = Object.create(null);
    }
  };
}
export { _Set };

export interface SimpleSet {
  has(key: string | number): boolean;
  add(key: string | number): any;
  clear(): void;
}

let _isServer: boolean;
export const isServerRendering = () => {
  if (_isServer === undefined) {
    if (!inBrowser && typeof global !== "undefined") {
      _isServer =
        global["process"] && global["process"].env.VUE_ENV === "server";
    } else {
      _isServer = false;
    }
  }
  return _isServer;
};
