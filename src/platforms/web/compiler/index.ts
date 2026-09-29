import { createCompiler } from "compiler/index";
import { baseOptions } from "./options";

/**
 * 不同平台传入不同的 options
 */
const { compile, compileToFunctions } = createCompiler(baseOptions);

export { compile, compileToFunctions };
