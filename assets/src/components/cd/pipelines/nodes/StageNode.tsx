import {
  Button,
  Chip,
  CodeEditor,
  FormField,
  GitPullIcon,
  IconFrame,
  Modal,
  PrOpenIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { produce } from 'immer'
import { groupBy, mapValues } from 'lodash'
import isEmpty from 'lodash/isEmpty'
import upperFirst from 'lodash/upperFirst'
import {
  ComponentProps,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import {
  PipelineContextsDocument,
  PipelineContextsQuery,
  PipelineStageFragment,
  PrStatus,
  PullRequestFragment,
  ServiceDeploymentStatus,
  useCreatePipelineContextMutation,
} from 'generated/graphql'

import { useNodeEdges } from 'components/hooks/reactFlowHooks'
import { GqlError } from 'components/utils/Alert'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { getServiceDetailsPath } from 'routes/cdRoutesConsts'

import {
  ServiceErrorsChip,
  ServiceErrorsModal,
} from 'components/cd/services/ServicesTableErrors'

import { PipelinePullRequestsModal } from '../PipelinePullRequests'

import { CountBadge } from '../../../utils/CountBadge'

import {
  CardStatus,
  IconHeading,
  NodeCardList,
  PipelineBaseNode,
  PipelineStageNodeProps,
  StatusCard,
} from './PipelineBaseNode'

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
    gap: theme.spacing.xxlarge,
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
    display: 'flex',
    gap: theme.spacing.small,
  },
}))

export function getStageStatus(stage: PipelineStageFragment) {
  return (stage.services || []).every(
    (svc) => svc?.service?.status === ServiceDeploymentStatus.Healthy
  )
    ? StageStatus.Complete
    : StageStatus.Pending
}

const StageNodeSC = styled(PipelineBaseNode)(() => ({
  '&&': { minWidth: 240 },
}))

const IconHeadingInnerSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
  justifyContent: 'space-between',
  alignItems: 'center',
  width: '100%',
}))

export const PrCountBadgeSC = styled(CountBadge).attrs(() => ({
  size: 'small',
}))(({ theme }) => ({
  position: 'absolute',
  right: 0,
  top: 4,
  transform: 'translate(50%, -50%)',
  backgroundColor: theme.colors['icon-warning'],
  color:
    theme.mode === 'light'
      ? theme.colors['action-always-white']
      : theme.colors['fill-zero'],
}))

function PrsButton({
  pullRequests,
}: {
  pullRequests: Nullable<PullRequestFragment>[]
}) {
  const [open, setOpen] = useState(false)
  const numOpenPrs = pullRequests.reduce(
    (acc, pr) => (pr?.status === PrStatus.Open ? acc + 1 : acc),
    0
  )

  return (
    <>
      <div css={{ position: 'relative' }}>
        <PrCountBadgeSC count={numOpenPrs} />
        <IconFrame
          as="div"
          clickable
          onClick={(e) => {
            setOpen(true)
            ;(e.target as HTMLElement)?.blur()
          }}
          icon={<PrOpenIcon />}
          tooltip={
            <>
              View pull requests
              <br />({numOpenPrs}/{pullRequests.length} open)
            </>
          }
        />
      </div>
      <PipelinePullRequestsModal
        open={open}
        onClose={() => setOpen(false)}
        pullRequests={pullRequests}
      />
    </>
  )
}

function HeaderChip({ stage, isOpen, setIsOpen, status }) {
  if ((stage.errors || []).length > 0) {
    return (
      <>
        <ServiceErrorsChip
          fillLevel={0}
          clickable
          onClick={(e) => {
            setIsOpen(true)
            e.target?.blur()
          }}
          errors={stage.errors}
        />
        <ServiceErrorsModal
          header={`Errors applying stage ${stage.name}`}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          errors={stage.errors}
        />
      </>
    )
  }

  return (
    <Chip
      fillLevel={0}
      size="small"
      severity={stageStatusToSeverity[status]}
    >
      {status}
    </Chip>
  )
}

export function StageNode({ id, data }: PipelineStageNodeProps) {
  const navigate = useNavigate()
  const { incomers, outgoers } = useNodeEdges(id)
  const pipelineId = useParams().pipelineId!
  const [isOpen, setIsOpen] = useState(false)

  const { meta, ...stage } = data
  const status = meta.stageStatus

  const isRootStage = isEmpty(incomers) && !isEmpty(outgoers)

  const servicePullRequests = useMemo(
    () =>
      mapValues(
        groupBy(
          stage.context?.pipelinePullRequests?.filter(
            (pipelinePr) => pipelinePr?.stage?.id === stage.id
          ),
          (pipelinePr) => pipelinePr?.service?.id
        ),
        (prs) => prs?.map?.((pr) => pr?.pullRequest)
      ),
    [stage.context?.pipelinePullRequests, stage.id]
  )

  return (
    <StageNodeSC id={id}>
      <div className="headerArea">
        <h2 className="heading">STAGE</h2>
        <HeaderChip
          stage={stage}
          status={status}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
        />
      </div>
      <IconHeading icon={<GitPullIcon />}>
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
                <li key={serviceId}>
                  <ServiceCardSC
                    fillLevel={0}
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
                        <span>{service?.cluster?.name}</span>
                        <Tooltip
                          placement="bottom"
                          label={`Revision ID: ${service.revision?.id ?? ''}`}
                        >
                          <span>{service.revision?.id?.slice(-6)}</span>
                        </Tooltip>
                      </div>
                    </div>
                    <div
                      css={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                      }}
                    >
                      {servicePullRequests[serviceId]?.length && (
                        <div
                          style={{ display: 'contents' }}
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                        >
                          <PrsButton
                            pullRequests={servicePullRequests[serviceId]}
                          />
                        </div>
                      )}
                    </div>
                  </ServiceCardSC>
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
      } catch (_) {
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
      disabled={!json || !!jsonError}
      loading={loading}
    >
      Add context
    </Button>
  )

  return (
    <Modal
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
