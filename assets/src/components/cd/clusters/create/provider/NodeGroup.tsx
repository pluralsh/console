import {
  Dispatch,
  Key,
  ReactElement,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Accordion,
  FormField,
  IconFrame,
  Input,
  ListBoxItem,
  Select,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { RegionsForProvider, disabledNumberInputArrows } from '../helpers'
import { NodeGroup as NodeGroupType, Provider } from '../types'

import { NodeGroupAWS } from './NodeGroupAWS'

interface NodeGroupProps {
  provider: Provider
  initialNodeGroup: NodeGroupType
  removable: boolean
  onRemove?: Dispatch<void>
  onChange?: Dispatch<NodeGroupType>
}

function NodeGroup({
  provider,
  initialNodeGroup,
  removable,
  onRemove,
  onChange,
  ...props
}: NodeGroupProps): ReactElement {
  const theme = useTheme()
  const regions = useMemo(() => RegionsForProvider[provider], [provider])
  const [selectedRegion, setSelectedRegion] = useState<Key>(
    initialNodeGroup.nodeType
  )
  const [nodeGroup, setNodeGroup] = useState<NodeGroupType>(initialNodeGroup)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const providerEl = useMemo(() => {
    switch (provider) {
      case Provider.AWS:
        return <NodeGroupAWS {...props} />
      case Provider.GCP:
        return <div>Node Group GCP</div>
      case Provider.Azure:
        return <div>Node Group Azure</div>
    }
  }, [props, provider])

  useEffect(() => onChange?.(nodeGroup), [nodeGroup, onChange])

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xsmall,
      }}
    >
      <div
        css={{
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <FormField
          label="Name"
          width="fit-content"
          required
        >
          <Input
            placeholder="small-burst-on-demand"
            value={nodeGroup.name}
            onChange={({ target: { value } }) =>
              setNodeGroup((ng) => ({ ...ng, name: value }))
            }
          />
        </FormField>
        {removable && (
          <IconFrame
            clickable
            icon={<TrashCanIcon />}
            onClick={() => onRemove?.()}
          />
        )}
      </div>
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.large,
        }}
      >
        <FormField
          label="Min nodes"
          required
          hint="Production clusters should have a minimum of 3 nodes."
          width="100%"
        >
          <Input
            placeholder="3"
            value={nodeGroup.minNodes}
            onChange={({ target: { value } }) =>
              setNodeGroup((ng) => ({
                ...ng,
                minNodes: Number.parseInt(value),
              }))
            }
            type="number"
            css={disabledNumberInputArrows}
          />
        </FormField>

        <FormField
          label="Max nodes"
          required
          hint="No more than 5,000 nodes."
          width="100%"
        >
          <Input
            placeholder="2500"
            value={nodeGroup.maxNodes}
            onChange={({ target: { value } }) =>
              setNodeGroup((ng) => ({
                ...ng,
                maxNodes: Number.parseInt(value),
              }))
            }
            type="number"
            css={disabledNumberInputArrows}
          />
        </FormField>

        <FormField
          label="Node type"
          required
          width="100%"
        >
          <Select
            aria-label="node type"
            selectedKey={selectedRegion}
            onSelectionChange={setSelectedRegion}
          >
            {regions.map((r) => (
              <ListBoxItem
                key={r}
                label={r}
                textValue={r}
              />
            ))}
          </Select>
        </FormField>
      </div>

      <Accordion
        unstyled
        label="Advanced"
        isOpen={advancedOpen}
        onOpenChange={(open) => setAdvancedOpen(open)}
        css={{
          '> div:first-child': {
            ...theme.partials.text.overline,
            color: theme.colors['text-xlight'],
            padding: 0,
            paddingTop: theme.spacing.xsmall,
          },
        }}
      >
        <div
          css={{
            paddingTop: advancedOpen ? theme.spacing.medium : 0,
          }}
        >
          {providerEl}
        </div>
      </Accordion>
    </div>
  )
}

export { NodeGroup }
