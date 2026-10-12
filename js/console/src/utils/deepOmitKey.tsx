import { DeepOmit } from '../components/utils/DeepOmit'

export function deepOmitKey<
  T extends Record<string, any> | null | undefined,
  K extends string,
>(obj: T, key: K) {
  if (!obj) {
    return obj as null | undefined
  }

  const { [key]: _, ...nextObj } = obj

  // biome-ignore lint/suspicious/noForIn: nextObj is a spread copy, so it has only own properties
  for (const k in nextObj) {
    if (nextObj[k] && typeof nextObj[k] === 'object') {
      nextObj[k] = deepOmitKey(nextObj[k], key)
    }
  }

  return nextObj as DeepOmit<T, K>
}
