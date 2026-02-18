import {
  CaretDownIcon,
  Chip,
  Divider,
  Input2,
  ListBoxItem,
  LogsIcon,
  Select,
  SelectPropsSingle,
  Toast,
  isValidRepoUrl,
  prettifyRepoUrl,
} from '@pluralsh/design-system'
import { useThrottle } from 'components/hooks/useThrottle'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { TRUNCATE, TRUNCATE_LEFT } from 'components/utils/truncate'
import { CaptionP } from 'components/utils/typography/Text'
import {
  useAgentRunRepositoriesQuery,
  useAgentRuntimeReposSuspenseQuery,
} from 'generated/graphql'
import {
  ComponentPropsWithRef,
  Suspense,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import styled, { StyledObject, useTheme } from 'styled-components'
import Fuse from 'fuse.js'
import { sortDatesDesc } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'

export function AgentRunRepoSelector(
  props: ComponentPropsWithRef<typeof AgentRunRepoSelectorInner>
) {
  const { triggerButton } = props
  return (
    <Suspense
      fallback={
        triggerButton || (
          <BasicTriggerChipSC>
            <RectangleSkeleton $width={120} />
            <CaretDownIcon size={10} />
          </BasicTriggerChipSC>
        )
      }
    >
      <AgentRunRepoSelectorInner {...props} />
    </Suspense>
  )
}

function AgentRunRepoSelectorInner({
  selectedRepository,
  setSelectedRepository,
  outerStyles,
  defaultMostRecent = true,
  selectedRuntimeId,
  ...props
}: {
  selectedRepository: Nullable<string>
  setSelectedRepository: (repository: Nullable<string>) => void
  outerStyles?: StyledObject
  defaultMostRecent?: boolean
  selectedRuntimeId?: Nullable<string>
} & Omit<SelectPropsSingle, 'onSelectionChange' | 'selectedKey' | 'children'>) {
  const { colors, borders, spacing } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<Nullable<string>>(null)
  const [query, setQuery] = useState('')
  const debouncedQuery = useThrottle(query, 300)

  const { data: runtimeData } = useAgentRuntimeReposSuspenseQuery({
    variables: { id: selectedRuntimeId ?? '' },
    fetchPolicy: 'cache-and-network',
    skip: !selectedRuntimeId,
    errorPolicy: 'ignore',
  })
  const allowedRepos =
    runtimeData?.agentRuntime?.allowedRepositories?.filter(isNonNullable)

  const { data, loading, previousData } = useAgentRunRepositoriesQuery({
    variables: { q: debouncedQuery },
    fetchPolicy: 'cache-and-network',
    skip: !!runtimeData?.agentRuntime?.allowedRepositories,
  })
  const curData = data || previousData

  const repositories = useMemo(() => {
    if (allowedRepos)
      return query
        ? new Fuse(allowedRepos, { threshold: 0.25, ignoreLocation: true })
            .search(query)
            .map(({ item }) => item)
        : allowedRepos
    return mapExistingNodes(curData?.agentRunRepositories)
      .toSorted((a, b) => sortDatesDesc(a.lastUsedAt, b.lastUsedAt))
      .map(({ url }) => url)
  }, [allowedRepos, curData, query])

  const setRepositoryToMostRecent = useEffectEvent(() => {
    if (selectedRepository && query) return
    if (!repositories.includes(selectedRepository ?? 'null'))
      setSelectedRepository(repositories[0])
  })
  useLayoutEffect(() => {
    if (data && defaultMostRecent) setRepositoryToMostRecent() // data will be undefined if runtime repos is populated
  }, [data, defaultMostRecent])

  const isLoading = !curData && loading

  return (
    <div css={{ minWidth: 0, ...outerStyles }}>
      <Select
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        width={360}
        placement="left"
        leftContent={<LogsIcon />}
        selectedKey={selectedRepository}
        onSelectionChange={(key) =>
          setSelectedRepository(key ? `${key}` : null)
        }
        triggerButton={
          <BasicTriggerChipSC
            clickable
            size="large"
          >
            <CaptionP
              as="span"
              $color="text-xlight"
              css={{ ...TRUNCATE }}
            >
              {isLoading ? (
                <RectangleSkeleton $width={120} />
              ) : selectedRepository ? (
                prettifyRepoUrl(selectedRepository)
              ) : (
                'Select repository'
              )}
            </CaptionP>
            <CaretDownIcon
              size={10}
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease-in-out',
              }}
            />
          </BasicTriggerChipSC>
        }
        dropdownHeaderFixed={
          <div css={{ padding: spacing.xsmall }}>
            <Input2
              raised
              inputProps={{ ref: (node) => node?.focus() }}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              onEnter={() => {
                if (!query) return
                if (!isValidRepoUrl(query)) {
                  setToastMsg('Must be a valid git clone URL')
                  return
                }
                if (allowedRepos && !allowedRepos.includes(query)) {
                  setToastMsg('Repo must be from allowed list for this runtime')
                  return
                }
                setSelectedRepository(query)
                setIsOpen(false)
                setQuery('')
              }}
              placeholder={
                allowedRepos
                  ? 'Select from allowed repos'
                  : 'Enter full repo URL or select from recent'
              }
              showClearButton
              css={{
                border: 'none',
                '&:focus-within': {
                  border: borders['outline-focused'],
                  borderColor: toastMsg
                    ? colors['border-danger-light']
                    : undefined,
                },
              }}
            />
            <Divider backgroundColor={colors['border-input']} />
          </div>
        }
        {...props}
      >
        {repositories
          .map((repo) => {
            return (
              <ListBoxItem
                key={repo}
                label={repo}
                css={{
                  minWidth: 0,
                  '.label,.center-content': { ...TRUNCATE_LEFT },
                }}
              />
            )
          })
          // hidden item so dropdown still opens when no results
          // using concat because Selects children type is restrictive and will take some work to improve
          .concat(
            <ListBoxItem
              key="empty"
              label=""
              disabled
              css={{ display: 'none' }}
            />
          )}
      </Select>
      <Toast
        show={!!toastMsg}
        closeTimeout={3000}
        severity="danger"
        onClose={() => setToastMsg(null)}
        position="bottom"
        marginBottom="medium"
      >
        {toastMsg}
      </Toast>
    </div>
  )
}

const BasicTriggerChipSC = styled(Chip)(() => ({
  border: 'none',
  background: 'transparent',
  width: '100%',
  '.children': { gap: 'xsmall', alignItems: 'center', minWidth: 0 },
}))
