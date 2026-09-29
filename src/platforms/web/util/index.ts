export * from "./element";
export * from "./attrs";

import { warn } from "core/util";
import { __DEV__ } from "src/shared/util";
//

/**
 * 如果是 string 类型，说明是 css selector,根据 selector 查找到 DOMElement
 * @param el string | Element
 * @returns Element
 */
export function query(el: string | Element): Element {
  if (typeof el === "string") {
    const selected = document.querySelector(el);
    if (!selected) {
      __DEV__ && warn("Cannot find element: " + el);
      /**为了生成渲染函数过程中不报错 */
      return document.createElement("div");
    }
    return selected;
  } else {
    return el;
  }
}
