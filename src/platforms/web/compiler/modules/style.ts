import { baseWarn, getAndRemoveAttr, getBindingAttr } from "compiler/helpers";
import { parseText } from "compiler/parser/text-parser";
import { __DEV__ } from "shared/util";
import { ASTElement, CompilerOptions, ModuleOptions } from "src/types/compiler";
import { parseStyleText } from "web/util/style";

/** compiler/parser/index.ts => processElement() 中调用,解析模版中的样式绑定,结果为字符串 */
function transformNode(el: ASTElement, options: CompilerOptions) {
  const warn = options.warn || baseWarn;
  const staticStyle = getAndRemoveAttr(el, "style");

  if (staticStyle) {
    if (__DEV__) {
      const res = parseText(staticStyle, options.delimiters);
      if (res) {
        warn(
          `style="${staticStyle}": ` +
            "Interpolation inside attributes has been removed. " +
            "Use v-bind or the colon shorthand instead. For example, " +
            'instead of <div style="{{ val }}">, use <div :style="val">.',
          el.rawAttrsMap["style"]
        );
      }
    }
    el.staticStyle = JSON.stringify(parseStyleText(staticStyle));
  }
  /**
   * v-bind:style="{color:'red'}"
   * v-bind:style="{fontSize:size}"
   * v-bind:style="[{color:'red'},{fontSize:size}]"
   */
  const styleBinding = getBindingAttr(el, "style", false);
  if (styleBinding) {
    el.styleBinding = styleBinding;
  }
}
/** compiler/codegen/index.ts => genData() 中调用,生成节点数据 */
function genData(el: ASTElement) {
  let data = "";
  if (el.staticStyle) {
    data += `staticStyle:${el.staticStyle},`;
  }
  if (el.styleBinding) {
    data += `style:${el.styleBinding},`;
  }
  return data;
}

export default {
  staticKeys: ["staticStyle"],
  transformNode,
  genData,
} as ModuleOptions;
