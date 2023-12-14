import { FormField, Input } from '@pluralsh/design-system'
import { useEffect, useRef } from 'react'
import ClusterSelector from 'components/cd/utils/ClusterSelector'

export function DeployServiceSettingsBasic({
  name,
  setName,
  namespace,
  setNamespace,
  clusterId,
  setClusterId,
}: {
  name: string
  setName: (name: string) => void
  namespace: string
  setNamespace: (namespace: string) => void
  clusterId: string
  setClusterId: (clusterId: string) => void
}): any {
  const inputRef = useRef<HTMLInputElement>()

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
        <ClusterSelector
          clusterId={clusterId}
          allowDeselect={false}
          onClusterChange={(c) => {
            if (c?.id) {
              setClusterId(c.id)
            }
          }}
        />
      </FormField>
    </>
  )
}
