/**
 * 模版:
 * <p id="para" class="foo" v-bind:[attributename]="apple">I'm fruit</p>
 * 渲染函数:
 * "with(this){
 * return _c(
 *      'div',
 *      {attrs:{"id":"app"}},
 *      [
 *          _c(
 *              'p',
 *              _b(
 *                  {staticClass:"foo",attrs:{"id":"para"}},
 *                  "p",
 *                  _d({},[attributename,apple])
 *              ),
 *              [
 *                  _v("I'm fruit")
 *              ]
 *          )
 *      ]
 *  )
 * }"
 */

import { warn } from "core/util";
import { __DEV__ } from "shared/util";
import { Component } from "src/types/component";

/**
 * baseObj:{}
 * values:['hello','Apple']
 * 返回 {hello:'Apple'}
 */
export function bindDynamicKeys(
  this: Component,
  baseObj: Record<string, any>,
  values: Array<any>
) {
  /** 数组每两项为一个组数据{key:value} */
  for (let i = 0; i < values.length; i += 2) {
    const key = values[i];
    if (typeof key === "string" && key) {
      baseObj[key] = values[i + 1];
    } else if (__DEV__ && key !== "" && key !== null) {
      warn(
        `Invalid value for dynamic directive argument (expected string or null): ${key}`,
        this
      );
    }
  }
  return baseObj;
}
