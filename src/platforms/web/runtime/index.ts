import _Vue from 'core/index';
import { isReservedTag, mustUseProp, query } from '../util';
import { inBrowser } from 'core/util';
import { mountComponent } from 'core/instance/lifecycle';
import { Component } from 'src/types/component';
import { patch } from './patch';
import { extend, noop } from 'src/shared/util';
import platformDirectives from './directives';
import platformComponents from './components';

const Vue: typeof Component = _Vue as unknown as typeof Component;

/** 配置平台特有的工具方法，覆盖默认配置 */
Vue.config.isReservedTag = isReservedTag;
Vue.config.mustUseProp = mustUseProp;

/**配置平台特有指令和组件 */
extend(Vue.options.directives, platformDirectives);
extend(Vue.options.components, platformComponents);

Vue.prototype.__patch__ = inBrowser ? patch : noop;

/**如果没有模版编译，则直接调用该函数 */
Vue.prototype.$mount = function (el?: string | Element) {
  el = el && inBrowser ? query(el) : undefined;
  return mountComponent(this, el);
};

export default Vue;
