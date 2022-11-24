import { appState } from 'components/Application'
import { Readiness } from 'utils/status'

export const hasIcons = ({ spec: { descriptor } }) => descriptor?.icons?.length > 0

export const getIcon = (app, dark) => {
  const { spec: { descriptor } } = app

  if (!hasIcons(app)) return undefined

  if (dark && descriptor.icons.length > 1) return descriptor.icons[1]

  return descriptor.icons[0]
}

export const getBorderColor = app => {
  const { readiness } = appState(app)

  switch (readiness) {
  case Readiness.Failed:
    return 'border-danger'
  case Readiness.InProgress:
    return 'border-warning'
  case Readiness.Ready:
  default:
    return undefined
  }
}
