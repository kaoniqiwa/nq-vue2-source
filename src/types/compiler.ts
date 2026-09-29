import { ObjectType } from './component';

export type ModuleOptions = {
  /**
   * 格式化数据
   * class="bar" v-bind:class="foo" => AstElement = {staticClass:"bar",classBinding:foo}
   */
  transformNode?: (
    el: ASTElement,
    options: CompilerOptions
  ) => ASTElement | null | void;
  /**
   * 将格式化后的数据转成字符串
   * data = `{staticClass:"bar",class:foo}`
   */
  genData?: (el: ASTElement) => string;
  staticKeys?: Array<string>;
};
export type CompilerOptions = {
  warn?: Function;
  /**平台相关Modules,编译期间如何处理 class='foo' 和 :class='foo' */
  modules?: Array<ModuleOptions>;
  /**平台相关directives */
  directives?: { [key: string]: Function };
  /**是否是一元标签 */
  isUnaryTag?: (tag: string) => boolean | undefined;
  canBeLeftOpenTag?: (tag: string) => boolean | undefined;
  isReservedTag?: (tag: string) => boolean;
  /** 提取 modules 中的 staticKeys，组成 "staticClass,staticStyle" */
  staticKeys?: string;

  /**是否需要在标签之间插入一个空格 */
  preserveWhitespace?: boolean;
  whitespace?: 'preserve' | 'condense';

  /**web 平台独有的配置,其他平台默认 false */
  /**是否需要补全html标签 <p><h1></h1></p> ==> <p></p><h1></h1><p></p> */
  expectHTML?: boolean;
  /**换行符是否需要编码 IE和chrome */
  shouldDecodeNewlines?: boolean;
  shouldDecodeNewlinesForHref?: boolean;
  outputSourceRange?: boolean;
  isPreTag?: (attr?: string) => boolean;
  mustUseProp?: (tag: string, type?: string, attr?: string) => boolean;
  shouldKeepComment?: boolean;
  getTagNamespace?: (tag: string) => string | undefined;

  /**运行时配置 */
  delimiters?: [string, string];
  /** 在编译时，是否需要保留 html 注释 */
  comments?: boolean;
};

export interface HTMLParserOptions extends CompilerOptions {
  start?: (
    tag: string,
    attrs: ASTAttr[],
    unary: boolean,
    start: number,
    end: number
  ) => void;
  end?: (tag: string, start: number, end: number) => void;
  chars?: (text: string, start?: number, end?: number) => void;
  comment?: (content: string, start: number, end: number) => void;
}

export type ASTIfCondition = { exp?: string; block: ASTElement };
export type ASTIfConditions = Array<ASTIfCondition>;

export type WarningMessage = {
  msg: string;
  start?: number;
  end?: number;
};
export type CompiledResult = {
  ast: ASTElement | undefined;
  render: string;
  staticRenderFns: Array<string>;
  errors?: Array<WarningMessage>;
  tips?: Array<string | WarningMessage>;
};

export interface ToFunctionResult {
  render: Function;
  staticRenderFns: Array<Function>;
}

/**开始标签的数据结构  <div id='app'>*/
export interface StartTagMatch {
  /**匹配的标签名 */
  tagName: string;
  /**标签属性 */
  attrs: Array<RegExpMatchArray & { start: number; end: number }>;
  /**匹配的开始位置 */
  start: number;
  /**匹配的结束位置 */
  end: number;
  /**如果是自闭标签，unarySlash赋值 / ,否则为 undefined */
  unarySlash?: string;
}

export type ASTAttr = {
  name: string;
  value: any;
  dynamic?: boolean;
  start?: number;
  end?: number;
};
/**html解析后的雏形结构 */
export interface StackElement {
  tag: string;
  lowerCasedTag: string;
  attrs: Array<ASTAttr>;
  start: number;
  end: number;
}

export type ASTElement = {
  type: Node['ELEMENT_NODE'];
  tag: string;
  attrsList: Array<ASTAttr>;
  children: Array<ASTNode>;
  attrsMap: ObjectType;
  rawAttrsMap: { [key: string]: ASTAttr };

  parent?: ASTElement;
  processed?: boolean;

  hasBindings?: boolean;

  staticClass?: string;
  classBinding?: string;
  staticStyle?: string;
  styleBinding?: string;

  attrs?: Array<ASTAttr>;
  dynamicAttrs?: Array<ASTAttr>;
  /** 标签上没有属性，则不需要生成 data 对象 */
  plain?: boolean;

  if?: string;
  ifProcessed?: boolean;
  else?: boolean;
  elseif?: string;
  ifConditions?: ASTIfConditions;

  for?: string;
  forProcessed?: boolean;
  key?: string;
};
export type ASTExpression = {
  type: Node['ATTRIBUTE_NODE'];
  expression: string;
  tokens: Array<string | Object>;
  text: string;
};
export type ASTText = {
  type: Node['TEXT_NODE'];
  text: string;
  isComment?: boolean;
};

export type ASTNode = ASTElement | ASTText | ASTExpression;

export type CodegenResult = {
  render: string;
  staticRenderFns: Array<string>;
};

export type Range = { start?: number; end?: number };

export type DataGenFunction = (el: ASTElement) => string;
export type TransformFunction = (el: ASTElement, code: string) => string;
