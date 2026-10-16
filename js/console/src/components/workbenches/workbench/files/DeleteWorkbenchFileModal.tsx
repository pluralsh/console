import { Confirm } from 'components/utils/Confirm'
import {
  useDeleteWorkbenchFileMutation,
  WorkbenchFileKind,
} from 'generated/graphql'
import { toWorkbenchPath } from './workbenchFilePaths'

export type WorkbenchFileToDelete = {
  path: string
  name: string
  kind: WorkbenchFileKind
  sandboxPath?: Nullable<string>
}

export function DeleteWorkbenchFileModal({
  workbenchId,
  file,
  onClose,
  onDeleted,
}: {
  workbenchId: string
  file: Nullable<WorkbenchFileToDelete>
  onClose: () => void
  onDeleted: (path: string) => void
}) {
  const isDirectory = file?.kind === WorkbenchFileKind.Directory
  const [mutation, { loading, error, reset }] = useDeleteWorkbenchFileMutation({
    refetchQueries: ['WorkbenchFiles'],
    awaitRefetchQueries: true,
    onCompleted: () => {
      if (file) onDeleted(toWorkbenchPath(file.path))
      close()
    },
  })

  const close = () => {
    reset()
    onClose()
  }

  return (
    <Confirm
      open={!!file}
      close={close}
      destructive
      loading={loading}
      error={error}
      label="Delete"
      title={`Delete ${isDirectory ? 'directory' : 'file'}`}
      text={
        file &&
        (isDirectory
          ? `Delete ${file.sandboxPath ?? file.path} and everything in it? Agents in this workbench will no longer be able to read these files.`
          : `Delete ${file.sandboxPath ?? file.path}? Agents in this workbench will no longer be able to read it.`)
      }
      submit={() =>
        file && mutation({ variables: { workbenchId, path: file.path } })
      }
    />
  )
}
