import { makeMap } from "shared/util";

/**
 * 布尔属性:只要在模版上出现，就会应用属性的特性，无论是否有属性值或者属性值为任意值
 *
 * 只要 hidden 出现，div就一定会被隐藏
 * <div hidden></div>
 *
 * 并不关心 hidden 的属性值,照样隐藏，为了不隐藏 div,只能删除 hidden 属性
 * <div hidden='false'></div>
 *
 */
export const isBooleanAttr = makeMap(
  "allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare," +
    "default,defaultchecked,defaultmuted,defaultselected,defer,disabled," +
    "enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple," +
    "muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly," +
    "required,reversed,scoped,seamless,selected,sortable," +
    "truespeed,typemustmatch,visible"
);

/**
 * undefined == null    true
 * undefined === null   false
 */
export function isFalsyAttrValue(value: any) {
  return value == null || value === false;
}

/** 属性的值为 true/false */
export const isEnumeratedAttr = makeMap("contenteditable,draggable,spellcheck");

const isValidContentEditableValue = makeMap(
  "events,caret,typing,plaintext-only"
);
/**
 * 浏览器 HTML 页面 <div contenteditable></div>，outerHTML '<div contenteditable=""></div>'
 * Vue 会将 contenteditable="" 转成 contenteditable="true"
 *
 */
export function convertEnumeratedValue(key: string, value: any) {
  return isFalsyAttrValue(value) || value === "false"
    ? "false"
    : key === "contenteditable" && isValidContentEditableValue(value)
    ? value
    : "true";
}

const acceptValue = makeMap("input,textarea,option,select,progress");

/**
 * 是否使用 DOM 原生的属性绑定
 * div.innerHTML = 'aa'
 * input.value = 'aa'
 */
export const mustUseProp = (tag: string, type?: string, attr?: string) => {
  return (
    (attr === "value" && acceptValue(tag) && type !== "button") ||
    (attr === "selected" && tag === "option") ||
    (attr === "checked" && tag === "input") ||
    (attr === "muted" && tag === "video")
  );
};
export const xlinkNS = "http://www.w3.org/1999/xlink";

/**
 * xlink:type="simple"
 * xlink:href="http://book.com/images/HPotter.gif"
 * xlink:show="new"
 */
export const isXlink = (name: string) => {
  return name.charAt(5) === ":" && name.slice(0, 5) === "xlink";
};

/** 'xlink:href' 获取 'href'*/
export const getXlinkProp = (name: string) => {
  return isXlink(name) ? name.slice(6) : "";
};
