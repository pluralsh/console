import {
  getBarePathFromPath,
  isExternalUrl,
  isRelativeUrl,
  isSubrouteOf,
  isValidRepoUrl,
  prettifyRepoUrl,
  removeTrailingSlashes,
  toHtmlId,
} from './urls'

const relativeUrls = [
  '',
  'a',
  'a/',
  'abcd',
  'abcd/',
  'abcd#something-something',
  'abcd/#hash.hash',
  'deep/path/to/page.html',
  'deep/path/to/page.html#hash',
  ':something',
  '#hash-link',
]

const absoluteUrls = [
  '/a',
  '/a/',
  '/abcd',
  '/abcd/',
  '/abcd#something-something',
  '/abcd/#hash.hash',
  '/deep/path/to/page.html',
  '/deep/path/to/page.html#hash',
]

const externalUrls = [
  // Links with protocols
  '//google.com',
  'http://google.com',
  'https://google.com',
  'ftp://google.com',
  'gopher://google.com',
  'HTTP://google.com',
  'HTTPS://google.com',
  'FTP://google.com',
  'GOPHER://google.com',
  '234h+-.:something', // Weird, but valid protocol

  // Alternative links
  'mailto:',
  'mailto:email@domain.com',
  'tel:',
  'sms:',
  'callto:',
  'tel:+1.123.345.6342',
  'sms:+1.123.345.6342',
  'callto:+1.123.345.6342',
]

describe('URL utils', () => {
  it('should detect relative urls', () => {
    relativeUrls.forEach((url) => {
      expect(isRelativeUrl(url)).toBeTruthy()
    })
    absoluteUrls.forEach((url) => {
      expect(isRelativeUrl(url)).toBeFalsy()
    })
    externalUrls.forEach((url) => {
      expect(isRelativeUrl(url)).toBeFalsy()
    })
  })

  it('should detect external urls', () => {
    relativeUrls.forEach((url) => {
      expect(isExternalUrl(url)).toBeFalsy()
    })
    absoluteUrls.forEach((url) => {
      expect(isExternalUrl(url)).toBeFalsy()
    })
    externalUrls.forEach((url) => {
      expect(isExternalUrl(url)).toBeTruthy()
    })
  })

  it('should remove trailing slashes', () => {
    expect(removeTrailingSlashes(null)).toBe(null)
    expect(removeTrailingSlashes(undefined)).toBe(undefined)
    expect(removeTrailingSlashes('/')).toBe('')
    expect(removeTrailingSlashes('//')).toBe('')
    expect(removeTrailingSlashes('///////')).toBe('')
    expect(removeTrailingSlashes('/abc/a/')).toBe('/abc/a')
    expect(removeTrailingSlashes('/abc/a////')).toBe('/abc/a')
    expect(removeTrailingSlashes('/abc////a')).toBe('/abc////a')
    expect(removeTrailingSlashes('http://a.b.c/#d')).toBe('http://a.b.c/#d')
  })

  it('should detect subroutes', () => {
    expect(isSubrouteOf('/', '')).toBeTruthy()
    expect(isSubrouteOf('/something', '/')).toBeTruthy()
    expect(isSubrouteOf('/a/b/cdefg/h/', '/a/b/cdefg/h/')).toBeTruthy()
    expect(isSubrouteOf('/a/b/cdefg/h/ijk', '/a/b/cdefg/h/')).toBeTruthy()
    expect(isSubrouteOf('/a/b/cdefg/', '/a/b/cdefg/h/')).toBeFalsy()
    expect(isSubrouteOf('/a/b/cdefg/i/', '/a/b/cdefg/h/')).toBeFalsy()
    expect(
      isSubrouteOf('http://google.com/?x=something', 'http://google.com')
    ).toBeTruthy()

    expect(isSubrouteOf('', '/')).toBeFalsy()
    expect(isSubrouteOf('https://google.com', 'http://google.com')).toBeFalsy()
  })

  it('should create valid id attributes', () => {
    expect(toHtmlId('some%#$long9 string-with_chars')).toBe(
      'some-long9-string-with_chars'
    )
    expect(toHtmlId('123 numbers')).toBe('_123-numbers')
    expect(toHtmlId('')).toBe('')
    expect(toHtmlId('   ')).toBe('')
    expect(toHtmlId('a')).toBe('a')
    expect(toHtmlId('   abc')).toBe('abc')
    expect(toHtmlId('-things')).toBe('things')
    expect(toHtmlId('_things')).toBe('_things')
    expect(toHtmlId('_thiñgs')).toBe('_thi-gs')
    expect(toHtmlId('CAPITALS')).toBe('capitals')
  })

  it('should get paths without url params or hashes', () => {
    expect(getBarePathFromPath('')).toBe('')
    expect(getBarePathFromPath('abc')).toBe('abc')
    expect(getBarePathFromPath('abc//')).toBe('abc//')
    expect(getBarePathFromPath('#hash?var=val')).toBe('')
    expect(getBarePathFromPath('path#hash?var=val')).toBe('path')
    expect(getBarePathFromPath('//path#hash?var=val')).toBe('//path')
    expect(getBarePathFromPath('path/#/morepath')).toBe('path/')
    expect(getBarePathFromPath('//path/#hash?var=val')).toBe('//path/')
    expect(getBarePathFromPath('http://path.com?var=val')).toBe(
      'http://path.com'
    )
  })

  it('should prettify repo urls', () => {
    expect(prettifyRepoUrl('https://github.com/pluralsh/plural.git')).toBe(
      'pluralsh/plural'
    )
    expect(prettifyRepoUrl('git@github.com:pluralsh/plural.git')).toBe(
      'pluralsh/plural'
    )
    expect(prettifyRepoUrl('ssh://github.com/pluralsh/plural')).toBe(
      'pluralsh/plural'
    )
    expect(prettifyRepoUrl('not-a-url')).toBe('not-a-url')
  })

  it('should validate repo urls', () => {
    // valid https
    expect(isValidRepoUrl('https://github.com/pluralsh/plural.git')).toBe(true)
    expect(isValidRepoUrl('https://gitlab.com/org/repo')).toBe(true)
    expect(isValidRepoUrl('  https://github.com/org/repo  ')).toBe(true)

    // valid git@
    expect(isValidRepoUrl('git@github.com:pluralsh/plural.git')).toBe(true)
    expect(isValidRepoUrl('git@gitlab.com:org/repo.git')).toBe(true)
    expect(isValidRepoUrl('git@gitlab.com:org/repo')).toBe(true)

    // valid ssh://
    expect(isValidRepoUrl('ssh://git@github.com/pluralsh/plural.git')).toBe(
      true
    )
    expect(isValidRepoUrl('ssh://github.com/org/repo')).toBe(true)

    // invalid - wrong protocol
    expect(isValidRepoUrl('http://github.com/org/repo')).toBe(false)
    expect(isValidRepoUrl('ftp://github.com/org/repo')).toBe(false)

    // invalid - missing structure
    expect(isValidRepoUrl('https://github.com')).toBe(false)
    expect(isValidRepoUrl('https://github.com/pluralsh')).toBe(false)
    expect(isValidRepoUrl('git@github.com:')).toBe(false)
    expect(isValidRepoUrl('git@github.com:pluralsh')).toBe(false)
    expect(isValidRepoUrl('ssh://github.com')).toBe(false)

    // invalid - no protocol
    expect(isValidRepoUrl('github.com/org/repo')).toBe(false)
    expect(isValidRepoUrl('pluralsh/plural')).toBe(false)
    expect(isValidRepoUrl('')).toBe(false)
    expect(isValidRepoUrl('   ')).toBe(false)
  })
})
