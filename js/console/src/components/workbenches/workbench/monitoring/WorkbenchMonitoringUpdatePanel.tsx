import { Button, Flex, Flyover } from '@pluralsh/design-system'
import type { MonitoringResourceType } from 'components/ai/chatbot/input/autocomplete/mentionTypes'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import styled from 'styled-components'
import { WorkbenchOutletContext } from '../Workbench'
import { WorkbenchJobCreateInput } from '../WorkbenchJobCreateInput'
import { WorkbenchJobActivities } from '../job/WorkbenchJobActivities'
import { monitoringUpdatePromptSeed } from './monitoringUpdatePrompt'

export function WorkbenchMonitoringUpdateButton({
  kind,
  name,
  onClick,
}: {
  kind: MonitoringResourceType
  name: string
  onClick: () => void
}) {
  return (
    <Button
      primary
      onClick={onClick}
      aria-label={`Update ${kind} ${name}`}
    >
      {kind === 'dashboard' ? 'Update dashboard' : 'Update monitor'}
    </Button>
  )
}

export function WorkbenchMonitoringUpdatePanel({
  open,
  onClose,
  kind,
  id,
  name,
}: {
  open: boolean
  onClose: () => void
  kind: MonitoringResourceType
  id: string
  name: string
}) {
  const { workbenchId, isLoading, workbench } =
    useOutletContext<WorkbenchOutletContext>()
  const [jobId, setJobId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) setJobId(null)
  }, [open])

  useEffect(() => {
    setJobId(null)
  }, [kind, id])

  return (
    <Flyover
      open={open}
      onClose={onClose}
      header={
        <UpdateHeaderSC>
          {kind === 'dashboard' ? 'Update dashboard' : 'Update monitor'}{' '}
          <UpdateHeaderNameSC>{name}</UpdateHeaderNameSC>
        </UpdateHeaderSC>
      }
      width="min(720px, 100%)"
      minWidth={480}
      scrollable={!jobId}
      css={
        jobId
          ? {
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }
          : undefined
      }
    >
      {jobId ? (
        <ChatWrapSC>
          <WorkbenchJobActivities
            jobId={jobId}
            workbenchId={workbenchId}
            workbenchName={workbench?.name ?? 'workbench'}
          />
        </ChatWrapSC>
      ) : (
        <Flex
          direction="column"
          gap="medium"
          paddingBottom="medium"
        >
          <WorkbenchJobCreateInput
            key={`${kind}-${id}-${open}`}
            workbenchId={workbenchId}
            workbenchLoading={isLoading}
            seedPrompt={monitoringUpdatePromptSeed({
              id,
              name,
              resourceType: kind,
              workbenchId,
            })}
            placeholder="Describe the change. Use @ to mention dashboards, monitors, clusters, and more."
            bgColor="fill-one-selected"
            onCreated={(job) => setJobId(job.id)}
          />
        </Flex>
      )}
    </Flyover>
  )
}

const UpdateHeaderSC = styled.span(({ theme }) => ({
  ...theme.partials.text.buttonMedium,
  color: theme.colors['text-light'],
}))

const UpdateHeaderNameSC = styled.span({
  fontWeight: 400,
})

const ChatWrapSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  height: '100%',
  padding: theme.spacing.small,
}))
