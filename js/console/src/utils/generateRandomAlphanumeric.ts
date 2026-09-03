const ALPHANUM =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function generateRandomAlphanumeric(length = 32): string {
  const values = new Uint8Array(length)
  crypto.getRandomValues(values)

  return Array.from(values, (value) => ALPHANUM[value % ALPHANUM.length]).join(
    ''
  )
}
