import modules from "./modules/index";
import { CompilerOptions } from "src/types/compiler";
import directives from "./directives";
import {
  getTagNamespace,
  isPreTag,
  isReservedTag,
  mustUseProp,
} from "web/util";
import { canBeLeftOpenTag, isUnaryTag } from "./utils";
import { genStaticKeys } from "shared/util";

/**
 *
 */
export const baseOptions: CompilerOptions = {
  expectHTML: true,
  modules,
  directives,
  isPreTag,
  isUnaryTag,
  mustUseProp,
  canBeLeftOpenTag,
  isReservedTag,
  getTagNamespace,
  staticKeys: genStaticKeys(modules),
};
