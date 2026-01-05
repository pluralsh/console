import { AgentRuntimeType } from '../../../generated/graphql.ts'
import {
  IconFrame,
  styledTheme,
  toFillLevel,
  useFillLevel,
} from '@pluralsh/design-system'
import { ComponentProps } from 'react'
import { useTheme } from 'styled-components'
import {
  fillLevelToBackground,
  fillLevelToBorderColor,
} from '../../utils/FillLevelDiv.tsx'

export const AgentRuntimeIcons = {
  [AgentRuntimeType.Claude]: {
    dark: `/claude-logo.svg`,
    light: `/claude-logo.svg`,
  },
  [AgentRuntimeType.Gemini]: {
    dark: `/gemini-logo.svg`,
    light: `/gemini-logo.svg`,
  },
  [AgentRuntimeType.Opencode]: {
    dark: `/opencode-logo-dark.svg`,
    light: `/opencode-logo-light.svg`,
  },
} as const satisfies Record<
  Exclude<AgentRuntimeType, AgentRuntimeType.Custom>,
  Record<typeof styledTheme.mode, string>
>

export function AgentRuntimeIcon({
  type,
  size,
  ...props
}: {
  type: AgentRuntimeType
  size?: number
} & ComponentProps<'img'>) {
  const theme = useTheme()

  return type === AgentRuntimeType.Custom ? undefined : (
    <img
      alt={type}
      src={AgentRuntimeIcons[type][theme.mode]}
      {...props}
      {...(size ? { width: size } : {})}
    />
  )
}

export function AgentRuntimeIconFrame({
  type,
  fillLevel: fillLevelProp,
  ...props
}: {
  type: AgentRuntimeType
  fillLevel?: number
} & Omit<ComponentProps<typeof IconFrame>, 'icon'>) {
  const { colors } = useTheme()
  const inferredFillLevel = useFillLevel() + 1
  const fillLevel = fillLevelProp ?? inferredFillLevel
  return (
    <IconFrame
      css={{
        background: colors[fillLevelToBackground[toFillLevel(fillLevel)]],
        borderColor: colors[fillLevelToBorderColor[toFillLevel(fillLevel)]],
      }}
      textValue={type}
      icon={<AgentRuntimeIcon type={type} />}
      {...props}
    />
  )
}
