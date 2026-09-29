import { noop } from "shared/util";
import { isIE, isIOS, isNative } from ".";

const callbacks: Array<Function> = [];

let pending = false;

let timerFunc: Function;

if (typeof Promise !== "undefined" && isNative(Promise)) {
  timerFunc = () => {
    /** 将 flushCallbacks 注册为微任务,当所有数据完成更新后(同步代码)会立即执行微任务 */
    Promise.resolve().then(flushCallbacks);
    if (isIOS) {
      /**
       * BUG: ios 中宏任务执行完毕，如果宏任务队列已经空了，
       * 不会立即执行微任务，那么就再注册一个宏任务，强制浏览器执行新的宏任务前，把上次的微任务执行掉 */
      setTimeout(noop);
    }
  };
} else if (
  !isIE &&
  typeof MutationObserver !== "undefined" &&
  (isNative(MutationObserver) ||
    MutationObserver.toString() === "[object MutationObserverConstructor]")
) {
  let counter = 1;
  const observer = new MutationObserver(flushCallbacks);
  const textNode = document.createTextNode(String(counter));
  /**
   * 监听文本节点的文本变化,一旦变化，则会调用 flushCallbacks,注意这是个微任务
   */
  observer.observe(textNode, {
    characterData: true,
  });
  timerFunc = () => {
    /**
     * counter 永远在 0 和 1 之间变化
     * 如果 counter += 1,会有整型溢出风险
     */
    counter = (counter + 1) % 2;
    textNode.data = String(counter);
  };
} else if (typeof setImmediate !== "undefined" && isNative(setImmediate)) {
  timerFunc = () => {
    /** setImmediate 是一个宏任务 ,仅 IE 支持 */
    setImmediate(flushCallbacks);
  };
} else {
  timerFunc = () => {
    /**
     * setTimeout 在计时结束前，会不停地查看有没有达到指定时间，
     * 达到指定时间则将 flushCallbacks注册进宏任务队列中
     * 所以有性能问题
     */
    setTimeout(flushCallbacks, 0);
  };
}
export function nextTick(cb?: Function, ctx?: Object) {
  let _resolve: any;
  /**
   * callbacks 中并不是直接添加 cb，而是添加一个执行 cb 的匿名函数,
   * 并且如果直接添加 callbacks.push(cb),在 flushCallbacks 中执行 cb() 时，丢失 this 指向 ctx 的要求
   */
  callbacks.push(() => {
    if (cb) {
      try {
        /** this 闭包引用 ctx */
        cb.call(ctx);
      } catch (e) {}
    } else if (_resolve) {
      /** 如果没有 cb ,则调用 Promise 的resolve,这样 promise 对象的状态为 fullfilled,状态值为 ctx */
      _resolve(ctx);
    }
  });

  /**
   * created() {
   *      this.$nextTick(() => {
   *        console.log(1);
   *      });
   *      this.$nextTick(() => {
   *        console.log(2);
   *      });
   *      this.$nextTick(() => {
   *        console.log(3);
   *      });
   * },
   * 1.callbacks 注册 fn1,此时 pending 为 false,进入 if 分支，pending 设为 true,注册一个异步任务
   * 2.callbacks 注册 fn2,此时 pending 为 true,跳过 if 分支
   * 3.callbacks 注册 fn3,此时 pending 为 true,跳过 if 分支
   * 4.created 执行完毕,执行后续的 vue 代码，执行完毕，调用栈已经清空，开始执行异步任务 flushCallbacks
   * 5.按顺序执行 fn1,fn2,fn3,同时 pending 设置为 false
   * 6.当 flushCallbacks执 行完毕后，表示异步任务结束，等待下一次更新
   */
  if (!pending) {
    /**
     * 回调队列等待执行，此时仍然可以向 callbacks 中添加回调，但添加的回调应该在同一个异步任务中，
     * 所以 pending 防止在等待异步队列开始执行前，又开启了一个一步任务
     */
    pending = true;
    /**
     *  注册一个异步任务，该异步任务会等待调用栈清空后再执行
     */
    timerFunc();
  }
  if (!cb && typeof Promise !== "undefined") {
    return new Promise((resolve) => {
      _resolve = resolve;
    });
  }
}

/**
 * 如果 flushCallbacks 是直接遍历 callbacks
 * function flushCallbacks() {
 *    pending = false;
 *    for (let i = 0; i < callbacks.length; i++) {
 *      callbacks[i]();
 *    }
 *    callbacks.length = 0;
 * }


 * created() {
 *      this.$nextTick(function fn1() {
 *          console.log(1);
 *          this.$nextTick(function fn2() {
 *            console.log(2);
 *          });
 *      });
 *  },
 * 1.callbacks 注册 fn1,同时创建微任务 m1
 * 2.调用栈清空，开始执行微任务 m1
 * 3.执行 flushCallbacks,遍历执行 callbacks，也就是执行 fn1
 * 4.fn1中输出 1，然后又遇到了 $nextTick
 * 5.由于当前处于 for 循环中,  callbacks.length = 0;还未执行, callbacks 又注册了 fn2,当前 callbacks 内容为 [fn1,fn2]
 * 6.pending 已经为 false，所以在当前微任务 m1 执行时又创建了新的微任务 m2
 * 7.fn1中 $nextTick 执行完毕,fn1执行完毕，i++
 * 8.执行 callbacks 中第二个函数 fn2
 * 9.fn2执行完毕，for 循环结束,callbacks 清空
 * 10.微任务 m1 执行完毕，开始执行微任务 m2
 * 11.执行 flushCallbacks ,但 callbacks 长度为 0
 * 
 * a.对于两次 $nextTick 应该创建两个微任务
 * b.fn1 应该在微任务 m1 中执行，fn2 应该在 m2 中执行,也就是在执行 m1 时，应该遍历 m1 时注册的回调
 * c.执行微任务m1时,备份 m1 时注册的回调，并清空 callbacks，这样在注册 m2 时，callbacks 中仅有 m2 时的回调
 */
function flushCallbacks() {
  pending = false;
  const copies = callbacks.slice(0);
  callbacks.length = 0;
  for (let i = 0; i < copies.length; i++) {
    copies[i]();
  }
}
