import VNode from "core/vdom/vnode";
import { SimpleSet, _Set as Set } from "core/util";
import { isArray, isObject } from "src/shared/util";

const seenObjects = new Set();

/**
 * 递归读取 val 的所有子属性，
 * 每读一个属性就会触发 defineReactive 的 getter，
 * 从而把当前 Dep.target（watcher）收集进去 —— 这就是 watch 的 deep 选项
 */
export function traverse(val: any) {
  _traverse(val, seenObjects);
  seenObjects.clear();
  return val;
}

function _traverse(val: any, seen: SimpleSet) {
  const isA = isArray(val);

  /** 只遍历对象/数组，且跳过被冻结的对象和 VNode */
  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    return;
  }

  if (val.__ob__) {
    /** 已经遍历过的对象不再重复遍历，同时避免循环引用导致死循环 */
    const depId = val.__ob__.dep.id;
    if (seen.has(depId)) {
      return;
    }
    seen.add(depId);
  }

  if (isA) {
    /** 数组要逐项递归，否则 deep 穿不透数组元素 */
    let i = val.length;
    while (i--) _traverse(val[i], seen);
  } else {
    const keys = Object.keys(val);
    let i = keys.length;
    while (i--) _traverse(val[keys[i]], seen);
  }
}
