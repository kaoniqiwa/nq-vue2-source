import VNode from 'core/vdom/vnode';
import { ComponentOptions } from './options';
import { VNodeChildren, VNodeData } from './vnode';
import Watcher from 'core/observer/watcher';
import { Config } from 'core/config';
import { ToFunctionResult } from './compiler';

export declare class Component {
  constructor(options?: ComponentOptions);

  static cid: number;
  static super: typeof Component;
  static config: Config;
  static options: Record<string, any>;
  static compile: (template: string) => ToFunctionResult;

  /**公有属性 */
  $options: ComponentOptions;
  $el: any; // 真实 DOM 元素,由于需要添加额外属性，这里就不声明为 Element
  $data: Record<string, any>;
  $vnode?: VNode;

  /** 公有方法 */
  $mount: (el?: Element | string) => Component & { [key: string]: any };
  $nextTick: (fn: (...args: any[]) => any) => void | Promise<any>;
  $watch: (
    expOrFn: string | (() => any),
    cb: Function,
    options?: Record<string, any>
  ) => Function;

  /** 私有属性 */
  _uid: number | string;
  _data: Record<string, any>;
  _isMounted: boolean;
  _self: Component;
  _isVue: boolean;
  /** 避免 vue 实例被观测 */
  __v_skip: boolean;
  _watcher: Watcher | null;
  _vnode?: VNode | null;
  _computedWatchers: { [key: string]: Watcher };
  _watchers: Watcher[];

  /** 私有方法 */
  _init: Function;
  _render: () => VNode;
  _update: (vnode: VNode) => void;
  _c: (tag?: string, data?: VNodeData, children?: VNodeChildren) => VNode;
  $createElement: (
    tag?: string,
    data?: VNodeData,
    children?: VNodeChildren
  ) => VNode;
  __patch__: (el: Element | VNode, vnode: VNode) => void;

  [key: string]: any;
}

export interface FuncType<T = any> {
  (...args: any[]): T;
}
export interface ObjectType {
  [key: PropertyKey]: any;
}
export interface ObjectFuncType {
  [key: PropertyKey]: FuncType;
}
