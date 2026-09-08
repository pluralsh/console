import { Flex, type SemanticColorKey } from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import { type DefaultTheme } from 'styled-components'
import type { WorkbenchPromptMode } from './workbenchPromptModes'
import { WorkbenchCodingSupervisionFields } from './WorkbenchModeOptionFields'

export type WorkbenchPromptModeConfig = {
  label: string
  Icon: React.ComponentType<{ size: number; color: string }>
  iconColor?: SemanticColorKey
  iconFill?: string
  description: string
  supervisionOptions?: boolean
}

export function workbenchPromptModeIconColor(
  config: WorkbenchPromptModeConfig,
  theme: DefaultTheme
) {
  if (config.iconFill) return config.iconFill
  if (config.iconColor) return theme.colors[config.iconColor]
  return theme.colors['icon-default']
}

export function WorkbenchPromptModeDetails({
  config,
  mode,
  approval,
  babysit,
  review,
  onApprovalChange,
  onBabysitChange,
  onReviewChange,
}: {
  config: WorkbenchPromptModeConfig
  mode: WorkbenchPromptMode
  approval: boolean
  babysit: boolean
  review: boolean
  onApprovalChange: (approval: boolean) => void
  onBabysitChange: (babysit: boolean) => void
  onReviewChange: (review: boolean) => void
}) {
  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
    >
      <CaptionP $color="text-xlight">{config.description}</CaptionP>
      {config.supervisionOptions && mode === 'agent' && (
        <WorkbenchCodingSupervisionFields
          approval={approval}
          babysit={babysit}
          review={review}
          onApprovalChange={onApprovalChange}
          onBabysitChange={onBabysitChange}
          onReviewChange={onReviewChange}
        />
      )}
    </Flex>
  )
}
