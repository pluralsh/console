import {
  ArrowScroll,
  Callout,
  Chip,
  ChipSeverity,
  ComponentsIcon,
  FillLevelProvider,
  Flex,
  IconFrame,
  InfoOutlineIcon,
  ListIcon,
  NetworkInterfaceIcon,
  SearchIcon,
  UpdatesIcon,
} from '@pluralsh/design-system'
import { type Key } from '@react-types/shared'
import { Node, NodeProps, ReactFlowProvider } from '@xyflow/react'

import { useThrottle } from 'components/hooks/useThrottle.tsx'
import { GqlError } from 'components/utils/Alert.tsx'
import { ExpandedInput, IconExpander } from 'components/utils/IconExpander.tsx'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { LayoutOptions } from 'elkjs'
import {
  ComponentState,
  ServiceComponent,
  ServiceDeploymentComponentFragment,
  useServiceDeploymentComponentsQuery,
  useServiceDeploymentComponentsWithChildrenQuery,
} from 'generated/graphql'
import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { getServiceComponentPath } from 'routes/cdRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import ButtonGroup from '../../../utils/ButtonGroup.tsx'
import { NodeBase } from '../../../utils/reactflow/nodes.tsx'
import { ReactFlowGraph } from '../../../utils/reactflow/ReactFlowGraph.tsx'
import { TRUNCATE, TRUNCATE_LEFT } from '../../../utils/truncate.ts'
import { ComponentList } from './component/ComponentList.tsx'
import {
  ComponentStateFilter,
  useComponentKindSelect,
} from './component/Components.tsx'
import { ComponentIcon } from './component/misc.tsx'
import { countDeprecations } from './deprecationUtils'
import { ServiceDeprecationsModal } from './ServiceDeprecationsModal'

const directory = [
  { path: 'list', icon: <ListIcon /> },
  { path: 'tree', icon: <NetworkInterfaceIcon /> },
]

export function ServiceComponents() {
  const [selectedState, setSelectedState] = useState<Key | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [tab, setTab] = useState(directory[0].path)
  const [components, setComponents] = useState()

  const { kindSelector, selectedKinds, setSelectedKinds, allKinds } =
    useComponentKindSelect(components, {
      width: 320,
    })

  return (
    <ScrollablePage
      scrollable
      heading="Components"
      headingContent={
        <ArrowScroll>
          <FiltersWrapperSC>
            {tab === 'list' && (
              <>
                <IconExpander
                  tooltip="Search components"
                  icon={<SearchIcon />}
                  active={!!searchQuery}
                  onClear={() => setSearchQuery('')}
                >
                  <ExpandedInput
                    width={320}
                    inputValue={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search components"
                  />
                </IconExpander>
                <IconExpander
                  tooltip="Filter by component kind"
                  icon={<ComponentsIcon />}
                  active={!!selectedKinds.size}
                  onClear={() => setSelectedKinds(new Set())}
                >
                  {kindSelector}
                </IconExpander>
                <IconExpander
                  tooltip="Filter by component state"
                  icon={<UpdatesIcon />}
                  active={!!selectedState}
                  onClear={() => setSelectedState(null)}
                >
                  <ComponentStateFilter
                    selectedState={selectedState}
                    setSelectedState={setSelectedState}
                  />
                </IconExpander>
              </>
            )}
            <ComponentsViewSwitch
              tab={tab}
              setTab={setTab}
            ></ComponentsViewSwitch>
          </FiltersWrapperSC>
        </ArrowScroll>
      }
    >
      {tab === 'list' && (
        <ComponentsListView
          setComponents={setComponents}
          selectedKinds={selectedKinds}
          allKinds={allKinds}
          selectedState={selectedState}
          searchQuery={searchQuery}
        ></ComponentsListView>
      )}
      {tab === 'tree' && <ComponentsTreeView></ComponentsTreeView>}
    </ScrollablePage>
  )
}

const FiltersWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  overflowX: 'auto',
  width: '100%',
  gap: theme.spacing.medium,
  paddingRight: theme.spacing.large,
}))

function ComponentsViewSwitch({ tab, setTab }): ReactNode {
  return (
    <FillLevelProvider value={0}>
      <ButtonGroup
        directory={directory}
        tab={tab}
        onClick={setTab}
      ></ButtonGroup>
    </FillLevelProvider>
  )
}

function ComponentsListView({
  selectedKinds,
  allKinds,
  selectedState,
  setComponents,
  searchQuery,
}): ReactNode {
  const { serviceId, clusterId, flowId } = useParams()
  const throttledSearchQuery = useThrottle(searchQuery, 250)
  const [showDeprecations, setShowDeprecations] = useState(false)

  const { data, error } = useServiceDeploymentComponentsQuery({
    variables: { id: serviceId || '' },
  })

  const deprecationCount = useMemo(
    () => countDeprecations(data?.serviceDeployment?.components),
    [data?.serviceDeployment?.components]
  )
  const components: ServiceDeploymentComponentFragment[] = useMemo(
    () => data?.serviceDeployment?.components?.filter(isNonNullable) ?? [],
    [data?.serviceDeployment?.components]
  )

  useEffect(() => {
    setComponents(components)
  }, [components, setComponents])

  if (error) return <GqlError error={error} />
  if (!data) return <LoadingIndicator />

  return (
    <>
      <Flex
        direction="column"
        gap="medium"
        overflow="hidden"
      >
        {deprecationCount > 0 && (
          <Callout
            severity="danger"
            title={`Using ${
              deprecationCount > 1 ? '' : 'an '
            } outdated k8s version${deprecationCount > 1 ? 's' : ''}`}
            buttonProps={{
              onClick: () => setShowDeprecations(true),
              children: 'Review deprecations',
            }}
          >
            This service is using {deprecationCount > 1 ? '' : 'a '}deprecated
            k8s resource{deprecationCount > 1 ? 's' : ''}.{' '}
            {deprecationCount > 1 ? 'These are' : 'This is'} incompatible with
            the k8s cluster version you are using.
          </Callout>
        )}
        <ComponentList
          setUrl={(c) =>
            c?.name && c?.kind
              ? `${getServiceComponentPath({
                  clusterId,
                  serviceId,
                  flowId,
                  componentId: c.id,
                })}`
              : undefined
          }
          components={components}
          selectedKinds={selectedKinds.size > 0 ? selectedKinds : allKinds}
          selectedState={selectedState as ComponentState | null}
          searchQuery={throttledSearchQuery}
        />
      </Flex>
      <ModalMountTransition open={showDeprecations}>
        <ServiceDeprecationsModal
          open={showDeprecations}
          onClose={() => setShowDeprecations(false)}
          components={components}
        />
      </ModalMountTransition>
    </>
  )
}

type ServiceComponentNodeType = Node<
  ServiceComponent,
  typeof ServiceComponentNodeKey
>
const ServiceComponentNodeKey = 'plural-service-component-tree-node'

const nodeTypes = {
  [ServiceComponentNodeKey]: ServiceComponentTreeNode,
}

function ServiceComponentTreeNode({
  id,
  data,
}: NodeProps<ServiceComponentNodeType>) {
  const theme = useTheme()
  const stateToSeverity: { [key in ComponentState]: ChipSeverity } = {
    [ComponentState.Failed]: 'danger',
    [ComponentState.Pending]: 'warning',
    [ComponentState.Running]: 'success',
    [ComponentState.Paused]: 'warning',
  }
  const [open, setOpen] = useState(false)

  return (
    <NodeBase
      id={id}
      css={{
        backgroundColor: theme.colors['fill-two'],
        borderColor:
          data.state === ComponentState.Failed
            ? theme.colors['border-danger']
            : data.state === ComponentState.Pending
              ? theme.colors['border-warning']
              : undefined,
        gap: 0,
        padding: 0,
        width: 336,
      }}
    >
      <div
        css={{
          ...theme.partials.text.caption,
          alignItems: 'center',
          justifyContent: 'space-between',
          display: 'flex',
          backgroundColor: theme.colors['fill-one'],
          borderBottom: '1px solid',
          borderColor:
            theme.mode === 'light'
              ? theme.colors['border-fill-two']
              : theme.colors.border,
          color: theme.colors['text-xlight'],
          gap: theme.spacing.medium,
          borderTopLeftRadius: theme.borderRadiuses.large,
          borderTopRightRadius: theme.borderRadiuses.large,
          padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
        }}
      >
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.xsmall,
            minWidth: 50,
          }}
        >
          <ComponentIcon kind={data.kind} />
          <span css={{ ...TRUNCATE_LEFT }}>
            {!data.group?.replace('group', '') ? '' : `${data.group}.`}
            {data.kind}
          </span>
        </div>
        <Chip
          severity={stateToSeverity[data.state ?? ComponentState.Pending]}
          css={{ whiteSpace: 'nowrap' }}
          size="small"
        >
          {data.state}
        </Chip>
      </div>
      <div
        css={{
          padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
        }}
      >
        <div css={{ flex: 1 }}>
          <div css={{ display: 'flex', gap: theme.spacing.small }}>
            <div css={{ flex: 1, minWidth: 50 }}>
              <div css={{ ...TRUNCATE, ...theme.partials.text.body2Bold }}>
                {data.name}
              </div>
              <div
                css={{
                  ...TRUNCATE,
                  ...theme.partials.text.caption,
                  color: theme.colors['text-xlight'],
                }}
              >
                {data?.namespace}
              </div>
            </div>
            <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
              <IconFrame
                clickable
                onClick={() => setOpen(true)}
                icon={<InfoOutlineIcon />}
                type="secondary"
              />
            </div>
          </div>
        </div>
      </div>
    </NodeBase>
  )
}

function ComponentsTreeView(): ReactNode {
  const { serviceId } = useParams()
  const options: LayoutOptions = {
    'elk.algorithm': 'mrtree',
    'elk.direction': 'RIGHT',
    'elk.spacing.nodeNode': '60',
  }

  const { data, error } = useServiceDeploymentComponentsWithChildrenQuery({
    variables: { id: serviceId || '' },
  })

  const { nodes: baseNodes, edges: baseEdges } = useMemo(
    () =>
      getNodesAndEdges(
        (data?.serviceDeployment?.components as Array<ServiceComponent>) ?? []
      ),
    [data?.serviceDeployment?.components]
  )

  if (error) return <GqlError error={error} />
  if (!data) return <LoadingIndicator />

  return (
    <ReactFlowProvider>
      <ReactFlowGraph
        allowFullscreen
        baseNodes={baseNodes}
        baseEdges={baseEdges}
        elkOptions={options}
        minZoom={0.01}
        nodeTypes={nodeTypes}
      />
    </ReactFlowProvider>
  )
}

function getNodesAndEdges(components: Array<ServiceComponent>): {
  nodes: Array<any>
  edges: Array<any>
} {
  const nodes: Array<any> = []
  const edges: Array<any> = []

  components.forEach((component) => {
    nodes.push({
      id: component.id,
      position: { x: 0, y: 0 },
      type: ServiceComponentNodeKey,
      data: { ...component },
    })

    component.children?.forEach((child) => {
      nodes.push({
        id: child?.id,
        position: { x: 0, y: 0 },
        type: ServiceComponentNodeKey,
        data: { ...child },
      })

      edges.push({
        type: 'smooth',
        reconnectable: false,
        id: `${child?.id}${component.id}`,
        source: component?.id,
        target: child?.id,
      })
    })
  })

  return { nodes, edges }
}
