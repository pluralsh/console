// loosely adapted from https://github.com/Kesin11/ts-junit2json/blob/master/src/index.ts
// but ported to use fast-xml-parser instead of xml2js
// also using https://github.com/testmoapp/junitxml/blob/main/examples/junit-complete.xml as a partial reference for typing
import { XMLParser, type X2jOptions } from 'fast-xml-parser'

type ParsedObject = Record<string, unknown>

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Aggregate test statistics shared by `<testsuites>` and `<testsuite>` */
export type TestsuiteStats = {
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
export type TestSuites = TestsuiteStats & {
  testsuite?: TestSuite[]
}

/** represents a `<testsuite>` tag.  */
export type TestSuite = TestsuiteStats & {
  testcase?: TestCase[]
  /** Nested suites; flattened onto the parent `<testsuites>` after parse. */
  testsuite?: TestSuite[]
  file?: string
  disabled?: number
  hostname?: string
  id?: string
  package?: string
  properties?: Property[]
  systemOut?: string[]
  systemErr?: string[]
}

export type TestcaseOutcome = 'passed' | 'failed' | 'error' | 'skipped'

export type TestStatCounts = {
  tests: number
  failures: number
  errors: number
  skipped: number
}

/** represents a `<testcase>` tag.  */
export type TestCase = {
  name?: string
  classname?: string
  assertions?: number
  time?: number
  file?: string
  line?: number
  skipped?: TestcaseResult[]
  error?: TestcaseResult[]
  failure?: TestcaseResult[]
  systemOut?: string[]
  systemErr?: string[]
  properties?: Property[]
}

const OBJ_ARRAY_TYPES: (keyof TestCase | keyof TestSuite | keyof TestSuites)[] =
  ['skipped', 'error', 'failure', 'properties', 'testsuite', 'testcase']

/** represents a `<property>` tag.  */
export type Property = { name?: string; value?: string; inner?: string }
/** represents `<skipped>`, `<failure>`, or `<error>` tags */
export type TestcaseResult = { message?: string; type?: string; inner?: string }

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
    return normalizeParsedTestSuites(
      _parseObject(result.testsuites) as TestSuites
    )

  // Wrap standalone <testsuite> in a TestSuites container with aggregate values
  if ('testsuite' in result) {
    const parsedSuite = _parseObject(result.testsuite) as TestSuite
    // spreading the object so TestStats are on the parent
    // technically will add extra testsuite-only properties to the parent but these will be ignored in practice
    return normalizeParsedTestSuites({
      ...parsedSuite,
      testsuite: [parsedSuite],
    })
  }

  return null
}

/**
 * Outcome of a single `<testcase>`, matching the JUnit UI status chips.
 * Presence of skipped/error/failure children wins over suite-level attributes.
 */
export const getTestcaseOutcome = (testcase: TestCase): TestcaseOutcome => {
  if (hasResult(testcase.skipped)) return 'skipped'
  if (hasResult(testcase.error)) return 'error'
  if (hasResult(testcase.failure)) return 'failed'
  return 'passed'
}

/**
 * Rolls up tests/failures/errors/skipped for a suite or suite collection.
 *
 * gotestsum (and some other producers) omit package-level failures such as
 * compile/import errors from `<testsuite tests="0" failures="0">` while still
 * emitting a synthetic `<testcase name="TestMain"><failure/></testcase>`.
 * Attribute-only rollup therefore reports an all-green summary for a failed run.
 * Prefer the higher of declared attributes vs actual testcase outcomes, and
 * walk nested `<testsuite>` children.
 */
export const getTestStats = (node: TestSuites | TestSuite): TestStatCounts => {
  const nested = node.testsuite
  const fromCases = countTestcases(
    'testcase' in node ? node.testcase : undefined
  )
  const fromAttrs: TestStatCounts = {
    tests: node.tests ?? 0,
    failures: node.failures ?? 0,
    errors: node.errors ?? 0,
    skipped: node.skipped ?? 0,
  }
  const own = maxStats(fromAttrs, fromCases)

  if (!nested?.length) return own

  const fromChildren = nested.reduce<TestStatCounts>(
    (acc, suite) => addStats(acc, getTestStats(suite)),
    emptyStats()
  )
  return maxStats(own, fromChildren)
}

const emptyStats = (): TestStatCounts => ({
  tests: 0,
  failures: 0,
  errors: 0,
  skipped: 0,
})

const addStats = (a: TestStatCounts, b: TestStatCounts): TestStatCounts => ({
  tests: a.tests + b.tests,
  failures: a.failures + b.failures,
  errors: a.errors + b.errors,
  skipped: a.skipped + b.skipped,
})

const maxStats = (a: TestStatCounts, b: TestStatCounts): TestStatCounts => ({
  tests: Math.max(a.tests, b.tests),
  failures: Math.max(a.failures, b.failures),
  errors: Math.max(a.errors, b.errors),
  skipped: Math.max(a.skipped, b.skipped),
})

const countTestcases = (testcases: TestCase[] | undefined): TestStatCounts => {
  const stats = emptyStats()
  if (!testcases?.length) return stats

  for (const testcase of testcases) {
    stats.tests += 1
    switch (getTestcaseOutcome(testcase)) {
      case 'failed':
        stats.failures += 1
        break
      case 'error':
        stats.errors += 1
        break
      case 'skipped':
        stats.skipped += 1
        break
      default:
        break
    }
  }
  return stats
}

const hasResult = (value: unknown): boolean => {
  if (value == null || value === false || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

/**
 * Flatten nested suites and raise undercounted attributes so consumers that
 * still read `tests` / `failures` on the parsed object stay consistent with
 * the testcase list.
 */
const normalizeParsedTestSuites = (suites: TestSuites): TestSuites => {
  const flattened = flattenTestSuites(suites.testsuite ?? []).map(
    applyCaseCountsToSuite
  )
  const stats = getTestStats({ ...suites, testsuite: flattened })
  return {
    ...suites,
    ...stats,
    testsuite: flattened,
  }
}

const flattenTestSuites = (suites: TestSuite[]): TestSuite[] => {
  const flattened: TestSuite[] = []

  for (const suite of suites) {
    const nested = suite.testsuite
    const rest = { ...suite }
    delete rest.testsuite

    if (nested?.length) flattened.push(...flattenTestSuites(nested))
    if (rest.testcase?.length || !nested?.length) flattened.push(rest)
  }

  return flattened
}

const applyCaseCountsToSuite = (suite: TestSuite): TestSuite => {
  const stats = getTestStats(suite)
  return { ...suite, ...stats }
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

    // <system-out> / <system-err>: ensure they always end up as string[], output as camelCase
    if (key === 'system-out' || key === 'system-err') {
      const camelKey = key === 'system-out' ? 'systemOut' : 'systemErr'
      if (Array.isArray(nested))
        output[camelKey] = nested.map((n: any) =>
          n && typeof n === 'object' && '_' in n ? n._ : String(n)
        )
      else if (nested && typeof nested === 'object' && '_' in nested)
        output[camelKey] = [String(nested._)]
      else output[camelKey] = [String(nested)]

      return
    }

    // <properties><property ... /></properties>: unwrap container, normalize property array
    if (key === 'properties') {
      const propsNode = Array.isArray(nested) ? nested[0] : nested
      const propRaw = propsNode?.property
      output[key] = propRaw ? normalizeToArray(propRaw) : []
      return
    }

    // <testsuite> / <testcase> /<skipped> / <error> / <failure>: ensure they always end up as arrays
    // unless they're numeric attributes like skipped="1" (like when the attributes are on a testsuite rather than testcase)
    if (OBJ_ARRAY_TYPES.includes(key as (typeof OBJ_ARRAY_TYPES)[number])) {
      if (typeof nested === 'number') {
        output[key] = nested
        return
      }
      output[key] = normalizeToArray(nested)
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

const normalizeToArray = (value: any): ParsedObject[] =>
  (Array.isArray(value) ? value : [value]).map((item) =>
    isPlainObject(item) ? _parseObject(item) : { inner: item }
  )
