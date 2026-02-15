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
import { useAgentRunRepositoriesQuery } from 'generated/graphql'
import { useEffectEvent, useLayoutEffect, useMemo, useState } from 'react'
import { StyledObject, useTheme } from 'styled-components'
import { sortDatesDesc } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'

export function AgentRunRepoSelector({
  selectedRepository,
  setSelectedRepository,
  outerStyles,
  defaultMostRecent = true,
  ...props
}: {
  selectedRepository: Nullable<string>
  setSelectedRepository: (repository: Nullable<string>) => void
  outerStyles?: StyledObject
  defaultMostRecent?: boolean
} & Omit<SelectPropsSingle, 'onSelectionChange' | 'selectedKey' | 'children'>) {
  const { colors, borders, spacing } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useThrottle(query, 300)

  const { data, loading, previousData } = useAgentRunRepositoriesQuery({
    variables: { q: debouncedQuery },
    fetchPolicy: 'cache-and-network',
  })
  const curData = data || previousData

  const repositories = useMemo(
    () =>
      mapExistingNodes(curData?.agentRunRepositories).toSorted((a, b) =>
        sortDatesDesc(a.lastUsedAt, b.lastUsedAt)
      ),
    [curData?.agentRunRepositories]
  )

  const setRepositoryToMostRecent = useEffectEvent(() => {
    const { url } = repositories[0] ?? {}
    if (url && !!defaultMostRecent) setSelectedRepository(url)
  })
  useLayoutEffect(() => {
    if (data && !selectedRepository) setRepositoryToMostRecent()
  }, [data, selectedRepository])

  const isLoading = !curData && loading

  return (
    <div css={{ minWidth: 0, ...outerStyles }}>
      <Select
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        width={320}
        placement="left"
        leftContent={<LogsIcon />}
        selectedKey={selectedRepository}
        onSelectionChange={(key) =>
          setSelectedRepository(key ? `${key}` : null)
        }
        triggerButton={
          <Chip
            clickable
            size="large"
            css={{
              border: 'none',
              backgroundColor: 'transparent',
              width: '100%',
              '.children': { gap: 'xsmall', alignItems: 'center', minWidth: 0 },
            }}
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
          </Chip>
        }
        dropdownHeaderFixed={
          <div css={{ padding: spacing.xsmall }}>
            <Input2
              inputProps={{ ref: (node) => node?.focus() }}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              onEnter={() => {
                if (!query) return
                if (!isValidRepoUrl(query)) {
                  setShowToast(true)
                  return
                }
                setSelectedRepository(query)
                setIsOpen(false)
                setQuery('')
              }}
              placeholder="Enter full repo URL or select from recent"
              showClearButton
              css={{
                border: 'none',
                '&:focus-within': {
                  border: borders['outline-focused'],
                  borderColor: showToast
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
          .map(({ url }) => {
            return (
              <ListBoxItem
                key={url}
                label={url}
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
        show={showToast}
        closeTimeout={1600}
        severity="danger"
        onClose={() => setShowToast(false)}
        position="bottom"
        marginBottom="medium"
      >
        Must be a valid git clone URL
      </Toast>
    </div>
  )
}
