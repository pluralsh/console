export function hasDefined<T, K extends keyof T>(
  argument: T | Defined<T, K>,
  keys: K[]
): argument is Defined<T, K> {
  return keys.every((key) => argument[key] != null)
}

type Defined<T, K extends keyof T = keyof T> = {
  [P in K]-?: Exclude<T[P], undefined | null>
}
