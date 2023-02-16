import { Flex } from 'honorable'
import { Readiness } from 'utils/status'

export const hasIcons = ({ spec: { descriptor } }) => descriptor?.icons?.length > 0

export const getIcon = (app, dark = true) => {
  const { spec: { descriptor } } = app

  if (!hasIcons(app)) return undefined

  if (dark && descriptor.icons.length > 1) return descriptor.icons[1]

  return descriptor.icons[0]
}

export function appState({ status: { conditions } }) {
  const ready = conditions.find(({ type }) => type === 'Ready')
  const error = conditions.find(({ type }) => type === 'Error')
  const readiness = error.status === 'True' ? Readiness.Failed : (ready.status === 'True' ? Readiness.Ready : Readiness.InProgress)

  return { ready, error, readiness }
}

export function ListItemBorder({ color = 'none', width = 3, radius = 4 }: { color: string, width?: number, radius?: number }) {
  return (
    <Flex
      backgroundColor={color}
      borderTopLeftRadius={radius}
      borderBottomLeftRadius={radius}
      height="inherit"
      width={width}
    />
  )
}
