import {
  Accordion,
  AccordionItem,
  FormField,
  Input,
  ListBoxItem,
  Select,
  Switch,
} from '@pluralsh/design-system'
import { useEffect, useRef } from 'react'
import ClusterSelector from 'components/cd/utils/ClusterSelector'

import { useTheme } from 'styled-components'

import { StackType } from '../../../generated/graphql'

import { StackTypeIcon } from '../common/StackTypeIcon'

export function CreateStackModalFormBasic({
  name,
  setName,
  type,
  setType,
  image,
  setImage,
  version,
  setVersion,
  clusterId,
  setClusterId,
  approval,
  setApproval,
}: {
  name: string
  setName: (name: string) => void
  type: StackType
  setType: (type: StackType) => void
  image: string
  setImage: (image: string) => void
  version: string
  setVersion: (version: string) => void
  clusterId: string
  setClusterId: (clusterId: string) => void
  approval: boolean
  setApproval: (name: boolean) => void
}): any {
  const theme = useTheme()
  const inputRef = useRef<HTMLInputElement>(undefined)

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
        <Select
          aria-label="type"
          label="Type"
          leftContent={<StackTypeIcon stackType={type} />}
          selectedKey={type}
          onSelectionChange={(key) => setType(key as StackType)}
        >
          {Object.entries(StackType).map(([key, value]) => (
            <ListBoxItem
              key={value}
              label={key}
              textValue={value}
              leftContent={<StackTypeIcon stackType={value} />}
            />
          ))}
        </Select>
      </FormField>
      <FormField
        required
        label="Version"
      >
        <Input
          value={version}
          onChange={(e) => setVersion(e.currentTarget.value)}
        />
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
      <Accordion type="single">
        <AccordionItem
          padding="compact"
          trigger={
            <span
              css={{
                ...theme.partials.text.overline,
                color: theme.colors['text-xlight'],
              }}
            >
              Advanced configuration
            </span>
          }
        >
          <FormField
            label="Image"
            paddingTop="medium"
          >
            <Input
              background="transparent"
              value={image}
              onChange={(e) => setImage(e.currentTarget.value)}
            />
          </FormField>
        </AccordionItem>
      </Accordion>
    </>
  )
}
