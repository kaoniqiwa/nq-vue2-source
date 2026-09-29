import VNode from 'core/vdom/vnode';
import { cached, extend, isArray, toObject } from 'shared/util';
import { ObjectType } from 'src/types/component';
import { VNodeData } from 'src/types/vnode';

/**
 * @example
 * 字符串:"color: red; font-size: 20px" => 对象:{'color':'red','font-size':'20px'}
 */
export const parseStyleText = cached((cssText: string) => {
  const res: any = {};
  /**
   * (?![^(]*\))是一个先行否定断言 字符集中是取反操作
   * ';' 后面的字符需要匹配 [^(]*\)  失败才能满足条件
   *
   * cssText不能是:
   *  'color:red;)'
   *  'color:red;a)
   */
  const listDelimiter = /;(?![^(]*\))/g;
  const propertyDelimiter = /:(.+)/;

  cssText.split(listDelimiter).forEach((item) => {
    if (item) {
      /**
       *  ";".split(listDelimiter) 结果为 ['','']
       */
    }
    const tmp = item.split(propertyDelimiter);
    /**
     * style="color" 并未设置颜色值时，应该不返回结果
     */
    if (tmp.length > 1) {
      /**
       * style='color:red; font-size:20px'
       * font-size 前面有空格
       */
      res[tmp[0].trim()] = tmp[1].trim();
    }
  });
  return res;
});

export function getStyle(vnode: VNode, checkChild: boolean) {
  const res: ObjectType = {};

  let styleData = normalizeStyleData(vnode.data || {});
  extend(res, styleData);
  return res;
}
/** 合并样式为单个对象形式 {color:'red';font-size:'20px'} */
function normalizeStyleData(data: VNodeData) {
  const style = normalizeStyleBinding(data.style);
  return data.staticStyle ? extend(data.staticStyle, style) : style;
}

/**
 * 合并数组项为单个对象
 * v-bind:style="[{ "font-size": "20px" }, { "text-align": "center" }];" 转成
 * {"font-size": "20px","text-align": "center" }
 */
export function normalizeStyleBinding(
  bindingStyle?: Array<ObjectType> | ObjectType
) {
  if (isArray(bindingStyle)) {
    return toObject(bindingStyle);
  }
  return bindingStyle;
}
