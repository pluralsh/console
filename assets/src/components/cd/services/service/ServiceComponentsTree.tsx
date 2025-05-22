import {
  ArrowTopRightIcon,
  Button,
  Chip,
  ChipSeverity,
  CloseIcon,
  CodeEditor,
  Divider,
  Flex,
  IconFrame,
  InfoOutlineIcon,
  Modal,
} from '@pluralsh/design-system'
import { Node, NodeProps, ReactFlowProvider } from '@xyflow/react'
import { StackedText } from 'components/utils/table/StackedText.tsx'
import { LayoutOptions } from 'elkjs'
import { dump } from 'js-yaml'
import { Dispatch, ReactNode, SetStateAction, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import {
  ComponentState,
  ServiceComponent,
  ServiceComponentChild,
  useServiceComponentRawQuery,
  useServiceDeploymentComponentsWithChildrenQuery,
} from '../../../../generated/graphql.ts'
import { getServiceComponentPath } from '../../../../routes/cdRoutesConsts.tsx'
import {
  getKubernetesCustomResourceDetailsPath,
  getKubernetesResourcePath,
} from '../../../../routes/kubernetesRoutesConsts.tsx'
import { GqlError } from '../../../utils/Alert.tsx'
import LoadingIndicator from '../../../utils/LoadingIndicator.tsx'
import { ModalMountTransition } from '../../../utils/ModalMountTransition.tsx'
import { NodeBase } from '../../../utils/reactflow/nodes.tsx'
import { ReactFlowGraph } from '../../../utils/reactflow/ReactFlowGraph.tsx'
import { TRUNCATE, TRUNCATE_LEFT } from '../../../utils/truncate.ts'
import { OverlineH1 } from '../../../utils/typography/Text.tsx'
import { ComponentIcon } from './component/misc.tsx'

type ServiceComponentNodeType = Node<
  ServiceComponent,
  typeof ServiceComponentNodeKey
>

type ServiceComponentChildNodeType = Node<
  ServiceComponentChild,
  typeof ServiceComponentChildNodeKey
>

const ServiceComponentNodeKey = 'plural-service-component-tree-node'
const ServiceComponentChildNodeKey = 'plural-service-component-child-tree-node'

const nodeTypes = {
  [ServiceComponentNodeKey]: ServiceComponentTreeNode,
  [ServiceComponentChildNodeKey]: ServiceComponentTreeNode,
}

export function ComponentsTreeView(): ReactNode {
  const { serviceId } = useParams()

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
        elkOptions={elkOptions}
        // minZoom={0.01}
        nodeTypes={nodeTypes}
        maxZoom={1.5}
      />
    </ReactFlowProvider>
  )
}
const elkOptions: LayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.spacing.nodeNode': '30',
  'elk.layered.spacing.nodeNodeBetweenLayers': '200',
  'elk.separateConnectedComponents': 'false',
  'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
}

function ServiceComponentTreeNodeBase({
  id,
  state,
  actions,
  header,
  content,
}): ReactNode {
  const theme = useTheme()

  return (
    <NodeBase
      id={id}
      css={{
        backgroundColor: theme.colors['fill-two'],
        borderColor:
          state === ComponentState.Failed
            ? theme.colors['border-danger']
            : state === ComponentState.Pending
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
        {header}
      </div>
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.small,
          padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
        }}
      >
        <div css={{ ...TRUNCATE, flex: 1 }}>{content}</div>
        <div>{actions}</div>
      </div>
    </NodeBase>
  )
}

function ServiceComponentTreeNodeHeader({ kind, group, state }): ReactNode {
  const stateToSeverity: { [key in ComponentState]: ChipSeverity } = {
    [ComponentState.Failed]: 'danger',
    [ComponentState.Pending]: 'warning',
    [ComponentState.Running]: 'success',
    [ComponentState.Paused]: 'warning',
  }

  return (
    <Flex
      gap="xsmall"
      align="center"
      width="100%"
    >
      <ComponentIcon kind={kind} />
      <span css={{ ...TRUNCATE_LEFT, flex: 1 }}>
        {!group ? '' : `${group}.`}
        {kind}
      </span>
      <Chip
        severity={stateToSeverity[state ?? ComponentState.Pending]}
        css={{ whiteSpace: 'nowrap' }}
        size="small"
      >
        {state}
      </Chip>
    </Flex>
  )
}

function ServiceComponentTreeNode({
  id,
  data,
  type,
}: NodeProps<ServiceComponentNodeType | ServiceComponentChildNodeType>) {
  const theme = useTheme()
  const { serviceId, clusterId, flowId } = useParams()
  const [open, setOpen] = useState(false)

  const componentDetailsUrl = getComponentDetailsUrl({
    component: data,
    clusterId,
    serviceId,
    flowId,
  })

  return (
    <ServiceComponentTreeNodeBase
      id={id}
      state={data.state}
      header={
        <ServiceComponentTreeNodeHeader
          kind={data.kind}
          group={data.group}
          state={data.state}
        />
      }
      content={
        <StackedText
          truncate
          first={data.name}
          firstPartialType="body2Bold"
          firstColor="text"
          second={data.namespace}
        />
      }
      actions={
        <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
          {componentDetailsUrl && (
            <IconFrame
              clickable
              as={Link}
              to={componentDetailsUrl}
              icon={<ArrowTopRightIcon />}
              type="secondary"
              tooltip={`Go to ${type === ServiceComponentNodeKey ? 'component' : 'resource'}`}
            />
          )}
          <IconFrame
            clickable
            onClick={() => setOpen(true)}
            icon={<InfoOutlineIcon />}
            type="secondary"
            tooltip="View details"
          />
          <ServiceComponentModal
            component={data}
            url={componentDetailsUrl}
            open={open}
            setOpen={setOpen}
          />
        </div>
      }
    />
  )
}

function ServiceComponentModal({
  component,
  url,
  open,
  setOpen,
}: {
  component: ServiceComponent | ServiceComponentChild
  url?: string
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}) {
  const theme = useTheme()
  const { serviceId, clusterId, flowId } = useParams()

  const isChild = component.__typename === 'ServiceComponentChild'
  const componentDetailsUrl = getComponentDetailsUrl({
    component,
    clusterId,
    serviceId,
    flowId,
  })

  return (
    <ModalMountTransition open={open}>
      <Modal
        size="large"
        header={
          <ServiceComponentTreeNodeHeader
            kind={component.kind}
            group={component.group}
            state={component.state}
          />
        }
        actions={
          <>
            <Button
              secondary
              onClick={() => setOpen(false)}
              flex={1}
            >
              Close
            </Button>
            {url && (
              <Button
                as={Link}
                to={url}
                marginLeft="medium"
                flex={1}
              >
                Go to {isChild ? 'resource' : 'component'}
              </Button>
            )}
          </>
        }
        open={open}
        onClose={() => setOpen(false)}
      >
        <Flex gap="xsmall">
          <StackedText
            truncate
            first={component.name}
            firstPartialType="body2Bold"
            firstColor="text"
            second={component.namespace}
            css={{ flex: 1 }}
          />
          {componentDetailsUrl && (
            <IconFrame
              clickable
              as={Link}
              to={componentDetailsUrl}
              icon={<ArrowTopRightIcon />}
              type="secondary"
              tooltip={`Go to ${isChild ? 'resource' : 'component'}`}
            />
          )}
          <IconFrame
            clickable
            onClick={() => setOpen(false)}
            icon={<CloseIcon />}
            type="secondary"
            tooltip="Close modal"
          />
        </Flex>
        <Divider
          backgroundColor="border"
          marginTop="medium"
          marginBottom="medium"
        />
        <div>
          <OverlineH1
            $color="text-xlight"
            css={{ marginBottom: theme.spacing.small }}
          >
            Raw YAML
          </OverlineH1>
          <ServiceComponentRaw
            serviceId={serviceId ?? ''}
            componentId={isChild ? undefined : component.id}
            childId={isChild ? component.id : undefined}
          />
        </div>
      </Modal>
    </ModalMountTransition>
  )
}

function ServiceComponentRaw({
  serviceId,
  componentId,
  childId,
}: {
  serviceId: string
  componentId?: string
  childId?: string
}) {
  const { data, loading, error } = useServiceComponentRawQuery({
    variables: {
      serviceId,
      componentId,
      childId,
    },
  })

  const current = dump(data?.serviceDeployment?.rawResource?.raw)

  if (!current && !error) return <LoadingIndicator />

  if (!data?.serviceDeployment?.rawResource?.raw && !loading)
    return <GqlError error="Could not fetch resource" />

  return (
    <div
      css={{
        maxHeight: '400px',
        height: '100%',
      }}
    >
      <CodeEditor
        language="yaml"
        value={current}
        options={{ lineNumbers: false, minimap: { enabled: false } }}
      />
    </div>
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
      id: component.uid,
      position: { x: 0, y: 0 },
      type: ServiceComponentNodeKey,
      data: { ...component },
    })

    component.children?.forEach((child) => {
      nodes.push({
        id: child?.uid,
        position: { x: 0, y: 0 },
        type: ServiceComponentChildNodeKey,
        data: { ...child },
      })

      edges.push({
        type: 'smooth',
        reconnectable: false,
        id: child?.uid,
        source: child?.parentUid,
        target: child?.uid,
      })
    })
  })

  return { nodes, edges }
}

function getComponentDetailsUrl({
  component,
  clusterId,
  serviceId,
  flowId,
}: {
  component: ServiceComponent | ServiceComponentChild
  clusterId?: string
  serviceId?: string
  flowId?: string
}): string | undefined {
  const { id, group, version, kind, name, namespace } = component
  if (component.__typename === 'ServiceComponentChild')
    return (
      getKubernetesResourcePath({
        clusterId: clusterId,
        group: group,
        version: version,
        kind: kind?.toLowerCase(),
        name: name,
        namespace: namespace,
      }) ??
      getKubernetesCustomResourceDetailsPath({
        clusterId: clusterId ?? '',
        group: group ?? '',
        kind: kind?.toLowerCase(),
        name: name,
        namespace: namespace,
      })
    )
  else if (component.__typename === 'ServiceComponent')
    return getServiceComponentPath({
      clusterId,
      serviceId,
      flowId,
      componentId: id,
    })
  else return undefined
}
