import VNode from "core/vdom/vnode";
import { isUndef } from "shared/util";
import { PatchModuleOptions } from "src/types/vnode";
import { genClassForVnode } from "web/util/class";

/**
 * core/vdom/patch.ts =>createElm() 中调用，运行时调用
 * 动态绑定表达式时，会在 render()执行时获得结果
 */
export function updateClass(oldVnode: VNode, vnode: VNode) {
  const data = vnode.data || {};
  const oldData = oldVnode.data;
  const el = vnode.elm as Element;

  if (
    isUndef(data.class) &&
    isUndef(data.staticClass) &&
    (isUndef(oldData) ||
      (isUndef(oldData.class) && isUndef(oldData.staticClass)))
  ) {
    return;
  }
  /**
   * 解析 class,将对象形式转换成浏览器正常的字符串形式
   * class:{bar:true} => class="bar"
   * class:['baz','ii',{geck:999}] => class="baz ii geck"
   *
   */
  let cls = genClassForVnode(vnode);

  /** 更新的不是 class,则跳过 */
  let _prevClass = el.className;
  if (cls != _prevClass && cls) {
    el.setAttribute("class", cls);
  }
}

export default {
  create: updateClass,
  update: updateClass,
} as PatchModuleOptions;
