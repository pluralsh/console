import {
  AiSparkleFilledIcon,
  AppIcon,
  ClaudeLogoIcon,
  GeminiLogoIcon,
  IconProps,
  OpenCodeLogoIcon,
  OpenAILogoIcon,
} from '@pluralsh/design-system'
import { AgentRuntimeType } from 'generated/graphql'
import { ComponentPropsWithRef, type ComponentType } from 'react'

export function AgentRuntimeIcon({
  type,
  fullColor = true,
  wrapInFrame = true,
  ...props
}: {
  type: Nullable<AgentRuntimeType>
  fullColor?: boolean
  wrapInFrame?: boolean
} & ComponentPropsWithRef<typeof AppIcon>) {
  const Icon = runtimeToIcon[type ?? AgentRuntimeType.Custom]

  if (!wrapInFrame) return <Icon fullColor={fullColor} />
  return (
    <AppIcon
      icon={<Icon fullColor={fullColor} />}
      size="xxxsmall"
      {...props}
    />
  )
}

export const runtimeToIcon = {
  [AgentRuntimeType.Claude]: ClaudeLogoIcon,
  [AgentRuntimeType.Gemini]: GeminiLogoIcon,
  [AgentRuntimeType.Opencode]: OpenCodeLogoIcon,
  [AgentRuntimeType.Custom]: AiSparkleFilledIcon,
  [AgentRuntimeType.Codex]: OpenAILogoIcon,
} as const satisfies Record<AgentRuntimeType, ComponentType<IconProps>>
