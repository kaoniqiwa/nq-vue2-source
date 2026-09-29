import { PatchModuleOptions, VNodeWithData } from "src/types/vnode";
import VNode from "../vnode";

function updateDirectives(oldVnode: VNode, vnode: VNodeWithData) {}

export default {
  create: updateDirectives,
  update: updateDirectives,
  destroy: function unbindDirectives(vnode: VNodeWithData) {},
} as PatchModuleOptions;
