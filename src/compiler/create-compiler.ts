import {
  CompiledResult,
  CompilerOptions,
  WarningMessage,
} from "src/types/compiler";
import { createCompileToFunctionFn } from "./to-function";
import { __DEV__, extend } from "shared/util";

export function createCompilerCreator(
  baseCompile: (template: string, options: CompilerOptions) => CompiledResult
) {
  return function createCompiler(baseOptions: CompilerOptions) {
    function compile(
      template: string,
      options?: CompilerOptions
    ): CompiledResult {
      /**
       * baseOptions 为通用参数 platforms/web/compiler/options.ts
       * options 为平台独有参数 platforms/web/runtime-with-comipler.ts
       */
      const finalOptions = Object.create(baseOptions);
      const errors: WarningMessage[] = [];
      const tips: WarningMessage[] = [];

      let warn = (
        msg: WarningMessage,
        range: { start: number; end: number },
        tip: string
      ) => {
        (tip ? tips : errors).push(msg);
      };

      if (options) {
        if (__DEV__ && options.outputSourceRange) {
          const leadingSpaceLength = template.match(/^\s*/)![0].length;

          warn = (
            msg: WarningMessage | string,
            range: { start: number; end: number },
            tip: string
          ) => {
            const data: WarningMessage =
              typeof msg === "string" ? { msg } : msg;

            if (range) {
              if (range.start != null) {
                data.start = range.start + leadingSpaceLength;
              }
              if (range.end != null) {
                data.end = range.end + leadingSpaceLength;
              }
            }
            (tip ? tips : errors).push(data);
          };
        }
        if (options.modules) {
          finalOptions.modules = (baseOptions.modules || []).concat(
            options.modules
          );
        }
        if (options.directives) {
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          );
        }
        /**
         * 由于需要排除 modules 和 directives ，所以这里不用 extend()
         */
        for (const key in options) {
          if (key != "modules" && key != "directives") {
            finalOptions[key] = options[key as keyof CompilerOptions];
          }
        }
      }
      finalOptions.warn = warn;

      const compiled = baseCompile(template.trim(), finalOptions);

      compiled.errors = errors;
      compiled.tips = tips;

      return compiled;
    }
    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile),
    };
  };
}
