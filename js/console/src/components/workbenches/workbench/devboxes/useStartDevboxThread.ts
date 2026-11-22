import {
  DevboxAgentType,
  DevboxInstanceFragment,
  useCreateDevboxThreadMutation,
  usePromptDevboxThreadMutation,
} from 'generated/graphql'
import { useCallback } from 'react'

export type DevboxSessionStart = {
  agent: DevboxAgentType
  model?: Nullable<string>
  configOptions?: Record<string, Nullable<string>>
  text?: string
  files?: File[]
}

// starts a thread, then sends the first prompt with its attachments, which
// thread creation can't carry; resolves to the new thread's id
export function useStartDevboxThread(
  instance: Nullable<DevboxInstanceFragment>
) {
  const [create, createState] = useCreateDevboxThreadMutation()
  const [prompt, promptState] = usePromptDevboxThreadMutation()
  const instanceId = instance?.id

  const start = useCallback(
    async ({
      agent,
      model,
      configOptions = {},
      text = '',
      files = [],
    }: DevboxSessionStart) => {
      if (!instanceId) return null
      const options = Object.entries(configOptions)
        .filter((e): e is [string, string] => !!e[1])
        .map(([configId, value]) => ({ configId, value }))
      const { data } = await create({
        variables: {
          instanceId,
          attributes: {
            agent,
            ...(model ? { model } : {}),
            ...(options.length ? { configOptions: options } : {}),
          },
        },
        // the view resolves the selected thread from the instance's threads
        refetchQueries: ['DevboxInstance'],
        awaitRefetchQueries: true,
      })
      const id = data?.createDevboxThread?.id
      if (!id) return null
      if (text || files.length)
        await prompt({
          variables: {
            id,
            prompt: text || null,
            ...(files.length ? { attachments: files } : {}),
          },
        })
      return id
    },
    [create, instanceId, prompt]
  )

  return {
    start,
    loading: createState.loading || promptState.loading,
    error: createState.error ?? promptState.error,
  }
}
