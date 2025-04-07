import { FormField, HelpIcon, Tooltip } from '@pluralsh/design-system'
import upperFirst from 'lodash/upperFirst'

import { PrAutomationFragment } from 'generated/graphql'
import { useTheme } from 'styled-components'

import { PrConfigurationInput } from './PrConfigurationInput'
import { conditionIsMet } from './prConfigurationUtils'

export function PrConfigurationFields({
  configuration,
  configVals,
  setConfigVals,
}: {
  configuration?: PrAutomationFragment['configuration']
  configVals: Record<string, string>
  setConfigVals: (vals: Record<string, string>) => void
}) {
  const theme = useTheme()

  return (
    <>
      {(configuration || []).map((cfg) => {
        if (!cfg) return null

        const { name, documentation, longform, optional } = cfg

        if (!name || !conditionIsMet(cfg?.condition, configVals)) {
          return null
        }
        const setValue = (value: string) => {
          setConfigVals({ ...configVals, [name]: value })
        }

        return (
          <FormField
            key={name}
            required={!optional}
            label={upperFirst(name)}
            hint={upperFirst(documentation || '')}
            caption={
              !longform ? undefined : (
                <Tooltip
                  placement="top"
                  displayOn="click"
                  label={longform}
                >
                  <div
                    css={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <HelpIcon
                      size={16}
                      color={theme.colors['action-link-inline']}
                    >
                      Help
                    </HelpIcon>
                  </div>
                </Tooltip>
              )
            }
          >
            <PrConfigurationInput
              config={cfg}
              value={configVals[name] || ''}
              setValue={setValue}
            />
          </FormField>
        )
      })}
    </>
  )
}
