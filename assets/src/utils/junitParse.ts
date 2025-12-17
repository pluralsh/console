// based on https://github.com/Kesin11/ts-junit2json/blob/master/src/index.ts
// but ported to use fast-xml-parser instead of xml2js
import { XMLParser, type X2jOptions } from 'fast-xml-parser'

type ObjOrArray =
  | Record<string, any>
  | Array<ObjOrArray>
  | string
  | number
  | boolean
  | null

/** represents a `<testsuites>` tag.  */
export type TestSuites = {
  testsuite?: TestSuite[]
  time?: number
  tests?: number
  failures?: number
  errors?: number
  disabled?: number
}

/** represents a `<testcase>` tag.  */
export type TestCase = {
  name?: string
  classname?: string
  assertions?: number
  time?: number
  status?: string
  skipped?: Skipped[]
  error?: Details[]
  failure?: Details[]
  'system-out'?: string[]
  'system-err'?: string[]
}

/** represents a `<testsuite>` tag.  */
export type TestSuite = {
  testcase?: TestCase[]
  name?: string
  tests?: number
  failures?: number
  errors?: number
  time?: number
  disabled?: number
  skipped?: number
  timestamp?: string
  hostname?: string
  id?: string
  package?: string
  properties?: Property[]
  'system-out'?: string[]
  'system-err'?: string[]
}

/** represents a `<properties>` tag.  */
export type Property = { name?: string; value?: string }
/** represents a `<skipped>` tag.  */
export type Skipped = { message?: string }
/** represents a `<failure> and <error>` tag.  */
export type Details = { message?: string; type?: string; inner?: string }

export type FastXmlOptions = Partial<X2jOptions>

/**
 * Parses the given JUnit XML string into a JavaScript object representation
 * using fast-xml-parser. Always returns a TestSuites object (standalone
 * testsuite elements are wrapped in a TestSuites container).
 *
 */
export const parseJunit = (
  xmlString: string,
  fastXmlOptions?: FastXmlOptions
): Nullable<TestSuites> => {
  const parser = new XMLParser({
    // we want attributes preserved and numeric values parsed where possible
    ignoreAttributes: false,
    attributeNamePrefix: '', // attributes become normal props: name, tests, ...
    textNodeName: '_', // inner text goes under "_", like xml2js
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
    ...fastXmlOptions,
  })

  const result = parser.parse(xmlString)
  if (result == null) return null

  if ('testsuites' in result) return _parse(result.testsuites) as TestSuites

  // Wrap standalone <testsuite> in a TestSuites container with aggregate values
  if ('testsuite' in result) {
    const parsedSuite = _parse(result.testsuite) as TestSuite
    const testsuite = [parsedSuite]
    const { time, tests, failures, errors, disabled } = parsedSuite
    return { testsuite, time, tests, failures, errors, disabled }
  }

  return null
}

const _parse = (objOrArray: ObjOrArray): ObjOrArray => {
  // Arrays: recurse each element, normalize primitives to { inner: ... } like original
  if (Array.isArray(objOrArray))
    return objOrArray.map((_obj: ObjOrArray) => {
      if (Array.isArray(_obj) || (typeof _obj === 'object' && _obj !== null)) {
        return _parse(_obj)
      }
      // primitive -> { inner: primitive }
      return { inner: _obj }
    })

  // Primitives not in an array: wrap as { inner: value }
  if (objOrArray === null || typeof objOrArray !== 'object')
    return { inner: objOrArray }

  const input = objOrArray as Record<string, any>
  const output: Record<string, any> = {}

  Object.keys(input).forEach((key) => {
    const nested = input[key]

    // Map text node "_" => "inner"
    if (key === '_') {
      output.inner = nested
      return
    }

    // <system-out> / <system-err>: ensure they always end up as string[]
    if (key === 'system-out' || key === 'system-err') {
      if (Array.isArray(nested))
        output[key] = nested.map((n: any) =>
          n && typeof n === 'object' && '_' in n ? n._ : String(n)
        )
      else if (nested && typeof nested === 'object' && '_' in nested)
        output[key] = [String(nested._)]
      else output[key] = [String(nested)]

      return
    }

    // <properties><property ... /></properties>
    if (key === 'properties') {
      // Depending on XML, this can be:
      // { property: {...} } or { property: [...] } or [ { property: ... } ]
      const propsNode = Array.isArray(nested) ? nested[0] : nested
      const propRaw = propsNode?.property ?? []

      const propArray = Array.isArray(propRaw) ? propRaw : [propRaw]
      output[key] = propArray.map((p: any) => _parse(p))
      return
    }

    // Objects / arrays: recurse
    if (Array.isArray(nested) || (nested && typeof nested === 'object')) {
      output[key] = _parse(nested)
      return
    }

    // Plain scalar value: copy through
    output[key] = nested
  })

  return output
}
