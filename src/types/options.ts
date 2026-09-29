import VNode from "core/vdom/vnode";
import { Component, FuncType } from "./component";

export type ComponentOptions = {
  [key: string]: any;

  // data
  data?: object | Function;
  props?:
    | string[]
    | Record<string, Function | Array<Function> | null | PropOptions>;

  _isComponent?: boolean;
  methods?: { [key: string]: Function };
  computed?: {
    [key: string]:
      | FuncType
      | {
          get?: FuncType;
          set?: FuncType;
          cache?: boolean;
        };
  };
  watch?: { [key: string]: Function | string };

  //DOM
  el?: string | Element;
  template?: string | Element;
  /**
   *
   * 内部编译出的渲染函数: function anonymous(){_c('div')}
   * 用户传入的渲染函数:function(h){return h('div')}
   * 为了运行通过在 mountComponent 中 render=function(text){return new VNode()}
   */
  render?: (h?: () => VNode) => VNode;

  // lifecycle

  //assets
  components?: { [key: string]: ComponentOptions | typeof Component };
  // filters?: { [key: string]: Function };
  // directives?: { [key: string]: object };

  // misc
  delimiters?: [string, string];
  comments?: boolean;

  name?: string;

  // _base: typeof Component;
};

export type PropOptions = {
  type?: Function | Array<Function> | null;
  default?: any;
  required?: boolean | null;
  validator?: Function | null;
};
export interface InternalComponentOptions extends ComponentOptions {
  _isComponent: true;
  parent: Component;
  _parentVnode: VNode;
  staticRenderFns?: Array<Function>;
}
