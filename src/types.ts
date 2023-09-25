import { type DefaultTheme } from 'styled-components'

export type UserType = {
  name?: string
  email?: string
  imageUrl?: string
}

export const SEVERITIES = [
  'info',
  'success',
  'warning',
  'danger',
  'critical',
  'neutral',
  // deprecated
  'error',
] as const

export function isSeverity(sev: string): sev is Severity {
  if (sev === 'error') {
    console.warn(
      'Warning: Severity of "error" has been replaced with "danger." Please update your code as "error" will no longer be supported in a future release"'
    )
  }

  return SEVERITIES.includes(sev as any)
}

export function sanitizeSeverity<T extends SeverityExt>(
  severity: string,
  opts: {
    allowList?: Readonly<T[]>
    default: T
  }
): T {
  if (severity === 'error') {
    console.warn(
      'Warning: Severity of "error" has been replaced with "danger." Please update your code as "error" will no longer be supported in a future release"'
    )

    severity = 'danger'
  }
  if (opts.allowList.includes(severity as any)) {
    return severity as T
  }
  console.warn(
    `Warning: Severity of "${severity}" is not allowed. Using default of "${opts.default}"`
  )

  return opts.allowList.includes('neutral' as T)
    ? ('neutral' as T)
    : opts.default
}

export type Severity = (typeof SEVERITIES)[number]
export type SeverityExt = (typeof SEVERITIES)[number]

export type ColorKey = keyof DefaultTheme['colors']

export { type CSSObject } from 'styled-components'
