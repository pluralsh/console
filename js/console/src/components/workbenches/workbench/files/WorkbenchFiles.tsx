import { EmptyState, FileIcon, Flex } from '@pluralsh/design-system'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { WorkbenchFileFragment } from 'generated/graphql'
import { useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { WORKBENCH_FILES_PATH_QUERY_PARAM } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { WorkbenchOutletContext, WorkbenchPageLayout } from '../Workbench'
import {
  WORKBENCH_FILES_HEADER_HEIGHT,
  WorkbenchFileTree,
} from './WorkbenchFileTree'
import { WorkbenchFileViewer } from './WorkbenchFileViewer'
import { DeleteWorkbenchFileModal } from './DeleteWorkbenchFileModal'
import { toWorkbenchPath } from './workbenchFilePaths'

export function WorkbenchFiles() {
  const { workbenchId, workbench, isLoading } =
    useOutletContext<WorkbenchOutletContext>()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawPath = searchParams.get(WORKBENCH_FILES_PATH_QUERY_PARAM)
  const selectedPath = rawPath ? toWorkbenchPath(rawPath) : null
  const [toDelete, setToDelete] = useState<Nullable<WorkbenchFileFragment>>()

  const select = (path: Nullable<string>) =>
    setSearchParams(
      (params) => {
        if (path) params.set(WORKBENCH_FILES_PATH_QUERY_PARAM, path)
        else params.delete(WORKBENCH_FILES_PATH_QUERY_PARAM)
        return params
      },
      { replace: true }
    )

  // deselect the deleted file, or any file beneath a deleted directory
  const onDeleted = (path: string) => {
    if (selectedPath === path || selectedPath?.startsWith(`${path}/`))
      select(null)
  }

  if (!isLoading && workbench && !workbench.filesystemEnabled)
    return (
      <WorkbenchPageLayout>
        <CenteredSC>
          <EmptyState
            icon={<FileIcon size={40} />}
            message="Filesystem isn't enabled"
            description="Configure an object store for the console to give workbenches a shared filesystem."
          />
        </CenteredSC>
      </WorkbenchPageLayout>
    )

  return (
    <WorkbenchPageLayout
      showEditWorkbenchButton={false}
      tabStripHeight={WORKBENCH_FILES_HEADER_HEIGHT}
      sidebar={{
        kind: 'custom',
        content: (
          <WorkbenchFileTree
            workbenchId={workbenchId}
            selectedPath={selectedPath}
            onSelect={select}
            onDelete={setToDelete}
          />
        ),
      }}
    >
      {isLoading ? (
        <RectangleSkeleton
          $height="100%"
          $width="100%"
        />
      ) : selectedPath ? (
        <WorkbenchFileViewer
          key={selectedPath}
          workbenchId={workbenchId}
          path={selectedPath}
          onDelete={setToDelete}
        />
      ) : (
        <CenteredSC>
          <EmptyState
            icon={<FileIcon size={40} />}
            message="Select a file to view it"
            description="Files written by agents and attached to prompts are stored here."
          />
        </CenteredSC>
      )}
      <DeleteWorkbenchFileModal
        workbenchId={workbenchId}
        file={toDelete}
        onClose={() => setToDelete(null)}
        onDeleted={onDeleted}
      />
    </WorkbenchPageLayout>
  )
}

const CenteredSC = styled(Flex)({
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 0,
})
