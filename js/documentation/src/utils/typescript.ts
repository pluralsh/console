export function isDefined<T>(argument: T | undefined): argument is T {
  return argument !== undefined
}

export function isNotNull<T>(argument: T | null): argument is T {
  return argument !== null
}

export function exists<T>(argument: T | null | undefined): argument is T {
  return argument !== null && argument !== undefined
}

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
