import config from 'core/config';
import { __DEV__ } from 'shared/util';

export interface DepTarget {
  id: number;
  addDep(dep: Dep): void;
  update(): void;
}
let uid = 0;

export default class Dep {
  /**
   * Dep实例是在 defineReactive() 中被创建的,
   * 为了能将 watcher实例 添加入监听列表,需要Dep 静态属性作为中转
   */

  static target?: DepTarget | null;

  id: number;
  subs: Array<DepTarget | null>;

  constructor() {
    this.id = uid++;
    // console.log("dep:", this.id);
    this.subs = [];
  }
  /**
   * 收集依赖
   * 一个 watcher 对应多个 dep的情况:
   *    渲染函数: {{msg}}  {{age}}
   *  一个dep对应多个 watcher 的情况
   *    渲染函数:{{msg}}
   *    计算属性:{greet(){return this.msg + 'world'}}
   * 依赖去重:
   *    渲染函数: {{msg}} {{msg}}
   * 每次取 msg 时，dep 需要记住当前 watcher ,但是已经存在的 watcher 不需要重复 push
   * 源代码的去重是在 watcher 中进行
   *
   */
  depend() {
    if (Dep.target) {
      /**双向绑定 */
      Dep.target.addDep(this);
    }
  }

  /**通知依赖更新*/
  notify() {
    const subs = this.subs.filter((s) => s) as DepTarget[];

    if (__DEV__ && !config.async) {
    }
    subs.forEach((sub) => sub.update());
  }
  /** 真正的收集依赖 */
  addSub(sub: DepTarget) {
    this.subs.push(sub);
    // console.log(
    //   "depId:" + this.id + " host: " + this.host + " 依赖集合: ",
    //   this.subs
    // );
  }
  /** 解除 sub 对属性的观察，以后属性的变化，不再触发 sub 的更新 */
  removeSub(sub: DepTarget) {
    this.subs[this.subs.indexOf(sub)] = null;
  }
}

Dep.target = null;
// const targetStack: Array<DepTarget | null | undefined> = [];

export function pushTarget(target?: DepTarget) {
  // targetStack.push(target);
  Dep.target = target;
}
export function popTarget(target?: DepTarget) {
  // targetStack.pop();
  // Dep.target = targetStack[targetStack.length - 1];
  Dep.target = null;
}
