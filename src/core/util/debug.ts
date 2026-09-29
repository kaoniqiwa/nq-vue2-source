import { __DEV__, noop } from "src/shared/util";
import { Component } from "src/types/component";
import config from "core/config";

export let warn: (msg: string, vm?: Component) => void = noop;
export let tip = noop;

if (__DEV__) {
  const hasConsole = typeof console !== "undefined";

  warn = (msg, vm?: Component) => {
    const trace = "";
    if (config.warnHandler) {
      config.warnHandler.call(null, msg, vm, trace);
    } else if (hasConsole && !config.silent) {
      console.error(`[Vue warn]: ${msg}${trace}`);
    }
  };
  tip = (msg: string, vm?: Component) => {
    if (hasConsole && !config.silent) {
      console.warn(`[Vue tip]: ${msg}`);
    }
  };
}
