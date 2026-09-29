import { CompiledResult, CompilerOptions } from 'src/types/compiler';
import { createCompilerCreator } from './create-compiler';
import { parse } from './parser';
import { generate } from './codegen';

/** 一层层封装各平台 CompilerOptions,最终调用 baseCompile  */
export const createCompiler = createCompilerCreator(function baseCompile(
  template: string,
  options: CompilerOptions
): CompiledResult {
  let ast = parse(template.trim(), options);
  let code = generate(ast, options);

  // console.log(code);
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns,
  };
});
