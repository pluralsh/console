import {
  ComponentProps,
  ReactElement,
  useCallback,
  useRef,
  useState,
} from 'react'
import {
  Button,
  Card,
  PlusIcon,
  useResizeObserver,
} from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'

import { NewNodeGroup } from '../helpers'
import { NodeGroup } from '../types'

import { NodeGroup as NodeGroupComponent } from './NodeGroup'

const NodeGroupsScrollContainerSC = styled.div(({ theme }) => ({
  '& > div': {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.large,
  },
  position: 'relative',
  overflow: 'auto',
  maxHeight: 350,
}))

function NodeGroupsScrollContainer({
  children,
  ...props
}: ComponentProps<typeof NodeGroupsScrollContainerSC>) {
  const theme = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useResizeObserver(ref as any, () => {
    if (ref.current && innerRef.current) {
      const barWidth =
        ref.current.getBoundingClientRect().width -
        innerRef.current.getBoundingClientRect().width

      if (barWidth > 0) {
        innerRef.current.style.setProperty(
          'padding-right',
          `${theme.spacing.xsmall}px`
        )
        ref.current.style.setProperty(
          'margin-right',
          `${-barWidth - theme.spacing.xsmall}px`
        )
      } else {
        innerRef.current.style.setProperty('padding-right', '0')
        ref.current.style.setProperty('margin-right', '0')
      }
    }
  })

  return (
    <NodeGroupsScrollContainerSC
      ref={ref}
      {...props}
    >
      <div ref={innerRef}>{children}</div>
    </NodeGroupsScrollContainerSC>
  )
}

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

        <NodeGroupsScrollContainer>
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
        </NodeGroupsScrollContainer>
      </div>
    </div>
  )
}

export { NodeGroupContainer }
