import { Readiness } from 'utils/status'
import styled from 'styled-components'

export const ListItemBorder = styled.div<{
  color?: string
  width?: number
  radius?: number
}>(({ theme, color, radius = 4, width = 3 }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  bottom: 0,
  backgroundColor: color ? theme.colors[color] : undefined,
  borderBottomLeftRadius: radius,
  borderTopLeftRadius: radius,
  display: 'flex',
  width,
}))

export const hasIcons = ({ spec: { descriptor } }) =>
  descriptor?.icons?.length > 0

export const getIcon = (app, dark = true) => {
  const {
    spec: { descriptor },
  } = app

  if (!hasIcons(app)) return undefined

  if (dark && descriptor.icons.length > 1) return descriptor.icons[1]

  return descriptor.icons[0]
}

export function appState({ status: { conditions } }) {
  const ready = conditions.find(({ type }) => type === 'Ready')
  const error = conditions.find(({ type }) => type === 'Error')
  const readiness =
    error.status === 'True'
      ? Readiness.Failed
      : ready.status === 'True'
      ? Readiness.Ready
      : Readiness.InProgress

  return { ready, error, readiness }
}
