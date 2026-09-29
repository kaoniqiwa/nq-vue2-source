import { inBrowser } from "core/util";

let div = document.createElement("div");

/** 如果 '\n' 被渲染成 '&#10;',则 Vue 在解析模版时，需要将 '&#10;' 转回 '\n' */
function getShouldDecode(href: boolean) {
  div.innerHTML = href ? `<a href="\n"/>` : `<div a="\n"/>`;
  return div.innerHTML.indexOf("&#10;") > 0;
}

/**
 * IE中:<div a="\n"></div>会被渲染成 <div a="&#10;"></div>
 */
// #3663: IE encodes newlines inside attribute values while other browsers don't
export const shouldDecodeNewlines = inBrowser ? getShouldDecode(false) : false;

/**
 * Chrome中:<a href="\n"/>会被渲染成 <a href="&#10;"/>
 */
// #6828: chrome encodes content in a[href]
export const shouldDecodeNewlinesForHref = inBrowser
  ? getShouldDecode(true)
  : false;
