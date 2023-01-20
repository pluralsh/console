import { ensureURLValidity, isValidURL } from './url'

describe('URL utils', () => {
  it('should detect valid URL paths', () => {
    expect(isValidURL('https://growthbook.plural.sh')).toBeTruthy()
    expect(isValidURL('//minecraft.plural.sh:25565')).toBeTruthy()
    expect(isValidURL('//www.plural.sh')).toBeTruthy()

    expect(isValidURL('minecraft.plural.sh:25565')).toBeFalsy()
    expect(isValidURL('www.plural.sh')).toBeFalsy()
    expect(isValidURL('/test')).toBeFalsy()
    expect(isValidURL('/')).toBeFalsy()
  })

  it('should ensure validity of URL paths', () => {
    expect(ensureURLValidity('https://growthbook.plural.sh')).toBe('https://growthbook.plural.sh')
    const valid = 'https://growthbook.plural.sh'
    const transformedValid = ensureURLValidity(valid)

    expect(isValidURL(valid)).toBeTruthy()
    expect(transformedValid).toBe(valid)

    const invalid = 'minecraft.plural.sh:25565'
    const transformedInvalid = ensureURLValidity(invalid)

    expect(isValidURL(invalid)).toBeFalsy()
    expect(isValidURL(transformedInvalid)).toBeTruthy()
    expect(transformedInvalid).toBe('//minecraft.plural.sh:25565')
  })
})
