import styled from 'styled-components'
import { ClockIcon, IconFrame } from '@pluralsh/design-system'
import { WorkbenchCronFragment } from 'generated/graphql'
import { useNavigate } from 'react-router-dom'
import { getWorkbenchCronScheduleEditAbsPath } from 'routes/workbenchesRoutesConsts'
import { WorkbenchSidePanelEditRow } from 'components/workbenches/workbench/WorkbenchSidePanel'
import { TRUNCATE } from 'components/utils/truncate'
import { WorkbenchSidePanelStoredPrompt } from './WorkbenchSidePanelStoredPrompt'

export function WorkbenchSidePanelCron({
  cron,
  workbenchId,
}: {
  cron: WorkbenchCronFragment
  workbenchId: string
}) {
  const navigate = useNavigate()

  return (
    <WrapperSC>
      <WorkbenchSidePanelEditRow
        onClick={() =>
          navigate(
            getWorkbenchCronScheduleEditAbsPath({
              workbenchId,
              cronId: cron.id,
            })
          )
        }
      >
        <IconFrame
          icon={<ClockIcon />}
          size="xsmall"
        />
        <CrontabSC>{cron.crontab}</CrontabSC>
      </WorkbenchSidePanelEditRow>
      <WorkbenchSidePanelStoredPrompt prompt={cron.prompt ?? ''} />
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
}))

const CrontabSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  ...TRUNCATE,
  color: theme.colors['text-light'],
  flex: 1,
  fontFamily: 'monospace',
  minWidth: 0,
}))
