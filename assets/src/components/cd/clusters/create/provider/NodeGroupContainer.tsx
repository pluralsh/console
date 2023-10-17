import { ReactElement, useCallback, useState } from 'react'
import { Button, Card, PlusIcon } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'

import { NewNodeGroup } from '../helpers'
import { NodeGroup } from '../types'

import { NodeGroup as NodeGroupComponent } from './NodeGroup'

function NodeGroupContainer({ provider }): ReactElement {
  const theme = useTheme()
  const [nodeGroups, setNodeGroups] = useState<Array<NodeGroup>>([
    NewNodeGroup(provider),
  ])

  const onRemove = useCallback(
    (idx: number) =>
      setNodeGroups((ngs) => ngs.filter((_, ngIdx) => idx !== ngIdx)),
    []
  )
  const onChange = useCallback(
    (ng: NodeGroup, idx: number) =>
      setNodeGroups((ngs) => ngs.fill(ng, idx, idx)),
    []
  )

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <div
          css={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <div
            css={{
              ...theme.partials.text.overline,
              color: theme.colors['text-xlight'],
            }}
          >
            node groups
          </div>

          <Button
            css={{
              width: 'fit-content',
            }}
            small
            secondary
            floating
            startIcon={<PlusIcon />}
            onClick={() =>
              setNodeGroups((nodeGroups) => [
                ...nodeGroups,
                NewNodeGroup(provider),
              ])
            }
          >
            Add node group
          </Button>
        </div>

        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            position: 'relative',
            overflow: 'auto',
            maxHeight: '350px',
            paddingRight: '4px', // TODO: make it dynamic based on if element is scrollable
          }}
        >
          {nodeGroups.map((ng, idx) => (
            <Card
              key={ng.id}
              fillLevel={2}
              padding="medium"
            >
              <NodeGroupComponent
                provider={provider}
                initialNodeGroup={ng}
                removable={nodeGroups.length > 1}
                onChange={(ng) => onChange(ng, idx)}
                onRemove={() => onRemove(idx)}
              />
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export { NodeGroupContainer }
