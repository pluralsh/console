import {
  Button,
  Card,
  Chip,
  CloseIcon,
  Flex,
  FormField,
  IconFrame,
  ListBoxItem,
  Modal,
  Select,
  SelectButton,
} from '@pluralsh/design-system'
import { CardGrid } from 'components/self-service/catalog/CatalogsGrid'
import { GqlError } from 'components/utils/Alert'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StackedText } from 'components/utils/table/StackedText'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  useUpdateWorkbenchMutation,
  useWorkbenchToolsQuery,
  WorkbenchQuery,
} from 'generated/graphql'
import { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import {
  getWorkbenchToolLabel,
  WorkbenchToolCardBody,
  workbenchToolCardGridStyles,
  WorkbenchToolIcon,
} from '../tools/workbenchToolsUtils'

const ModalActionsRowSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  justifyContent: 'space-between',
  width: '100%',
  gap: theme.spacing.medium,
}))

const ModalContentSC = styled(Flex)(() => ({
  minHeight: 0,
  maxHeight: 'min(70vh, 760px)',
  overflow: 'hidden',
}))

const CardsScrollAreaSC = styled.div(({ theme }) => ({
  minHeight: 0,
  overflowY: 'auto',
  paddingRight: theme.spacing.xxsmall,
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
  const configuredToolsById = useMemo(
    () => new Map(configuredTools.map((tool) => [tool.id, tool])),
    [configuredTools]
  )
  const selectedTools = useMemo(
    () =>
      selectedToolIds
        .map((toolId) => configuredToolsById.get(toolId))
        .filter(isNonNullable),
    [configuredToolsById, selectedToolIds]
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
          content: `${workbench?.name ?? 'workbench tools'} updated`,
          severity: 'success',
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

  const handleDeselectTool = (toolId: string) => {
    setSelectedToolIds((ids) => ids.filter((id) => id !== toolId))
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
        <ModalContentSC
          direction="column"
          gap="medium"
        >
          <FormField label="Add tools">
            <Select
              label="Add tools"
              triggerButton={
                <SelectButton>
                  <Flex
                    align="center"
                    gap="xsmall"
                  >
                    <Chip
                      fillLevel={3}
                      size="small"
                    >
                      {selectedToolIds.length}
                    </Chip>
                    <span>Tools selected</span>
                  </Flex>
                </SelectButton>
              }
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
                      icon={
                        <WorkbenchToolIcon
                          type={tool.tool}
                          provider={tool.cloudConnection?.provider}
                        />
                      }
                      size="xsmall"
                    />
                  }
                />
              ))}
            </Select>
          </FormField>
          {selectedTools.length > 0 && (
            <CardsScrollAreaSC>
              <CardGrid
                styles={{
                  ...workbenchToolCardGridStyles(320),
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                }}
              >
                {selectedTools.map(
                  ({ id, name, tool: type, cloudConnection }) => (
                    <Card key={id}>
                      <WorkbenchToolCardBody>
                        <Flex
                          align="center"
                          justify="space-between"
                          width="100%"
                          gap="small"
                        >
                          <Flex
                            align="center"
                            gap="small"
                            css={{ minWidth: 0, flex: 1 }}
                          >
                            <IconFrame
                              circle
                              type="secondary"
                              icon={
                                <WorkbenchToolIcon
                                  size={20}
                                  type={type}
                                  provider={cloudConnection?.provider}
                                />
                              }
                            />
                            <StackedText
                              truncate
                              first={name}
                              firstPartialType="body2Bold"
                              firstColor="text"
                              second={getWorkbenchToolLabel(
                                type,
                                cloudConnection?.provider
                              )}
                              css={{ minWidth: 0, flex: 1, width: 0 }}
                            />
                          </Flex>
                          <IconFrame
                            circle
                            clickable
                            icon={<CloseIcon />}
                            tooltip="Remove from selection"
                            onClick={() => handleDeselectTool(id)}
                          />
                        </Flex>
                      </WorkbenchToolCardBody>
                    </Card>
                  )
                )}
              </CardGrid>
            </CardsScrollAreaSC>
          )}
        </ModalContentSC>
      )}
    </Modal>
  )
}
