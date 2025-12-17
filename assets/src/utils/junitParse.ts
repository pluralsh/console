// loosely adapted from https://github.com/Kesin11/ts-junit2json/blob/master/src/index.ts
// also referenced https://github.com/testmoapp/junitxml/blob/main/examples/junit-complete.xml for typing
// but ported to use fast-xml-parser instead of xml2js
import { XMLParser, type X2jOptions } from 'fast-xml-parser'

type ParsedObject = Record<string, unknown>

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Aggregate test statistics shared by `<testsuites>` and `<testsuite>` */
type TestStats = {
  name?: string
  tests?: number
  failures?: number
  errors?: number
  skipped?: number
  assertions?: number
  time?: number
  timestamp?: string
}

/** represents a `<testsuites>` tag.  */
export type TestSuites = TestStats & {
  testsuite?: TestSuite[]
}

/** represents a `<testsuite>` tag.  */
export type TestSuite = TestStats & {
  testcase?: TestCase[]
  file?: string
  disabled?: number
  hostname?: string
  id?: string
  package?: string
  properties?: Property[]
  'system-out'?: string[]
  'system-err'?: string[]
}

/** represents a `<testcase>` tag.  */
export type TestCase = {
  name?: string
  classname?: string
  assertions?: number
  time?: number
  file?: string
  line?: number
  skipped?: Skipped[]
  error?: Details[]
  failure?: Details[]
  'system-out'?: string[]
  'system-err'?: string[]
  properties?: Property[]
}

/** represents a `<property>` tag.  */
export type Property = { name?: string; value?: string; inner?: string }
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

  if ('testsuites' in result)
    return _parseObject(result.testsuites) as TestSuites

  // Wrap standalone <testsuite> in a TestSuites container with aggregate values
  if ('testsuite' in result) {
    const parsedSuite = _parseObject(result.testsuite) as TestSuite
    // spreading the object so TestStats are on the parent
    // technically will add extra testsuite-only properties to the parent but these will be ignored in practice
    return { ...parsedSuite, testsuite: [parsedSuite] }
  }

  return null
}

/**
 * Parses a plain object from XML, normalizing nested structures.
 * Always returns a ParsedObject (not an array or primitive).
 */
const _parseObject = (input: Record<string, any>): ParsedObject => {
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
      output[key] = propArray.map((p: any) =>
        isPlainObject(p) ? _parseObject(p) : { inner: p }
      )
      return
    }

    // <testsuite> / <testcase>: ensure they always end up as arrays
    if (key === 'testsuite' || key === 'testcase') {
      const asArray = Array.isArray(nested) ? nested : [nested]
      output[key] = asArray.map((item: any) =>
        isPlainObject(item) ? _parseObject(item) : { inner: item }
      )
      return
    }

    // Arrays: recurse into each element
    if (Array.isArray(nested)) {
      output[key] = nested.map((item: any) =>
        isPlainObject(item) ? _parseObject(item) : { inner: item }
      )
      return
    }

    // Objects: recurse
    if (isPlainObject(nested)) {
      output[key] = _parseObject(nested)
      return
    }

    // Plain scalar value: copy through
    output[key] = nested
  })

  return output
}
