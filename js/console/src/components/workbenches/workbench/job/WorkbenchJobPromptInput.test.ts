import { AiProvider, WorkbenchJobModelAttributes } from 'generated/graphql'
import { describe, expect, it } from 'vitest'
import { selectedModelForJob } from './WorkbenchJobPromptInput'

const globalDefault: WorkbenchJobModelAttributes = {
  provider: AiProvider.Openai,
  model: 'gpt-global',
}
const jobModel: WorkbenchJobModelAttributes = {
  provider: AiProvider.Openai,
  model: 'gpt-job',
}

describe('selectedModelForJob', () => {
  it('uses the job model before the user makes a selection', () => {
    expect(
      selectedModelForJob('job-2', jobModel, {
        jobId: 'job-1',
        model: globalDefault,
      })
    ).toEqual(jobModel)
  })

  it('uses the selection made for the current job', () => {
    expect(
      selectedModelForJob('job-1', jobModel, {
        jobId: 'job-1',
        model: globalDefault,
      })
    ).toEqual(globalDefault)
  })

  it('preserves an explicit return to the global default', () => {
    expect(
      selectedModelForJob('job-1', jobModel, {
        jobId: 'job-1',
        model: null,
      })
    ).toBeNull()
  })
})
