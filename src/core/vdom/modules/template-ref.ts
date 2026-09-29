import { PatchModuleOptions, VNodeWithData } from "src/types/vnode";

export default {
  create(_: any, vnode: VNodeWithData) {},
  update(oldVnode: VNodeWithData, vnode: VNodeWithData) {},
  destroy(vnode: VNodeWithData) {},
} as PatchModuleOptions;
