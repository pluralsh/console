import {
  FormField,
  Input,
  ListBoxItem,
  Select,
  Switch,
} from '@pluralsh/design-system'
import { useEffect, useRef } from 'react'
import ClusterSelector from 'components/cd/utils/ClusterSelector'

import { StackType } from '../../generated/graphql'

export function CreateStackBasic({
  name,
  setName,
  type,
  setType,
  clusterId,
  setClusterId,
  approval,
  setApproval,
}: {
  name: string
  setName: (name: string) => void
  type: StackType
  setType: (type: StackType) => void
  clusterId: string
  setClusterId: (clusterId: string) => void
  approval: boolean
  setApproval: (name: boolean) => void
}): any {
  const inputRef = useRef<HTMLInputElement>()

  useEffect(() => {
    inputRef.current?.focus?.()
  }, [])

  return (
    <>
      <FormField
        required
        label="Name"
      >
        <Input
          inputProps={{ ref: inputRef }}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
        />
      </FormField>
      <FormField
        required
        label="Type"
      >
        {/* TODO: Add provider icon. */}
        <Select
          aria-label="type"
          label="Type"
          selectedKey={type}
          onSelectionChange={(key) => setType(key as StackType)}
        >
          {Object.entries(StackType).map(([key, value]) => (
            <ListBoxItem
              key={value}
              label={key}
              textValue={value}
            />
          ))}
        </Select>
      </FormField>
      <FormField
        required
        label="Cluster"
      >
        {/* TODO: Make sure that cluster icon resets after modal close. */}
        <ClusterSelector
          placeholder="Select cluster"
          hideTitleContent
          allowDeselect={false}
          clusterId={clusterId}
          onClusterChange={(c) => {
            if (c?.id) setClusterId(c.id)
          }}
        />
      </FormField>
      <Switch
        checked={approval}
        onChange={setApproval}
      >
        Require approvals
      </Switch>
    </>
  )
}
