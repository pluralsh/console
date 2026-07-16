import { Flex, ListBoxItem, Select } from '@pluralsh/design-system'
import { Body2BoldP } from 'components/utils/typography/Text'
import type {
  WorkbenchJobCodingModesAttributes,
  WorkbenchJobModesAttributes,
} from 'generated/graphql'
import { useTheme } from 'styled-components'
import { WorkbenchBudgetLimitControl } from './WorkbenchBudgetLimit'
import {
  WorkbenchPromptModeDetails,
  workbenchPromptModeIconColor,
} from './WorkbenchPromptModeDetails'
import { WORKBENCH_PROMPT_MODES } from './WorkbenchPromptModeSelector'
import {
  attributesForPromptMode,
  type WorkbenchPromptMode,
  updateBudgetModes,
  updateCodingModes,
} from './workbenchPromptModes'

export function WorkbenchModesForm({
  value,
  onChange,
  disabled = false,
}: {
  value: WorkbenchJobModesAttributes | null
  onChange: (value: WorkbenchJobModesAttributes | null) => void
  disabled?: boolean
}) {
  const theme = useTheme()
  const selectedMode: WorkbenchPromptMode = value?.plan ? 'plan' : 'agent'
  const selectedConfig = WORKBENCH_PROMPT_MODES.find(
    ({ mode }) => mode === selectedMode
  )!

  const setCoding = (coding: WorkbenchJobCodingModesAttributes) =>
    onChange(
      updateCodingModes(
        value?.plan ? attributesForPromptMode('agent', value) : value,
        coding
      )
    )

  return (
    <Flex
      direction="column"
      gap="large"
      height="100%"
    >
      <Flex
        direction="column"
        gap="small"
      >
        <Body2BoldP>Modes</Body2BoldP>
        <Select
          aria-label="Modes"
          label="Select a mode"
          selectedKey={selectedMode}
          isDisabled={disabled}
          leftContent={
            <selectedConfig.Icon
              size={16}
              color={workbenchPromptModeIconColor(selectedConfig, theme)}
            />
          }
          onSelectionChange={(mode) =>
            onChange(
              attributesForPromptMode(mode as WorkbenchPromptMode, value)
            )
          }
        >
          {WORKBENCH_PROMPT_MODES.map(({ mode, label, Icon, ...config }) => (
            <ListBoxItem
              key={mode}
              label={label}
              leftContent={
                <Icon
                  size={16}
                  color={workbenchPromptModeIconColor(
                    { label, Icon, ...config },
                    theme
                  )}
                />
              }
            />
          ))}
        </Select>
        <WorkbenchPromptModeDetails
          config={selectedConfig}
          mode={selectedMode}
          approval={!!value?.coding?.approval}
          babysit={!!value?.coding?.babysit}
          onApprovalChange={(approval) => setCoding({ approval })}
          onBabysitChange={(babysit) => setCoding({ babysit })}
          showHeader={false}
        />
      </Flex>
      <WorkbenchBudgetLimitControl
        value={value?.budget}
        onChange={(budget) => onChange(updateBudgetModes(value, budget))}
        disabled={disabled}
      />
    </Flex>
  )
}
