import VNode from 'core/vdom/vnode';
import { isUndef } from 'shared/util';
import { PatchModuleOptions } from 'src/types/vnode';
import {
  convertEnumeratedValue,
  getXlinkProp,
  isBooleanAttr,
  isEnumeratedAttr,
  isFalsyAttrValue,
  isXlink,
  xlinkNS,
} from 'web/util/attrs';

function setAttr(el: Element, key: string, value: any) {
  if (el.tagName.indexOf('-') > -1) {
  } else if (isBooleanAttr(key)) {
    if (isFalsyAttrValue(value)) {
      el.removeAttribute(key);
    } else {
      /**
       * :disabled="false" 时删除 disabled 属性
       * disabled并不关心属性值
       * :disabled="'add'" 时，转换成<div disabled='disabled'></div>
       */

      value =
        key === 'allowfullscreen' && el.tagName === 'EMBED' ? 'true' : key;
      el.setAttribute(key, value);
    }
  } else if (isEnumeratedAttr(key)) {
    el.setAttribute(key, convertEnumeratedValue(key, value));
  } else if (isXlink(key)) {
    if (isFalsyAttrValue(value)) {
      el.removeAttributeNS(xlinkNS, getXlinkProp(key));
    } else {
      el.setAttributeNS(xlinkNS, key, value);
    }
  } else {
    baseSetAttr(el, key, value);
  }
}
/** 普通属性的添加/删除 */
function baseSetAttr(el: Element, key: string, value: any) {
  if (isFalsyAttrValue(value)) {
    /**
     *  <div :role='role'></div>
     * 当 role 为 null 或者 false 时，删除 role 属性
     */
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value);
  }
}
function updateAttrs(oldVnode: VNode, vnode: VNode) {
  const oldData = oldVnode.data || {};
  const data = vnode.data || {};
  if (isUndef(oldData.attrs) && isUndef(data.attrs)) {
    return;
  }
  const el = vnode.elm as Element;
  const oldAttrs = oldData.attrs || {};
  const attrs = data.attrs || {};

  /**
   * oldAttrs: {id:'app',role:'guest',a:1}
   * newAttrs: {id:'app',role:'admin',b:2}
   *
   * id   没有操作
   * role 修改操作
   * a    删除操作
   * b    添加操作
   *
   */
  for (let key in attrs) {
    if (attrs[key] != oldAttrs[key]) {
      setAttr(el, key, attrs[key]);
    }
  }
  for (let key in oldAttrs) {
    if (isUndef(attrs[key])) {
      if (isXlink(key)) {
        el.removeAttributeNS(xlinkNS, getXlinkProp(key));
      } else if (!isEnumeratedAttr(key)) {
        /**
         * contenteditable,draggable,spellcheck会自动保留下来,
         */
        el.removeAttribute(key);
      }
    }
  }
}

export default {
  create: updateAttrs,
  update: updateAttrs,
} as PatchModuleOptions;
