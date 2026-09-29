import { __DEV__, extend, noop } from 'src/shared/util';
import {
  CompiledResult,
  CompilerOptions,
  ToFunctionResult,
} from 'src/types/compiler';
import { Component } from 'src/types/component';
import { warn as baseWarn } from 'core/util';
import { generateCodeFrame } from './codeframe';

export function createCompileToFunctionFn(
  compile: (template: string, options?: CompilerOptions) => CompiledResult
) {
  /*作为缓存，防止每次都重新编译*/
  const cache: Record<string, any> = Object.create(null);

  /** runtime-with-compiler 中调用的是该函数 */
  return function compileToFunctions(
    template: string,
    options?: CompilerOptions,
    vm?: Component
  ): ToFunctionResult {
    options = extend({}, options);
    const warn = options.warn || baseWarn;
    Reflect.deleteProperty(options, 'warn');

    /** 检查内容安全策略,看看 new Function()能不能使用，因为在渲染函数执行时，需要使用到 new Function */
    if (__DEV__) {
      try {
        new Function('return 1');
      } catch (e: any) {
        if (e.toString().match(/unsafe-eval|CSP/)) {
          warn(
            'It seems you are using the standalone build of Vue.js in an ' +
              'environment with Content Security Policy that prohibits unsafe-eval. ' +
              'The template compiler cannot work in this environment. Consider ' +
              'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
              'templates into render functions.'
          );
        }
      }
    }
    const key = options.delimiters
      ? String(options.delimiters) + template
      : template;
    if (cache[key]) {
      return cache[key];
    }

    /**将 template 编译成字符串函数 */
    const compiled = compile(template, options);

    /** 编译期间的一些警告+报错 */
    if (__DEV__) {
      if (compiled.errors && compiled.errors.length) {
        if (options.outputSourceRange) {
          compiled.errors.forEach((e) => {
            warn(
              `Error compiling template:\n\n${e.msg}\n\n` +
                generateCodeFrame(template, e.start, e.end),
              vm
            );
          });
        } else {
          warn(
            `Error compiling template:\n\n${template}\n\n` +
              compiled.errors.map((e) => `- ${e}`).join('\n') +
              '\n',
            vm
          );
        }
      }
    }

    /** 在字符串函数体转真正的函数时收集报错信息 */
    const fnGenErrors: Array<{ err: Error; code: string }> = [];

    const res: ToFunctionResult = {
      render: createFunction(compiled.render, fnGenErrors),
      staticRenderFns: compiled.staticRenderFns.map((code) => {
        return createFunction(code, fnGenErrors);
      }),
    };

    if (__DEV__) {
      /**
       * 打印 new Function()时的错误
       */
      if ((!compiled.errors || !compiled.errors.length) && fnGenErrors.length) {
        warn(
          `Failed to generate render function:\n\n` +
            fnGenErrors
              .map(
                ({ err, code }) => `${(err as any).toString()} in\n\n${code}\n`
              )
              .join('\n'),
          vm
        );
      }
    }
    // return res as ToFunctionResult;
    return (cache[key] = res) as ToFunctionResult;
  };
}

/**
 * 所有模版引擎的实现都需要借助 new Function() + with()作用域
 * new Function('a','b','return a+b')
 * function (a,b){return a+b}
 */
function createFunction(
  code: string,
  errors: Array<{ err: Error; code: string }>
) {
  try {
    return new Function(code);
  } catch (err: any) {
    errors.push({ err, code });
    return noop;
  }
}
