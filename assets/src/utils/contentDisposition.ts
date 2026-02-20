/*!
 * Content-Disposition header parsing helpers.
 * Adapted from:
 * https://raw.githubusercontent.com/Methuselah96/content-disposition-header/refs/heads/main/index.ts
 *
 * Original Copyright(c) 2014-2017 Douglas Christopher Wilson
 * Original Copyright(c) 2021 Nathan Bierema
 * MIT Licensed
 */

const QESC_REGEXP = /\\([\u0000-\u007f])/g // eslint-disable-line no-control-regex
const NON_LATIN1_REGEXP = /[^\x20-\x7e\xa0-\xff]/g
const HEX_ESCAPE_REPLACE_REGEXP = /%([0-9A-Fa-f]{2})/g

const PARAM_REGEXP =
  /;[\x09\x20]*([!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*=[\x09\x20]*("(?:[\x20!\x23-\x5b\x5d-\x7e\x80-\xff]|\\[\x20-\x7e])*"|[!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*/g // eslint-disable-line no-control-regex
const DISPOSITION_TYPE_REGEXP =
  /^([!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*(?:$|;)/ // eslint-disable-line no-control-regex
const EXT_VALUE_REGEXP =
  /^([A-Za-z0-9!#$%&+\-^_`{}~]+)'(?:[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}|[A-Za-z]{4,8}|)'((?:%[0-9A-Fa-f]{2}|[A-Za-z0-9!#$&+.^_`|~-])+)$/

type ContentDispositionParameters = Record<string, string>

function getlatin1(value: string) {
  return String(value).replace(NON_LATIN1_REGEXP, '?')
}

function pdecode(_value: string, hex: string) {
  return String.fromCharCode(Number.parseInt(hex, 16))
}

function decodefield(value: string) {
  const match = EXT_VALUE_REGEXP.exec(value)

  if (!match) throw new TypeError('invalid extended field value')

  const charset = match[1].toLowerCase()
  const encoded = match[2]

  switch (charset) {
    case 'iso-8859-1':
      return getlatin1(encoded.replace(HEX_ESCAPE_REPLACE_REGEXP, pdecode))
    case 'utf-8':
      return decodeURIComponent(encoded)
    default:
      throw new TypeError('unsupported charset in extended field')
  }
}

function parseContentDispositionParameters(
  contentDisposition: string
): ContentDispositionParameters {
  if (!contentDisposition || typeof contentDisposition !== 'string')
    throw new TypeError('argument string is required')

  let match = DISPOSITION_TYPE_REGEXP.exec(contentDisposition)
  if (!match) throw new TypeError('invalid type format')

  let index = match[0].length
  const names: string[] = []
  const parameters: ContentDispositionParameters = {}

  index = PARAM_REGEXP.lastIndex =
    match[0].slice(-1) === ';' ? index - 1 : index

  while ((match = PARAM_REGEXP.exec(contentDisposition))) {
    if (match.index !== index) throw new TypeError('invalid parameter format')

    index += match[0].length
    let key = match[1].toLowerCase()
    let value = match[2]

    if (names.includes(key)) throw new TypeError('invalid duplicate parameter')
    names.push(key)

    if (key.endsWith('*')) {
      key = key.slice(0, -1)
      value = decodefield(value)
      parameters[key] = value
      continue
    }

    if (typeof parameters[key] === 'string') continue

    if (value[0] === '"') value = value.slice(1, -1).replace(QESC_REGEXP, '$1')

    parameters[key] = value
  }

  if (index !== -1 && index !== contentDisposition.length)
    throw new TypeError('invalid parameter format')

  return parameters
}

export function parseContentDispositionFilename(
  contentDisposition: string
): string | undefined {
  try {
    return parseContentDispositionParameters(contentDisposition).filename
  } catch {
    return undefined
  }
}
