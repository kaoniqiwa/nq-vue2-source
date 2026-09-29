import { warn } from "core/util";
import { __DEV__ } from "src/shared/util";
import { Component } from "src/types/component";
import { ComponentOptions } from "src/types/options";
import { initMixin } from "./init";
import { renderMixin } from "./render";
import { lifecycleMixin } from "./lifecycle";
import { stateMixin } from "./state";
import { eventsMixin } from "./events";

function Vue(this: Component, options: ComponentOptions) {
  if (__DEV__ && !(this instanceof Vue)) {
    warn("Vue is a constructor and should be called with the `new` keyword");
  }

  this._init(options);
}

/**
 * Vue.prototype._init
 */
//@ts-expect-error
initMixin(Vue);

/**
 * Vue.prototype.$set,
 * Vue.prototype.$delete,
 * Vue.prototype.$watch
 */
//@ts-expect-error
stateMixin(Vue);

/**
 * Vue.prototype.$on,
 * Vue.prototype.$once,
 * Vue.prototype.$off,
 * Vue.prototype.$emit
 */
//@ts-expect-error
eventsMixin(Vue);

/**
 * Vue.prototype._update
 * Vue.prototype.$forceUpdate
 * Vue.prototype.$destroy
 */
//@ts-expect-error
lifecycleMixin(Vue);

/**
 * Vue.prototype._render
 * Vue.prototype.$nextTick
 */
//@ts-expect-error
renderMixin(Vue);

export default Vue;
