import { isString } from 'lodash'

import { memoryParser as mParser } from 'kubernetes-resource-parser'

const MULTIPLES = {
  m: 1000,
  n: 1000 ** 3,
}

const nanToUndef = val => (typeof val !== 'number' || Number.isNaN(val) ? undefined : val)

export function isEqual({ metadata: first }, { metadata: second }) {
  return (first.namespace === second.namespace && first.name === second.name)
}

export function cpuParser(input?: string | null) {
  if (!input || typeof input !== 'string') {
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

export function cpuFormat(value?: string | number | null) {
  if (value === undefined || value === null) {
    return ''
  }
  value = isString(value) ? parseFloat(value) : value
  if (value < 1 / MULTIPLES.n) {
    return `${value * MULTIPLES.n}n`
  }

  if (value < 1 / MULTIPLES.m) {
    return `${value * MULTIPLES.m}m`
  }

  return `${value}`
}
