import {
  Chip,
  ContainerRuntimeIcon,
  Flex,
  WarningShieldIcon,
  type SemanticColorKey,
} from '@pluralsh/design-system'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'
import { type DefaultTheme, useTheme } from 'styled-components'
import { green } from '../../../../../design-system/src/theme/colors-base'
import type { WorkbenchPromptMode } from './workbenchPromptModes'
import { WorkbenchPromptSupervisionOption } from './WorkbenchPromptSupervisionOption'

export const WORKBENCH_PROMPT_MODE_ICON_SIZE_HEADER = 16

export type WorkbenchPromptModeConfig = {
  label: string
  Icon: React.ComponentType<{ size: number; color: string }>
  iconColor?: SemanticColorKey
  iconFill?: string
  badge?: { label: string; severity: 'success' | 'neutral' }
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
  onApprovalChange,
  onBabysitChange,
}: {
  config: WorkbenchPromptModeConfig
  mode: WorkbenchPromptMode
  approval: boolean
  babysit: boolean
  onApprovalChange: (approval: boolean) => void
  onBabysitChange: (babysit: boolean) => void
}) {
  const theme = useTheme()

  return (
    <Flex
      direction="column"
      gap="small"
      height="100%"
    >
      <Flex
        align="center"
        gap="small"
      >
        <config.Icon
          size={WORKBENCH_PROMPT_MODE_ICON_SIZE_HEADER}
          color={workbenchPromptModeIconColor(config, theme)}
        />
        <Body2BoldP
          $color="text"
          css={{ flex: 1 }}
        >
          {config.label}
        </Body2BoldP>
        {config.badge && (
          <Chip
            size="small"
            severity={config.badge.severity}
            css={{
              flexShrink: 0,
              '&&':
                config.badge.severity === 'success'
                  ? {
                      backgroundColor: green[900],
                      border: `1px solid ${green[850]}`,
                    }
                  : {
                      color: theme.colors['text-xlight'],
                      backgroundColor: theme.colors['fill-three'],
                      border: theme.borders['fill-three'],
                    },
            }}
          >
            {config.badge.label}
          </Chip>
        )}
      </Flex>
      <Body2P $color="text-xlight">{config.description}</Body2P>
      {config.supervisionOptions && mode === 'agent' && (
        <Flex
          direction="column"
          gap="xxsmall"
          css={{ marginTop: theme.spacing.xsmall }}
        >
          <Overline>SUPERVISION</Overline>
          <Flex
            direction="column"
            gap="xxsmall"
          >
            <WorkbenchPromptSupervisionOption
              icon={
                <WarningShieldIcon
                  size={12}
                  color="icon-light"
                />
              }
              label="Requires approval"
              hint="Pause for your sign-off before it edits anything or opens a PR."
              checked={approval}
              onChange={onApprovalChange}
            />
            <WorkbenchPromptSupervisionOption
              icon={
                <ContainerRuntimeIcon
                  size={12}
                  color="icon-light"
                />
              }
              label="Babysit"
              hint="Stays active after opening the PR to monitor review feedback and requested changes, then follows up until it's ready to merge."
              checked={babysit}
              onChange={onBabysitChange}
            />
          </Flex>
        </Flex>
      )}
    </Flex>
  )
}
