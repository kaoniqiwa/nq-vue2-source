import { ToFunctionResult } from './compiler';
import { Component } from './component';
import { ComponentOptions } from './options';

export interface GlobalAPI {
  cid: number;
  options: ComponentOptions;
  util: Object;
  extend: (options?: ComponentOptions | typeof Component) => typeof Component;
  nextTick: (fn: Function, context?: Object) => void | Promise<any>;
  mixin: (mixin: ComponentOptions) => GlobalAPI;
  component: (
    id: string,
    def?: typeof Component | Object | Function
  ) => typeof Component | Function | void;
  directive: (id: string, def?: Function | Object) => Function | Object;
  filter: (id: string, def?: Function) => Function | Object;
  compile: (template: string) => ToFunctionResult;
  use: (this: GlobalAPI, plugin: any) => GlobalAPI;
  /** 让一个普通对象变成响应式对象 */
  observable: <T>(obj: T) => T;
  /** Vue.use 已安装的插件列表 */
  _installedPlugins?: Array<any>;
}
