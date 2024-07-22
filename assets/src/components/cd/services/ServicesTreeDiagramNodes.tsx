import { NodeProps } from 'reactflow'
import { useTheme } from 'styled-components'
import {
  ArrowTopRightIcon,
  ChipList,
  FolderIcon,
  GitHubLogoIcon,
  GlobeIcon,
  IconFrame,
  InfoOutlineIcon,
  Modal,
} from '@pluralsh/design-system'
import React, { Dispatch, SetStateAction, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import {
  GlobalServiceFragment,
  ServiceTreeNodeFragment,
} from '../../../generated/graphql'
import { NodeBase } from '../../utils/reactflow/nodes'
import {
  getGlobalServiceDetailsPath,
  getServiceDetailsPath,
} from '../../../routes/cdRoutesConsts'
import { TRUNCATE, TRUNCATE_LEFT } from '../../utils/truncate'

import ProviderIcon from '../../utils/Provider'

import { ModalMountTransition } from '../../utils/ModalMountTransition'

import { ServiceStatusChip } from './ServiceStatusChip'
import { ServicesTableErrors } from './ServicesTableErrors'

export const ServiceNodeType = 'plural-services-tree-service-node'
export const GlobalServiceNodeType = 'plural-services-tree-global-service-node'

export const nodeTypes = {
  [ServiceNodeType]: ServicesTreeDiagramServiceNode,
  [GlobalServiceNodeType]: ServicesTreeDiagramGlobalServiceNode,
}

export function ServicesTreeDiagramServiceNode(
  props: NodeProps<ServiceTreeNodeFragment>
) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { data } = props
  const [open, setOpen] = useState(false)
  // const componentsLimit = data.components?.length === 20 ? 20 : 19
  // const hiddenComponents = (data.components?.length ?? 0) - componentsLimit

  return (
    <NodeBase
      {...props}
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
      backgroundColor="fill-one"
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
          backgroundColor: theme.colors['fill-zero'],
          borderBottom: '1px solid',
          borderColor:
            theme.mode === 'light'
              ? theme.colors['border-fill-two']
              : theme.colors.border,
          color: theme.colors['text-xlight'],
          gap: theme.spacing.medium,
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

// TODO
function ServicesTreeDiagramServiceNodeModal({
  service,
  open,
  setOpen,
}: {
  service: ServiceTreeNodeFragment
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}) {
  return (
    <ModalMountTransition open={open}>
      <Modal
        portal
        size="large"
        header={service.name}
        open={open}
        onClose={() => setOpen(false)}
      >
        {service.name}
      </Modal>
    </ModalMountTransition>
  )
}

export function ServicesTreeDiagramGlobalServiceNode(
  props: NodeProps<GlobalServiceFragment>
) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { data } = props

  return (
    <NodeBase
      {...props}
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
          {data.tags && (
            <div css={{ marginTop: theme.spacing.small }}>
              <ChipList
                limit={6}
                size="small"
                values={data.tags}
                transformValue={(tag) => `${tag?.name}: ${tag?.value}`}
                emptyState={null}
              />
            </div>
          )}
        </div>
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
    </NodeBase>
  )
}
