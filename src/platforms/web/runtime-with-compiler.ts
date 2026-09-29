import { warn } from "core/util";
import Vue from "./runtime";
import { query } from "./util";
import { Component } from "src/types/component";
import { __DEV__ } from "src/shared/util";
import { cached } from "src/shared/util";
import { compileToFunctions } from "./compiler";
import {
  shouldDecodeNewlines,
  shouldDecodeNewlinesForHref,
} from "./util/compat";
import { ComponentOptions } from "src/types/options";

// 将 Vue 的核心进行平台化包装
/*根据id获取templete，即获取id对应的DOM，然后访问其innerHTML*/
const idToTemplate = cached<string>((id: string) => {
  const el = query(id);
  return el && el.innerHTML;
});

const mount = Vue.prototype.$mount;

/*挂载组件，带模板编译*/
Vue.prototype.$mount = function (this: Component, el?: string | Element) {
  el = el && query(el);

  /** el 将来会被模版内容替换掉,dody 和 html 是坚决不能替换的 */
  if (el === document.body || el === document.documentElement) {
    warn(
      "Do not mount Vue to <html> or <body> - mount to normal elements instead."
    );
    return this;
  }
  const options = this.$options;

  /**
   * 处理模板template，编译成 render 函数，
   * render 不存在的时候才会编译template，否则优先使用render
   */
  if (!options.render) {
    let template = options.template;

    if (template) {
      if (typeof template === "string") {
        if (template.charAt(0) == "#") {
          /** template 为外部模版 id  */
          template = idToTemplate(template);

          /**
           * 无效的模版id
           * 在挂载时还会报一次错
           */
          if (__DEV__ && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            );
          }
        }
      } else if (template instanceof Element) {
        /** 当 template 为 DOM 节点的时候 */
        template = template.innerHTML;
      } else {
        if (__DEV__) {
          warn("invalid template option:" + template, this);
        }
        return this;
      }
    } else if (el) {
      /**
       * 没有配置 template 选项，则从 el 表示的 DOM 元素中获取
       * el查找 DOM 失败，则返回 <div></div>,但是在生成真实 DOM 时，临时 DIV 没有 parentNode ，挂载失败
       */
      template = getOuterHTML(el as Element);
    }
    if (template) {
      /**将模版字编译成渲染函数 */
      const { render } = compileToFunctions(
        template,
        {
          shouldDecodeNewlines,
          shouldDecodeNewlinesForHref,
          delimiters: options.delimiters,
          outputSourceRange: __DEV__,
          comments: options.comments,
        },
        this
      );
      options.render = render as ComponentOptions["render"];
    }
  }
  /**模版编译结束，开始调用 render 挂载组件 */
  return mount.call(this, el);
};

/** 获取element 的 outerHTML */
function getOuterHTML(el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML;
  } else {
    /** 对于 svg元素, IE9-IE11 无法获取 svg 的  outerHTML */
    const container = document.createElement("div");
    container.appendChild(el.cloneNode(true));
    return container.innerHTML;
  }
}
Vue.compile = compileToFunctions;

export default Vue;
