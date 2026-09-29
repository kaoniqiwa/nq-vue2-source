import { Component } from 'src/types/component';
import { ComponentOptions, InternalComponentOptions } from 'src/types/options';
import { initState } from './state';
import { initRender } from './render';
import { mergeOptions } from 'core/util';
import { GlobalAPI } from 'src/types/global-api';
import { callHook, initLifecycle } from './lifecycle';
import { initEvents } from './events';
import { initProxy } from './proxy';

/** uid: vue 实例 唯一ID  */
let uid = 0;

export function initMixin(Vue: typeof Component) {
  Vue.prototype._init = function (options?: ComponentOptions) {
    const vm = this;
    this._uid = uid++;

    /** 在响应系统重，避免在 vue 实例上添加响应式数据*/
    vm._isVue = true;

    /** 在响应系统中，避免 vue 实例被观测 */
    vm.__v_skip = true;

    if (options && options._isComponent) {
      /** 创建自定义组件实例时，选项中有 _isComponent */
      initInternalComponent(vm, options as any);
    } else {
      /**
       * 不能直接传参 Vue.options，
       * 因为 vm 有可能是 Vue 的子类的实例
       * const Sub = Vue.extend({});
       * const s = new Sub()
       *
       * 我们需要获取构造函数上的 options ,并不是固定的 Vue.options
       */
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor as unknown as GlobalAPI),
        options || {},
        vm
      );
    }

    /** 开发环境给 vm 包一层 Proxy，渲染时引用未定义属性会告警 */
    initProxy(vm);

    vm._self = vm;
    initLifecycle(vm);
    initEvents(vm);
    initRender(vm);

    /**初始化之前，数据还未代理到 vm 实例上 */
    callHook(vm, 'beforeCreate');

    /** 初始化状态，处理 options 选项 */
    initState(vm);

    /**数据处理完成，数据已经代理到 vm 实例上 */
    callHook(vm, 'created');

    /** 自动挂载元素 */
    if (vm.$options.el) {
      vm.$mount(vm.$options.el);
    }
  };
}
function resolveConstructorOptions(Ctor: GlobalAPI) {
  let optioins = Ctor.options;

  return optioins;
}

function initInternalComponent(
  vm: Component,
  options: InternalComponentOptions
) {
  const opts = (vm.$options = Object.create((vm.constructor as any).options));
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode;
  opts.parent = options.parent;
  opts._parentVnode = parentVnode;

  const vnodeComponentOptions = parentVnode.componentOptions!;
  opts.propsData = vnodeComponentOptions.propsData;
  opts._parentListeners = vnodeComponentOptions.listeners;
  opts._renderChildren = vnodeComponentOptions.children;
  opts._componentTag = vnodeComponentOptions.tag;

  if (options.render) {
    opts.render = options.render;
    opts.staticRenderFns = options.staticRenderFns;
  }
}
