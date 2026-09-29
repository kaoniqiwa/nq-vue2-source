import { Component } from 'src/types/component';
import Dep, { DepTarget, popTarget, pushTarget } from './dep';
import { __DEV__, isFunction, noop } from 'src/shared/util';
import { SimpleSet, _Set as Set, parsePath, warn } from 'core/util/';
import { queueWatcher } from './scheduler';
import { traverse } from './traverse';

let uid = 0;

export interface WatcherOptions {
  deep?: boolean;
  user?: boolean;
  lazy?: boolean;
  sync?: boolean;
  before?: Function;
}

export default class Watcher implements DepTarget {
  vm: Component;
  /**uid号 */
  id: number;
  /**原始表达式,方便观察 watcher 的来源 */
  expression: string;
  /**数据变化后的回调函数 */
  cb: Function;

  /** 是否立即获取数据 */
  lazy: boolean;
  /** 是否深度观测 */
  deep: boolean;
  /** 当前 watcher 是用户定义的还是 Vue 内部定义的(渲染函数 watcher 和计算属性 watcher) */
  user: boolean;
  /** 当数据变化时是否同步求值，默认是异步等待所有数据变化结束后统一求值 */
  sync: boolean;

  dirty: boolean;
  /** 当前 watcher 是否为激活状态，默认 true，可在 teardown() 中设为 false */
  active: boolean;

  /** 数据变化后，在更新之前调用该钩子 */
  before?: Function;

  /**取值函数 */
  getter: Function;
  depIds: SimpleSet;
  newDepIds: SimpleSet;

  deps: Array<Dep>;
  newDeps: Array<Dep>;

  value: any;

  constructor(
    vm: Component,
    expOrFn: string | (() => any),
    cb: Function,
    options?: WatcherOptions | null,

    isRenderWatcher?: boolean
  ) {
    this.vm = vm;
    if (vm && isRenderWatcher) {
      /**渲染函数的 watcher  */
      vm._watcher = this;
    }
    vm._watchers.push(this);

    if (options) {
      this.lazy = !!options.lazy;
      this.deep = !!options.deep;
      this.user = !!options.user;
      this.sync = !!options.sync;
      this.before = options.before;
    } else {
      this.lazy = false;
      this.deep = false;
      this.user = false;
      this.sync = false;
    }
    this.id = ++uid;
    this.cb = cb;
    this.dirty = this.lazy;
    this.active = true;

    // console.log("watcher:", this.id);
    this.deps = [];
    this.depIds = new Set();

    this.newDeps = [];
    this.newDepIds = new Set();

    this.expression = __DEV__ ? expOrFn.toString() : '';
    if (isFunction(expOrFn)) {
      this.getter = expOrFn;
    } else {
      this.getter = parsePath(expOrFn);
      if (!this.getter) {
        /**  expOrFn 字符串时非法字符*/
        this.getter = noop;
        process.env.NODE_ENV !== 'production' &&
          warn(
            `Failed watching path: "${expOrFn}" ` +
              'Watcher only accepts simple dot-delimited paths. ' +
              'For full control, use a function instead.',
            vm
          );
      }
    }

    this.value = this.lazy ? undefined : this.get();
  }

  get() {
    // console.log("watcher get");
    pushTarget(this);
    let value;
    /**
     * watch:{
     *  "f.g.h":function(){....}
     * }
     * vm 是给字符串形式的 expOrFn 用的
     */
    const vm = this.vm;

    /**
     * 执行getter(),在 getter 中如果需要访问 vm 数据则会触发数据的 getter 访问器
     * 由于已经pushTarget(this)，Dep.target 指向当前 watcher 实例
     * 在 getter 访问器中通过 Dep.target 拿到 watcher 实例
     * 将 watcher 实例 push()到 Dep 中，完成依赖收集
     * 以后每次 vm 属性值发生改变时,遍历 Dep 保存的 watcher 实例数组，从而实现更新
     *
     */
    try {
      value = this.getter.call(vm, vm);
    } catch (e) {
    } finally {
      /** deep watch：递归读取所有子属性，把嵌套数据的依赖也收集进来 */
      if (this.deep) {
        traverse(value);
      }
      popTarget();
      this.cleanupDeps();
    }

    return value;
  }
  addDep(dep: Dep): void {
    const id = dep.id;

    /**
     * 通过 newDepIds 避免重复收集依赖
     * {{name}} {{name}} 触发两次 getter => 触发两次 dep.depend() => 触发两次 addDep()
     */
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id);
      this.newDeps.push(dep);
      // if (!this.depIds.has(id)) {
      //   dep.addSub(this);
      // }
      dep.addSub(this);
    }
  }
  cleanupDeps() {}
  update(): void {
    if (this.lazy) {
    } else if (this.sync) {
      /**
       *  同步更新:每次属性的变化，都要重新渲染，将导致严重的性能问题
       */
    } else {
      /**
       * 将更新放到异步队列中
       */
      queueWatcher(this);
    }
  }

  run() {
    if (this.active) {
      // const value = this.get();
      // console.log(value);
    }
  }
  evaluate() {
    this.value = this.get();
    this.dirty = false;
  }
  depend() {}
  teardown() {
    if (this.active) {
      let i = this.deps.length;
      while (i--) {
        this.deps[i].removeSub(this);
      }
      this.active = false;
    }
  }
}
