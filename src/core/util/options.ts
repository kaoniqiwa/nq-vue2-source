import { ASSET_TYPES, LIFECYCLE_HOOKS } from 'src/shared/constants';
import config from '../config';
import { Component, ObjectType } from 'src/types/component';
import { set } from 'core/observer';
import {
  __DEV__,
  camelize,
  capitalize,
  extend,
  hasOwn,
  isArray,
  isBuiltInTag,
  isFunction,
  isPlainObject,
  toRawType,
} from 'shared/util';
import { hasSymbol, unicodeRegExp, warn } from '.';
import { GlobalAPI } from 'src/types/global-api';
import { ComponentOptions } from 'src/types/options';
const defaultStrat = function (parentVal: any, childVal: any): any {
  return childVal === undefined ? parentVal : childVal;
};
const strats = config.optionMergeStrategies;

if (__DEV__) {
  strats.el = function (parent: any, child: any, vm: Component, key: string) {
    if (!vm) {
      /**
       * 全局混入时，不能有 el 配置项
       */
      warn(
        `option "${key}" can only be used during instance ` +
          'creation with the `new` keyword.'
      );
    }
    return defaultStrat(parent, child);
  };
}
LIFECYCLE_HOOKS.forEach((hook) => (strats[hook] = mergeLifecycleHook));

/**生命周期合并为数组 */
function mergeLifecycleHook(
  parentVal?: Array<Function>,
  childVal?: Function | Array<Function>
) {
  /**
   *  childVal?
   *    存在
   *      parentVal?
   *        存在 res = parentVal.concat(childVal)
   *        不存在
   *          childVal
   *              是数组 res = childVal
   *              不是   res = [childVal]
   *    不存在
   *      res = parentVal
   *
   */
  return childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : isArray(childVal)
      ? childVal
      : [childVal]
    : parentVal;
}

ASSET_TYPES.forEach((type) => (strats[type + 's'] = mergeAssets));

/** assets 使用原型链合并 */
function mergeAssets(
  parentVal: ObjectType | undefined,
  childVal: ObjectType | undefined,
  vm: Component | undefined,
  key: PropertyKey
) {
  let res = Object.create(parentVal || null);
  if (childVal) {
    if (__DEV__) {
      assertObjectType(key, childVal, vm);
    }
    extend(res, childVal);
  }
  return res;
}
strats.data = function (parentVal: any, childVal: any, vm?: Component) {
  if (!vm) {
    /**
     * 全局混入:
     * parent是 Vue.options = {components:...,filters:...} 初始时并没有 data 属性，所以 parentVal 为 undefined
     * child:是Vue.mixin(...)参数，childValue 是 data 属性的值
     *
     *
     */

    if (childVal && !isFunction(childVal)) {
      if (__DEV__) {
        /**
         * 全局混入的 data 必须为一个返回对象的函数
         */
        warn(
          'The "data" option should be a function ' +
            'that returns a per-instance value in component ' +
            'definitions.',
          vm
        );
      }
      return parentVal;
    }
    return mergeDataOrFn(parentVal, childVal);
  }
  return mergeDataOrFn(parentVal, childVal, vm);
};

function mergeDataOrFn(parentVal: any, childVal: any, vm?: Component) {
  if (!vm) {
    /**
     * Vue.minxin({
     *  data:null
     * })
     * 丢弃此时 null 值，返回上次混入的 data 值
     */
    if (!childVal) {
      return parentVal;
    }

    /**
     * 第一次全局混入 data 时，原样返回
     */
    if (!parentVal) {
      return childVal;
    }
    /**
     * 第2,3,4,...次之后的全局混入 ，需要返回 mergedDataFn 函数，
     * mergedDataFn 会在 mergedInstanceDataFn() 中调用
     * 因为闭包关系，每次调用 mergedDataFn() 时， parentVal 和 childVal 为混入时的值
     * 比如 Vue.mix({data:1}) ,Vue.mixin({data:2}) Vue.mixin({data:3})
     *
     * 合并全局混入时: mergeData({data:3},mergeData({data:2},{data:1}))
     *
     */
    return function mergedDataFn() {
      return mergeData(
        isFunction(childVal) ? childVal.call(vm, vm) : childVal,
        isFunction(parentVal) ? parentVal.call(vm, vm) : parentVal
      );
    };
  } else {
    /**获取实例数据，在 initData中会调用 mergedInstanceDataFn.call(vm,vm) */
    return function mergedInstanceDataFn() {
      const instanceData = isFunction(childVal)
        ? childVal.call(vm, vm)
        : childVal;
      const defaultData = isFunction(parentVal)
        ? parentVal.call(vm, vm)
        : parentVal;

      if (instanceData) {
        return mergeData(instanceData, defaultData);
      } else {
        return defaultData;
      }
    };
  }
}

function mergeData(
  to: Record<string | symbol, any>,
  from: Record<string | symbol, any> | null,
  recursive = true
) {
  if (!from) return to;

  /** 合并所有属性 Object.ownProperNames() + Object.ownPropertySymbols() */
  const keys = hasSymbol ? Reflect.ownKeys(from) : Object.keys(from);

  for (let i = 0, l = keys.length; i < l; i++) {
    let key = keys[i];
    let toVal = to[key];
    let fromVal = from[key];

    if (!recursive || !hasOwn(to, key)) {
      /**
       * from {a:1}
       * to {b:2}
       * 合并: to {a:1,b:2}
       *
       * from { [Symbol('a'):111] }
       * to   { [Symbol('a'):222] }
       */
      // to[key] = fromVal;
      set(to, key, fromVal);
    } else if (
      toVal != fromVal &&
      isPlainObject(toVal) &&
      isPlainObject(fromVal)
    ) {
      /**
       * let obj = {a:1}
       * from {info:obj}
       * to   {info:obj}
       * 属性值为对象合并时，指向相同对象不需要合并
       */
      mergeData(toVal, fromVal);
    } else {
      /**
       * 属性值全都不是对象情况下，不需要合并，使用原始 to 的值
       * from {a:1}
       * to {a:2}
       * 不需要合并 to {a:2}
       *
       * from {info:{a:1}}
       * to {info:2}
       * 不需要合并 to {info:2}
       */
    }
  }

  return to;
}
strats.computed = strats.methods = function (
  parentVal: Object | undefined,
  childVal: Object | undefined,
  vm: Component | undefined,
  key: string
) {
  if (childVal && __DEV__) {
    assertObjectType(key, childVal, vm);
  }
  if (!parentVal) return childVal;
  const ret = Object.create(null);
  extend(ret, parentVal);
  /** 由于是简单的对象合并，childVal 可能会覆盖 parentVal  */
  if (childVal) extend(ret, childVal);
  return ret;
};

function assertObjectType(name: PropertyKey, value: any, vm?: Component) {
  if (!isPlainObject(value)) {
    warn(
      `Invalid value for option "${String(name)}": expected an Object, ` +
        `but got ${toRawType(value)}.`,
      vm
    );
  }
}

function checkComponents(options: ComponentOptions) {
  for (const key in options.components) {
    validateComponentName(key);
  }
}

function normalizeProps(options: Record<string, any>, vm?: Component | null) {}
function normalizeInject(options: Record<string, any>, vm?: Component | null) {}
function normalizeDirectives(options: Record<string, any>) {}
export function validateComponentName(name: string) {
  if (
    !new RegExp(`^[a-zA-Z][\\-\\.0-9_${unicodeRegExp.source}]*$`).test(name)
  ) {
    warn(
      'Invalid component name: "' +
        name +
        '". Component names ' +
        'should conform to valid custom element name in html5 specification.'
    );
  }
  /**
   * 组件名称不能是 slot,component
   * 组件名称不能是 html 标签，svg 标签
   */
  if (isBuiltInTag(name) || config.isReservedTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component ' +
        'id: ' +
        name
    );
  }
}
export function mergeOptions(
  parent: Record<string, any>,
  child: Record<string, any>,
  vm?: Component | null
) {
  /** 如果配置了组件，检查组件名是否合法 */
  if (__DEV__) {
    checkComponents(child);
  }

  /**
   * child 参数为 Vue 子类
   * 子类 options 会和父类 options 合并
   *
   */
  if (isFunction(child) && Reflect.has(child, 'cid')) {
    child = (child as unknown as GlobalAPI).options;
  }

  /** 各种形式的 props 规范化，统一处理 */
  normalizeProps(child, vm);
  normalizeInject(child, vm);
  normalizeDirectives(child);

  let option: Record<string, any> = {};

  /**合并 parent 和 child 公有的 Key  */
  for (let key in parent) {
    mergeField(key);
  }
  for (let key in child) {
    /**合并 child 独有的key */
    if (!hasOwn(parent, key)) {
      mergeField(key);
    }
  }
  function mergeField(key: string) {
    /**不同的 Key,采用不同合并策略 */
    let strat = strats[key] || defaultStrat;
    option[key] = strat(parent[key], child[key], vm, key);
  }
  return option as unknown as ComponentOptions;
}

/**
 * 在 实例的 $options 上寻找特定资源的定义,全局配置的资源已经合并到实例 $options 上
 * instance[type][id]
 */
export function resolveAsset(
  options: ComponentOptions,
  type: 'components',
  id: string,
  warnMissing?: boolean
) {
  if (typeof id !== 'string') return;
  const assets = options[type];

  if (assets) {
    if (Object.hasOwn(assets, id)) {
      return assets[id];
    }
    /** hello-world => helloWorld */
    const camelizedId = camelize(id);
    if (Object.hasOwn(assets, camelizedId)) {
      return assets[camelizedId];
    }

    /** helloWorld => HelloWorld */
    const PascalCaseId = capitalize(camelizedId);
    if (Object.hasOwn(assets, PascalCaseId)) {
      return assets[PascalCaseId];
    }

    /** assets 本身没有找到，则去原型链上找 */
    const res = assets[id];

    if (__DEV__ && warnMissing && !res) {
      /** 未找到资源 */
      warn('Failed to resolve ' + type.slice(0, -1) + ': ' + id);
    }
    return res;
  }
  return;
}
