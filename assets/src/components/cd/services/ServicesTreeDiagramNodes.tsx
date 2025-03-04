import {
  ArrowTopRightIcon,
  Button,
  CaretRightIcon,
  ChipList,
  Divider,
  FolderIcon,
  GitHubLogoIcon,
  GlobeIcon,
  IconFrame,
  InfoIcon,
  InfoOutlineIcon,
  Modal,
  Table,
} from '@pluralsh/design-system'
import { Dispatch, ReactNode, SetStateAction, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { NodeProps, Node } from '@xyflow/react'
import { useTheme } from 'styled-components'
import { formatDateTime } from 'utils/datetime'

import { createColumnHelper } from '@tanstack/react-table'

import { isEmpty } from 'lodash'

import {
  ComponentState,
  GlobalServiceFragment,
  ServiceDeploymentComponentFragment,
  ServiceDeploymentStatus,
  ServiceTreeNodeFragment,
  useKickServiceMutation,
  useSyncGlobalServiceMutation,
} from '../../../generated/graphql'
import {
  getClusterDetailsPath,
  getGlobalServiceDetailsPath,
  getServiceComponentPath,
  getServiceDetailsPath,
} from '../../../routes/cdRoutesConsts'
import { ModalMountTransition } from '../../utils/ModalMountTransition'
import ProviderIcon from '../../utils/Provider'
import { NodeBase } from '../../utils/reactflow/nodes'
import { ColWithIcon } from '../../utils/table/ColWithIcon'
import { TRUNCATE, TRUNCATE_LEFT } from '../../utils/truncate'
import { InlineLink } from '../../utils/typography/InlineLink'
import { OverlineH1 } from '../../utils/typography/Text'

import KickButton from '../../utils/KickButton'

import { ServiceStatusChip } from './ServiceStatusChip'
import { ServicesTableErrors } from './ServicesTableErrors'
import { ComponentIcon, ComponentStateChip } from './service/component/misc.tsx'

export const ServiceNodeKey = 'plural-services-tree-service-node'
export const GlobalServiceNodeKey = 'plural-services-tree-global-service-node'

type ServiceNodeType = Node<ServiceTreeNodeFragment, typeof ServiceNodeKey>
type GlobalServiceNodeType = Node<
  GlobalServiceFragment,
  typeof GlobalServiceNodeKey
>

export const nodeTypes = {
  [ServiceNodeKey]: ServicesTreeDiagramServiceNode,
  [GlobalServiceNodeKey]: ServicesTreeDiagramGlobalServiceNode,
}

export function ServicesTreeDiagramServiceNode({
  id,
  data,
}: NodeProps<ServiceNodeType>) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  // const componentsLimit = data.components?.length === 20 ? 20 : 19
  // const hiddenComponents = (data.components?.length ?? 0) - componentsLimit

  return (
    <NodeBase
      id={id}
      // additionalContent={
      //   !isEmpty(data.components) ? (
      //     <NodeBaseCard
      //       css={{
      //         display: 'flex',
      //         flexWrap: 'wrap',
      //         gap: theme.spacing.xxsmall,
      //         marginTop: theme.spacing.xxsmall,
      //         padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
      //         width: 336,
      //       }}
      //     >
      //       {data.components
      //         ?.filter(isNonNullable)
      //         .slice(0, componentsLimit)
      //         .map((component) => (
      //           <IconFrame
      //             color={
      //               component.state === ComponentState.Failed
      //                 ? 'icon-danger'
      //                 : component.state === ComponentState.Pending
      //                 ? 'icon-warning'
      //                 : 'icon-light'
      //             }
      //             size="small"
      //             type="floating"
      //             icon={<ComponentIcon kind={component.kind} />}
      //           />
      //         ))}
      //       {hiddenComponents > 0 && (
      //         <div
      //           css={{
      //             alignItems: 'center',
      //             display: 'flex',
      //             backgroundColor: theme.colors['fill-two'],
      //             border: theme.borders['fill-two'],
      //             borderRadius: theme.borderRadiuses.medium,
      //             color: theme.colors['text-light'],
      //             height: 24,
      //             justifyContent: 'center',
      //             minWidth: 24,
      //             padding: theme.spacing.xxsmall,
      //           }}
      //         >
      //           +{hiddenComponents}
      //         </div>
      //       )}
      //     </NodeBaseCard>
      //   ) : undefined
      // }
      backgroundColor="fill-two"
      borderColor={
        data.status === ServiceDeploymentStatus.Failed
          ? theme.colors['border-danger']
          : data.status === ServiceDeploymentStatus.Stale
            ? theme.colors['border-warning']
            : undefined
      }
      gap={0}
      padding={0}
      width={336}
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
          {data.helmRepository ? (
            <ProviderIcon
              provider="byok"
              width={16}
            />
          ) : (
            <GitHubLogoIcon />
          )}
          <span css={{ ...TRUNCATE_LEFT }}>
            {data.helmRepository?.spec.url ?? data.repository?.url}
          </span>
        </div>
        <ServiceStatusChip
          status={data?.status}
          componentStatus={data?.componentStatus}
          size="small"
          css={{ whiteSpace: 'nowrap' }}
        />
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
                {data.cluster?.name}
              </div>
            </div>
            <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
              <KickButton
                icon
                pulledAt={data.repository?.pulledAt}
                kickMutationHook={useKickServiceMutation}
                tooltipMessage="Use this to sync this service now instead of at the next poll interval"
                variables={{ id: data.id }}
              />
              <IconFrame
                clickable
                onClick={() =>
                  navigate(
                    getServiceDetailsPath({
                      serviceId: data.id,
                      clusterId: data.cluster?.id,
                    })
                  )
                }
                icon={<ArrowTopRightIcon />}
                type="secondary"
              />
              <IconFrame
                clickable
                onClick={() => setOpen(true)}
                icon={<InfoOutlineIcon />}
                type="secondary"
              />
              <ServicesTreeDiagramServiceNodeModal
                service={data}
                open={open}
                setOpen={setOpen}
              />
            </div>
          </div>
          <ServicesTableErrors
            service={data}
            justifyContent="center"
            marginTop="small"
            width="100%"
          />
        </div>
      </div>
    </NodeBase>
  )
}

function ServicesTreeDiagramServiceNodeModal({
  service,
  open,
  setOpen,
}: {
  service: ServiceTreeNodeFragment
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}) {
  const theme = useTheme()
  const navigate = useNavigate()

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
            {service.name}
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
            <Button
              onClick={() =>
                navigate(
                  getServiceDetailsPath({
                    serviceId: service.id,
                    clusterId: service.cluster?.id,
                  })
                )
              }
              marginLeft="medium"
              flex={1}
            >
              Go to service
            </Button>
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
          <ModalProp title="name">{service.name}</ModalProp>
          <ModalProp title="repository">
            {service.helmRepository?.spec.url ?? service.repository?.url}
          </ModalProp>
          {service.git && (
            <>
              <ModalProp title="reference">{service.git?.ref}</ModalProp>
              <ModalProp title="folder">{service.git?.folder}</ModalProp>
            </>
          )}
          <ModalProp title="cluster">
            <Link
              to={getClusterDetailsPath({ clusterId: service.cluster?.id })}
            >
              <InlineLink as="span">{service.cluster?.name}</InlineLink>
            </Link>
          </ModalProp>
          <ModalProp title="health status">
            <ServiceStatusChip
              status={service.status}
              componentStatus={service.componentStatus}
              size="small"
              css={{ whiteSpace: 'nowrap' }}
            />
          </ModalProp>
          <ModalProp title="errors">
            <ServicesTableErrors
              service={service}
              alwaysShow
              size="small"
            />
          </ModalProp>
          <ModalProp title="namespace">{service.namespace}</ModalProp>
          <ModalProp title="last activity">
            {formatDateTime(service.updatedAt)}
          </ModalProp>
        </div>
        <Divider
          backgroundColor="border"
          marginTop="xlarge"
          marginBottom="xlarge"
        />
        <div>
          <OverlineH1
            css={{
              color: theme.colors['text-xlight'],
              marginBottom: theme.spacing.large,
            }}
          >
            Components
          </OverlineH1>
          <Table
            columns={columns}
            data={service.components ?? []}
            onRowClick={(_e, { original }) =>
              navigate(
                getServiceComponentPath({
                  componentId: original.id,
                  serviceId: service.id,
                  clusterId: service.cluster?.id,
                })
              )
            }
            emptyStateProps={{ message: 'No components found' }}
            rowBg="raised"
            loose
            hideHeader
            css={{
              maxHeight: 400,
              height: '100%',
            }}
          />
        </div>
      </Modal>
    </ModalMountTransition>
  )
}

const columnHelper = createColumnHelper<ServiceDeploymentComponentFragment>()

export const columns = [
  columnHelper.accessor((component) => component, {
    id: 'component',
    cell: function Cell({ getValue }) {
      const theme = useTheme()
      const component = getValue()

      return (
        <ColWithIcon
          truncateLeft
          iconSize="xsmall"
          icon={
            <ComponentIcon
              kind={component.kind}
              size={24}
            />
          }
        >
          <div
            css={{
              ...theme.partials.text.body2Bold,
              color: theme.colors.text,
            }}
          >
            {component.name}
          </div>
          <div css={{ ...theme.partials.text.body2 }}>{component.group}</div>
        </ColWithIcon>
      )
    },
  }),
  columnHelper.accessor((component) => component, {
    id: 'status',
    meta: { gridTemplate: `fit-content(100px)` },
    cell: ({
      row: {
        original: { state, synced },
      },
    }) => (
      <ComponentStateChip
        state={synced ? ComponentState.Running : state}
        size="medium"
      />
    ),
  }),
  columnHelper.accessor(() => {}, {
    id: 'icon',
    meta: { gridTemplate: `fit-content(100px)` },
    cell: () => <IconFrame icon={<CaretRightIcon />} />,
  }),
]

function ModalProp({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  const theme = useTheme()

  return (
    <div
      css={{
        alignItems: 'center',
        display: 'flex',
        gap: theme.spacing.small,
      }}
    >
      <div className="prop-title">{children}</div>
      <Divider
        backgroundColor="border"
        flexGrow={1}
      />
      <div
        css={{
          ...theme.partials.text.caption,
          backgroundColor: theme.colors['fill-two'],
          border: theme.borders['fill-two'],
          borderRadius: theme.borderRadiuses.medium,
          color: theme.colors['text-light'],
          display: 'flex',
          padding: theme.spacing.xxxsmall,
        }}
      >
        {title}
      </div>
    </div>
  )
}

export function ServicesTreeDiagramGlobalServiceNode({
  id,
  data,
}: NodeProps<GlobalServiceNodeType>) {
  const theme = useTheme()
  const navigate = useNavigate()

  return (
    <NodeBase
      id={id}
      gap={0}
      padding={0}
      width={336}
    >
      <div
        css={{
          ...theme.partials.text.caption,
          justifyContent: 'space-between',
          display: 'flex',
          backgroundColor: theme.colors['fill-zero'],
          borderBottom: '1px solid',
          borderColor:
            theme.mode === 'light'
              ? theme.colors['border-fill-two']
              : theme.colors.border,
          borderTopLeftRadius: theme.borderRadiuses.large,
          borderTopRightRadius: theme.borderRadiuses.large,
          color: theme.colors['text-xlight'],
          gap: theme.spacing.medium,
          padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
        }}
      >
        <div
          css={{
            display: 'flex',
            gap: theme.spacing.xsmall,
            whiteSpace: 'nowrap',
          }}
        >
          <GlobeIcon />
          Global Service
        </div>
        {data.project && (
          <div
            css={{
              display: 'flex',
              gap: theme.spacing.xsmall,
              minWidth: 50,
            }}
          >
            <FolderIcon />
            <span css={{ ...TRUNCATE }}>{data.project.name}</span>
          </div>
        )}
      </div>
      <div
        css={{
          display: 'flex',
          backgroundColor: theme.colors['fill-one'],
          padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
        }}
      >
        <div css={{ flex: 1, minWidth: 50 }}>
          <div css={{ ...TRUNCATE, ...theme.partials.text.body2Bold }}>
            {data.name}
          </div>
          <div
            css={{
              ...theme.partials.text.caption,
              color: theme.colors['text-xlight'],
            }}
          >
            {data?.distro ? `${data.distro} distribution` : 'All distributions'}
          </div>
          {!isEmpty(data.tags) && (
            <div css={{ marginTop: theme.spacing.small }}>
              <ChipList
                limit={6}
                size="small"
                values={data.tags ?? []}
                transformValue={(tag) => `${tag?.name}: ${tag?.value}`}
                emptyState={null}
              />
            </div>
          )}
        </div>
        <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
          <KickButton
            icon
            kickMutationHook={useSyncGlobalServiceMutation}
            message="Resync"
            tooltipMessage="Sync this service now instead of at the next poll interval"
            variables={{ id: data.id }}
          />
          <IconFrame
            clickable
            onClick={() =>
              navigate(
                getGlobalServiceDetailsPath({
                  serviceId: data.id,
                })
              )
            }
            icon={<ArrowTopRightIcon />}
            type="secondary"
          />
        </div>
      </div>
    </NodeBase>
  )
}
