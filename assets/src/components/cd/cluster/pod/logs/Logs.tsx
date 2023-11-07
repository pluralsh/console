import { Key, ReactElement, useMemo, useState } from 'react'
import { FormField, ListBoxItem, Select } from '@pluralsh/design-system'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { ScrollablePage } from '../../../../utils/layout/ScrollablePage'
import { Pod } from '../../../../../generated/graphql'

import ContainerLogs from './ContainerLogs'

enum SinceSecondsOptions {
  Minute = 60,
  QuarterHour = SinceSecondsOptions.Minute * 15,
  HalfHour = SinceSecondsOptions.Minute * 30,
  Hour = SinceSecondsOptions.Minute * 60,
  Day = SinceSecondsOptions.Hour * 24,
}

const SinceSecondsSelectOptions: Array<{ key: Key; label: string }> = [
  {
    key: SinceSecondsOptions.Minute,
    label: '1 minute',
  },
  {
    key: SinceSecondsOptions.QuarterHour,
    label: '15 minutes',
  },
  {
    key: SinceSecondsOptions.HalfHour,
    label: '30 minutes',
  },
  {
    key: SinceSecondsOptions.Hour,
    label: '1 hour',
  },
  {
    key: SinceSecondsOptions.Day,
    label: '1 day',
  },
]

function Logs(): ReactElement {
  const { pod } = useOutletContext() as { pod: Pod }

  if (!pod) {
    throw new Error('This logs viewer can only be used in a pod context')
  }

  const theme = useTheme()
  const containers: Array<string> = useMemo(
    () => [
      ...(pod.spec?.initContainers?.map((c) => c!.name!) ?? []),
      ...(pod.spec?.containers?.map((c) => c!.name!) ?? []),
    ],
    [pod]
  )
  const [selected, setSelected] = useState<Key>(containers.at(0) as Key)
  const [sinceSeconds, setSinceSeconds] = useState<Key>(
    SinceSecondsOptions.HalfHour as Key
  )

  return (
    <ScrollablePage
      heading="Logs"
      scrollable={false}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.large,
          height: '100%',
        }}
      >
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.large,
            '> *': { width: '100%' },
          }}
        >
          <FormField label="Container">
            <Select
              selectedKey={selected}
              onSelectionChange={(key) => setSelected(key)}
            >
              {containers.map((c) => (
                <ListBoxItem
                  key={c}
                  label={c}
                />
              ))}
            </Select>
          </FormField>

          <FormField label="Logs since">
            <Select
              selectedKey={`${sinceSeconds}`}
              onSelectionChange={(key) => setSinceSeconds(key)}
            >
              {SinceSecondsSelectOptions.map((opts) => (
                <ListBoxItem
                  key={`${opts.key}`}
                  label={opts.label}
                  selected={opts.key === sinceSeconds}
                />
              ))}
            </Select>
          </FormField>
        </div>
        <ContainerLogs
          container={selected as string}
          sinceSeconds={+sinceSeconds}
        />
      </div>
    </ScrollablePage>
  )
}

export default Logs
