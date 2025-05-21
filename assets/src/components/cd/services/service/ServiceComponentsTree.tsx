import {
  ArrowTopRightIcon,
  Button,
  Chip,
  ChipSeverity,
  IconFrame,
  InfoIcon,
  InfoOutlineIcon,
  Modal,
} from '@pluralsh/design-system'
import { Node, NodeProps, ReactFlowProvider } from '@xyflow/react'
import { LayoutOptions } from 'elkjs'
import { Dispatch, ReactNode, SetStateAction, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import {
  ComponentState,
  ServiceComponent,
  ServiceComponentChild,
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
import { ModalProp } from '../ServicesTreeDiagramNodes.tsx'
import { ComponentIcon } from './component/misc.tsx'

type ServiceComponentNodeType = Node<
  ServiceComponent,
  typeof ServiceComponentNodeKey
>

type ServiceComponentChildNodeType = Node<
  ServiceComponentChild,
  typeof ServiceComponentNodeKey
>

const ServiceComponentNodeKey = 'plural-service-component-tree-node'
const ServiceComponentChildNodeKey = 'plural-service-component-child-tree-node'

const nodeTypes = {
  [ServiceComponentNodeKey]: ServiceComponentTreeNode,
  [ServiceComponentChildNodeKey]: ServiceComponentChildTreeNode,
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
  const theme = useTheme()
  const stateToSeverity: { [key in ComponentState]: ChipSeverity } = {
    [ComponentState.Failed]: 'danger',
    [ComponentState.Pending]: 'warning',
    [ComponentState.Running]: 'success',
    [ComponentState.Paused]: 'warning',
  }

  return (
    <>
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.xsmall,
          minWidth: 50,
        }}
      >
        <ComponentIcon kind={kind} />
        <span css={{ ...TRUNCATE_LEFT }}>
          {!group ? '' : `${group}.`}
          {kind}
        </span>
      </div>
      <Chip
        severity={stateToSeverity[state ?? ComponentState.Pending]}
        css={{ whiteSpace: 'nowrap' }}
        size="small"
      >
        {state}
      </Chip>
    </>
  )
}

function ServiceComponentTreeNodeContent({ name, namespace }): ReactNode {
  const theme = useTheme()

  return (
    <div css={{ flex: 1, minWidth: 50 }}>
      <div css={{ ...TRUNCATE, ...theme.partials.text.body2Bold }}>{name}</div>
      <div
        css={{
          ...TRUNCATE,
          ...theme.partials.text.caption,
          color: theme.colors['text-xlight'],
        }}
      >
        {namespace}
      </div>
    </div>
  )
}

function ServiceComponentTreeNode({
  id,
  data,
}: NodeProps<ServiceComponentNodeType>) {
  const theme = useTheme()
  const { serviceId, clusterId, flowId } = useParams()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const componentDetailsUrl = getServiceComponentPath({
    clusterId,
    serviceId,
    flowId,
    componentId: data.id,
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
        <ServiceComponentTreeNodeContent
          name={data.name}
          namespace={data.namespace}
        />
      }
      actions={
        <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
          <IconFrame
            clickable
            onClick={() => navigate(componentDetailsUrl)}
            icon={<ArrowTopRightIcon />}
            type="secondary"
          />
          <IconFrame
            clickable
            onClick={() => setOpen(true)}
            icon={<InfoOutlineIcon />}
            type="secondary"
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

function ServiceComponentChildTreeNode({
  id,
  data,
}: NodeProps<ServiceComponentChildNodeType>) {
  const theme = useTheme()
  const { clusterId } = useParams()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const componentDetailsUrl =
    getKubernetesResourcePath({
      clusterId: clusterId,
      group: data.group,
      version: data.version,
      kind: data.kind?.toLowerCase(),
      name: data.name,
      namespace: data.namespace,
    }) ??
    getKubernetesCustomResourceDetailsPath({
      clusterId: clusterId ?? '',
      group: data.group ?? '',
      kind: data.kind?.toLowerCase(),
      name: data.name,
      namespace: data.namespace,
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
        <ServiceComponentTreeNodeContent
          name={data.name}
          namespace={data.namespace}
        />
      }
      actions={
        <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
          {componentDetailsUrl && (
            <IconFrame
              clickable
              onClick={() => navigate(componentDetailsUrl)}
              icon={<ArrowTopRightIcon />}
              type="secondary"
            />
          )}
          <IconFrame
            clickable
            onClick={() => setOpen(true)}
            icon={<InfoOutlineIcon />}
            type="secondary"
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
  const navigate = useNavigate()

  const isChild = component.__typename === 'ServiceComponentChild'

  return (
    <ModalMountTransition open={open}>
      <Modal
        size="large"
        header={
          <div
            css={{
              alignItems: 'start',
              display: 'flex',
              gap: theme.spacing.xsmall,
            }}
          >
            <InfoIcon
              color="icon-info"
              size={12}
            />
            {component.name}
          </div>
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
                onClick={() => navigate(url)}
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
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing.xxsmall,
          }}
        >
          <ModalProp title="name">{component.name}</ModalProp>
          <ModalProp title="namespace">{component.namespace}</ModalProp>
          <ModalProp title="group">{component.group ?? 'core'}</ModalProp>
          <ModalProp title="version">{component.version}</ModalProp>
          <ModalProp title="kind">{component.kind}</ModalProp>
          <ModalProp title="uid">{component.uid}</ModalProp>
          {isChild && (
            <ModalProp title="parent uid">{component.parentUid}</ModalProp>
          )}
          <ModalProp title="state">
            <Chip
              severity={'info'}
              css={{ whiteSpace: 'nowrap' }}
              size="small"
            >
              {component.state}
            </Chip>
          </ModalProp>
        </div>
      </Modal>
    </ModalMountTransition>
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

export { ComponentsTreeView }
