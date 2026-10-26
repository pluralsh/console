import {
  AddIcon,
  Button,
  ChatOutlineIcon,
  Flex,
  Flyover,
  Tooltip,
  WrapWithIf,
} from '@pluralsh/design-system'
import type { MonitoringResourceType } from 'components/ai/chatbot/input/autocomplete/mentionTypes'
import { useOutletContext } from 'react-router-dom'
import styled from 'styled-components'
import { WorkbenchOutletContext } from '../Workbench'
import { WorkbenchJobCreateInput } from '../WorkbenchJobCreateInput'
import { WorkbenchJobActivities } from '../job/WorkbenchJobActivities'
import { monitoringUpdatePromptSeed } from './monitoringUpdatePrompt'

export function WorkbenchMonitoringUpdateButton({
  kind,
  name,
  hasJob,
  onClick,
}: {
  kind: MonitoringResourceType
  name: string
  hasJob: boolean
  onClick: () => void
}) {
  const label = kind === 'dashboard' ? 'Update dashboard' : 'Update monitor'

  return (
    <WrapWithIf
      condition={hasJob}
      wrapper={
        <Tooltip
          label="Return to the update job you started"
          placement="bottom"
        />
      }
    >
      <Button
        primary
        small
        startIcon={hasJob ? <ChatOutlineIcon /> : undefined}
        onClick={onClick}
        aria-label={
          hasJob
            ? `Return to the update job for ${kind} ${name}`
            : `Update ${kind} ${name}`
        }
      >
        {label}
      </Button>
    </WrapWithIf>
  )
}

export function WorkbenchMonitoringUpdatePanel({
  open,
  onClose,
  kind,
  id,
  name,
  jobId,
  onJobChange,
}: {
  open: boolean
  onClose: () => void
  kind: MonitoringResourceType
  id: string
  name: string
  jobId: Nullable<string>
  onJobChange: (jobId: Nullable<string>) => void
}) {
  const { workbenchId, isLoading, workbench } =
    useOutletContext<WorkbenchOutletContext>()

  return (
    <Flyover
      open={open}
      onClose={onClose}
      header={
        <UpdateHeaderSC>
          <span>
            {kind === 'dashboard' ? 'Update dashboard' : 'Update monitor'}{' '}
            <UpdateHeaderNameSC>{name}</UpdateHeaderNameSC>
          </span>
          {jobId && (
            <Button
              secondary
              small
              startIcon={<AddIcon />}
              onClick={() => onJobChange(null)}
            >
              New request
            </Button>
          )}
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
            onCreated={(job) => onJobChange(job.id)}
          />
        </Flex>
      )}
    </Flyover>
  )
}

const UpdateHeaderSC = styled.span(({ theme }) => ({
  ...theme.partials.text.buttonMedium,
  color: theme.colors['text-light'],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.small,
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
