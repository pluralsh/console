import { FormField } from '@pluralsh/design-system'
import upperFirst from 'lodash/upperFirst'
import { AddOnConfigurationFragment } from 'generated/graphql'

import { ConfigurationInput } from './ConfigurationInput'
import { conditionIsMet } from './configurationUtils'

export function AddOnConfigurationFields({
  configuration,
  configVals,
  setConfigVals,
}: {
  configuration: AddOnConfigurationFragment[]
  configVals: Record<string, string>
  setConfigVals: (vals: Record<string, string>) => void
}) {
  return (
    <>
      {configuration.map((cfg) => {
        const { name, documentation } = cfg

        if (!name || !conditionIsMet(cfg?.condition, configVals)) {
          return null
        }
        const setValue = (value: string) => {
          setConfigVals({ ...configVals, [name]: value })
        }

        return (
          <FormField
            required
            label={name}
            hint={upperFirst(documentation || '')}
          >
            <ConfigurationInput
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
