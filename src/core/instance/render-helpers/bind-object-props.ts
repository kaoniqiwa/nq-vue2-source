import config from "core/config";
import { warn } from "core/util";
import {
  __DEV__,
  camelize,
  hyphenate,
  isArray,
  isObject,
  isReservedAttribute,
  toObject,
} from "shared/util";
import { Component, ObjectType } from "src/types/component";
import { VNodeData } from "src/types/vnode";

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
export function bindObjectProps(
  this: Component,
  data: VNodeData,
  tag: string,
  value: Array<ObjectType> | ObjectType,
  asProp?: boolean,
  isSync?: boolean
) {
  if (value) {
    if (!isObject(value)) {
      __DEV__ &&
        warn("v-bind without argument expects an Object or Array value", this);
    } else {
      if (isArray(value)) {
        value = toObject(value);
      }
      let hash: ObjectType;
      for (const key in value) {
        if (key === "class" || key === "style" || isReservedAttribute(key)) {
          hash = data;
        } else {
          const type = data.attrs && data.attrs.type;
          hash =
            asProp || config.mustUseProp(tag, type, key)
              ? data.domProps || (data.domProps = {})
              : data.attrs || (data.attrs = {});
        }
        /** key:hello-world ,在 hash 中寻找是否有属性名 helloWorld*/
        const camelizedKey = camelize(key);

        /** key:hello-world,在 hash 中寻找是否有属性名 helloWorld */
        const hyphenatedKey = hyphenate(key);

        /** 普通属性 hello 转换还是 hello */
        if (!(camelizedKey in hash) && !(hyphenatedKey in hash)) {
          hash[key] = value[key];
          if (isSync) {
          }
        }
      }
    }
  }
  return data;
}
