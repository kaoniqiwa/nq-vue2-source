import Watcher, { WatcherOptions } from 'core/observer/watcher';
import { warn } from 'core/util';
import { invokeWithErrorHandling } from 'core/util/error';
import { createEmptyVNode } from 'core/vdom/create-empty';
import VNode from 'core/vdom/vnode';
import { __DEV__, noop } from 'src/shared/util';
import { Component } from 'src/types/component';

export let activeInstance: any = null;

export function setActiveInstance(vm: Component) {
  const prevActiveInstance = activeInstance;
  activeInstance = vm;
  return () => {
    activeInstance = prevActiveInstance;
  };
}
export function lifecycleMixin(Vue: typeof Component) {
  /**将虚拟DOM，生成真实DOM */
  Vue.prototype._update = function (vnode: VNode) {
    const vm = this;
    // const prevEl = vm.$el;
    const prevVnode = vm._vnode;
    vm._vnode = vnode;
    const restoreActiveInstance = setActiveInstance(vm);

    if (!prevVnode) {
      /**
       * 没有 prevVnode 说明是第一次渲染,vm.$el 为 HtmlElemtn
       */
      vm.$el = vm.__patch__(vm.$el, vnode);
    } else {
      /** prevVnode 存在,说明是更新操作 */
      vm.$el = vm.__patch__(prevVnode, vnode);
    }
    restoreActiveInstance();
  };
}
export function initLifecycle(vm: Component) {
  vm._isMounted = false;
  vm._watcher = null;
}

export function mountComponent(vm: Component, el?: Element) {
  /**
   * vm.$el 初次挂载时指向将要被替换的 DOM 元素,
   * 但是挂载完成后 vm.$el 将在 _update() 中被替换为组件的根元素
   *
   */
  vm.$el = el;
  /**
   * 如果是 runtime+compiler 版本，一定有 render 函数
   * 当 runtime 版本时，不提供 render 函数，则需要报错
   */
  if (!vm.$options.render) {
    /**为了渲染时不报错，提供一个空的VNode */
    //@ts-expect-error
    vm.$options.render = createEmptyVNode;
    if (__DEV__) {
      if (
        (vm.$options.template &&
          String(vm.$options.template).charAt(0) != '#') ||
        vm.$options.el ||
        el
      ) {
        /**
         * runtime 版本且未提供 render
         *  1. new Vue({}).$mount('#app)
         *  2. new Vue({el:"#app"}).$mount('')
         */
        warn(
          'You are using the runtime-only build of Vue where the template ' +
            'compiler is not available. Either pre-compile the templates into ' +
            'render functions, or use the compiler-included build.',
          vm
        );
      } else {
        /**
         * runtime 版本且未提供 render
         * new Vue({}).$mount('')
         */
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        );
      }
    }
  }
  callHook(vm, 'beforeMount');

  const updateComponent = () => {
    vm._update(vm._render());
  };

  const watcherOptions: WatcherOptions = {
    /** 每次更新前调用 before() */
    before() {
      if (vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'beforeUpdate');
      }
    },
  };

  /**
   * 渲染 watcher,每个组件都有一个渲染 watcher,watcher 内部会调用 updateComponent()
   * updateComponent() 又会调用 vm._render(),
   * vm._render()的执行将触发数据属性的 getter 拦截器，从将依赖者(watcher) 收集
   * 当数据变化时，重新执行 updateComponent(),这就完成了重新渲染
   */
  new Watcher(vm, updateComponent, noop, watcherOptions, true);

  /**挂载完成后，vm.$el 更新为最新元素 */
  callHook(vm, 'mounted');
  vm._isMounted = true;

  return vm;
}

export function callHook(vm: Component, hook: string, args?: any[]) {
  // const info = `${hook} hook`;
  const handlers = vm.$options[hook];
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      invokeWithErrorHandling(handlers[i], vm);
    }
  }
}
