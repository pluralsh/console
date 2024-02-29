import { useNavigate, useParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import {
  Button,
  Chip,
  ClusterIcon,
  CodeEditor,
  FormField,
  IconFrame,
  Modal,
  PrOpenIcon,
} from '@pluralsh/design-system'
import {
  ComponentProps,
  ComponentPropsWithoutRef,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { type NodeProps } from 'reactflow'
import isEmpty from 'lodash/isEmpty'
import upperFirst from 'lodash/upperFirst'
import { MergeDeep } from 'type-fest'
import { produce } from 'immer'

import {
  PipelineContextsDocument,
  PipelineContextsQuery,
  PipelineStageFragment,
  PullRequestFragment,
  ServiceDeploymentStatus,
  useCreatePipelineContextMutation,
} from 'generated/graphql'

import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { useNodeEdges } from 'components/hooks/reactFlowHooks'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { GqlError } from 'components/utils/Alert'

import { groupBy, mapValues } from 'lodash'

import { PIPELINE_GRID_GAP } from '../PipelineGraph'
import { PipelinePullRequestsModal } from '../PipelinePullRequests'

import { StopPropagation } from '../../../utils/StopPropagation'

import {
  BaseNode,
  CardStatus,
  IconHeading,
  NodeCardList,
  NodeMeta,
  StatusCard,
} from './BaseNode'

const serviceStateToCardStatus = {
  [ServiceDeploymentStatus.Healthy]: 'ok',
  [ServiceDeploymentStatus.Synced]: 'ok',
  [ServiceDeploymentStatus.Stale]: 'pending',
  [ServiceDeploymentStatus.Failed]: 'closed',
  [ServiceDeploymentStatus.Paused]: 'pending',
} as const satisfies Record<ServiceDeploymentStatus, CardStatus>

export enum StageStatus {
  Complete = 'Complete',
  Pending = 'Pending',
}
const stageStatusToSeverity = {
  [StageStatus.Complete]: 'success',
  [StageStatus.Pending]: 'warning',
} as const satisfies Record<
  StageStatus,
  ComponentProps<typeof Chip>['severity']
>
const ServiceCardSC = styled(StatusCard)(({ theme }) => ({
  '&&': {
    width: '100%',
  },
  '.contentArea': {
    display: 'flex',
    gap: theme.spacing.small,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  '.serviceName': {
    ...theme.partials.text.body2,
    color: theme.colors['text-light'],
  },
  '.clusterName': {
    ...theme.partials.text.caption,
    color: theme.colors['text-xlight'],
  },
}))

export function ServiceCard({
  state,
  ...props
}: ComponentPropsWithoutRef<typeof ServiceCardSC>) {
  return (
    <ServiceCardSC
      state={state}
      {...props}
    />
  )
}

export function getStageStatus(stage: PipelineStageFragment) {
  if (
    (stage.services || []).every(
      (svc) => svc?.service?.status === ServiceDeploymentStatus.Healthy
    )
  ) {
    return StageStatus.Complete
  }

  return StageStatus.Pending
}

const StageNodeSC = styled(BaseNode)((_) => ({
  '&&': { minWidth: 10 * PIPELINE_GRID_GAP },
}))

const IconHeadingInnerSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
}))

function PrsButton({
  pullRequests,
}: {
  pullRequests: Nullable<PullRequestFragment>[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <IconFrame
        type="secondary"
        clickable
        onClick={(e) => {
          setOpen(true)
          e.target?.blur()
        }}
        icon={<PrOpenIcon />}
        tooltip="View pull requests"
      />
      <PipelinePullRequestsModal
        open={open}
        onClose={() => setOpen(false)}
        pullRequests={pullRequests}
      />
    </>
  )
}

export function StageNode(
  props: NodeProps<
    PipelineStageFragment &
      MergeDeep<NodeMeta, { meta: { stageStatus: StageStatus } }>
  >
) {
  const navigate = useNavigate()
  const { incomers, outgoers } = useNodeEdges(props.id)
  const pipelineId = useParams().pipelineId!

  const {
    data: { meta, ...stage },
  } = props
  const status = meta.stageStatus

  const isRootStage = isEmpty(incomers) && !isEmpty(outgoers)

  const servicePullRequests = useMemo(
    () =>
      mapValues(
        groupBy(
          stage.context?.pipelinePullRequests,
          (pipelinePr) => pipelinePr?.service?.id
        ),
        (prs) => prs?.map?.((pr) => pr?.pullRequest)
      ),
    [stage.context?.pipelinePullRequests]
  )

  return (
    <StageNodeSC {...props}>
      <div className="headerArea">
        <h2 className="heading">STAGE</h2>
        <Chip
          size="small"
          severity={stageStatusToSeverity[status]}
        >
          {status}
        </Chip>
      </div>
      <IconHeading icon={<ClusterIcon />}>
        <IconHeadingInnerSC>Deploy to {stage.name}</IconHeadingInnerSC>
      </IconHeading>

      {!isEmpty(stage.services) && (
        <div className="section">
          <NodeCardList>
            {stage.services?.map((stageService) => {
              const service = stageService?.service
              const serviceId = service?.id

              if (!serviceId) return null

              return (
                <li>
                  <ServiceCard
                    clickable
                    onClick={() => {
                      navigate(
                        getServiceDetailsPath({
                          clusterId: service?.cluster?.id,
                          serviceId,
                        })
                      )
                    }}
                    status={
                      service?.status
                        ? serviceStateToCardStatus[service?.status]
                        : undefined
                    }
                    statusLabel={upperFirst(service?.status.toLowerCase?.())}
                  >
                    <div>
                      <div className="serviceName">{service?.name}</div>
                      <div className="clusterName">
                        {service?.cluster?.name}
                      </div>
                    </div>
                    {servicePullRequests[serviceId]?.length && (
                      <StopPropagation>
                        <PrsButton
                          pullRequests={servicePullRequests[serviceId]}
                        />
                      </StopPropagation>
                    )}
                  </ServiceCard>
                </li>
              )
            })}
          </NodeCardList>
        </div>
      )}
      {isRootStage && pipelineId && (
        <AddPipelineContext pipelineId={pipelineId} />
      )}
    </StageNodeSC>
  )
}

function AddPipelineContext({ pipelineId }: { pipelineId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        secondary
        onClick={() => setOpen(true)}
      >
        Add context
      </Button>

      <ModalMountTransition open={open}>
        <AddContextModal
          open={open}
          onClose={() => setOpen(false)}
          pipelineId={pipelineId}
        />
      </ModalMountTransition>
    </>
  )
}

function AddContextModal({
  pipelineId,
  ...props
}: { pipelineId: string } & ComponentProps<typeof Modal>) {
  const theme = useTheme()
  const [json, setJson] = useState('')
  const [jsonError, setJsonError] = useState('')

  const [mutation, { error, loading }] = useCreatePipelineContextMutation({
    onCompleted: () => {
      setJson('')
      props?.onClose?.()
    },
    update: (cache, { data }) => {
      const pipelineId = data?.createPipelineContext?.pipeline?.id

      if (!data?.createPipelineContext || !pipelineId) {
        return
      }
      const { pipeline: _, ...newContext } = data.createPipelineContext
      const params = {
        query: PipelineContextsDocument,
        variables: { id: pipelineId, first: 100 },
      }
      const prev = cache.readQuery<PipelineContextsQuery>(params)
      const next = produce(prev, (draft) => {
        draft?.pipeline?.contexts?.edges?.unshift?.({
          __typename: 'PipelineContextEdge',
          node: newContext,
        })
      })

      cache.writeQuery({
        ...params,
        data: next,
      })
    },
  })

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      if (!json) {
        setJsonError('JSON is required')

        return
      }
      try {
        JSON.parse(json)
      } catch (e) {
        setJsonError('Invalid JSON')

        return
      }
      mutation({
        variables: { pipelineId, attributes: { context: json } },
      })
    },
    [json, mutation, pipelineId]
  )

  useEffect(() => {
    setJsonError('')
  }, [json])

  const actions = (
    <Button
      type="submit"
      disabled={!json || jsonError}
      loading={loading}
    >
      Add context
    </Button>
  )

  return (
    <Modal
      portal
      asForm
      formProps={{ onSubmit }}
      header="Add context"
      actions={actions}
      {...props}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing.medium,
        }}
      >
        <FormField
          label="JSON"
          required
        >
          <CodeEditor
            value={json}
            language="json"
            onChange={setJson}
            height="160px"
            options={{ lineNumbers: false, minimap: { enabled: false } }}
          />
        </FormField>
        {(jsonError || error) && <GqlError error={jsonError || error} />}
      </div>
    </Modal>
  )
}
