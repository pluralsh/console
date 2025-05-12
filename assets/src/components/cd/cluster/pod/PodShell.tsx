import { useOutletContext, useParams, useSearchParams } from 'react-router-dom'

import { FormField, ListBoxItem, Select } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Pod, useServiceDeploymentTinyQuery } from 'generated/graphql'
import { useMemo, useRef } from 'react'
import { useTheme } from 'styled-components'

import { Key } from '@react-types/shared'
import { ShellWithContext } from '../../../cluster/containers/ContainerShell'
import { ShellContext, TerminalActions } from '../../../terminal/Terminal'

export default function PodShell() {
  const { pod } = useOutletContext() as { pod: Pod }
  const { serviceId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const container = searchParams.get('container')
  const ref = useRef<TerminalActions>({ handleResetSize: () => {} })

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

  const { data: serviceData } = useServiceDeploymentTinyQuery({
    variables: { id: serviceId ?? '' },
    skip: !serviceId,
  })
  const clusterId = serviceData?.serviceDeployment?.cluster?.id

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
            selectedKey={container ?? (containers.at(0) as Key)}
            onSelectionChange={(key) =>
              setSearchParams({ container: `${key}` })
            }
          >
            {containers.map((c) => (
              <ListBoxItem
                key={c}
                label={c}
              />
            ))}
          </Select>
        </FormField>
        <ShellContext.Provider value={ref}>
          <ShellWithContext
            clusterId={clusterId}
            name={pod.metadata.name}
            namespace={pod.metadata.namespace || ''}
            container={container ?? ''}
          />
        </ShellContext.Provider>
      </div>
    </ScrollablePage>
  )
}
