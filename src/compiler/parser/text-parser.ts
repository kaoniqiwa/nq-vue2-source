import { cached } from "shared/util";
import { parseFilters } from "./filter-parser";

/**
 * 文本内容: {{name}} hello {{age}} world
 * 正则 ".|\r?\n" 需要添加量词，所以用括号包围 => (.|\r?\n)+
 * 由于需要捕获整个单词，而非单个字符，所以子正则使用非捕获 ((?:.|\r?\n)+)
 * 由于仅需要匹配 {{name}}} hello 中的 {{name}},不包含多余的 "}"
 * 所以使用非贪婪模式  ((?:.|\r?\n)+?)
 * 由于需要匹配多次 {{name}} ,{{age}},
 * 所以正则使用 global 匹配 =>  /((?:.|\r?\n)+?)/g
 */
const defaultTagRE = /\{\{((?:.|\r?\n)+?)\}\}/g;
/**
 * 字符集 : - . * + ? ^ $ { } ( ) | [ ] / \
 * 这些字符在字符集中需要被转义为普通字符，否则有特殊含义
 */
const regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g;

/** delimiters:["&[","&]"] */
const buildRegex = cached((delimiters: [string, string]) => {
  /** $&表示匹配的子字符串，这里是 "[" 和 "]" */
  let open = delimiters[0].replace(regexEscapeRE, "\\$&"); // "&\\["
  let close = delimiters[1].replace(regexEscapeRE, "\\$&"); // "&\\]"
  return new RegExp(`${open}((?:.|\\n)+?)${close}`, "g");
});

export function parseText(text: string, delimiters?: [string, string]) {
  const tagRE = delimiters ? buildRegex(delimiters) : defaultTagRE;

  /** 如果是纯文本，则返回，否则就表示有插值表达式 {{expression}} */
  if (!tagRE.test(text)) {
    return;
  }
  /** defaultTagRE 是字面量正则，在global 模式下，
   * 重复进入 parseText 匹配新的 text 时(parseHtml.chars)，需要从位置0开始匹配
   */
  let lastIndex = (tagRE.lastIndex = 0);

  let match: RegExpExecArray | null;

  const rawTokens: Array<string | Object> = [];
  const tokens: string[] = [];

  /** 匹配的开始位置 */
  let index;
  let tokenValue;
  while ((match = tagRE.exec(text))) {
    index = match.index;
    if (index > lastIndex) {
      /**
       * hello{{msg}}
       * index:5,
       * lastIndex:0
       * 说明匹配的表达式，前面有纯文本
       */
      rawTokens.push((tokenValue = text.slice(lastIndex, index)));

      /**
       *  字符串"hello"需要 => "\"hello\""
       *  因为不这样 "hello" 在被拼接到字符串渲染函数中时
       *  text="hello"
       *   `_v(${text})` => "_v(hello)",在函数运行时,
       *  function (){
       *    _v(hello)
       *  }
       * hello被认为是变量而不是字符串
       */
      tokens.push(JSON.stringify(tokenValue));
    }

    const exp = parseFilters(match[1].trim());
    tokens.push(`_s(${exp})`);
    rawTokens.push({ "@binding": exp });

    /** index + match[0].length ==  tagRE.lastIndex */
    lastIndex = index + match[0].length;
    // lastIndex = tagRE.lastIndex;
  }
  /**保存最后一个插值表达式后面的文本 */
  if (lastIndex < text.length) {
    rawTokens.push((tokenValue = text.slice(lastIndex)));
    tokens.push(JSON.stringify(tokenValue));
  }

  return {
    /**
     * 渲染函数的函数体:new Function(""hello "+_s(msg)+" age "+_s(age)+" world"")
     */
    expression: tokens.join("+"),
    tokens: rawTokens,
  };
}
