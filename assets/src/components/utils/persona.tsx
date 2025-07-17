import { PersonaConfiguration } from '../../generated/graphql.ts'

type Keys<T> = T extends object
  ? {
      [K in string & keyof T]: K | `${K & string}.${Keys<T[K]>}`
    }[string & keyof T]
  : never

export function hasAccess(
  persona: PersonaConfiguration,
  feature: Keys<Omit<PersonaConfiguration, '__typename' | 'all'>>
): boolean {
  const keys = feature.split('.')
  let current: any = persona

  if (persona?.all === true) {
    return true
  }

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key]
    }
  }

  if (typeof current === 'boolean') {
    return current
  }

  return false
}
