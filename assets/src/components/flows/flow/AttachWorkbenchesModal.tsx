import {
  Button,
  Card,
  Flex,
  Input2,
  Modal,
  SearchIcon,
} from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import { GqlError } from 'components/utils/Alert'
import { StackedText } from 'components/utils/table/StackedText'
import { WorkbenchToolsMetadataIcons } from 'components/workbenches/tools/WorkbenchToolsMetadataIcons'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  useUpsertFlowMutation,
  useWorkbenchesQuery,
  WorkbenchTinyFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import {
  ComponentPropsWithoutRef,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'

export function AttachWorkbenchesModal({
  flowName,
  attachedWorkbenches,
  onUpdated,
  open,
  onClose,
}: {
  flowName: string
  attachedWorkbenches: WorkbenchTinyFragment[]
  onUpdated: () => void
} & ComponentPropsWithoutRef<typeof Modal>) {
  const [query, setQuery] = useState('')
  const [selectedWorkbenches, setSelectedWorkbenches] = useState<
    Map<string, WorkbenchTinyFragment>
  >(new Map())
  const debouncedQuery = useDebounce(query, 200)

  const { data, loading, error } = useWorkbenchesQuery({
    variables: { q: debouncedQuery },
    fetchPolicy: 'cache-and-network',
  })

  const [upsertFlow, { loading: mutationLoading, error: mutationError }] =
    useUpsertFlowMutation({
      awaitRefetchQueries: true,
      refetchQueries: ['FlowWorkbenches'],
      onCompleted: () => {
        onUpdated()
        onClose?.()
      },
    })

  useEffect(() => {
    if (!open) return

    setSelectedWorkbenches(
      new Map(attachedWorkbenches.map((workbench) => [workbench.id, workbench]))
    )
  }, [attachedWorkbenches, open])

  const allWorkbenches = useMemo(
    () => mapExistingNodes(data?.workbenches),
    [data]
  )

  const attached = useMemo(
    () => [...selectedWorkbenches.values()],
    [selectedWorkbenches]
  )

  const available = useMemo(
    () => allWorkbenches.filter(({ id }) => !selectedWorkbenches.has(id)),
    [allWorkbenches, selectedWorkbenches]
  )

  const addWorkbench = (workbench: WorkbenchTinyFragment) =>
    setSelectedWorkbenches((workbenches) =>
      new Map(workbenches).set(workbench.id, workbench)
    )

  const removeWorkbench = (workbenchId: string) =>
    setSelectedWorkbenches((workbenches) => {
      const next = new Map(workbenches)
      next.delete(workbenchId)
      return next
    })

  const save = () =>
    upsertFlow({
      variables: {
        attributes: {
          name: flowName,
          flowWorkbenches: [...selectedWorkbenches.keys()].map(
            (workbenchId) => ({ workbenchId })
          ),
        },
      },
    })

  return (
    <Modal
      open={open}
      onClose={onClose}
      header="Attach workbench to flow"
      size="custom"
      css={{ maxWidth: 800 }}
      onOpenAutoFocus={(e) => e.preventDefault()}
      actions={
        <>
          <Button
            secondary
            destructive
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            loading={mutationLoading}
            onClick={save}
          >
            Save
          </Button>
        </>
      }
    >
      <Flex
        direction="column"
        gap="large"
      >
        {error && <GqlError error={error} />}
        {mutationError && <GqlError error={mutationError} />}
        <Input2
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          startIcon={<SearchIcon />}
          placeholder="Search for available workbenches"
        />
        <ModalSection
          title="Attached"
          emptyMessage="No workbenches attached."
        >
          {attached.map((workbench) => (
            <WorkbenchModalRow
              key={workbench.id}
              workbench={workbench}
              action={
                <Button
                  destructive
                  small
                  onClick={() => removeWorkbench(workbench.id)}
                >
                  Remove
                </Button>
              }
            />
          ))}
        </ModalSection>
        <ModalSection
          title="Available"
          emptyMessage={
            loading
              ? 'Loading workbenches...'
              : 'No available workbenches match your search.'
          }
        >
          {available.map((workbench) => (
            <WorkbenchModalRow
              key={workbench.id}
              workbench={workbench}
              action={
                <Button
                  secondary
                  small
                  onClick={() => addWorkbench(workbench)}
                >
                  Add
                </Button>
              }
            />
          ))}
        </ModalSection>
      </Flex>
    </Modal>
  )
}

function ModalSection({
  title,
  emptyMessage,
  children,
}: {
  title: string
  emptyMessage: string
  children: ReactNode
}) {
  const hasItems = !isEmpty(children)

  return (
    <Flex
      direction="column"
      gap="small"
    >
      <Body2BoldP $color="text">{title}</Body2BoldP>
      {hasItems ? (
        children
      ) : (
        <CaptionP $color="text-xlight">{emptyMessage}</CaptionP>
      )}
    </Flex>
  )
}

function WorkbenchModalRow({
  workbench,
  action,
}: {
  workbench: WorkbenchTinyFragment
  action: ReactNode
}) {
  const tools = workbench.tools?.filter(isNonNullable) ?? []

  return (
    <WorkbenchCardSC>
      <StackedText
        first={workbench.name}
        second={workbench.description}
        truncate
        firstPartialType="body2Bold"
        firstColor="text"
        secondPartialType="caption"
        secondColor="text-xlight"
        css={{ flex: 1, minWidth: 0 }}
      />
      {!!tools.length && (
        <WorkbenchToolsMetadataIcons
          iconSize={16}
          tools={tools}
        />
      )}
      {action}
    </WorkbenchCardSC>
  )
}

const WorkbenchCardSC = styled(Card)(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.medium,
  justifyContent: 'space-between',
  padding: theme.spacing.medium,
}))
