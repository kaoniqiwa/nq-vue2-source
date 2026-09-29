import {
  __DEV__,
  hasOwn,
  isArray,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
} from "shared/util";
import { arrayMethods, methodsToPatch } from "./array";
import { hasProto, warn } from "core/util";
import { def } from "core/util";
import Dep from "./dep";
import { ObjectType } from "src/types/component";

const NO_INITIAL_VALUE = {};

export function observe(value: any) {
  if (value && isObject(value)) {
    /** ESNEXT API*/
    if (Object.hasOwn(value, "__ob__") && value.__ob__ instanceof Observer) {
      /** 已经劫持过 */
      return value.__ob__ as Observer;
    } else {
      if (
        (isPlainObject(value) || Array.isArray(value)) &&
        Object.isExtensible(value) // 需要给 value 添加 __ob__ 属性
      ) {
        /**
         * 使用 Object.freeze()冻结对象，使之不能扩展，也就不会进行数据观测，
         * 对于业务上不需要观测的数据，可以提高性能 */
        return new Observer(value);
      }
    }
  }
}

export class Observer {
  /** 给数组使用的Dep */
  dep: Dep;

  constructor(public value: object) {
    def(value, "__ob__", this);
    this.dep = new Dep();
    if (Array.isArray(value)) {
      if (hasProto) {
        Object.setPrototypeOf(value, arrayMethods);
      } else {
        /** arrayMethods 属性不可遍历,无法使用 Object.keys() */
        // let keys = Object.getOwnPropertyNames(arrayMethods);
        // let keys = Reflect.ownKeys(arrayMethods);
        let keys = methodsToPatch;
        keys.forEach((key) => def(value, key, arrayMethods[key]));
      }
      this.observeArray(value);
    } else {
      this.walk(value);
    }
  }
  walk(obj: Object) {
    /**
     * 实例的数据必须可枚举，所以一般不用 data=Object.create(null,{...}) 来定义数据
     *  */
    Object.keys(obj).forEach((key) => {
      defineReactive(obj, key as keyof typeof obj, NO_INITIAL_VALUE);
    });
  }
  /** 劫持数组元素 [{a:1}] */
  observeArray(arr: any[]) {
    arr.forEach((val) => observe(val));
  }
}

export function defineReactive(obj: Object, key: keyof typeof obj, val?: any) {
  /**
   * 每个属性都对应一个 Dep 实例
   * 一个 Dep 实例保存多个 Watcher 实例
   * 这个 Dep 是给 PlainObject 使用
   * 数组需要更复杂的操作
   *
   * {
   *    list:[1,2]
   * }
   * vm.list = 1 会触发 list 映射的 Dep 更新
   * 但是 vm.list.push(0) 由于没有更改 list 的值，所以不会触发 list 映射的 Dep 更新
   * 对于数组，需要给数组额外添加 Dep,当调用数组 API 时，触发该 Dep 更新
   */
  const dep = new Dep();

  const descriptor = Object.getOwnPropertyDescriptor(obj, key);

  /**  由于要修改configurable,所以原始configurable不能为false */
  if (!!descriptor?.configurable === false) {
    return;
  }
  /**
   * 如果之前该对象已经预设了getter以及setter函数则将其取出来，
   * 新定义的getter/setter中会将其执行，保证不会覆盖之前已经定义的getter/setter。
   */
  const getter = descriptor?.get;
  const setter = descriptor?.set;
  if (
    (!getter || setter) &&
    (val === NO_INITIAL_VALUE || arguments.length === 2)
  ) {
    val = obj[key];
  }

  /** 递归劫持子对象 */
  let childOb = observe(val);

  /**
   * template:{{age}}
   * data:{age:{a:1}}
   * 1. 获取 age 走一次 get 访问器
   * 2. 返回的结果是对象 {a:1},对象给渲染函数时，为了能在页面上展示数据，需要将对象转成字符串
   * 3. JSON.stringify({a:1}) 会遍历对象取值，从而再次进入 get 访问器()，导致 age 对应的依赖，a 也会收集
   */
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      const value = getter ? getter.call(obj) : val;

      /**
       * {
       *  list:[1,2]
       * }
       * vm.list = [3]
       * 由于是更改对象属性，所以 list 属性映射的 Dep 会通知更新
       *
       * vm.list.push(3)
       * 对于数组操作，需要给 [1,2] 数组映射一个 Dep，[1,2].dep = new Dep(),当 操作 push()时
       * 就通过 [1,2].dep.notify()
       */
      if (Dep.target) {
        dep.depend();

        if (childOb) {
          childOb.dep.depend();

          /**
           * value当前值:['hello',{a:1},[1,2]],
           * 内层数组 [1,2] 依然需要收集当前依赖
           */
          if (isArray(value)) dependArray(value);
        }
      }
      return value;
    },
    set: function reactiveSetter(newVal) {
      const value = getter ? getter.call(obj) : val;

      if (Object.is(value, newVal)) {
        return;
      }
      if (setter) {
        setter.call(obj, newVal);
      } else if (getter) {
        return;
      } else {
        val = newVal;
      }
      /** 设置新值，需要重新劫持 */
      childOb = observe(newVal);

      dep.notify();
    },
  });
}

export function set(
  target: Array<any> | ObjectType,
  key: PropertyKey,
  val: any
) {
  if (__DEV__) {
    if (isUndef(target) || isPrimitive(target)) {
      warn(
        `Cannot set reactive property on undefined, null, or primitive value: ${target}`
      );
    }
  }
  if (isArray(target)) {
    return;
  }
  if (hasOwn(target, key)) {
  }

  target[key] = val;
  return val;
}
function dependArray(val: Array<any>) {
  val.forEach((v) => {
    if (isArray(v)) {
      (v as any).__ob__.dep.depend();

      dependArray(v);
    }
  });
}
