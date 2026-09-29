export function invokeWithErrorHandling(
  handler: Function,
  context: any,
  args?: any[]
) {
  let res;
  try {
    res = args ? handler.apply(context, args) : handler.call(context);
  } catch (e: any) {}

  return res;
}
