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
import styled, { useTheme } from 'styled-components'
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
        <Flex
          direction="column"
          gap="small"
        >
          <Body2BoldP $color="text">Attached</Body2BoldP>
          {!isEmpty(attached) ? (
            attached.map((workbench) => (
              <AttachedWorkbench
                key={workbench.id}
                workbench={workbench}
                onRemove={removeWorkbench}
              />
            ))
          ) : (
            <CaptionP $color="text-xlight">No workbenches attached.</CaptionP>
          )}
        </Flex>
        <Flex
          direction="column"
          gap="small"
        >
          <Flex
            align="center"
            gap="xsmall"
          >
            <Body2BoldP $color="text">Available</Body2BoldP>
            <Tooltip
              label="You can use workbenches matching your permissions tier on this flow. Contact your admin for access."
              css={{ width: 300 }}
            >
              <InfoOutlineIcon
                color="icon-xlight"
                size={12}
              />
            </Tooltip>
          </Flex>
          {!isEmpty(available) ? (
            available.map((workbench) => (
              <AvailableWorkbench
                key={workbench.id}
                workbench={workbench}
                onAdd={addWorkbench}
              />
            ))
          ) : (
            <CaptionP $color="text-xlight">
              {loading
                ? 'Loading workbenches...'
                : 'No available workbenches match your search.'}
            </CaptionP>
          )}
        </Flex>
      </Flex>
    </Modal>
  )
}

function AttachedWorkbench({
  workbench,
  onRemove,
}: {
  workbench: WorkbenchTinyFragment
  onRemove: (workbenchId: string) => void
}) {
  const theme = useTheme()
  const tools = workbench.tools?.filter(isNonNullable) ?? []

  return (
    <Card
      css={{
        alignItems: 'center',
        display: 'flex',
        gap: theme.spacing.medium,
        justifyContent: 'space-between',
        padding: theme.spacing.medium,
      }}
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
    </Card>
  )
}

function AvailableWorkbench({
  workbench,
  onAdd,
}: {
  workbench: WorkbenchTinyFragment
  onAdd: (workbench: WorkbenchTinyFragment) => void
}) {
  const theme = useTheme()
  const RuntimeIcon =
    runtimeToIcon[workbench.agentRuntime?.type ?? AgentRuntimeType.Custom]
  const tools = workbench.tools?.filter(isNonNullable) ?? []
  const webhooks = mapExistingNodes(workbench.webhooks)
  const hasCodingAgent = Boolean(workbench.agentRuntime?.name)
  const hasWebhooks = webhooks.length > 0
  const hasTools = tools.length > 0
  const hasAnyMetadata = hasCodingAgent || hasWebhooks || hasTools

  return (
    <Card
      css={{
        alignItems: 'center',
        display: 'flex',
        gap: theme.spacing.medium,
        justifyContent: 'space-between',
        padding: theme.spacing.medium,
      }}
    >
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
          <div
            css={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              columnGap: theme.spacing.small,
              rowGap: theme.spacing.xxsmall,
              alignItems: 'center',
              minWidth: 0,
              width: '100%',
            }}
          >
            {hasCodingAgent && (
              <>
                <MetadataLabelSC>coding agent</MetadataLabelSC>
                <div css={{ minWidth: 0 }}>
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
                </div>
              </>
            )}
            {hasWebhooks && (
              <>
                <MetadataLabelSC>webhooks</MetadataLabelSC>
                <div css={{ minWidth: 0 }}>
                  <MetadataIcons
                    items={webhooks.map((webhook) => ({
                      id: webhook.id,
                      label: webhook.name ?? 'Webhook',
                      icon: withIconSize(getWebhookIcon(webhook), 12),
                    }))}
                  />
                </div>
              </>
            )}
            {hasTools && (
              <>
                <MetadataLabelSC>bound tools</MetadataLabelSC>
                <div css={{ minWidth: 0 }}>
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
                </div>
              </>
            )}
          </div>
        )}
      </Flex>
      <Button
        secondary
        small
        onClick={() => onAdd(workbench)}
      >
        Add
      </Button>
    </Card>
  )
}

function withIconSize(icon: ReactNode, size: number) {
  if (!isValidElement(icon)) return icon

  return cloneElement(icon as ReactElement<{ size?: number }>, { size })
}

const MetadataLabelSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-input-disabled'],
}))
