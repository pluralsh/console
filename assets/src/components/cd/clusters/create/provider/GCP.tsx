import {
  Dispatch,
  Key,
  ReactElement,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useTheme } from 'styled-components'
import { FormField, Input, ListBoxItem, Select } from '@pluralsh/design-system'

import { RegionsForProvider } from '../helpers'
import { Provider, ProviderState } from '../types'
import {
  CloudSettingsAttributes,
  GcpCloudAttributes,
} from '../../../../../generated/graphql'

interface GCPProps extends ProviderState {
  onChange?: Dispatch<SetStateAction<CloudSettingsAttributes>>
}

export function GCP({ onValidityChange, onChange }: GCPProps): ReactElement {
  const theme = useTheme()
  const [region, setRegion] = useState<Key>()
  const [project, setProject] = useState<string>()
  const [vpc, setVPC] = useState<string>()
  const valid = useMemo(() => !!region, [region])

  const attributes = useMemo(
    () =>
      ({
        gcp: {
          project,
          region,
          network: vpc,
        } as GcpCloudAttributes,
      }) as CloudSettingsAttributes,
    [project, region, vpc]
  )

  useEffect(() => onValidityChange?.(valid), [onValidityChange, valid])
  useEffect(() => onChange?.(attributes), [onChange, attributes])

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.large,
      }}
    >
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.medium,
        }}
      >
        <Input
          placeholder="project-512333"
          value={project}
          onChange={({ target: { value } }) => setProject(value)}
          prefix={<div>Project ID*</div>}
        />
        <Input
          placeholder="vpc-network"
          value={vpc}
          onChange={({ target: { value } }) => setVPC(value)}
          prefix={<div>VPC Name*</div>}
        />
      </div>
      <FormField
        label="Region"
        hint="Region where workload cluster should be created."
        required
      >
        <Select
          aria-label="region"
          selectedKey={region}
          onSelectionChange={setRegion}
        >
          {RegionsForProvider[Provider.GCP].map((r) => (
            <ListBoxItem
              key={r}
              label={r}
              textValue={r}
            />
          ))}
        </Select>
      </FormField>
      {/* TODO: Enable once node group configuration is supported by cluster create */}
      {/* <NodeGroupContainer provider={Provider.GCP} /> */}
    </div>
  )
}
