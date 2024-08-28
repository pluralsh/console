type Remainder<T> =
  | ((remainder: T[], arr: T[]) => any)
  | number
  | bigint
  | string
  | boolean
  | null
  | symbol
  | object
  | undefined

export function insertBetweenLimited<T, TVal, TRemainder extends Remainder<T>>(
  arr: T[],
  value: TVal,
  limit?: number | undefined,
  remainderLabel?: TRemainder
) {
  if (limit === undefined) limit = Infinity

  const result: (
    | T
    | TVal
    | (undefined extends TRemainder
        ? never
        : TRemainder extends (...args: any) => infer Return
        ? Return
        : TRemainder)
  )[] = []

  const arrLimit =
    arr.length > limit ? (remainderLabel ? limit - 1 : limit) : arr.length

  for (let i = 0; i < arrLimit; i++) {
    result.push(arr[i])
    if (i !== arrLimit - 1) {
      result.push(value)
    }
  }
  if (arr.length > limit && remainderLabel) {
    if (typeof remainderLabel === 'function') {
      result.push(remainderLabel(arr.slice(limit - 1), arr))
    } else if (typeof remainderLabel !== 'undefined') {
      result.push(remainderLabel as any)
    }
  }

  return result
}
