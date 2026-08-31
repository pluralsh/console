import { describe, expect, it } from 'vitest'
import {
  WorkbenchJobActionFragment,
  WorkbenchJobActivityStatus,
  WorkbenchJobActivityType,
  WorkbenchToolType,
} from 'generated/graphql'
import { getActionPolicyToolName } from './workbenchJobActionPolicyUtils'

function action(
  overrides: Partial<WorkbenchJobActionFragment> & {
    result?: WorkbenchJobActionFragment['result']
  }
): WorkbenchJobActionFragment {
  return {
    id: 'act',
    status: WorkbenchJobActivityStatus.Successful,
    ...overrides,
  } as WorkbenchJobActionFragment
}

describe('getActionPolicyToolName', () => {
  it('maps kubernetes update and delete methods to policy tool names', () => {
    expect(
      getActionPolicyToolName(
        action({
          type: WorkbenchJobActivityType.Kubernetes,
          result: { kubeRequest: { method: 'patch' } },
        })
      )
    ).toBe('update_k8s_resource')
    expect(
      getActionPolicyToolName(
        action({
          type: WorkbenchJobActivityType.Kubernetes,
          result: { kubeRequest: { method: 'delete' } },
        })
      )
    ).toBe('delete_k8s_resource')
  })

  it('maps exec actions to exec_k8s_pod', () => {
    expect(
      getActionPolicyToolName(action({ type: WorkbenchJobActivityType.Exec }))
    ).toBe('exec_k8s_pod')
  })

  it('builds function-call policy names from tool type and name', () => {
    expect(
      getActionPolicyToolName(
        action({
          type: WorkbenchJobActivityType.Function,
          result: {
            functionCall: {
              name: 'pager',
              tool: {
                id: 'tool',
                name: 'pager',
                tool: WorkbenchToolType.Pagerduty,
              },
            },
          },
        })
      )
    ).toBe('pagerduty_function_call_pager')
  })
})
