import { expect } from 'vitest'
import { parseJunit, TestSuites, TestCase, TestSuite } from './junitParse'

// Helper to access testcases with empty array fallback
const getTestCases = (suite: TestSuite): TestCase[] => suite.testcase ?? []

// Helper to access testsuites with empty array fallback
const getTestSuites = (suites: TestSuites): TestSuite[] =>
  suites.testsuite ?? []

describe('junitParse', () => {
  describe('parse', () => {
    it('should return null for empty string', () => {
      expect(parseJunit('')).toBeNull()
    })

    it('should return null for invalid XML', () => {
      expect(parseJunit('<not-junit><invalid></not-junit>')).toBeNull()
    })

    it('should return null for XML without testsuite or testsuites', () => {
      expect(parseJunit('<root><something /></root>')).toBeNull()
    })

    describe('testsuites parsing', () => {
      it('should parse a simple testsuites element', () => {
        const xml = `
          <testsuites name="All Tests" tests="3" failures="1" errors="0" time="1.5">
            <testsuite name="Suite1" tests="2" failures="1" errors="0" time="1.0">
              <testcase name="test1" classname="MyClass" time="0.5" />
              <testcase name="test2" classname="MyClass" time="0.5">
                <failure message="assertion failed" type="AssertionError">Expected true but got false</failure>
              </testcase>
            </testsuite>
          </testsuites>
        `

        const result = parseJunit(xml) as TestSuites

        expect(result).not.toBeNull()
        expect(result.tests).toBe(3)
        expect(result.failures).toBe(1)
        expect(result.errors).toBe(0)
        expect(result.time).toBe(1.5)

        const suites = getTestSuites(result)
        expect(suites).toHaveLength(1)
        expect(suites[0].name).toBe('Suite1')
      })

      it('should parse multiple testsuites', () => {
        const xml = `
          <testsuites name="All Tests" tests="4">
            <testsuite name="Suite1" tests="2">
              <testcase name="test1" />
              <testcase name="test2" />
            </testsuite>
            <testsuite name="Suite2" tests="2">
              <testcase name="test3" />
              <testcase name="test4" />
            </testsuite>
          </testsuites>
        `

        const result = parseJunit(xml) as TestSuites

        expect(result.testsuite).toHaveLength(2)
        expect(result.testsuite![0].name).toBe('Suite1')
        expect(result.testsuite![1].name).toBe('Suite2')
      })
    })

    describe('testsuite parsing', () => {
      it('should parse a standalone testsuite element wrapped in TestSuites with aggregate values', () => {
        const xml = `
          <testsuite name="MySuite" tests="2" failures="0" errors="0" time="0.123">
            <testcase name="test1" classname="TestClass" time="0.1" />
            <testcase name="test2" classname="TestClass" time="0.023" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites

        expect(result).not.toBeNull()

        // Verify aggregate values are copied to the wrapper
        expect(result.tests).toBe(2)
        expect(result.failures).toBe(0)
        expect(result.errors).toBe(0)
        expect(result.time).toBe(0.123)

        const suites = getTestSuites(result)
        expect(suites).toHaveLength(1)

        const suite = suites[0]
        expect(suite.name).toBe('MySuite')
        expect(suite.tests).toBe(2)
        expect(suite.failures).toBe(0)
        expect(suite.errors).toBe(0)
        expect(suite.time).toBe(0.123)
        expect(suite.testcase).toHaveLength(2)
      })

      it('should parse testsuite with all attributes', () => {
        const xml = `
          <testsuite 
            name="FullSuite" 
            tests="5" 
            failures="1" 
            errors="2" 
            time="10.5"
            disabled="1"
            skipped="1"
            timestamp="2024-01-15T12:00:00"
            hostname="localhost"
            id="suite-1"
            package="com.example.tests"
          >
            <testcase name="test1" />
            <testcase name="test2" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suites = getTestSuites(result)
        const suite = suites[0]

        expect(suite.name).toBe('FullSuite')
        expect(suite.tests).toBe(5)
        expect(suite.failures).toBe(1)
        expect(suite.errors).toBe(2)
        expect(suite.time).toBe(10.5)
        expect(suite.disabled).toBe(1)
        expect(suite.skipped).toBe(1)
        expect(suite.timestamp).toBe('2024-01-15T12:00:00')
        expect(suite.hostname).toBe('localhost')
        expect(suite.id).toBe('suite-1')
        expect(suite.package).toBe('com.example.tests')
      })
    })

    describe('testcase parsing', () => {
      it('should parse testcase with all attributes', () => {
        const xml = `
          <testsuite name="Suite">
            <testcase 
              name="myTest" 
              classname="com.example.TestClass" 
              assertions="3" 
              time="0.456"
              file="tests/example.test.ts"
              line="42"
            />
            <testcase name="anotherTest" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]
        const testcases = getTestCases(suite)
        const testcase = testcases[0]

        expect(testcase.name).toBe('myTest')
        expect(testcase.classname).toBe('com.example.TestClass')
        expect(testcase.assertions).toBe(3)
        expect(testcase.time).toBe(0.456)
        expect(testcase.file).toBe('tests/example.test.ts')
        expect(testcase.line).toBe(42)
      })

      it('should parse testcase with multiple failures', () => {
        const xml = `
          <testsuite name="Suite">
            <testcase name="multiFailTest">
              <failure message="First failure" type="Error">First trace</failure>
              <failure message="Second failure" type="Error">Second trace</failure>
            </testcase>
            <testcase name="passingTest" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]
        const testcases = getTestCases(suite)
        const testcase = testcases[0]

        expect(testcase.failure).toHaveLength(2)
        expect(testcase.failure![0].message).toBe('First failure')
        expect(testcase.failure![1].message).toBe('Second failure')
      })

      it('should parse testcase with skipped without message', () => {
        const xml = `
          <testsuite name="Suite">
            <testcase name="skippedTest">
              <skipped />
            </testcase>
            <testcase name="passingTest" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]
        const testcases = getTestCases(suite)
        const testcase = testcases[0]

        // Must be an array even for single element
        expect(Array.isArray(testcase.skipped)).toBe(true)
        expect(testcase.skipped).toHaveLength(1)
      })
    })

    describe('single elements should always be arrays', () => {
      it('should parse single skipped as array', () => {
        const xml = `
          <testsuite name="Suite">
            <testcase name="test1">
              <skipped message="Skipped reason"/>
            </testcase>
          </testsuite>
        `
        const result = parseJunit(xml) as TestSuites
        const testcase = getTestCases(getTestSuites(result)[0])[0]

        expect(Array.isArray(testcase.skipped)).toBe(true)
        expect(testcase.skipped![0].message).toBe('Skipped reason')
      })

      it('should parse single failure as array', () => {
        const xml = `
          <testsuite name="Suite">
            <testcase name="test1">
              <failure message="Failed" type="AssertionError">Stack trace here</failure>
            </testcase>
          </testsuite>
        `
        const result = parseJunit(xml) as TestSuites
        const testcase = getTestCases(getTestSuites(result)[0])[0]

        expect(Array.isArray(testcase.failure)).toBe(true)
        expect(testcase.failure![0].message).toBe('Failed')
        expect(testcase.failure![0].type).toBe('AssertionError')
        expect(testcase.failure![0].inner).toBe('Stack trace here')
      })

      it('should parse single error as array', () => {
        const xml = `
          <testsuite name="Suite">
            <testcase name="test1">
              <error message="Crashed" type="RuntimeError">Error details</error>
            </testcase>
          </testsuite>
        `
        const result = parseJunit(xml) as TestSuites
        const testcase = getTestCases(getTestSuites(result)[0])[0]

        expect(Array.isArray(testcase.error)).toBe(true)
        expect(testcase.error![0].message).toBe('Crashed')
        expect(testcase.error![0].type).toBe('RuntimeError')
        expect(testcase.error![0].inner).toBe('Error details')
      })
    })

    describe('systemOut and systemErr parsing', () => {
      it('should parse multiple system-out elements as array', () => {
        const xml = `
          <testsuite name="Suite">
            <testcase name="test1">
              <system-out>First output</system-out>
              <system-out>Second output</system-out>
            </testcase>
            <testcase name="test2" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]
        const testcases = getTestCases(suite)
        const testcase = testcases[0]

        expect(testcase.systemOut).toEqual(['First output', 'Second output'])
      })
    })

    describe('properties parsing', () => {
      it('should parse single property without array wrapper', () => {
        const xml = `
          <testsuite name="Suite">
            <properties>
              <property name="single" value="value" />
            </properties>
            <testcase name="test1" />
            <testcase name="test2" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]

        expect(suite.properties).toHaveLength(1)
        expect(suite.properties![0].name).toBe('single')
        expect(suite.properties![0].value).toBe('value')
      })
    })

    describe('edge cases', () => {
      it('should handle empty testsuite', () => {
        const xml = `<testsuite name="Empty" tests="0" />`

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]

        expect(suite.name).toBe('Empty')
        expect(suite.tests).toBe(0)
        expect(suite.testcase).toBeUndefined()
      })

      it('should always return testcase as array even with single element', () => {
        const xml = `
          <testsuite name="Suite" tests="1">
            <testcase name="onlyTest" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]

        // Must be an array, not a single object
        expect(Array.isArray(suite.testcase)).toBe(true)
        expect(suite.testcase).toHaveLength(1)
        expect(suite.testcase![0].name).toBe('onlyTest')
      })

      it('should always return testsuite as array even with single element', () => {
        const xml = `
          <testsuites name="All">
            <testsuite name="OnlySuite" tests="0" />
          </testsuites>
        `

        const result = parseJunit(xml) as TestSuites

        // Must be an array, not a single object
        expect(Array.isArray(result.testsuite)).toBe(true)
        expect(result.testsuite).toHaveLength(1)
        expect(result.testsuite![0].name).toBe('OnlySuite')
      })

      it('should handle testcase with empty failure message', () => {
        const xml = `
          <testsuite name="Suite">
            <testcase name="test1">
              <failure></failure>
            </testcase>
            <testcase name="test2" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]
        const testcases = getTestCases(suite)
        const testcase = testcases[0]

        expect(testcase.failure).toBeDefined()
      })
    })

    describe('custom fastXmlOptions', () => {
      it('should respect custom options', () => {
        const xml = `
          <testsuite name="Suite" tests="2">
            <testcase name="test1" />
            <testcase name="test2" />
          </testsuite>
        `

        const result = parseJunit(xml, { trimValues: false }) as TestSuites
        const suite = getTestSuites(result)[0]

        expect(result).not.toBeNull()
        expect(suite.name).toBe('Suite')
      })
    })

    describe('real-world examples', () => {
      it('should parse a typical Jest JUnit output', () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
          <testsuites name="jest tests" tests="3" failures="1" time="2.5">
            <testsuite name="Button Component" tests="3" failures="1" time="0.5" timestamp="2024-01-15T10:00:00">
              <testcase name="renders correctly" classname="Button Component" time="0.1" />
              <testcase name="handles click" classname="Button Component" time="0.2" />
              <testcase name="shows loading state" classname="Button Component" time="0.2">
                <failure message="Expected element to have class 'loading'" type="Error">
                  expect(element).toHaveClass('loading')

                  Expected: loading
                  Received: button
                </failure>
              </testcase>
            </testsuite>
          </testsuites>
        `

        const result = parseJunit(xml) as TestSuites

        expect(result.tests).toBe(3)
        expect(result.failures).toBe(1)

        const suites = getTestSuites(result)
        expect(suites).toHaveLength(1)

        const suite = suites[0]
        expect(suite.name).toBe('Button Component')

        const testcases = getTestCases(suite)
        expect(testcases).toHaveLength(3)

        const failedTest = testcases[2]
        expect(failedTest.name).toBe('shows loading state')
        expect(failedTest.failure).toBeDefined()

        const failures = Array.isArray(failedTest.failure)
          ? failedTest.failure
          : [failedTest.failure]
        expect(failures[0]!.message).toBe(
          "Expected element to have class 'loading'"
        )
      })

      it('should parse a typical Go test JUnit output', () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
          <testsuites>
            <testsuite tests="2" failures="0" time="0.003" name="github.com/example/pkg">
              <properties>
                <property name="go.version" value="go1.21" />
              </properties>
              <testcase classname="pkg" name="TestAdd" time="0.001" />
              <testcase classname="pkg" name="TestSubtract" time="0.002" />
            </testsuite>
          </testsuites>
        `

        const result = parseJunit(xml) as TestSuites

        const suites = getTestSuites(result)
        expect(suites).toHaveLength(1)

        const suite = suites[0]
        expect(suite.name).toBe('github.com/example/pkg')
        expect(suite.properties).toHaveLength(1)
        expect(suite.properties![0].name).toBe('go.version')

        const testcases = getTestCases(suite)
        expect(testcases).toHaveLength(2)
      })

      it('should parse junit-complete.xml reference format', () => {
        // Based on https://github.com/testmoapp/junitxml/blob/main/examples/junit-complete.xml
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
          <testsuites name="Test run" tests="8" failures="1" errors="1" skipped="1"
              assertions="20" time="16.082687" timestamp="2021-04-02T15:48:23">
            <testsuite name="Tests.Registration" tests="8" failures="1" errors="1" skipped="1"
                assertions="20" time="16.082687" timestamp="2021-04-02T15:48:23"
                file="tests/registration.code">
              <properties>
                <property name="version" value="1.774" />
                <property name="commit" value="ef7bebf" />
                <property name="config">
                  Config line #1
                  Config line #2
                </property>
              </properties>
              <system-out>Data written to standard out.</system-out>
              <system-err>Data written to standard error.</system-err>
              <testcase name="testCase1" classname="Tests.Registration" assertions="2"
                  time="2.436" file="tests/registration.code" line="24" />
              <testcase name="testCase2" classname="Tests.Registration" assertions="6"
                  time="1.534" file="tests/registration.code" line="62" />
              <testcase name="testCase3" classname="Tests.Registration" assertions="0"
                  time="0" file="tests/registration.code" line="164">
                <skipped message="Test was skipped." />
              </testcase>
              <testcase name="testCase4" classname="Tests.Registration" assertions="2"
                  time="2.902412" file="tests/registration.code" line="202">
                <failure message="Expected value did not match." type="AssertionError">
                  Stack trace here
                </failure>
              </testcase>
              <testcase name="testCase5" classname="Tests.Registration" assertions="0"
                  time="3.819" file="tests/registration.code" line="235">
                <error message="Division by zero." type="ArithmeticError">
                  Error stack trace
                </error>
              </testcase>
              <testcase name="testCase6" classname="Tests.Registration" assertions="3"
                  time="2.944" file="tests/registration.code" line="287">
                <system-out>Test case output.</system-out>
                <system-err>Test case error.</system-err>
              </testcase>
              <testcase name="testCase7" classname="Tests.Registration" assertions="4"
                  time="1.625275" file="tests/registration.code" line="302">
                <properties>
                  <property name="priority" value="high" />
                  <property name="author" value="Adrian" />
                </properties>
              </testcase>
            </testsuite>
          </testsuites>
        `

        const result = parseJunit(xml) as TestSuites

        // TestSuites level
        expect(result.name).toBe('Test run')
        expect(result.tests).toBe(8)
        expect(result.failures).toBe(1)
        expect(result.errors).toBe(1)
        expect(result.skipped).toBe(1)
        expect(result.assertions).toBe(20)
        expect(result.time).toBe(16.082687)
        expect(result.timestamp).toBe('2021-04-02T15:48:23')

        // TestSuite level
        const suites = getTestSuites(result)
        expect(suites).toHaveLength(1)

        const suite = suites[0]
        expect(suite.name).toBe('Tests.Registration')
        expect(suite.file).toBe('tests/registration.code')
        expect(suite.assertions).toBe(20)
        expect(suite.systemOut).toEqual(['Data written to standard out.'])
        expect(suite.systemErr).toEqual(['Data written to standard error.'])

        // Suite properties (including multiline)
        expect(suite.properties).toHaveLength(3)
        expect(suite.properties![0].name).toBe('version')
        expect(suite.properties![0].value).toBe(1.774)
        expect(suite.properties![2].name).toBe('config')
        expect(suite.properties![2].inner).toContain('Config line #1')

        // TestCases
        const testcases = getTestCases(suite)
        expect(testcases).toHaveLength(7)

        // Passing test with file/line
        const passingTest = testcases[0]
        expect(passingTest.name).toBe('testCase1')
        expect(passingTest.file).toBe('tests/registration.code')
        expect(passingTest.line).toBe(24)
        expect(passingTest.assertions).toBe(2)

        // Skipped test - must be an array
        const skippedTest = testcases[2]
        expect(Array.isArray(skippedTest.skipped)).toBe(true)
        expect(skippedTest.skipped![0].message).toBe('Test was skipped.')

        // Failed test - must be an array
        const failedTest = testcases[3]
        expect(Array.isArray(failedTest.failure)).toBe(true)
        expect(failedTest.failure![0].message).toBe(
          'Expected value did not match.'
        )
        expect(failedTest.failure![0].type).toBe('AssertionError')

        // Error test - must be an array
        const errorTest = testcases[4]
        expect(Array.isArray(errorTest.error)).toBe(true)
        expect(errorTest.error![0].message).toBe('Division by zero.')
        expect(errorTest.error![0].type).toBe('ArithmeticError')

        // Test with systemOut/systemErr
        const outputTest = testcases[5]
        expect(outputTest.systemOut).toEqual(['Test case output.'])
        expect(outputTest.systemErr).toEqual(['Test case error.'])

        // Test with properties
        const propsTest = testcases[6]
        expect(propsTest.properties).toHaveLength(2)
        expect(propsTest.properties![0].name).toBe('priority')
        expect(propsTest.properties![0].value).toBe('high')
      })
    })
  })
})
