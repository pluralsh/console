import { describe, expect, it } from 'vitest'
import {
  AI_AGENT_RUN_BACK_LABEL_PARAM,
  AI_AGENT_RUN_BACK_SOURCE_PARAM,
  AI_AGENT_RUN_BACK_TO_PARAM,
} from 'routes/aiRoutesConsts'
import {
  getWorkbenchLaunchAbsPath,
  WORKBENCH_LAUNCH_BACK_SOURCE,
} from './workbenchesRoutesConsts'

describe('getWorkbenchLaunchAbsPath', () => {
  it('returns the workbench path when no return target is provided', () => {
    expect(getWorkbenchLaunchAbsPath({ workbenchId: 'wb-1' })).toBe(
      '/workbenches/wb-1'
    )
  })

  it('attaches return query params for the send-to-workbench flow', () => {
    const path = getWorkbenchLaunchAbsPath({
      workbenchId: 'wb-1',
      backTo: '/stacks/abc/insights',
      backLabel: 'Insights',
    })
    const [pathname, query] = path.split('?')
    const params = new URLSearchParams(query)

    expect(pathname).toBe('/workbenches/wb-1')
    expect(params.get(AI_AGENT_RUN_BACK_SOURCE_PARAM)).toBe(
      WORKBENCH_LAUNCH_BACK_SOURCE
    )
    expect(params.get(AI_AGENT_RUN_BACK_TO_PARAM)).toBe('/stacks/abc/insights')
    expect(params.get(AI_AGENT_RUN_BACK_LABEL_PARAM)).toBe('Insights')
  })
})
