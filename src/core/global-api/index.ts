import { GlobalAPI } from 'src/types/global-api';
import { initMixin } from './mixin';
import { mergeOptions, nextTick, warn } from 'core/util';
import { ASSET_TYPES } from 'src/shared/constants';
import { initAssetRegisters } from './assets';
import { initUse } from './use';
import { initExtend } from './extend';
import config from 'core/config';
import { __DEV__, extend } from 'shared/util';
import { Component } from 'src/types/component';
import { defineReactive, observe } from 'core/observer';
import builtInComponents from '../components/index';

export function initGlobalAPI(Vue: GlobalAPI) {
  const configDef: Record<string, any> = {};
  configDef.get = () => config;
  if (__DEV__) {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      );
    };
  }
  /**Vue 全局配置 */
  Object.defineProperty(Vue, 'config', configDef);

  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive,
  };
  Vue.options = Object.create(null);

  /**
   * Vue.options.components = {}
   * Vue.options.filters = {}
   * Vue.options.directives = {}
   *
   */
  ASSET_TYPES.forEach((type) => {
    Vue.options[type + 's'] = Object.create(null);
  });

  /** _base 会被合并到所有 instance.$options 中 */
  Vue.options._base = Vue;
  Vue.nextTick = nextTick;

  /** 让一个普通对象变成响应式对象，返回该对象本身 */
  Vue.observable = <T>(obj: T): T => {
    observe(obj);
    return obj;
  };

  extend(Vue.options.components!, builtInComponents);

  initUse(Vue);
  initMixin(Vue);
  initExtend(Vue);
  initAssetRegisters(Vue);
}
