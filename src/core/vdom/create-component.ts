import { Component, ObjectType } from "src/types/component";
import { ComponentOptions, InternalComponentOptions } from "src/types/options";
import { VNodeData, VNodeWithData } from "src/types/vnode";
import VNode from "./vnode";
import { __DEV__, isFunction, isPlainObject, isUndef } from "shared/util";
import { warn } from "core/util";
import { activeInstance } from "core/instance/lifecycle";

const componentVNodeHooks: ObjectType = {
  init(vnode: VNodeWithData) {
    const child = (vnode.componentInstance = createComponentInstanceForVnode(
      vnode,
      activeInstance
    ));
    if (child) {
      /**
       *  需要挂载，在挂载过程中,vm.$el = path(...),实例获得真实DOM元素
       *  也就是 vnode.componentInstance.$el 就被赋值了 */
      child.$mount();
    }
  },
};

const hooksToMerge = Object.keys(componentVNodeHooks);

function installComponentHooks(data: VNodeData) {
  const hooks = data.hook || (data.hook = {});
  hooksToMerge.forEach((key) => {
    const existing = hooks[key];
    const toMerge = componentVNodeHooks[key];

    /**
     * existing 不存在，则返回 toMerge
     * existing 存在
     *    和 toMerge 相等
     *        已经合并过 无操作
     *        未合并过   合并
     *    和 toMerge 不相等，合并
     */
    if (existing != toMerge || !(existing && existing._merged)) {
      hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge;
    }
  });
}
function mergeHook(f1: Function, f2: Function) {
  const merged: Function & { _merged: boolean } = function (a: any, b: any) {
    f1(a, b);
    f2(a, b);
  };
  merged._merged = true;
  return merged;
}
export function getComponentName(options: ComponentOptions | Function) {
  if (typeof options === "function") {
    return options.name;
  } else {
    return options.name || options.__name || options._componentTag;
  }
}
export function createComponent(
  Ctor: typeof Component | ComponentOptions,
  data: VNodeData | undefined,
  context: Component,
  children?: Array<VNode>,
  tag?: string
) {
  let VueComponent: typeof Component;
  if (isUndef(Ctor)) return;

  const baseCtor = context.$options._base;
  /** 如果是组件配置选项，则调用 Vue.extend()转成 Vue 子类 */
  if (isPlainObject(Ctor)) {
    VueComponent = baseCtor.extend(Ctor);
  } else {
    VueComponent = Ctor;
  }
  /**
   * 组件配置选项无效
   * components:{
   *    hello:111
   * }
   */
  if (!isFunction(VueComponent)) {
    if (__DEV__) {
      warn(`Invalid Component definition: ${String(Ctor)}`, context);
    }
    return;
  }
  var name = getComponentName(VueComponent.options) || tag;
  data = data || {};

  /** 绑定一些钩子函数 */
  installComponentHooks(data);
  /** vue-component-1-counter */
  const vnode = new VNode(
    `vue-component-${VueComponent.cid}${name ? `-${name}` : ""}`,
    data,
    undefined,
    undefined,
    undefined,
    context,
    {
      Ctor: VueComponent,
      tag,
      propsData: undefined,
      listeners: undefined,
      children,
    }
  );
  return vnode;
}

export function createComponentInstanceForVnode(
  vnode: VNodeWithData,
  parent?: any
) {
  if (vnode.componentOptions) {
    const options: InternalComponentOptions = {
      _isComponent: true,
      _parentVnode: vnode,
      parent,
    };
    return new vnode.componentOptions.Ctor(options);
  }
}
