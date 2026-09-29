import VNode from "core/vdom/vnode";
import * as nodeOps from "web/runtime/node-ops";
import { Component } from "./component";

export interface VNodeData {
  key?: string | number;
  staticClass?: string;
  class?: any;
  staticStyle?: { [key: string]: any };
  style?: Array<Object> | Object;
  normalizedStyle?: Object;
  attrs?: { [key: string]: string };
  domProps?: { [key: string]: any };

  hook?: { [key: string]: Function & { _merged: boolean } };
}

export type VNodeChildren = Array<VNode>;

export interface PatchModuleFn {
  (oldVnode: VNode, vnode: VNode): void;
}
export interface PatchModuleOptions {
  create?: PatchModuleFn;
  activate?: PatchModuleFn;
  update?: PatchModuleFn;
  remove?: PatchModuleFn;
  destroy?: PatchModuleFn;
}
export interface PatchOptions {
  nodeOps: typeof nodeOps;
  modules: Array<PatchModuleOptions>;
}

export interface VNodeComponentOptions {
  Ctor: typeof Component;
  propsData?: object;
  listeners?: object;
  children?: VNode[];
  tag?: string;
}

export type VNodeWithData = VNode & {
  tag: string;
  data: VNodeData;
  children: Array<VNode>;
  text?: string;
  elm: any;
  ns?: string;
  context: Component;
  key?: string | number;
  parent?: VNodeWithData;
  componentOptions?: VNodeComponentOptions;
  componentInstance?: Component;
  isRootInsert: boolean;
};
