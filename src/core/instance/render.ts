import VNode from 'core/vdom/vnode';
import { Component } from 'src/types/component';
import { installRenderHelpers } from './render-helpers';
import { VNodeChildren, VNodeData } from 'src/types/vnode';
import { createElement } from 'core/vdom/create-element';
import { createEmptyVNode } from 'core/vdom/create-empty';
import { __DEV__, isArray } from 'src/shared/util';
import { nextTick, warn } from 'core/util';

export function renderMixin(Vue: typeof Component) {
  installRenderHelpers(Vue.prototype);

  /**执行渲染函数，生成虚拟DOM VNode */
  Vue.prototype._render = function () {
    const vm = this;
    const { render, _parentVnode } = vm.$options;
    vm.$vnode = _parentVnode;
    // console.log(render);
    let vnode;
    /**
     * 在调用render之前，如果render为undefined,mountComponent 中会给 render 赋值
     * 这里的 this 用 _renderProxy 而不是 vm：
     * 开发环境它是一个 Proxy，渲染中访问了未定义的属性会打印警告
     */
    vnode = render!.call(vm._renderProxy, vm.$createElement);
    // console.log(vnode);

    /**
     * template: "<script>ss</" + "script>"时，渲染函数返回 null
     */
    if (!(vnode instanceof VNode)) {
      if (__DEV__ && isArray(vnode)) {
        warn(
          'Multiple root nodes returned from render function. Render function ' +
            'should return a single root node.',
          vm
        );
      }
      vnode = createEmptyVNode();
    }
    /**
     *  Vue.component("hello", {
     *    template: "<div>hello</div>",
     *   }
     * );
     *
     * vnode 指向 div 产生的VNode
     * _parentVnode 指向 hello 产生的 VNode
     *
     */
    vnode.parent = _parentVnode;
    return vnode;
  };

  Vue.prototype.$nextTick = function (fn?: (...args: any[]) => any) {
    return nextTick(fn, this);
  };
}

export function initRender(vm: Component) {
  vm._vnode = null;
  // const options = vm.$options;
  // const parentVnode = (vm.$vnode = options._parentVnode);

  vm._c = (tag?: string, data?: VNodeData, children?: VNodeChildren) =>
    createElement(vm, tag, data, children);
  vm.$createElement = (
    tag?: string,
    data?: VNodeData,
    children?: VNodeChildren
  ) => createElement(vm, tag, data, children);
}
