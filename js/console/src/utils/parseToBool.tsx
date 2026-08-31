export function parseToBool(val: boolean | string | undefined | null) {
  if (typeof val === 'boolean') {
    return val
  }
  let boolVal = false

  if (typeof val === 'string') {
    try {
      const jsonVal = JSON.parse(val.toLowerCase())

      if (typeof jsonVal === 'boolean') {
        boolVal = jsonVal
      }
    } catch {
      /* empty */
    }
  }

  return boolVal
}
