/* Use this file to export your Markdoc functions */

import { type ConfigFunction } from '@markdoc/markdoc'

export const includes: ConfigFunction = {
  transform(parameters) {
    const [array, value] = Object.values(parameters) as [unknown, unknown]

    return Array.isArray(array) ? array.includes(value) : false
  },
}

export const upper: ConfigFunction = {
  transform(parameters) {
    const str = parameters[0] as unknown

    return typeof str === 'string' ? str.toUpperCase() : str
  },
}
