import { useNavigate, useParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import {
  Button,
  Chip,
  ClusterIcon,
  CodeEditor,
  FormField,
  Modal,
} from '@pluralsh/design-system'
import {
  ComponentProps,
  ComponentPropsWithoutRef,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { type NodeProps } from 'reactflow'
import isEmpty from 'lodash/isEmpty'
import upperFirst from 'lodash/upperFirst'
import { MergeDeep } from 'type-fest'

import {
  PipelineContextQueryHookResult,
  PipelineContextQueryResult,
  PipelineContextsDocument,
  PipelineContextsQuery,
  PipelineDocument,
  PipelineQuery,
  PipelineStageFragment,
  ServiceDeploymentStatus,
  useCreatePipelineContextMutation,
} from 'generated/graphql'

import { getServiceDetailsPath } from 'routes/cdRoutesConsts'
import { useNodeEdges } from 'components/hooks/reactFlowHooks'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { GqlError } from 'components/utils/Alert'

import { produce } from 'immer'

import { PIPELINE_GRID_GAP } from '../PipelineGraph'

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
      <IconHeading icon={<ClusterIcon />}>Deploy to {stage.name}</IconHeading>

      {!isEmpty(stage.services) && (
        <div className="section">
          <NodeCardList>
            {stage.services?.map((stageService) => (
              <li>
                <ServiceCard
                  clickable
                  onClick={() => {
                    navigate(
                      getServiceDetailsPath({
                        clusterId: stageService?.service?.cluster?.id,
                        serviceId: stageService?.service?.id,
                      })
                    )
                  }}
                  status={
                    stageService?.service?.status
                      ? serviceStateToCardStatus[stageService?.service?.status]
                      : undefined
                  }
                  statusLabel={upperFirst(
                    stageService?.service?.status.toLowerCase?.()
                  )}
                >
                  <div className="serviceName">
                    {stageService?.service?.name}
                  </div>
                  <div className="clusterName">
                    {stageService?.service?.cluster?.name}
                  </div>
                </ServiceCard>
              </li>
            ))}
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
      Create context
    </Button>
  )

  return (
    <Modal
      portal
      asForm
      formProps={{ onSubmit }}
      header="Create context"
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
