import { memoryParser as mParser } from 'kubernetes-resource-parser'

const MULTIPLES = {
  m: 1000,
  n: 1000 ** 3,
}

const nanToUndef = (val) =>
  typeof val !== 'number' || Number.isNaN(val) ? undefined : val

export function isEqual({ metadata: first }, { metadata: second }) {
  return first.namespace === second.namespace && first.name === second.name
}

export function cpuParser(input?: string | null) {
  if (!input) {
    return undefined
  }
  const milliMatch = input.match(/^([0-9]+)([a-z])$/)

  if (milliMatch) {
    return parseFloat(milliMatch[1]) / MULTIPLES[milliMatch[2]]
  }

  return parseFloat(input)
}

export function memoryParser(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return undefined
  }

  return nanToUndef(mParser(value))
}
