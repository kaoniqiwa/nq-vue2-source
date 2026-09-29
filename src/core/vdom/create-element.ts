import { Component } from "src/types/component";
import VNode from "./vnode";
import { VNodeChildren, VNodeData } from "src/types/vnode";
import { isDef, isPrimitive } from "src/shared/util";
import { createEmptyVNode } from "./create-empty";
import config from "core/config";
import { resolveAsset } from "core/util";
import { createComponent } from "./create-component";
export function createElement(
  context: Component,
  tag?: string,
  data?: VNodeData,
  children?: VNodeChildren
) {
  /**
   * render:(h)=>h('div','hello') 没有 data 时
   */
  if (Array.isArray(data) || isPrimitive(data)) {
    children = data as VNodeChildren;
    data = undefined;
  }

  return _createElement(context, tag, data, children);
}

function _createElement(
  context: Component,
  tag?: string,
  data?: VNodeData,
  children?: VNodeChildren
) {
  /**render:(h)=>h('') */
  if (!tag) {
    return createEmptyVNode();
  }
  let vnode: VNode | undefined;

  /**
   * tag 为字符串时有两种形式:
   * <div>hello</div>
   * <counter></counter>
   */
  if (typeof tag === "string") {
    if (config.isReservedTag(tag)) {
      /** 普通 html 标签 */
      vnode = new VNode(tag, data, children, undefined, undefined, context);
    } else {
      /** 获取组件构造函数 */
      let Ctor = resolveAsset(context.$options, "components", tag);

      if (Ctor) {
        vnode = createComponent(Ctor, data, context, children, tag);
      }
    }
  } else {
  }
  if (isDef(vnode)) {
    return vnode;
  } else {
    return createEmptyVNode();
  }
}
