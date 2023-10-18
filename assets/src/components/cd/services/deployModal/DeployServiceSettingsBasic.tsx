import { FormField, Input, ListBoxItem, Select } from '@pluralsh/design-system'
import { ClusterTinyFragment } from 'generated/graphql'
import { Dispatch, SetStateAction, useEffect, useRef } from 'react'
import ProviderIcon from 'components/utils/Provider'

export function DeployServiceSettingsBasic({
  name,
  setName,
  namespace,
  setNamespace,
  clusterId,
  setClusterId,
  clusters,
}: {
  name: string
  setName: Dispatch<SetStateAction<string>>
  namespace: string
  setNamespace: Dispatch<SetStateAction<string>>

  clusterId: string
  setClusterId: Dispatch<SetStateAction<string>>
  clusters: ClusterTinyFragment[]
}): any {
  const inputRef = useRef<HTMLInputElement>()
  const selectedCluster = clusters.find(({ id }) => clusterId === id)

  useEffect(() => {
    inputRef.current?.focus?.()
  }, [])

  return (
    <>
      <FormField
        required
        label="Service name"
      >
        <Input
          inputProps={{ ref: inputRef }}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
      </FormField>
      <FormField
        required
        label="Service namespace"
      >
        <Input
          value={namespace}
          onChange={(e) => setNamespace(e.currentTarget.value)}
        />
      </FormField>
      <FormField
        required
        label="Cluster"
      >
        <Select
          label="Select cluster"
          leftContent={
            selectedCluster && (
              <ProviderIcon
                provider={selectedCluster.provider?.cloud || ''}
                width={16}
              />
            )
          }
          selectedKey={clusterId || ''}
          onSelectionChange={(key) => {
            setClusterId(key as any)
          }}
        >
          {(clusters || []).map((cluster) => (
            <ListBoxItem
              key={cluster.id}
              label={cluster.name}
              leftContent={
                <ProviderIcon
                  provider={cluster.provider?.cloud || ''}
                  width={16}
                />
              }
            />
          ))}
        </Select>
      </FormField>
    </>
  )
}
