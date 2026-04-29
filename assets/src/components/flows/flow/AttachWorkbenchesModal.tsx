import {
  Button,
  Card,
  Flex,
  InfoOutlineIcon,
  Input2,
  Modal,
  SearchIcon,
  Tooltip,
} from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import { runtimeToIcon } from 'components/settings/ai/agent-runtimes/AIAgentRuntimeIcon'
import { GqlError } from 'components/utils/Alert'
import { MetadataIcons } from 'components/utils/MetadataIcons'
import { StackedText } from 'components/utils/table/StackedText'
import { TRUNCATE_LEFT } from 'components/utils/truncate'
import { WorkbenchToolIcon } from 'components/workbenches/tools/workbenchToolsUtils'
import { getWebhookIcon } from 'components/workbenches/workbench/webhooks/utils'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  AgentRuntimeType,
  useUpsertFlowMutation,
  useWorkbenchesQuery,
  WorkbenchTinyFragment,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import {
  ComponentPropsWithoutRef,
  cloneElement,
  isValidElement,
  ReactElement,
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
      css={{ maxWidth: 800, width: 800 }}
      onOpenAutoFocus={(e) => e.preventDefault()}
      actions={
        <Flex
          flex={1}
          justifyContent="space-between"
          gap="small"
        >
          <Button
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
        </Flex>
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
            <AttachedWorkbench
              key={workbench.id}
              workbench={workbench}
              onRemove={removeWorkbench}
            />
          ))}
        </ModalSection>
        <ModalSection
          title="Available"
          headerAddon={
            <Tooltip
              label="You can use workbenches matching your permissions tier on this flow. Contact your admin for access."
              css={{ width: 300 }}
            >
              <InfoOutlineIcon
                color="icon-xlight"
                size={12}
              />
            </Tooltip>
          }
          emptyMessage={
            loading
              ? 'Loading workbenches...'
              : 'No available workbenches match your search.'
          }
        >
          {available.map((workbench) => (
            <AvailableWorkbench
              key={workbench.id}
              workbench={workbench}
              onAdd={addWorkbench}
            />
          ))}
        </ModalSection>
      </Flex>
    </Modal>
  )
}

function ModalSection({
  title,
  headerAddon,
  emptyMessage,
  children,
}: {
  title: string
  headerAddon?: ReactNode
  emptyMessage: string
  children: ReactNode
}) {
  const hasItems = !isEmpty(children)

  return (
    <Flex
      direction="column"
      gap="small"
    >
      <Flex
        align="center"
        gap="xsmall"
      >
        <Body2BoldP $color="text">{title}</Body2BoldP>
        {headerAddon}
      </Flex>
      {hasItems ? (
        children
      ) : (
        <CaptionP $color="text-xlight">{emptyMessage}</CaptionP>
      )}
    </Flex>
  )
}

function AttachedWorkbench({
  workbench,
  onRemove,
}: {
  workbench: WorkbenchTinyFragment
  onRemove: (workbenchId: string) => void
}) {
  const tools = workbench.tools?.filter(isNonNullable) ?? []

  return (
    <AttachedWorkbenchCardSC>
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
        <MetadataIcons
          items={tools.map((tool) => ({
            id: tool.id,
            label: tool.name,
            icon: (
              <WorkbenchToolIcon
                type={tool.tool}
                provider={tool.cloudConnection?.provider}
                size={16}
              />
            ),
          }))}
        />
      )}
      <Button
        destructive
        small
        onClick={() => onRemove(workbench.id)}
      >
        Remove
      </Button>
    </AttachedWorkbenchCardSC>
  )
}

function AvailableWorkbench({
  workbench,
  onAdd,
}: {
  workbench: WorkbenchTinyFragment
  onAdd: (workbench: WorkbenchTinyFragment) => void
}) {
  const RuntimeIcon =
    runtimeToIcon[workbench.agentRuntime?.type ?? AgentRuntimeType.Custom]
  const tools = workbench.tools?.filter(isNonNullable) ?? []
  const webhooks = mapExistingNodes(workbench.webhooks)
  const hasCodingAgent = Boolean(workbench.agentRuntime?.name)
  const hasWebhooks = webhooks.length > 0
  const hasTools = tools.length > 0
  const hasAnyMetadata = hasCodingAgent || hasWebhooks || hasTools

  return (
    <AvailableWorkbenchCardSC>
      <Flex
        direction="column"
        gap="small"
        minWidth={0}
      >
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

        {hasAnyMetadata && (
          <MetadataGridSC>
            {hasCodingAgent && (
              <>
                <MetadataLabelSC>coding agent</MetadataLabelSC>
                <MetadataValueSC>
                  <Flex
                    align="center"
                    gap="xxsmall"
                    minWidth={0}
                  >
                    <RuntimeIcon
                      fullColor
                      size={12}
                    />
                    <CaptionP
                      $color="text-xlight"
                      css={{ ...TRUNCATE_LEFT, minWidth: 0 }}
                    >
                      {workbench.agentRuntime?.name}
                    </CaptionP>
                  </Flex>
                </MetadataValueSC>
              </>
            )}
            {hasWebhooks && (
              <>
                <MetadataLabelSC>webhooks</MetadataLabelSC>
                <MetadataValueSC>
                  <MetadataIcons
                    items={webhooks.map((webhook) => ({
                      id: webhook.id,
                      label: webhook.name ?? 'Webhook',
                      icon: withIconSize(getWebhookIcon(webhook), 12),
                    }))}
                  />
                </MetadataValueSC>
              </>
            )}
            {hasTools && (
              <>
                <MetadataLabelSC>bound tools</MetadataLabelSC>
                <MetadataValueSC>
                  <MetadataIcons
                    items={tools.map((tool) => ({
                      id: tool.id,
                      label: tool.name,
                      icon: (
                        <WorkbenchToolIcon
                          type={tool.tool}
                          provider={tool.cloudConnection?.provider}
                          size={12}
                        />
                      ),
                    }))}
                  />
                </MetadataValueSC>
              </>
            )}
          </MetadataGridSC>
        )}
      </Flex>
      <Button
        secondary
        small
        onClick={() => onAdd(workbench)}
      >
        Add
      </Button>
    </AvailableWorkbenchCardSC>
  )
}

function withIconSize(icon: ReactNode, size: number) {
  if (!isValidElement(icon)) return icon

  return cloneElement(icon as ReactElement<{ size?: number }>, { size })
}

const AttachedWorkbenchCardSC = styled(Card)(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.medium,
  justifyContent: 'space-between',
  padding: theme.spacing.medium,
}))

const AvailableWorkbenchCardSC = styled(Card)(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  gap: theme.spacing.medium,
  justifyContent: 'space-between',
  padding: theme.spacing.medium,
}))

const MetadataGridSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'auto 1fr',
  columnGap: theme.spacing.small,
  rowGap: theme.spacing.xxsmall,
  alignItems: 'center',
  minWidth: 0,
  width: '100%',
}))

const MetadataLabelSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-input-disabled'],
}))

const MetadataValueSC = styled.div({
  minWidth: 0,
})
