import {
  Button,
  CloseIcon,
  Flex,
  FormField,
  IconFrame,
  ListBoxItem,
  Modal,
  Select,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  useWorkbenchToolsQuery,
  useUpdateWorkbenchMutation,
  WorkbenchQuery,
} from 'generated/graphql'
import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { WorkbenchToolIcon } from '../tools/workbenchToolsUtils'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { isNonNullable } from 'utils/isNonNullable'

const ModalActionsRowSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%',
  gap: theme.spacing.medium,
}))

export function WorkbenchToolsEditModal({
  workbench,
  open,
  onClose,
}: {
  workbench: Nullable<WorkbenchQuery['workbench']>
  open: boolean
  onClose: () => void
}) {
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([])
  const { popToast } = useSimpleToast()

  const {
    data: toolsData,
    error: toolsError,
    loading: toolsLoading,
  } = useFetchPaginatedData({
    queryHook: useWorkbenchToolsQuery,
    keyPath: ['workbenchTools'],
    skip: !open,
  })

  const configuredTools = useMemo(
    () => mapExistingNodes(toolsData?.workbenchTools),
    [toolsData]
  )

  const associatedToolIds = useMemo(
    () => (workbench?.tools ?? []).filter(isNonNullable).map((tool) => tool.id),
    [workbench?.tools]
  )

  const canSave = useMemo(() => {
    if (associatedToolIds.length !== selectedToolIds.length) return true

    const selectedToolIdsSet = new Set(selectedToolIds)
    return !associatedToolIds.every((id) => selectedToolIdsSet.has(id))
  }, [associatedToolIds, selectedToolIds])

  useEffect(() => {
    if (open) setSelectedToolIds(associatedToolIds)
  }, [associatedToolIds, open])

  const [updateWorkbench, { loading: saveLoading, error: saveError }] =
    useUpdateWorkbenchMutation({
      refetchQueries: ['WorkbenchTriggersSummary', 'Workbench'],
      awaitRefetchQueries: true,
      onCompleted: () => {
        popToast({
          name: workbench?.name ?? 'workbench tools',
          action: 'updated',
          color: 'icon-success',
        })
        onClose()
      },
    })

  const handleSave = () => {
    if (!canSave || !workbench?.name || !workbench?.id) return

    updateWorkbench({
      variables: {
        id: workbench?.id,
        attributes: {
          name: workbench?.name,
          toolAssociations: selectedToolIds.map((toolId) => ({ toolId })),
        },
      },
    })
  }

  return (
    <Modal
      open={open}
      size="large"
      onClose={onClose}
      header={
        <Flex
          align="center"
          justify="space-between"
          width="100%"
        >
          <span>Add or remove tool from workbench</span>
          <IconFrame
            clickable
            size="small"
            icon={<CloseIcon size={12} />}
            tooltip="Close"
            onClick={onClose}
          />
        </Flex>
      }
      actions={
        <ModalActionsRowSC>
          <Button
            destructive
            type="button"
            onClick={onClose}
            disabled={saveLoading}
          >
            Cancel
          </Button>
          <Button
            primary
            type="button"
            onClick={handleSave}
            loading={saveLoading}
            disabled={!canSave}
          >
            Save
          </Button>
        </ModalActionsRowSC>
      }
    >
      {toolsError || saveError ? (
        <GqlError error={toolsError ?? saveError} />
      ) : (
        <FormField label="Add tools">
          <Select
            label="Add tools"
            selectionMode="multiple"
            selectedKeys={selectedToolIds}
            onSelectionChange={(keys) =>
              setSelectedToolIds(Array.from(keys).map(String))
            }
            isDisabled={toolsLoading}
          >
            {configuredTools.map((tool) => (
              <ListBoxItem
                key={tool.id}
                label={tool.name}
                leftContent={
                  <IconFrame
                    icon={<WorkbenchToolIcon type={tool.tool} />}
                    size="xsmall"
                  />
                }
              />
            ))}
          </Select>
        </FormField>
      )}
    </Modal>
  )
}
