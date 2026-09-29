import VNode from 'core/vdom/vnode';
import { isArray, isDef, isObject } from 'shared/util';
import { ObjectType } from 'src/types/component';

export function genClassForVnode(vnode: VNode) {
  const data = vnode.data || {};
  //   data.class = [{ bar: true, foo: false }, "base", { hello: 1 + 1 }];
  return renderClass(data.staticClass, data.class);
}

function renderClass(
  staticClass?: string,
  dynamicClass?: Array<any> | string | ObjectType
) {
  if (isDef(staticClass) || isDef(dynamicClass)) {
    return concat(staticClass, stringifyClass(dynamicClass));
  }
}
function concat(a?: string, b?: string) {
  /**
   * 类名之间用空格分隔 "foo bar base"
   */
  return a ? (b ? a + ' ' + b : a) : b || '';
}
function stringifyClass(value?: Array<any> | string | ObjectType) {
  if (isArray(value)) {
    return stringifyArray(value);
  }
  if (isObject(value)) {
    return stringifyObject(value as ObjectType);
  }
  /**
   * v-bind:class="'foo bar'"
   */
  if (typeof value === 'string') {
    return value;
  }
  return '';
}
/**
 * v-bind:class="['bar',['base',['hello']]]" => class="bar base hello"
 * v-bind:class="[{ bar: true, foo: false }, "base", { hello: 1 + 1 }]" => class="bar base hello"
 */
function stringifyArray(value: Array<any>) {
  let res = '';
  for (let i = 0, l = value.length; i < l; i++) {
    let stringified = stringifyClass(value[i]);
    if (isDef(stringified) && stringified !== '') {
      res += stringified + ' ';
    }
  }
  res = res.replace(/\s$/, '');
  return res;
}
/**
 * v-bind:class="{foo:true,bar:false}" => class="foo"
 */
function stringifyObject(value: ObjectType) {
  let res = '';
  Object.keys(value).forEach((key) => {
    if (value[key]) {
      res += key + ' ';
    }
  });
  res = res.replace(/\s$/, '');
  return res;
}
