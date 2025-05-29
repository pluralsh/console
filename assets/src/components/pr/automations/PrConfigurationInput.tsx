import { Input, ListBoxItem, Select, Switch } from '@pluralsh/design-system'
import ProjectSelector from 'components/utils/ProjectSelector'
import { ConfigurationType, PrConfiguration } from 'generated/graphql'

import { parseToBool } from 'utils/parseToBool'
import {
  ClusterHandleSelector,
  FlowSelector,
  GroupSelector,
  UserSelector,
} from '../../cd/utils/Selectors.tsx'

export function PrConfigurationInput({
  config,
  value,
  setValue,
}: {
  config: Nullable<PrConfiguration>
  setValue: (value: string) => void
  value: string
}) {
  if (!config) return null

  const { type } = config
  let configBoolVal = false

  if (type === ConfigurationType.Bool) {
    configBoolVal = parseToBool(value)
  }

  switch (type) {
    case ConfigurationType.Cluster:
      return (
        <ClusterHandleSelector
          clusterHandle={value}
          setClusterHandle={setValue}
        />
      )
    case ConfigurationType.Project:
      return (
        <ProjectSelector
          selectedProject={value}
          setSelectedProject={setValue}
          selectionValueType="name"
        />
      )
    case ConfigurationType.Bool:
      return (
        <Switch
          checked={configBoolVal}
          onChange={(isChecked) => {
            setValue(isChecked.toString())
          }}
        />
      )
    case ConfigurationType.Enum:
      return (
        <Select
          selectedKey={value}
          onSelectionChange={(key) => setValue(key as string)}
        >
          {(config?.values || [])?.map((val) => (
            <ListBoxItem
              key={`${val}`}
              label={val}
              textValue={val ?? ''}
            />
          ))}
        </Select>
      )
    case ConfigurationType.Group:
      return (
        <GroupSelector
          group={value}
          setGroup={setValue}
        />
      )
    case ConfigurationType.User:
      return (
        <UserSelector
          user={value}
          setUser={setValue}
        />
      )
    case ConfigurationType.Flow:
      return (
        <FlowSelector
          flow={value}
          setFlow={setValue}
        />
      )
    default:
      return (
        <Input
          value={value}
          placeContent={config.placeholder}
          onChange={(e) => {
            setValue(e.currentTarget.value)
          }}
        />
      )
  }
}
