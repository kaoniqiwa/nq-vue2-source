import { baseWarn, getAndRemoveAttr, getBindingAttr } from "compiler/helpers";
import { parseText } from "compiler/parser/text-parser";
import { __DEV__ } from "shared/util";
import { ASTElement, CompilerOptions, ModuleOptions } from "src/types/compiler";

/** compiler/parser/index.ts => processElement() 中调用,解析模版中的类绑定值,结果为字符串 */
function transformNode(el: ASTElement, options: CompilerOptions) {
  const warn = options.warn || baseWarn;
  let staticClass = getAndRemoveAttr(el, "class");

  if (staticClass) {
    if (__DEV__) {
      let res = parseText(staticClass, options.delimiters);
      /**
       * <div class="{{foo}}"></div>
       * 老式的属性绑定不再支持，使用 v-bind:class='foo'
       */
      if (res) {
        warn(
          `class="${staticClass}": ` +
            "Interpolation inside attributes has been removed. " +
            "Use v-bind or the colon shorthand instead. For example, " +
            'instead of <div class="{{ val }}">, use <div :class="val">.',
          el.rawAttrsMap["class"]
        );
      }
    }
    el.staticClass = JSON.stringify(staticClass.replace(/\s+/g, " ").trim());
  }
  /**
   * 字符串绑定 v-bind:class='foo'
   * 变量绑定   v-bind:class=foo
   * 对象绑定   v-bind:class={foo:true}
   * 数组绑定   v-bind:class=['foo',foo,{foo:true}]
   */
  const classBinding = getBindingAttr(el, "class", false);
  if (classBinding) {
    el.classBinding = classBinding;
  }
}
/** compiler/codegen/index.ts => genData() 中调用,生成节点数据 */
function genData(el: ASTElement) {
  let data = "";
  if (el.staticClass) {
    /** data='staticClass:"foo"' */
    data += `staticClass:${el.staticClass},`;
  }
  if (el.classBinding) {
    data += `class:${el.classBinding},`;
  }
  return data;
}

export default {
  staticKeys: ["staticClass"],
  transformNode,
  genData,
} as ModuleOptions;
