import VNode from 'core/vdom/vnode';

import { cached, camelize, hyphenate, isArray, isUndef } from 'shared/util';
import { ObjectType } from 'src/types/component';
import { PatchModuleOptions } from 'src/types/vnode';
import { getStyle, normalizeStyleBinding } from 'web/util/style';

const cssVarRE = /^--/;
const importantRE = /\s*!important$/;

const vendorNames = ['Webkit', 'Moz', 'ms'];
let emptyStyle: CSSStyleDeclaration;
/**
 * 检查 css 属性名的有效性
 * name='font-size' 转成 'fontSize' 之后在 CSSStyleDeclaration 查找是否有 'fontSize'
 */
const normalize = cached(function (prop: string) {
  emptyStyle = emptyStyle || document.createElement('div').style;

  prop = camelize(prop);
  if (prop != 'filter' && prop in emptyStyle) {
    return prop;
  }
  /**
   * style="tap-highlight-color:transparent"
   * 属性名:tap-highlight-color 是 chrome 独有的
   * 在 chrome浏览器中，emptyStyle 对象有 WebkitTapHighlightColor属性
   * 最终返回 WebkitTapHighlightColor
   * style="tap-highlight:transparent"
   * 当前浏览器没有 tapHighlight 属性，且 浏览器前缀+TapHighlight 仍找不到
   * 则没有返回
   */
  const capName = prop.charAt(0).toUpperCase() + prop.slice(1);
  /**
   * 不用 vendorNames.forEach(),因为 native code 无法跳出循环
   */
  for (let i = 0, l = vendorNames.length; i < l; i++) {
    const name = vendorNames[i] + capName;
    if (name in emptyStyle) {
      return name;
    }
  }
});
function setProp(el: HTMLElement, name: string, value: any) {
  if (cssVarRE.test(name)) {
    el.style.setProperty(name, value);
  } else if (importantRE.test(value)) {
    /**
     * v-bind:style="{'fontSize':'20px'}" => style="font-size:20px !important"
     * setProperty API 要求 value 中不能有 !important
     * @link https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration/setProperty
     */
    el.style.setProperty(
      hyphenate(name),
      value.replace(importantRE, ''),
      'important'
    );
  } else {
    const normalizedName = normalize(name);
    if (normalizedName) {
      /**
       * 对于非标准属性
       * setProperty('WebkitTapHighlightColor','transparent') 是无效的
       */
      if (isArray(value)) {
        /**
         * v-bind:style='{display:["-webkit-box", "-ms-flexbox", "flex"]}'
         * 兼容性代码放在前面，通用代码最后
         * chrome 识别 -webkit-box => display:-webkit-box
         * chrome 不识别 -ms-flexbox
         * chrome 识别 flex => diplay:flex
         * 最终结果 diplay:flex
         */
        value.forEach((item) => {
          el.style[normalizedName] = item;
        });
      } else {
        el.style[normalizedName] = value;
      }
    }
  }
}
function updateStyle(oldVnode: VNode, vnode: VNode) {
  const data = vnode.data || (vnode.data = {});
  const oldData = oldVnode.data || {};

  if (
    isUndef(data.staticStyle) &&
    isUndef(data.style) &&
    isUndef(oldData.staticStyle) &&
    isUndef(oldData.style)
  ) {
    return;
  }
  const el = vnode.elm as HTMLElement;

  // data.style = { "tap-highlight-color": "transparent" };

  const oldStaticStyle = oldData.staticStyle;
  const oldStyleBinding: ObjectType =
    oldData.normalizedStyle || oldData.style || {};
  const oldStyle = oldStaticStyle || oldStyleBinding;

  const style = normalizeStyleBinding(vnode.data.style) || {};
  vnode.data.normalizedStyle = style;

  const newStyle = getStyle(vnode, true);

  /**
   * style="color:red;" => style="background:red"
   *
   * 新的 style 中没有 color,则删除 color
   */
  for (let name in oldStyle) {
    if (isUndef(newStyle[name])) {
      setProp(el, name, '');
    }
  }
  /**
   * style="color:red;font-size:20px" => style="color:red;background:red"
   * 新的 style 中有color 值，则不错任何操作
   * 新的 style 中有 background,则添加 background
   */
  let cur;
  for (let name in newStyle) {
    cur = newStyle[name];
    if (cur != oldStyle[name]) {
      setProp(el, name, cur == null ? '' : cur);
    }
  }
}

export default {
  create: updateStyle,
  update: updateStyle,
} as PatchModuleOptions;
