import { ReactElement } from 'react'
import { WorkbenchIcon } from '@pluralsh/design-system'
import {
  AI_AGENT_RUN_BACK_LABEL_PARAM,
  AI_AGENT_RUN_BACK_SOURCE_PARAM,
  AI_AGENT_RUN_BACK_SOURCE_WORKBENCH,
  AI_AGENT_RUN_BACK_TO_PARAM,
} from 'routes/aiRoutesConsts'
import { WORKBENCH_LAUNCH_BACK_SOURCE } from 'routes/workbenchesRoutesConsts'
import { useSearchParams } from 'react-router-dom'

type SubheaderBackButton = {
  icon?: ReactElement<any>
  label: string
  to: string
}

function getSourceIcon(source: Nullable<string>) {
  switch (source) {
    case AI_AGENT_RUN_BACK_SOURCE_WORKBENCH:
    case WORKBENCH_LAUNCH_BACK_SOURCE:
      return <WorkbenchIcon size={12} />
    default:
      return undefined
  }
}

export function useSubheaderBackButton(): Nullable<SubheaderBackButton> {
  const [searchParams] = useSearchParams()
  const source = searchParams.get(AI_AGENT_RUN_BACK_SOURCE_PARAM)
  const backTo = searchParams.get(AI_AGENT_RUN_BACK_TO_PARAM)

  if (!isInternalReturnPath(backTo)) return null

  return {
    icon: getSourceIcon(source),
    to: backTo,
    label:
      searchParams.get(AI_AGENT_RUN_BACK_LABEL_PARAM) ||
      (source === AI_AGENT_RUN_BACK_SOURCE_WORKBENCH ? 'Workbench' : 'Back'),
  }
}

function isInternalReturnPath(path: Nullable<string>): path is string {
  return !!path && path.startsWith('/') && !path.startsWith('//')
}
