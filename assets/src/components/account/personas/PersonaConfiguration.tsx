import { Switch } from '@pluralsh/design-system'
import { PersonaConfigurationAttributes } from 'generated/graphql'
import { produce } from 'immer'
import { useTheme } from 'styled-components'
import { Body2BoldP, Body2P } from 'components/utils/typography/Text'

import { configKeyToLabel, configTabs } from './PersonaCreate'

export function PersonaConfiguration({
  configuration,
  setConfiguration,
}: {
  configuration: PersonaConfigurationAttributes
  setConfiguration: (cfg: PersonaConfigurationAttributes) => void
}) {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
      }}
    >
      <Body2BoldP as="h2">Configuration options</Body2BoldP>
      <Switch
        checked={!!configuration.all}
        onChange={() =>
          setConfiguration(
            produce(configuration, (draft) => {
              draft.all = !configuration.all
            })
          )
        }
      >
        Enable all
      </Switch>
      {true && (
        <div
          css={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          }}
        >
          {Object.entries(configTabs).map(([key, label]) => (
            <div
              key={key}
              css={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing.xsmall,
              }}
            >
              <Body2P
                as="h3"
                css={{ color: theme.colors['text-xlight'] }}
              >
                {label}
              </Body2P>
              <div
                css={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: theme.spacing.xsmall,
                }}
              >
                {configuration[key] &&
                  Object.entries(configuration[key]).map(
                    ([subKey, checked]) => (
                      <Switch
                        key={subKey}
                        disabled={!!configuration.all}
                        checked={!!configuration.all || !!checked}
                        onChange={() =>
                          setConfiguration(
                            produce(configuration, (draft) => {
                              draft[key][subKey] = !draft[key][subKey]
                            })
                          )
                        }
                      >
                        {configKeyToLabel(subKey)}
                      </Switch>
                    )
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
