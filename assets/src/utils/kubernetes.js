import { isString } from 'lodash'

const MULTIPLES = {
  m: 1000,
  n: 1000 ** 3,
}

export function cpuParser(input) {
  const milliMatch = input.match(/^([0-9]+)([a-z])$/)

  if (milliMatch) {
    return parseFloat(milliMatch[1]) / MULTIPLES[milliMatch[2]]
  }

  return parseFloat(input)
}

export function cpuFormat(value) {
  value = isString(value) ? parseFloat(value) : value
  if (value < 1 / MULTIPLES.n) {
    return `${value * MULTIPLES.n}n`
  }

  if (value < 1 / MULTIPLES.m) {
    return `${value * MULTIPLES.m}m`
  }

  return `${value}`
}
