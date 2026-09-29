import { observe } from 'core/observer';
import Dep from 'core/observer/dep';
import Watcher, { WatcherOptions } from 'core/observer/watcher';
import { isReserved, isServerRendering, nativeWatch, warn } from 'core/util';
import {
  __DEV__,
  hasOwn,
  isArray,
  isFunction,
  isPlainObject,
  noop,
} from 'src/shared/util';
import { Component, ObjectType } from 'src/types/component';
import { ComponentOptions } from 'src/types/options';

export function stateMixin(Vue: typeof Component) {
  const dataDef: Pick<PropertyDescriptor, 'get' | 'set'> = {
    get(this: Component) {
      return this._data;
    },
  };
  if (__DEV__) {
    dataDef.set = function (this: Component) {
      warn(
        'Avoid replacing instance root $data. ' +
          'Use nested data properties instead.',
        this
      );
    };
  }

  /** 访问 $data 就是访问 _data, _data 已经经过响应式处理 */
  Object.defineProperty(Vue.prototype, '$data', dataDef);

  Vue.prototype.$watch = function (
    expOrFn: string | (() => any),
    cb: Function | ObjectType,
    options?: WatcherOptions & { immediate?: boolean }
  ) {
    const vm: Component = this;
    /**
     * cb 除了是函数还可能是一个对象,该对象的 handler 属性值将作为 cb 的值
     * {
     *    handler:function (newVal, oldVal) {...}
     *    deep:true
     * }
     */
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options);
    }
    options = options || {};
    options.user = true;

    const watcher = new Watcher(vm, expOrFn, cb, options);
    /**
     * 立即取一次值，然后执行回调
     * 由于第一次没有oldVal，所以回调参数为 cb(undefined,newVal)
     *
     */
    if (options.immediate) {
    }
    return function unwatchFn() {
      watcher.teardown();
    };
  };
}
export function initState(vm: Component) {
  vm._watchers = [];
  const opts = vm.$options;

  if (opts.props) {
    initProps();
  }
  if (opts.data) {
    initData(vm);
  } else {
    vm._data = {};
  }
  if (opts.methods) {
    initMethods(vm, opts.methods);
  }
  if (opts.computed) {
    initComputed(vm, opts.computed);
  }
  if (opts.watch && opts.watch != nativeWatch) {
    initWatch(vm, opts.watch);
  }
}

function initProps() {}

function initData(vm: Component) {
  let d = vm.$options.data;
  /** 获得对象类型数据 */
  let data = isFunction(d) ? getData(d, vm) : d || {};
  vm._data = data;
  if (!isPlainObject(data)) {
    data = {};
    __DEV__ &&
      warn(
        'data functions should return an  object:\n' +
          'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
        vm
      );
  }

  const props = vm.$options.props;
  const methods = vm.$options.methods;

  Object.keys(data).forEach((key) => {
    if (methods && Object.hasOwn(methods, key)) {
      console.warn(
        `Method "${key}" has already been defined as a data property.`
      );
    }
    if (props && Object.hasOwn(props, key)) {
      console.warn(
        `The data property "${key}" is already declared as a prop. ` +
          `Use prop default value instead.`
      );
    }
    /**
     * 属性名不是 $xxx或者 _xxx，则将属性代理到 vue 实例上
     * vm.msg => vm._data.msg
     * 无效的属性名:
     * data:{
     *    $msg:'hello',
     *    _data:10
     * }
     */
    if (!isReserved(key)) {
      proxy(vm, '_data', key);
    }
  });
  /** 劫持数据 */
  observe(data);
}

function initMethods(vm: Component, methods: Record<string, Function>) {
  let props = vm.$options.props;
  for (let key in methods) {
    if (__DEV__) {
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[
            key
          ]}" in the component definition. ` +
            `Did you reference the function correctly?`,
          vm
        );
      }
      if (props && hasOwn(props, key)) {
        warn(`Method "${key}" has already been defined as a prop.`, vm);
      }
      if (key in vm && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
            `Avoid defining component methods that start with _ or $.`
        );
      }
    }
    vm[key] = typeof methods[key] !== 'function' ? noop : methods[key].bind(vm);
  }
}

/** lazy 计算属性的 watcher 不会立即执行 getter 操作 */
const computedWatcherOptions = { lazy: true };

function initComputed(vm: Component, computed: Record<string, any>) {
  console.log(computed);
  const watchers = (vm._computedWatchers = Object.create(null));
  /** 服务端渲染  */
  const isSSR = isServerRendering();

  for (let key in computed) {
    const userDef = computed[key];
    const getter = isFunction(userDef) ? userDef : userDef.get;
    if (__DEV__ && getter == null) {
      warn(`Getter is missing for computed property "${key}".`, vm);
    }
    if (!isSSR) {
      /** 保存计算属性的 watcher 到 vm._computedWatchers 上 */
      watchers[key] = new Watcher(
        vm,
        getter || noop,
        noop,
        computedWatcherOptions
      );
    }
    if (!(key in vm)) {
      /** 将计算属性映射到 vue 实例上 */
      defineComputed(vm, key, userDef);
    } else if (__DEV__) {
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm);
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(
          `The computed property "${key}" is already defined as a prop.`,
          vm
        );
      } else if (vm.$options.methods && key in vm.$options.methods) {
        warn(
          `The computed property "${key}" is already defined as a method.`,
          vm
        );
      }
    }
  }
}

function initWatch(vm: Component, watch: Record<string, any>) {
  for (let key in watch) {
    const handler = watch[key];
    if (isArray(handler)) {
    } else {
      createWatcher(vm, key, handler);
    }
  }
}

// this 指向 Vue 实例,可以拿到 props 属性
function getData(data: Function, vm: Component): object {
  try {
    return data.call(vm, vm);
  } catch (e: any) {
    console.error('[Vue warn]' + e);
    return {};
  }
}

function proxy(target: Object, sourceKey: string, key: string) {
  /** 源码是在全局定义 sharedPropertyDefinition */
  const sharedPropertyDefinition = {
    enumerable: true,
    configurable: true,
    get: function proxyGetter(this: ObjectType) {
      return this[sourceKey][key];
    },
    set: function (this: ObjectType, val: any) {
      this[sourceKey][key] = val;
    },
  };
  Object.defineProperty(target, key, sharedPropertyDefinition);
}
function defineComputed(
  target: Component,
  key: string,
  userDef: Exclude<ComponentOptions['computed'], undefined>['key']
) {
  const shouldCache = !isServerRendering(); // true
  const sharedPropertyDefinition = {
    enumerable: true,
    configurable: true,
    get: noop,
    set: noop,
  };
  if (isFunction(userDef)) {
    /**
     * 计算属性值为一个函数，则这个函数就是 getter 访问器,getter 访问器会在 watcher 中被调用
     * computed:{
     *  full(){
     *    return 'hello'
     *  }
     * }
     */
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef);
  } else {
    /**
     * 计算属性值为一个对象时
     * computed:{
     *    full:{
     *      get(){},
     *      set(val){}
     *    }
     * }
     * 表达式:undefined !== false 结果为 true
     */
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop;
    sharedPropertyDefinition.set = userDef.set || noop;
  }
  /** 未设置 set 访问器且调用 set 访问器时，报错 */
  if (__DEV__ && sharedPropertyDefinition.set === noop) {
    sharedPropertyDefinition.set = function (this: Component) {
      warn(
        `Computed property "${key}" was assigned to but it has no setter.`,
        this
      );
    };
  }
  /** 将计算属性映射到 vm 实例上 */
  Object.defineProperty(target, key, sharedPropertyDefinition);
}

/**
 *
 * 由于需要使用缓存功能，则通过 key 在 vm._computedWatchers 找到对应的 watcher，
 * 获取 watcher 的 value 值
 */
function createComputedGetter(key: string) {
  return function computedGetter(this: Component) {
    const watcher = this._computedWatchers && this._computedWatchers[key];
    if (watcher) {
      if (watcher.dirty) {
        watcher.evaluate();
      }
      if (Dep.target) {
        watcher.depend();
      }
      return watcher.value;
    }
  };
}
/** 服务端不需要缓存，直接调用 getter 访问器 */
// 高阶函数:参数为函数或者返回值为函数
function createGetterInvoker(fn: Function) {
  return function computedGetter(this: Component) {
    return fn.call(this, this);
  };
}

function createWatcher(
  vm: Component,
  expOrFn: string | (() => any),
  handler: any,
  options?: Object
) {
  return vm.$watch(expOrFn, handler, options);
}
