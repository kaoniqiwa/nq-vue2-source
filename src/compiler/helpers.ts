import { ASTAttr, ASTElement, Range } from "src/types/compiler";
import { parseFilters } from "./parser/filter-parser";
/**
 * 从模块中提取特定值
 * @example
 * modules = [
 *  {transformNode:..,genData:..},
 *  {transformNode:..,genData:..},
 *  {preTransformNode},
 * ]
 * pluckModuleFunction(modules,'transformNode') => [trans1,trans2,....]
 */
export function pluckModuleFunction<T, K extends keyof T>(
  modules: Array<T> | undefined,
  key: K
): Array<Required<T>[K]> {
  /** 先从各个对象中提取 transformNode 属性值，然后剔除 undefined */
  return modules ? modules.map((m) => m[key]).filter((_) => _) : [];
}

export function baseWarn(msg: string, rang: Range) {
  console.error(`[Vue compiler]: ${msg}`);
}

export function getAndRemoveAttr(
  el: ASTElement,
  name: string,
  removeFromMap?: boolean
) {
  let val = el.attrsMap[name];
  /**
   * null == null
   * undefined == null
   */
  if (val != null) {
    /** 根据 name ，在对象数组中删除某个对象 */
    // const list = el.attrsList;
    // for (let i = 0, l = list.length; i < l; i++) {
    //   if (list[i].name === name) {
    //     list.splice(i, 1);
    //     break;
    //   }
    // }
    let index = el.attrsList.findIndex((attr) => attr.name === name);
    el.attrsList.splice(index, 1);
  }
  if (removeFromMap) {
    Reflect.deleteProperty(el.attrsMap, name);
  }
  return val;
}

export function getRawBindingAttr(el: ASTElement, name: string) {
  return (
    el.rawAttrsMap[":" + name] ||
    el.rawAttrsMap["v-bind:" + name] ||
    el.rawAttrsMap[name]
  );
}
/**
 * name: key ,ref,slot,is,class,style
 * 其中 name为key时,getStatic 为true,如果动态绑定找不到，则寻找静态属性
 */
export function getBindingAttr(
  el: ASTElement,
  name: string,
  getStatic?: boolean
) {
  const dynamicValue =
    getAndRemoveAttr(el, ":" + name) || getAndRemoveAttr(el, "v-bind:" + name);
  if (dynamicValue != null) {
    return parseFilters(dynamicValue);
  } else if (getStatic !== false) {
    const staticValue = getAndRemoveAttr(el, name);
    if (staticValue != null) {
      return JSON.stringify(staticValue);
    }
  }
}

export function addAttr(
  el: ASTElement,
  name: string,
  value: any,
  range?: Range,
  dynamic?: boolean
) {
  /**
   * el.dynamicAttrs = [
   *  {
   *    name:"attributename"
   *    value:"apple",
   *    dynamic:true
   *  }
   * ]
   */
  const attrs = dynamic
    ? (el.dynamicAttrs = el.dynamicAttrs || [])
    : (el.attrs = el.attrs || []);
  attrs.push(rangeSetItem({ name, value, dynamic }, range));

  el.plain = false;
}

function rangeSetItem(item: ASTAttr, range?: Range) {
  if (range) {
    if (range.start) {
      item.start = range.start;
    }
    if (range.end) {
      item.end = range.end;
    }
  }
  return item;
}
