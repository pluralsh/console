import { type styledTheme } from '@pluralsh/design-system'
import { Application } from 'generated/graphql'

export const hasIcons = ({ spec: { descriptor } }) =>
  descriptor?.icons?.length > 0

export const getIcon = (app: Application, mode: typeof styledTheme.mode) => {
  const {
    spec: { descriptor },
  } = app

  if (!hasIcons(app)) return undefined

  if ((mode !== 'light' && descriptor?.icons?.length) || 0 > 1)
    return descriptor?.icons?.[1] || descriptor?.icons?.[0] || undefined

  return descriptor?.icons?.[0] || undefined
}
