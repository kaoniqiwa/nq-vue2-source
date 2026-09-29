import VNode from "core/vdom/vnode";
import { namespaceMap } from "web/util";

export function parentNode(node: Node) {
  return node.parentNode;
}

export function nextSibling(node: Node) {
  return node.nextSibling;
}

export function appendChild(node: Node, child: Node) {
  node.appendChild(child);
}

export function insertBefore(
  parentNode: Node,
  newNode: Node,
  referenceNode: Node | null
) {
  parentNode.insertBefore(newNode, referenceNode);
}

export function createElementNS(namespace: string, tagName: string): Element {
  return document.createElementNS(namespaceMap[namespace], tagName);
}

export function createElement(tagName: string, vnode: VNode) {
  const elm = document.createElement(tagName);
  if (tagName !== "select") {
    return elm;
  }
}

export function createTextNode(text: string): Text {
  return document.createTextNode(text);
}

export function removeChild(node: Node, child: Node) {
  node.removeChild(child);
}

export function setTextContent(node: Node, text: string) {
  node.textContent = text;
}
