import { inBrowser } from "core/util";
import { PatchModuleOptions } from "src/types/vnode";

function _enter() {}
const options = inBrowser
  ? {
      create: _enter,
    }
  : {};
export default options as PatchModuleOptions;
