import { unicodeRegExp } from "core/util/lang";
import { __DEV__, makeMap, no } from "src/shared/util";
import {
  ASTAttr,
  HTMLParserOptions,
  StackElement,
  StartTagMatch,
} from "src/types/compiler";
import { ObjectType } from "src/types/component";
import { isNonPhrasingTag } from "web/compiler/utils";

/**
 * 第一个分组捕获属性名
 * 第二个分组捕获等于号
 * 第三个分组捕获双引号内的值 id="app"
 * 第四个分组捕获单引号内的值 id='app'
 * 第五个分组捕获没有引号的值 id=app
 * 最后一个量词 ? 表示 第二三四五的捕获可选,仅捕获属性名 disabled
 *
 */
const attribute =
  /^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;

const dynamicArgAttribute =
  /^\s*((?:v-[\w-]+:|@|:|#)\[[^=]+?\][^\s"'<>\/=]*)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/;
/**
 * 字符集中 "-"和 "." 没有特殊意义，可以不用转义，不过转义也是一样的，比如 "a" 和 "\a" 是相等的
 * 这里采用了转义策略 => \- 和 \.
 * 在正则字面量中可以这样写 /[\-\.0-9]/
 * 但是这里是字符串形式，所以需要将 "\-" 中的 "\" 再进行一次转义 => "\\-"
 * ncname:An XML name that does not contain a colon,即不包含':'的 XML 标签
 */
const ncname = `[a-zA-Z_][\\-\\.0-9_a-zA-Z${unicodeRegExp.source}]*`;

/**
 * 由于 xml 中标签名是自定义的<bug></bug>,不同文档中相同的标签名会产生冲突，
 * 所以有这样的写法
 *    <pmx:bug></pmx:bug>
 *    <pmx:bug xmlns:link="xxx"></pmx:bug>
 * 捕获的内容为整个标签名 pmx:bug
 */
const qnameCapture = `((?:${ncname}\\:)?${ncname})`;

/** 匹配开始标签，并捕获标签名 */
const startTagOpen = new RegExp(`^<${qnameCapture}`);

/**
 * 匹配开始标签的结束符 > 和 />
 * 如果是一元标签，它的 / 会被捕获
 *
 */
const startTagClose = /^\s*(\/?)>/;

/** </(标签名)+(任意 '>' 外的字符)+('>'字符) */
const endTag = new RegExp(`^<\\/${qnameCapture}[^>]*>`);

const doctype = /^<!DOCTYPE [^>]+>/i;

/** 注释节点 <!-- This is comment --> */
const comment = /^<!\--/;

/**
 * 条件注释节点,只有 IE 浏览器识别，其他浏览器认为是普通的 html 注释
 * <!--[if IE]> <![endif]-->
 * <!--[if IE]> <![endif]-->
 */
const conditionalComment = /^<!\[/;

/** script,style,textarea 中可以包含任何内容 */
const isPlainTextElement = makeMap("script,style,textarea", true);
const reCache: ObjectType = {};

/**字符实体映射为html字符 */
const decodingMap = {
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&amp;": "&",
  "&#10;": "\n",
  "&#9;": "\t",
  "&#39;": "'",
};

const encodedAttr = /&(?:lt|gt|quot|amp|#39);/g;
const encodedAttrWithNewLines = /&(?:lt|gt|quot|amp|#39|#10|#9);/g;

/**
 * <pre>\nhello</pre>
 * 浏览器的行为是将pre标签中第一个 '\n' 删除
 */
const isIgnoreNewlineTag = makeMap("pre,textarea", true);

/**模拟浏览器行为 */
const shouldIgnoreFirstNewline = (tag: string, html: string) => {
  return tag && isIgnoreNewlineTag(tag) && html[0] === "\n";
};
/**
 * template:"<div id='&lt;hello'></div>"
 * 解析属性中的实体字符 => <div id='<hello'></div>
 */
const decodeAttr = function (value: string, shouldDecodeNewlines: boolean) {
  const re = shouldDecodeNewlines ? encodedAttrWithNewLines : encodedAttr;
  return value.replace(
    re,
    (match) => decodingMap[match as keyof typeof decodingMap]
  );
};
export function parseHTML(html: string, options: HTMLParserOptions) {
  /**
   * 每当遇到一个非一元标签,都将该标签的开始标签入栈,
   * 当遇到结束标签时，会检查 stack 的最后一个元素，如果两者标签名匹配，说明标签是完整的标签
   * 比如: <article><section><div></section></article>
   * stack: [articel,section,div]
   * 当结束标签为 section 时，查找 stack 的最后一个元素，发现是 div,两者不匹配，说明 div 缺失闭合标签
   */
  const stack: StackElement[] = [];
  const expectHTML = options.expectHTML;
  const isUnaryTag = options.isUnaryTag || no;
  const canBeLeftOpenTag = options.canBeLeftOpenTag || no;

  /**当前字符流的读入位置 */
  let index = 0;

  /** 当前还未解析的 html 字符 */
  let last;

  /** 始终存储着 stack 栈顶的元素 */
  let lastTag: string | undefined = void 0;

  while (html) {
    last = html;
    if (!lastTag || !isPlainTextElement(lastTag)) {
      /**
       * lastTag 为 undefined,表示第一次解析,则进入该分支
       * lastTag 有值，且不是 script,textarea,style,则进入该分支
       */
      let textEnd = html.indexOf("<");
      /** 开始标签的开始符或者结束标签的开始符*/
      if (textEnd == 0) {
        /**
         * textEnd ==0:
         *    comment,conditionalComment,doctypeMatch
         *    开始标签 <div>
         *    结束标签 </div>
         *    文本内容 <abcded
         */
        if (comment.test(html)) {
          /**
           * html注释
           * <!-- comment -->
           */
          const commentEnd = html.indexOf("-->");
          if (commentEnd >= 0) {
            if (options.shouldKeepComment && options.comment) {
              /**
               * <!--comment-->
               * 获取注释内容，以及注释起止位置
               */
              options.comment(
                html.slice(4, commentEnd),
                index,
                index + commentEnd + 3
              );
            }
            /** 剔除注释 */
            advance(commentEnd + 3);
            /** 结束当前循环，开启下一个循环 */
            continue;
          }
        }
        if (conditionalComment.test(html)) {
          const conditionalEnd = html.indexOf("]>");
          if (conditionalEnd >= 0) {
            advance(conditionalEnd + 2);
            continue;
          }
        }
        const doctypeMatch = html.match(doctype);
        if (doctypeMatch) {
          advance(doctypeMatch[0].length);
          continue;
        }
        /**开始标签<div id="app"> */
        const startTagMatch = parseStartTag();
        if (startTagMatch) {
          handleStartTag(startTagMatch);
          if (shouldIgnoreFirstNewline(startTagMatch.tagName, html)) {
            advance(1);
          }
          /** 开始标签解析完毕，返回循环，开始解析子节点或者结束标签 */
          continue;
        }
        const endTagMatch = html.match(endTag);

        /**
         * 闭合标签</div>
         * ['</div>','div']
         */
        if (endTagMatch) {
          /**index当前为闭合标签在source html 中的开始位置 */
          const curIndex = index;
          advance(endTagMatch[0].length);
          parseEndTag(endTagMatch[1], curIndex, index);
          /**当前标签解析结束，继续解析子元素或者根标签解析结束，退出解析 */
          continue;
        }
      }
      let rest;
      let next;
      let text;
      /**
       * 解析文本内容
       * " < 10 "时,textEnd 为 0,但 '<' 并不作为开始符解析,而是作为文本解析
       */
      if (textEnd >= 0) {
        /** rest 不一定是结束标签的开始符 */
        rest = html.slice(textEnd);

        /**
         * 遇到的 '<' 不是标签的开始符，而是文本显示内容时，进入循环
         * <div>hello 1 < 10 </div> textEnd ==8
         * <div>< 10 </div>  textEnd == 0 ,进入 if(textEnd==0)分支，但不做任何事情
         * <div>hello </div> 不进入循环
         */
        while (
          !endTag.test(rest) &&
          !startTagOpen.test(rest) &&
          !comment.test(rest) &&
          !conditionalComment.test(rest)
        ) {
          next = rest.indexOf("<", 1);
          /**<div>hello 1< 10 忘记写闭合标签时,next == -1 */
          if (next < 0) break;
          textEnd += next;
          rest = html.slice(textEnd);
        }
        /**退出循环后，textEnd指向关闭标签的开始符,text为标签的文本内容，rest为关闭标签+剩余内容 */
        text = html.slice(0, textEnd);
      }
      if (textEnd < 0) {
        text = html;
      }
      if (text) {
        /**处理完后，html 为</div>,重新进入循环，textEnd==0,但是解析的是闭合标签 */
        advance(text.length);
      }
      if (options.chars && text) {
        options.chars(text, index - text.length, index);
      }
    } else {
      let endTagLength = 0;
      const stackedTag = (lastTag as string).toLowerCase();
      /**
       * ([\\s\\S]*?) 表示正则 /([\s\S]*?)/,意思是非贪婪捕获任意字符,只要第二个分组匹配成功，/([\s\S]*?)/就停止匹配
       * "[^>]*>" 表示 </textarea>可以写成 </textareaoooo>,因为在 codegen中只用到了开始标签名
       */
      const reStackedTag =
        reCache[stackedTag] ||
        (reCache[stackedTag] = new RegExp(
          "([\\s\\S]*?)(</" + stackedTag + "[^>]*>)",
          "i"
        ));
      /**
       * html:"hello</textarea>abc"
       * matched:"hello</textarea>"
       * text:"hello"
       * endTag:"textarea"
       */
      const rest = html.replace(reStackedTag, function (matched, text, endTag) {
        endTagLength = endTag.length;
        /** ??? */
        if (!isPlainTextElement(stackedTag) && stackedTag != "noscript") {
          text = text
            .replace(/<!\--([\s\S]*?)-->/g, "$1") // #7298
            .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, "$1");
        }
        if (shouldIgnoreFirstNewline(stackedTag, text)) {
          /** pre,textarea 将忽略首行的 \n */
          text = text.slice(1);
        }
        if (options.chars) {
          /** 将纯文本标签里的内容全部当做文本处理 */
          options.chars(text);
        }
        /** rest 保存剔除纯文本标签之后的内容,这里是剩余的 abc */
        return "";
      });
      /** index 指向 'a' 位置*/
      index += html.length - rest.length;
      html = rest;
      parseEndTag(stackedTag, index - endTagLength, index);
    }

    /**
     * 经过循环体代码后，html 没有任何改变,则将 html 当做纯文本对待
     */
    if (html == last) {
      options.chars && options.chars(html);
      if (__DEV__ && !stack.length && options.warn) {
        options.warn(`Mal-formatted tag at end of template: "${html}"`, {
          start: index + html.length,
        });
      }
      break;
    }
  }
  /** 处理 stack 栈中剩余标签 */
  parseEndTag();

  /** 由于要动态删除html字符串，所以定义为闭包 */
  function parseStartTag() {
    const start = html.match(startTagOpen);
    if (start) {
      const match: StartTagMatch = {
        tagName: start[1],
        attrs: [],
        start: index,
        end: index,
      };
      /** 删除 <div 部分 */
      advance(start[0].length);

      let end;
      let attr: (RegExpMatchArray & { start?: number; end?: number }) | null;
      /**
       * 匹配开始标签的结束符,如果匹配失败，则表明开始标签有属性
       * 每次只能匹配一个属性，所以需要循环,一直到开始标签的结束符
       */
      while (
        !(end = html.match(startTagClose)) &&
        (attr = html.match(dynamicArgAttribute) || html.match(attribute))
      ) {
        /** attr=[' id="app"','id','=','app'] */
        attr.start = index;
        advance(attr[0].length);

        attr.end = index; // index = oldIndex+attr[0].length
        match.attrs.push(attr as unknown as StartTagMatch["attrs"][number]);
      }
      /**
       * 属性匹配结束，进入开始标签的结束符
       * 如果 end 匹配失败，说明刚刚匹配的根本就不是一个开始标签
       */

      if (end) {
        match.unarySlash = end[1];
        advance(end[0].length);
        match.end = index;
        return match;
      }
    }
  }

  function handleStartTag(match: StartTagMatch) {
    const tagName = match.tagName;
    const unarySlash = match.unarySlash;

    if (expectHTML) {
      if (lastTag === "p" && isNonPhrasingTag(tagName)) {
        /**
         * p 标签的特性是里面的内容必须是段落式内容
         * <p><h2></h2></p>
         * 当解析到 h2 时，由于 lastTag=='p' 且 h2 不是段落式内容，则需要关闭上一个'p'
         * => <p></p><h2></h2></p>
         * 并且最后一个 </p> 会被解析为 <p></p>
         * 所以最终变成 => <p></p><h2></h2><p></p>
         */
        parseEndTag(lastTag);
      }
      if (canBeLeftOpenTag(tagName) && lastTag === tagName) {
        /**
         * 当解析到是一个可省略闭合标签的标签时比如 p,且上一个解析的标签也是 p
         * <p>one<p>two
         * 第一个 p 未遇到结束标签，说明还在栈中，
         * 解析到第二个 p 时，
         */
        parseEndTag(tagName);
      }
    }
    /**
     * 判断 tagName 是否是 HTML 一元标签
     * 但是自定义组件 <my-component/> 需要根据 unarySlash 来判断
     */
    const unary = isUnaryTag(tagName) || !!unarySlash;

    const l = match.attrs.length;
    /**
     * 正则匹配的 RegExpMatchArray 需要格式化成对象形式
     * Array:
     * [
     *  {name:'id',value:'app'},
     *  {name:'style',value:'color:red;font-size:20px'}
     * ]
     *
     *
     */
    const attrs: ASTAttr[] = new Array(l);
    for (let i = 0; i < l; i++) {
      const args = match.attrs[i];
      /** id="app" ||  id='app'  || id=app */
      const value = args[3] || args[4] || args[5] || "";
      const shouldDecodeNewlines =
        tagName == "a" && args[1] == "href"
          ? options.shouldDecodeNewlinesForHref
          : options.shouldDecodeNewlines;
      attrs[i] = {
        name: args[1],
        value: decodeAttr(value, !!shouldDecodeNewlines),
      };
    }

    /**开始标签入栈 */
    if (!unary) {
      stack.push({
        tag: tagName,
        lowerCasedTag: tagName.toLowerCase(),
        attrs: attrs,
        start: match.start,
        end: match.end,
      });
      /** lastTag 始终保持着栈顶元素 */
      lastTag = tagName;
    }
    /**生成AST树节点*/
    if (options.start) {
      options.start(tagName, attrs, unary, match.start, match.end);
    }
  }
  /**
   * 1. 检测是否缺少闭合标签
   * div 缺少关闭标签，在 parseEndTag 中给用户提示
   *    <article><section><div></section></article>
   *
   * 2. 处理 stack栈 中剩余标签
   * 解析完成后, stack 为非空栈
   *    <article><section></section></article><div>
   * 3. 模拟浏览器行为
   * 浏览器行为:</br> 被解析为 <br>
   * 浏览器行为:</p> 被解析为 <p></p>
   * 除了 br 和 p 以外的任何标签，如果只写了闭合标签，都将被忽略
   */
  function parseEndTag(tagName?: string, start?: number, end?: number) {
    let pos;
    let lowerCasedTagName;
    /** 设置为当前字符流的读入位置 */
    if (start == null) start = index;
    if (end == null) end = index;
    if (tagName) {
      lowerCasedTagName = tagName.toLocaleLowerCase();
      /** 在 stack 中查找关闭标签，并保存查找成功时的位置 */
      for (pos = stack.length - 1; pos >= 0; pos--) {
        if (lowerCasedTagName == stack[pos].lowerCasedTag) {
          break;
        }
      }
    } else {
      /**
       * template:"<div>hello
       *
       */
      pos = 0;
    }

    if (pos >= 0) {
      for (let i = stack.length - 1; i >= pos; i--) {
        if (__DEV__ && (i > pos || !tagName) && options.warn) {
          /**
           * 和 tagName 匹配的位置应该是 stack 最后一个元素，pos 因该是 stack.length - 1,也就是 pos 和 i 相等
           * 如果 i 和 pos 不相等，说明 stack中 pos 之后的标签缺少关闭标签
           *
           * stack = [1 2 3]
           * tagName= 1
           * i=2
           * pos=0
           * 说明stack[1]和stack[2]没有闭合
           *
           *对应第一条
           */
          options.warn(`tag <${stack[i].tag}> has no matching end tag.`, {
            start: stack[i].start,
            end: stack[i].end,
          });
        }
        if (options.end) {
          /**
           * 闭合标签
           * <div></div>
           * <div><p></div>
           * <div>hello
           */
          options.end(stack[i].tag, start, end);
        }
      }
      /**pos之后的标签出栈 */
      stack.length = pos;
      lastTag = pos ? stack[pos - 1].tag : undefined;
    } else if (lowerCasedTagName === "br") {
      /** <div></br></div> */
      if (options.start) {
        /** tagName 如果是undefined ,则post 为 0 , 不会走该分支 */
        options.start(tagName!, [], true, start, end);
      }
    } else if (lowerCasedTagName === "p") {
      /** <div></p></div> */
      if (options.start) {
        options.start(tagName!, [], false, start, end);
      }
      if (options.end) {
        options.end(tagName!, start, end);
      }
    }
  }
  /**
   * 截取 html，html 长度逐渐为 0
   * n表示下一个开始的位置
   */
  function advance(n: number) {
    html = html.substring(n);
    index += n;
  }
}
