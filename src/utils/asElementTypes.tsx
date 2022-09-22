export function asElementTypes<T>() {
  return function ret<Obj>(obj: {
      [K in keyof Obj]: T
    }) {
    return obj
  }
}
