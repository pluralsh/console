import { Code, Flex } from '@pluralsh/design-system'
import { CaptionP } from 'components/utils/typography/Text'
import {
  useWorkbenchExecStreamSubscription,
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
} from 'generated/graphql'
import { ReactNode, useMemo, useState } from 'react'
import { combineExecChunks, ExecChunkMap } from './workbenchJobExecUtils'

export function WorkbenchJobExecDetails({
  activity,
  enabled,
}: {
  activity: Pick<WorkbenchJobActivityFragment, 'id' | 'status' | 'result'>
  enabled: boolean
}) {
  const [stream, setStream] = useState<{
    activityId: string
    chunks: ExecChunkMap
  }>({ activityId: '', chunks: {} })
  const exec = activity.result?.kubeExec
  const isRunning = activity.status === WorkbenchJobActivityStatus.Running
  const shouldStream = enabled && isRunning

  useWorkbenchExecStreamSubscription({
    variables: { activityId: activity.id },
    skip: !shouldStream,
    ignoreResults: true,
    onData: ({ data: { data } }) => {
      const stream = data?.workbenchExecStream
      if (typeof stream?.seq !== 'number' || stream.text == null) return
      const { seq, text } = stream

      setStream((previous) => ({
        activityId: activity.id,
        chunks: {
          ...(previous.activityId === activity.id ? previous.chunks : {}),
          [seq]: text,
        },
      }))
    },
  })

  const stdout = useMemo(
    () => combineExecChunks(stream.chunks),
    [stream.chunks]
  )
  const output = activity.result?.output?.trim()
  const completedOutput =
    output &&
    output !== 'waiting for user approval' &&
    output !== 'request pending user approval'
      ? activity.result?.output
      : null

  return (
    <>
      <ExecData label="COMMAND">
        <Code
          language="bash"
          showHeader={false}
        >
          {exec?.command ?? ''}
        </Code>
      </ExecData>
      <ExecData label="TARGET">
        <Flex
          gap="xsmall"
          wrap="wrap"
        >
          <Target
            label="Cluster"
            value={exec?.handle}
          />
          <Target
            label="Namespace"
            value={exec?.namespace}
          />
          <Target
            label="Pod"
            value={exec?.pod}
          />
          <Target
            label="Container"
            value={exec?.container}
          />
        </Flex>
      </ExecData>
      {isRunning && (
        <ExecData label="STDOUT">
          <Code
            language="bash"
            showHeader={false}
            css={{ maxHeight: 360, overflow: 'auto' }}
          >
            {stdout}
          </Code>
        </ExecData>
      )}
      {!isRunning && completedOutput && (
        <ExecData label="RESULT">
          <Code
            language="bash"
            showHeader={false}
            css={{ maxHeight: 360, overflow: 'auto' }}
          >
            {completedOutput}
          </Code>
        </ExecData>
      )}
    </>
  )
}

function ExecData({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Flex
      direction="column"
      gap="xxsmall"
    >
      <CaptionP $color="text-xlight">{label}</CaptionP>
      {children}
    </Flex>
  )
}

function Target({ label, value }: { label: string; value: Nullable<string> }) {
  if (!value) return null

  return (
    <CaptionP $color="text-light">
      <strong>{label}:</strong> {value}
    </CaptionP>
  )
}
