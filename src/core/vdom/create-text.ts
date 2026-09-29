import VNode from "./vnode";

export function createTextVNode(val: string | number) {
  return new VNode(undefined, undefined, undefined, String(val));
}
