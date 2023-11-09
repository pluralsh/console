import { useOutletContext, useSearchParams } from 'react-router-dom'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Pod } from 'generated/graphql'
import { useTheme } from 'styled-components'
import { Key, useMemo, useState } from 'react'
import { FormField, ListBoxItem, Select } from '@pluralsh/design-system'

export default function PodShell() {
  const { pod } = useOutletContext() as { pod: Pod }
  const [searchParams] = useSearchParams()

  if (!pod) {
    throw new Error('This cloud shell can only be used in a pod context')
  }

  const theme = useTheme()
  const containers: Array<string> = useMemo(
    () => [
      ...(pod.spec?.initContainers?.map((c) => c!.name!) ?? []),
      ...(pod.spec?.containers?.map((c) => c!.name!) ?? []),
    ],
    [pod]
  )
  const [selected, setSelected] = useState<Key>(
    searchParams.get('container') ?? (containers.at(0) as Key)
  )

  return (
    <ScrollablePage
      heading="Info"
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
        shell
      </div>
    </ScrollablePage>
  )
}
