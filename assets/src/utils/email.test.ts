import { isValidEmail } from './email'

describe('Email utils', () => {
  it('should detect valid email addresses', () => {
    expect(isValidEmail('marcin@plural.sh')).toBeTruthy()
    expect(isValidEmail('marcin.123@plural.sh')).toBeTruthy()
    expect(isValidEmail('marcin.123@plural.123.sh')).toBeTruthy()

    expect(isValidEmail('')).toBeFalsy()
    expect(isValidEmail('marcin')).toBeFalsy()
    expect(isValidEmail('marcin@plural')).toBeFalsy()
    expect(isValidEmail('marcin@plural.sh@plural.sh')).toBeFalsy()
    expect(isValidEmail('@plural.sh')).toBeFalsy()
  })
})
