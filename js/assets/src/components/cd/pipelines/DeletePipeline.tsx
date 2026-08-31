import { useTheme } from 'styled-components'

import { removeConnection, updateCache } from 'utils/graphql'

import { Confirm } from '../../utils/Confirm'
import {
  PipelineFragment,
  PipelinesDocument,
  useDeletePipelineMutation,
} from '../../../generated/graphql'

export function DeletePipelineModal({
  pipeline,
  open,
  onClose,
}: {
  pipeline: Pick<PipelineFragment, 'id' | 'name'>
  open: boolean
  onClose: Nullable<() => void>
}) {
  const theme = useTheme()
  const [mutation, { loading, error }] = useDeletePipelineMutation({
    variables: { id: pipeline.id },
    onCompleted: () => {
      onClose?.()
    },
    update: (cache, { data }) =>
      updateCache(cache, {
        query: PipelinesDocument,
        variables: {},
        update: (prev) =>
          removeConnection(prev, data?.deletePipeline, 'pipelines'),
      }),
  })

  return (
    <Confirm
      open={open}
      close={onClose}
      destructive
      label="Delete"
      loading={loading}
      error={error}
      submit={() => mutation()}
      title={`Delete pipeline – ${pipeline.name}`}
      text={
        <>
          Are you sure you want to delete the{' '}
          <span css={{ color: theme.colors['text-danger'] }}>
            “{pipeline.name}”{' '}
          </span>
          pipeline?
        </>
      }
    />
  )
}
