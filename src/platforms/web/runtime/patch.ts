import { createPatchFunction } from "core/vdom/patch";

import * as nodeOps from "web/runtime/node-ops";

import baseModules from "core/vdom/modules/index";

import platformModules from "web/runtime/modules";

const modules = platformModules.concat(baseModules);

export const patch = createPatchFunction({
  nodeOps,
  modules,
});
