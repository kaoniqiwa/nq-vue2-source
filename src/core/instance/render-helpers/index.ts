import { createTextVNode } from "core/vdom/create-text";
import { toString } from "src/shared/util";
import { ObjectType } from "src/types/component";
import { bindDynamicKeys } from "./bind-dynamic-keys";
import { bindObjectProps } from "./bind-object-props";

export function installRenderHelpers(target: ObjectType) {
  target._v = createTextVNode;
  target._s = toString;
  target._d = bindDynamicKeys;
  target._b = bindObjectProps;
}
