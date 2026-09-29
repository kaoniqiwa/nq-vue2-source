import { Component } from "src/types/component";
import { VNodeComponentOptions, VNodeData } from "src/types/vnode";

export default class VNode {
  tag?: string;
  data: VNodeData | undefined;
  children?: Array<VNode> | null;
  text?: string;
  elm?: Node;
  ns?: string;
  context?: Component;
  componentOptions?: VNodeComponentOptions;
  key?: string | number;

  /**
   * <hello><div></div></hello>
   */

  /**
   * hello 标签会创建一个 componentVNode
   * 由于 hello 是组件，根据 componentOptions 创建一个组件实例 componentInstance
   *
   * componentInstance 的 parent 是 <hello>组件所在的组件
   *
   */
  componentInstance?: Component;

  /**
   * hello 标签对应一个 componentVNode
   * 它下面的 div 会创建 divVNode
   *
   * divVNode.parent == componentVNode
   */
  parent?: VNode | null;

  isComment: boolean;

  isRootInsert: boolean;

  constructor(
    tag?: string,
    data?: VNodeData,
    children?: Array<VNode> | null,
    text?: string,
    elm?: Node,
    context?: Component,
    componentOptions?: VNodeComponentOptions
  ) {
    this.tag = tag;
    this.data = data;
    this.children = children;
    this.text = text;
    this.elm = elm;
    this.ns = void 0;
    this.key = data && data.key;
    this.context = context;
    this.componentOptions = componentOptions;

    this.parent = undefined;

    this.isComment = false;
    this.isRootInsert = true;
  }
}
