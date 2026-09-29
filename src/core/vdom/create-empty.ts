import VNode from "./vnode";

export function createEmptyVNode(text: string = "") {
  const vnode = new VNode();
  vnode.isComment = true;
  vnode.text = text;
  return vnode;
}
