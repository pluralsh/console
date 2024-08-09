export function validateRegex(str, { regex, message }) {
  const re = new RegExp(`^${regex}$`)

  if (re.test(str)) {
    return null
  }

  return message
}
