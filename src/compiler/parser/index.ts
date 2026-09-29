import he from 'he';

import {
  ASTAttr,
  ASTElement,
  ASTIfCondition,
  ASTNode,
  CompilerOptions,
  ModuleOptions,
} from 'src/types/compiler';
import { parseHTML } from './html-parser';
import { parseText } from './text-parser';
import { __DEV__, cached } from 'src/shared/util';
import {
  addAttr,
  baseWarn,
  getAndRemoveAttr,
  getBindingAttr,
  getRawBindingAttr,
  pluckModuleFunction,
} from 'compiler/helpers';
import { ObjectType } from 'src/types/component';
import { parseFilters } from './filter-parser';

const lineBreakRE = /[\r\n]/;
const whitespaceRE = /[ \f\t\r\n]+/g;
const invalidAttributeRE = /[\s"'<>\/=]/;

/** 通用指令解析 */
export const dirRE = process.env.VBIND_PROP_SHORTHAND
  ? /^v-|^@|^:|^\.|^#/
  : /^v-|^@|^:|^#/;
/** v-on 指令解析 */
export const onRE = /^@|^v-on:/;
/** v-bind 指令解析 */
export const bindRE = /^:|^\.|^v-bind:/;
const dynamicArgRE = /^\[.*\]$/;

/**在文本节点中，解码 Html 字符实体  '&lt;' => '<' */
const decodeHTMLCached = cached(he.decode);

let transforms: Array<Required<ModuleOptions>['transformNode']> = [];
let warn: Function;
let delimiters: [string, string] | undefined;

function isTextTag(el: ASTElement): boolean {
  return el.tag === 'script' || el.tag === 'style';
}

function createASTElement(
  tag: string,
  attrs: Array<ASTAttr>,
  parent?: ASTElement
) {
  /**
   * attrsList:[{name:'id',value:'"app"',start:,end:,dynamic:}]
   * attrsMap:{'id':"app"}
   * rawAttrsMap:{'id':{name:'id',value:'"app"',start:,end:,dynamic:}}
   */
  let element: ASTElement = {
    type: Node['ELEMENT_NODE'],
    tag: tag,
    attrsList: attrs,
    attrsMap: makeAttrsMap(attrs),
    rawAttrsMap: {},
    parent,
    children: [],
  };

  return element;
}

/**
 * Array:
 * [
 *  {name:'id',value:'app'},
 *  {name:'style',value:'color:red;font-size:20px'}
 * ] 转成
 *
 * Object:
 * {
 *    id:'app',
 *    style:'color:red;font-size:20px'
 * }
 * 方便根据属性名查找属性值
 */
function makeAttrsMap(attrs: Array<ASTAttr>) {
  let map: ObjectType = {};
  attrs.forEach((attr) => {
    if (__DEV__ && map[attr.name]) {
      /**
       * Vue行为:
       * <div class="foo" class="bar"></div>
       * class="bar" 覆盖 class="foo"
       *
       * <div v-bind:class="'foo'" v-bind:class="'bar'"
       * v-bind:class="'bar'" 覆盖  v-bind:class="'foo'"
       *
       * 浏览器行为:
       * <div class="foo" class="bar"></div>
       * 已经有 class="foo" 则抛弃class="bar"
       *
       */
      warn('duplicate attribute: ' + attr.name, attr);
    }
    map[attr.name] = attr.value;
  });

  return map;
}

function processElement(el: ASTElement, options: CompilerOptions) {
  processKey(el);
  /**
   * 处理完结构化指令后，结构化指令不再出现在 el.attrsList 中，
   * key 属性在 processKey(el) 之后，从 el.attrsList 中删除,但是仍需出现在 data 中 data={key:"key"}
   * 如果 el.plain 结果为 true,则表明 el 没有属性，则跳过 genData() 的调用
   */
  el.plain = !el.key && !el.attrsList.length;
  /**
   * style 和 class 单独处理,并从 element.attrsList 中删除
   * v-bind:style 和 v-bind:class 也会剔除，新增 styleBinding 和 classBinding
   * 如果不剔除，也能执行正确，因为 v-bind 被当做普通属性在 processAttrs 中处理
   */
  for (let i = 0; i < transforms.length; i++) {
    el = transforms[i](el, options) || el;
  }

  /**
   * 标签上的(剔除 style 和 class )的剩余属性
   * <div id='app' v-bind:role='role' :count="10" v-on:click="clickHandler" @click="clickHandler" ></div>
   */
  processAttrs(el);

  return el;
}
function processKey(el: ASTElement) {
  const exp = getBindingAttr(el, 'key');
  if (exp) {
    if (__DEV__) {
      if (el.tag === 'template') {
        warn(
          `<template> cannot be keyed. Place the key on real elements instead.`,
          getRawBindingAttr(el, 'key')
        );
      }
      if (el.for) {
      }
    }
    el.key = exp;
  }
}
function processAttrs(el: ASTElement) {
  const list = el.attrsList;
  for (let i = 0, l = list.length; i < l; i++) {
    let name = list[i].name;
    // let rawName = name;
    let value = list[i].value;
    let isDynamic = false;
    /** attrsList 中除了 DOM 属性，还有 Vue 指令 */
    if (dirRE.test(name)) {
      /** Vue 属性 */
      el.hasBindings = true;

      if (bindRE.test(name)) {
        /** v-bind 解析 */
        /** v-bind:title => title */
        name = name.replace(bindRE, '');
        /** 处理 value 中的过滤器 v-bind:title="apple | filter" */
        value = parseFilters(value);
        isDynamic = dynamicArgRE.test(name);

        if (isDynamic) {
          /**
           * 动态属性名
           * v-bind:[attributename]="apple"
           * name 为 attributename 变量值
           */
          name = name.slice(1, -1);
        }
        /**
         * v-bind 需要有值
         * <div v-bind:role></div>
         */
        if (__DEV__ && value.trim().length === 0) {
          warn(
            `The value for a v-bind expression cannot be empty. Found in "v-bind:${name}"`
          );
        }
        addAttr(el, name, value, list[i], isDynamic);
      } else if (onRE.test(name)) {
        /** v-on 解析 */
      } else {
        /** 其他指令解析 */
      }
    } else {
      /** DOM 属性 */
      if (__DEV__) {
        const res = parseText(value, delimiters);
        if (res) {
          warn(
            `${name}="${value}": ` +
              'Interpolation inside attributes has been removed. ' +
              'Use v-bind or the colon shorthand instead. For example, ' +
              'instead of <div id="{{ val }}">, use <div :id="val">.',
            list[i]
          );
        }
      }
      addAttr(el, name, JSON.stringify(value), list[i]);
    }
  }
}

function processFor(el: ASTElement) {}
/**
 *  删除 v-if,v-else,v-else-if,因为真实 DOM 没有这些东西
 */
function processIf(el: ASTElement) {
  const exp = getAndRemoveAttr(el, 'v-if');
  if (exp) {
    el.if = exp;
    addIfCondition(el, {
      exp,
      block: el,
    });
  } else {
    if (getAndRemoveAttr(el, 'v-else') !== null) {
      el.else = true;
    }
  }
}
function addIfCondition(el: ASTElement, condition: ASTIfCondition) {
  if (!el.ifConditions) {
    el.ifConditions = [];
  }
  el.ifConditions.push(condition);
}
function processOnce(el: ASTElement) {}
/**
 * 将模版字符串解析成 AST 语法树来描述原生语法，如果使用runtime版本，则不需要 AST 语法树了
 * <div id="app">hello<strong>world</strong></div>
 *
 *  let root = {
 *    tag:"div",
 *    type:ELEMENT_NODE
 *    attrs:[{name:"id",value:"app"}]
 *    parent:null,
 *    children:[
 *        {
 *            tag:undefined,
 *            type:TEXT_NODE,
 *            attrs:[]
 *            text:'hello',
 *            parent:root
 *         },
 *        {
 *            tag:"strong",
 *            type:ELEMENT_NODE,
 *            attrs:[],
 *            parent:root,
 *            children:[
 *                {
 *                    tag:undefined,
 *                    type:TEXT_NODE,
 *                    attrs:[],
 *                    text:"world",
 *                    parent:...
 *                 }
 *            ]
 *        }
 *    ]
 *  }
 */

export function parse(template: string, options: CompilerOptions) {
  warn = options.warn || baseWarn;
  delimiters = options.delimiters;

  /**
   * platform/web/compiler/modules
   * 获取 transformNode 函数，结果已经剔除了 undefined，所以 transforms 类型用 Required<T> 处理
   *
   */
  transforms = pluckModuleFunction(options.modules, 'transformNode');

  /**每次解析模版时，都需要生成新的树 */
  let root: ASTElement | undefined = void 0;
  let currentParent: ASTElement | undefined = void 0;

  /**用于检测标签是否规范 */
  const stack: ASTElement[] = [];
  const whitespaceOption = options.whitespace;
  const preserveWhitespace = options.preserveWhitespace !== false;

  let inVPre = false;
  // let inPre = false;
  let warned = false;
  function warnOnce(msg: string) {
    if (!warned) {
      warn(msg);
      warned = true;
    }
  }
  /**
   * <div id="app" class='hello'> \n \t hello \t </div>
   * 当前元素正式解析完毕，关闭元素，并且对 element 做一些细致化处理
   */
  function closeElement(element: ASTElement) {
    trimEndingWhitespace(element);
    if (!element.processed) {
      element = processElement(element, options);
    }
    /**
     * <div></div> 关闭 div 时, stack 为空，但是 element 和 root 相等，不会进入 if
     * <div></div><p></p> 关闭 p 时,stack 为空，element 和 root 不相等，进入 if
     * 然后判断 div 和 p 是否是条件渲染，如果是，则说明最终只有一个根节点，
     * 如果不是则会渲染 div 和 p，此时报错，因为 Vue 只能渲染一个根节点
     *
     */
    if (!stack.length && element != root) {
      if (root && root.if && (element.else || element.elseif)) {
        addIfCondition(root, {
          exp: element.elseif,
          block: element,
        });
      } else if (__DEV__) {
        warnOnce(
          `Component template should contain exactly one root element. ` +
            `If you are using v-if on multiple elements, ` +
            `use v-else-if to chain them instead.`
        );
      }
    }
    if (currentParent) {
      element.parent = currentParent;
      currentParent.children.push(element);
    }
  }
  /**
   * 剔除每个 Element 最后节点不能为空的 text 节点
   * <div><p>hello</p> #text1 #text2 #text3</div>
   * 浏览器会从结尾开始，剔除空白字符
   */
  function trimEndingWhitespace(element: ASTElement) {
    let lastNode;

    while (
      (lastNode = element.children[element.children.length - 1]) &&
      lastNode.type == Node['TEXT_NODE'] &&
      lastNode.text == ' '
    ) {
      element.children.pop();
    }
  }
  /** parseHTML 对模版进行词法分析,钩子函数 start,end,chars,comment进行句法分析 */
  parseHTML(template, {
    warn,
    expectHTML: options.expectHTML,
    isUnaryTag: options.isUnaryTag,
    canBeLeftOpenTag: options.canBeLeftOpenTag,
    shouldDecodeNewlines: options.shouldDecodeNewlines,
    shouldDecodeNewlinesForHref: options.shouldDecodeNewlinesForHref,
    shouldKeepComment: options.comments,
    outputSourceRange: options.outputSourceRange,

    start(
      tag: string,
      attrs: ASTAttr[],
      unary: boolean,
      start: number,
      end: number
    ) {
      let element: ASTElement = createASTElement(tag, attrs, currentParent);
      if (__DEV__) {
        if (options.outputSourceRange) {
          element.rawAttrsMap = element.attrsList.reduce(function (
            cumulated,
            attr
          ) {
            cumulated[attr.name] = attr;
            return cumulated;
          },
          {} as { [key: string]: ASTAttr });
        }
        attrs.forEach((attr) => {
          if (invalidAttributeRE.test(attr.name)) {
            // warn(
            //   `Invalid dynamic argument expression: attribute names cannot contain ` +
            //     `spaces, quotes, <, >, / or =.`,
            //   options.outputSourceRange
            //     ? {
            //         start: attr.start! + attr.name.indexOf(`[`),
            //         end: attr.start! + attr.name.length,
            //       }
            //     : undefined
            // );
          }
        });
      }
      if (inVPre) {
      } else if (!element.processed) {
        /**处理结构化指令 */
        processFor(element);
        processIf(element);
        processOnce(element);
      }
      if (!root) {
        root = element;
      }
      /**
       * 如果是自闭标签，则直接关闭
       * 否则当前标签入栈，作为子标签的父标签标识
       */
      if (!unary) {
        currentParent = element;
        stack.push(element);
      } else {
        closeElement(element);
      }
    },
    end(tag: string, start: number, end: number) {
      /**获取栈顶元素 */
      let element = stack.pop();
      /**获取 element 的 parent */
      currentParent = stack.at(stack.length - 1);
      if (element) {
        closeElement(element);
      }
    },
    chars(text: string, start?: number, end?: number) {
      // console.log(text);
      if (!currentParent) {
        if (__DEV__) {
          if (text == template) {
            warnOnce(
              'Component template requires a root element, rather than just text.'
            );
          } else if ((text = text.trim())) {
            warnOnce(`text "${text}" outside root element will be ignored.`);
          }
        }
      } else {
        const children = currentParent.children;
        if (text.trim()) {
          /**
           * text 不是空白字符情况下:
           *
           * 在script和style标签中的字符实体，浏览器默认不解析
           * template:"<script>&lt;hello</script>"
           *
           * 其他标签中的字符实体,浏览器会解析成 ASCII 字符
           * template:"<div>&lt;hello</div>"=> <div><hello</div>
           */
          text = isTextTag(currentParent)
            ? text
            : (decodeHTMLCached(text) as string);
        } else if (!children.length) {
          /** text 是空白字符，且 text 是原始 html中 currentParent 唯一子节点,不需要显示内容 */
          text = '';
        } else if (whitespaceOption) {
          if (whitespaceOption == 'condense') {
            /**如果有换行，则返回 "",如果没有，则返回 " " */
            text = lineBreakRE.test(text) ? '' : ' ';
          } else {
            text = ' ';
          }
        } else {
          /**
           * text 是空白字符 "   \t \n     "
           * 是否至少保留一个空格
           *
           */
          text = preserveWhitespace ? ' ' : '';
        }
        if (text) {
          if (whitespaceOption == 'condense') {
            /**
             * <div>hello \t \r\n \f world </div>
             * 压缩为
             * <div>hello world</div>
             *
             * 虽然浏览器在渲染时，结果是一样的
             */
            text = text.replace(whitespaceRE, '');
          }
          let child: ASTNode | undefined = void 0;
          let res;

          if (text != ' ' && (res = parseText(text, delimiters))) {
            child = {
              type: Node.ATTRIBUTE_NODE,
              expression: res.expression,
              tokens: res.tokens,
              text,
            };
          } else {
            /** text 是纯文本 */
            child = {
              type: Node['TEXT_NODE'],
              text,
            };
          }
          if (child) {
            children.push(child);
          }
        }
      }
    },
    comment(text: string, start: number, end: number) {},
  });
  return root;
}
