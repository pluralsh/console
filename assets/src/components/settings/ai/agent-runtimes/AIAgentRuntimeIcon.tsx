import {
  AiSparkleFilledIcon,
  AppIcon,
  ClaudeLogoIcon,
  GeminiLogoIcon,
  IconProps,
  OpenCodeLogoIcon,
} from '@pluralsh/design-system'
import { AgentRuntimeType } from 'generated/graphql'
import { ComponentPropsWithRef, type ComponentType } from 'react'

export function AgentRuntimeIcon({
  type,
  fullColor = true,
  ...props
}: {
  type: Nullable<AgentRuntimeType>
  fullColor?: boolean
} & ComponentPropsWithRef<typeof AppIcon>) {
  const Icon = runtimeToIcon[type ?? AgentRuntimeType.Custom]
  return (
    <AppIcon
      icon={<Icon fullColor={fullColor} />}
      size="xxxsmall"
      {...props}
    />
  )
}

const runtimeToIcon = {
  [AgentRuntimeType.Claude]: ClaudeLogoIcon,
  [AgentRuntimeType.Gemini]: GeminiLogoIcon,
  [AgentRuntimeType.Opencode]: OpenCodeLogoIcon,
  [AgentRuntimeType.Custom]: AiSparkleFilledIcon,
} as const satisfies Record<AgentRuntimeType, ComponentType<IconProps>>
