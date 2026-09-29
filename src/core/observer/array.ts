import { def } from "core/util";
import { Observer } from ".";

/** 在数组的原型链上插入自定义原型对象 */
export const arrayMethods = Object.create(Array.prototype);

export const methodsToPatch = [
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
];

/** 重写数组方法 */
methodsToPatch.forEach((method) => {
  /** Array.prototype 上的函数 */
  const original: Function = arrayMethods[method];

  def(
    arrayMethods,
    method,
    function mutator(this: { __ob__: Observer } & Array<any>, ...args: any[]) {
      const result = original.apply(this, args);
      const ob: Observer = this.__ob__;

      let inserted;
      switch (method) {
        case "push":
        case "unshift":
          /**
           * push(el1,el2,el3,...)
           */
          inserted = args;
          break;
        case "splice":
          /**
           * splice(start, deleteCount, item1, item2, itemN)
           *        第三项开始为插入项
           */
          inserted = args.slice(2);
          break;
      }

      /** 新插入的数据需要被劫持 */
      inserted && ob.observeArray(inserted);
      ob.dep?.notify();
      return result;
    }
  );
});
