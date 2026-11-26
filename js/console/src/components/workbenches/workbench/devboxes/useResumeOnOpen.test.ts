import { renderHook } from '@testing-library/react'
import { DevboxInstanceStatus } from 'generated/graphql'
import { describe, expect, it, vi } from 'vitest'

import { useResumeOnOpen } from './useResumeOnOpen'

const { Running, Suspended } = DevboxInstanceStatus

function render(status: Nullable<DevboxInstanceStatus>, instanceId = 'i1') {
  const resume = vi.fn()
  const hook = renderHook(
    (props: { instanceId: string; status: Nullable<DevboxInstanceStatus> }) =>
      useResumeOnOpen({ ...props, resume }),
    { initialProps: { instanceId, status } }
  )
  return { resume, rerender: hook.rerender }
}

describe('useResumeOnOpen', () => {
  it('resumes an instance that was suspended when opened, once', () => {
    const { resume, rerender } = render(undefined)
    expect(resume).not.toHaveBeenCalled()
    rerender({ instanceId: 'i1', status: Suspended })
    rerender({ instanceId: 'i1', status: Running })
    rerender({ instanceId: 'i1', status: Suspended })
    expect(resume).toHaveBeenCalledTimes(1)
  })

  it('leaves an instance suspended while open suspended', () => {
    const { resume, rerender } = render(Running)
    rerender({ instanceId: 'i1', status: Suspended })
    expect(resume).not.toHaveBeenCalled()
  })

  it('judges each instance opened', () => {
    const { resume, rerender } = render(Running)
    rerender({ instanceId: 'i2', status: Suspended })
    expect(resume).toHaveBeenCalledTimes(1)
  })
})
