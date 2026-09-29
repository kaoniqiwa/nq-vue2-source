import { ModuleOptions } from 'src/types/compiler';
import { ObjectType } from 'src/types/component';

export const __DEV__ = process.env.NODE_ENV != 'production';
export function noop(...res: any[]) {}
export const no = (...res: any[]) => false;
export const isArray = Array.isArray;
export const emptyObject: Record<string, any> = Object.freeze({});
export const _toString = Object.prototype.toString;

export function genStaticKeys(modules: Array<ModuleOptions>) {
  return modules
    .reduce((keys: string[], module: ModuleOptions) => {
      return keys.concat(module.staticKeys || []);
    }, [])
    .join(',');
}
export function toString(val: any) {
  /**
   * val 如果是对象或者val是数组，但是数组中有对象，
   * JSON.stringify 会遍历对象，从而触发 defineReactive 中的 getter,
   * 从而实现有关对象的依赖收集
   */
  return val == null
    ? ''
    : isArray(val) || (isPlainObject(val) && val.toString === _toString)
    ? JSON.stringify(val, null, 2)
    : String(val);
}
export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

export function isObject(o: any): boolean {
  return o !== null && (typeof o === 'function' || typeof o === 'object');
}

export function isPlainObject(o: any): o is ObjectType {
  return (
    isObject(o) &&
    Object.prototype.toString.call(o) === '[object Object]' &&
    /** 对象是 Object 实例而不是自定义类实例 */
    (typeof o.constructor !== 'function' || o.constructor.name === 'Object')
  );
}

/** Object.hasOwn(obj,key) */
const hasOwnProperty = Object.prototype.hasOwnProperty;
export function hasOwn(obj: Object | Array<any>, key: PropertyKey): boolean {
  return hasOwnProperty.call(obj, key);
}

// Object.is(a,b)的polyfill
export function hasChanged(x: unknown, y: unknown): boolean {
  if (x === y) {
    // 一般返回false
    // 特殊情况 0和-0应该返回true, => Infinity和-Infinity
    return x === 0 && 1 / x !== 1 / (y as number);
  } else {
    // 一般返回true,
    // 特殊情况 NaN应该返回false
    return x === x || y === y;
  }
}

export function extend(
  to: Record<PropertyKey, any>,
  _from?: Record<PropertyKey, any>
) {
  for (let key in _from) {
    to[key] = _from[key];
  }
  return to;
}

/** 把类数组（arguments、NodeList）转成真数组，可指定起始下标 */
export function toArray(list: any, start?: number): Array<any> {
  start = start || 0;
  let i = list.length - start;
  const ret: Array<any> = new Array(i);
  while (i--) {
    ret[i] = list[i + start];
  }
  return ret;
}

export function makeMap(str: string, expectsLowerCase?: boolean) {
  const map: Record<string, boolean> = Object.create(null);

  const list = str.split(',');
  list.forEach((key) => (map[key] = true));

  return expectsLowerCase
    ? (key: string) => map[key.toLocaleLowerCase()]
    : (key: string) => map[key];
}

/**
 * string,number,boolean,symbol,undefined,null,object + bigint
 * @param value
 * @returns
 */
export function isPrimitive(value: any): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'symbol'
  );
}

export function isDef<T>(v: T): v is NonNullable<T> {
  return v !== undefined && v !== null;
}

export function isUndef(v: any): v is undefined | null {
  return v === undefined || v === null;
}

export function isTrue(v: any): boolean {
  return v === true;
}
export function cached<T = any>(fn: Function) {
  const cache = Object.create(null);

  return function (key: string | [string, string]): T {
    let hit = cache[key.toString()];
    return hit ? hit : (cache[key.toString()] = fn(key));
  };
}
/**
 * [object Array].slice(8,-1) 结果为 Array
 *
 */
export function toRawType(value: any) {
  return _toString.call(value).slice(8, -1);
}
/** Vue 内部组件名,自定义组件不得使用 */
export const isBuiltInTag = makeMap('slot,component', true);

/**
 * hello-world => helloWorld
 * -webkit-user-select => WebkitUserSelect
 */
const camelizeRE = /-(\w)/g;
export const camelize = cached((str: string) => {
  return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
});

/**
 * hello => Hello
 */
export const capitalize = cached((str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
});

/** \B 表示非单词边界,也就是 [A-Z]以前一定有字符且该字符不是空白字符 */
const hyphenateRE = /\B([A-Z])/g;
/**
 * 将驼峰式转成连字符
 * @example
 *  helloWorld => hello-World => hello-world
 */
export const hyphenate = cached((str: string) => {
  return str.replace(hyphenateRE, '-$1').toLowerCase();
});

export function toObject(arr: Array<any>) {
  let res: ObjectType = {};
  arr.forEach((item) => {
    extend(res, item);
  });
  return res;
}
/** Vue 属性 */
export const isReservedAttribute = makeMap('key,ref,slot,slot-scope,is');
