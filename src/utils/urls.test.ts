import {
  getBarePathFromPath,
  isExternalUrl,
  isRelativeUrl,
  isSubrouteOf,
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
})
