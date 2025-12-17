import { expect } from 'vitest'
import { parseJunit, TestSuites, TestCase, TestSuite } from './junitParse'

// Helper to normalize testcase access since single elements aren't automatically arrays
const getTestCases = (suite: TestSuite): TestCase[] => {
  if (!suite.testcase) return []
  return Array.isArray(suite.testcase) ? suite.testcase : [suite.testcase]
}

// Helper to normalize testsuite access
const getTestSuites = (suites: TestSuites): TestSuite[] => {
  if (!suites.testsuite) return []
  return Array.isArray(suites.testsuite) ? suites.testsuite : [suites.testsuite]
}

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
              status="passed"
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
        expect(testcase.status).toBe('passed')
      })

      it('should parse testcase with failure', () => {
        const xml = `
          <testsuite name="Suite">
            <testcase name="failedTest">
              <failure message="Expected 1 but got 2" type="AssertionError">
                Stack trace here
              </failure>
            </testcase>
            <testcase name="passingTest" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]
        const testcases = getTestCases(suite)
        const testcase = testcases[0]

        expect(testcase.failure).toBeDefined()
        const failures = Array.isArray(testcase.failure)
          ? testcase.failure
          : [testcase.failure]
        expect(failures[0]!.message).toBe('Expected 1 but got 2')
        expect(failures[0]!.type).toBe('AssertionError')
        expect(failures[0]!.inner).toBe('Stack trace here')
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

      it('should parse testcase with error', () => {
        const xml = `
          <testsuite name="Suite">
            <testcase name="errorTest">
              <error message="NullPointerException" type="java.lang.NullPointerException">
                at com.example.Test.run(Test.java:42)
              </error>
            </testcase>
            <testcase name="passingTest" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]
        const testcases = getTestCases(suite)
        const testcase = testcases[0]

        expect(testcase.error).toBeDefined()
        const errors = Array.isArray(testcase.error)
          ? testcase.error
          : [testcase.error]
        expect(errors[0]!.message).toBe('NullPointerException')
        expect(errors[0]!.type).toBe('java.lang.NullPointerException')
        expect(errors[0]!.inner).toContain('Test.java:42')
      })

      it('should parse testcase with skipped', () => {
        const xml = `
          <testsuite name="Suite">
            <testcase name="skippedTest">
              <skipped message="Not implemented yet" />
            </testcase>
            <testcase name="passingTest" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]
        const testcases = getTestCases(suite)
        const testcase = testcases[0]

        expect(testcase.skipped).toBeDefined()
        const skipped = Array.isArray(testcase.skipped)
          ? testcase.skipped
          : [testcase.skipped]
        expect(skipped[0]!.message).toBe('Not implemented yet')
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

        expect(testcase.skipped).toBeDefined()
      })
    })

    describe('system-out and system-err parsing', () => {
      it('should parse system-out in testcase', () => {
        const xml = `
          <testsuite name="Suite">
            <testcase name="test1">
              <system-out>Console output here</system-out>
            </testcase>
            <testcase name="test2" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]
        const testcases = getTestCases(suite)
        const testcase = testcases[0]

        expect(testcase['system-out']).toEqual(['Console output here'])
      })

      it('should parse system-err in testcase', () => {
        const xml = `
          <testsuite name="Suite">
            <testcase name="test1">
              <system-err>Error output here</system-err>
            </testcase>
            <testcase name="test2" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]
        const testcases = getTestCases(suite)
        const testcase = testcases[0]

        expect(testcase['system-err']).toEqual(['Error output here'])
      })

      it('should parse system-out in testsuite', () => {
        const xml = `
          <testsuite name="Suite">
            <system-out>Suite level output</system-out>
            <testcase name="test1" />
            <testcase name="test2" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]

        expect(suite['system-out']).toEqual(['Suite level output'])
      })

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

        expect(testcase['system-out']).toEqual([
          'First output',
          'Second output',
        ])
      })
    })

    describe('properties parsing', () => {
      it('should parse properties in testsuite', () => {
        const xml = `
          <testsuite name="Suite">
            <properties>
              <property name="os" value="linux" />
              <property name="java.version" value="11" />
            </properties>
            <testcase name="test1" />
            <testcase name="test2" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]

        expect(suite.properties).toHaveLength(2)
        expect(suite.properties![0].name).toBe('os')
        expect(suite.properties![0].value).toBe('linux')
        expect(suite.properties![1].name).toBe('java.version')
        expect(suite.properties![1].value).toBe(11)
      })

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

      it('should handle single testcase', () => {
        const xml = `
          <testsuite name="Suite" tests="1">
            <testcase name="onlyTest" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]

        // Single element may not be array, but should be accessible
        expect(suite.testcase).toBeDefined()
        const testcases = getTestCases(suite)
        expect(testcases).toHaveLength(1)
        expect(testcases[0].name).toBe('onlyTest')
      })

      it('should handle XML declaration', () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
          <testsuite name="Suite" tests="2">
            <testcase name="test1" />
            <testcase name="test2" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]

        expect(suite.name).toBe('Suite')
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

      it('should handle numeric string values correctly', () => {
        const xml = `
          <testsuite name="Suite" tests="10" time="123.456">
            <testcase name="test1" time="0.001" assertions="5" />
            <testcase name="test2" time="0.002" />
          </testsuite>
        `

        const result = parseJunit(xml) as TestSuites
        const suite = getTestSuites(result)[0]

        expect(suite.tests).toBe(10)
        expect(suite.time).toBe(123.456)

        const testcases = getTestCases(suite)
        expect(testcases[0].time).toBe(0.001)
        expect(testcases[0].assertions).toBe(5)
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
    })
  })
})
