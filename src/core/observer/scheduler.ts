import { _Set as Set, nextTick } from "core/util";
import Watcher from "./watcher";
import { __DEV__ } from "shared/util";
import config from "core/config";

const watcherSet = new Set();
const queue: Array<Watcher> = [];
let has: { [key: number]: boolean | null } = {};
let waiting = false;
let flushing = false;

/**
 * 将不同 watcher 加入 queue 队列，设定一个微任务来遍历 queue，实现延迟批量处理更新功能
 */
export function queueWatcher(watcher: Watcher) {
  const id = watcher.id;
  if (watcherSet.has(id)) {
    return;
  }

  if (has[id] != null) {
    has[id] = true;

    if (!flushing) {
      queue.push(watcher);
    } else {
      /** queue 正在执行更新，此时如果有 watcher 进来，走当前分支 */
    }
    if (!waiting) {
      waiting = true;
      if (__DEV__ && !config.async) {
      }
      nextTick(flushSchedulerQueue);
    }
  }

  nextTick(flushSchedulerQueue);
}

function flushSchedulerQueue() {
  queue.forEach((watcher) => watcher.run());
  queue.length = 0;
  watcherSet.clear();
}
