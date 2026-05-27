import {
  AppIcon,
  Button,
  CatalogIcon,
  Chip,
  EmptyState,
  Flex,
  Input,
  MagnifyingGlassIcon,
  PrQueueIcon,
  Switch,
  Tooltip,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import Fuse from 'fuse.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'

import {
  CatalogFragment,
  PrAutomationFragment,
  useCatalogsQuery,
  usePrAutomationsQuery,
} from 'generated/graphql'
import {
  CATALOGS_ABS_PATH,
  PR_AUTOMATIONS_ABS_PATH,
  SELF_SERVICE_ABS_PATH,
  getCatalogAbsPath,
} from 'routes/selfServiceRoutesConsts'
import { GqlError } from 'components/utils/Alert'
import { mapExistingNodes } from 'utils/graphql'
import { iconUrl } from 'utils/icon'

// ----- Types -----

type ResultKind = 'catalog' | 'prAutomation'

type CatalogRow = {
  kind: 'catalog'
  id: string
  name: string
  description?: string
  category?: string
  author?: string
  icon?: string
  darkIcon?: string
  raw: CatalogFragment
}

type PrAutomationRow = {
  kind: 'prAutomation'
  id: string
  name: string
  description?: string
  category?: string
  author?: string
  icon?: string
  darkIcon?: string
  raw: PrAutomationFragment
}

type Row = CatalogRow | PrAutomationRow

type FuseHit<T> = { item: T; score?: number }

// ----- Constants -----

const SUGGESTIONS = [
  'I want to create clusters',
  'set up datastores',
  'add a new pipeline',
  'security scanning',
  'kubernetes networking',
]

const DEFAULT_KEYS: Array<'name' | 'description' | 'category' | 'author'> = [
  'name',
  'description',
]

// ----- Page -----

export function SelfServiceSearchPrototype() {
  useSetBreadcrumbs(
    useMemo(
      () => [
        { label: 'self service', url: SELF_SERVICE_ABS_PATH },
        { label: 'search prototype' },
      ],
      []
    )
  )

  // Pull a reasonably large slice so the prototype can fuzz-match offline.
  const {
    data: catalogsData,
    error: catalogsError,
    loading: catalogsLoading,
  } = useCatalogsQuery({ variables: { first: 100 } })

  const {
    data: prAutomationsData,
    error: prAutomationsError,
    loading: prAutomationsLoading,
  } = usePrAutomationsQuery({ variables: { first: 100 } })

  const catalogRows = useMemo<CatalogRow[]>(
    () =>
      mapExistingNodes(catalogsData?.catalogs).map((c) => ({
        kind: 'catalog',
        id: c.id,
        name: c.name,
        description: c.description ?? undefined,
        category: c.category ?? undefined,
        author: c.author ?? undefined,
        icon: c.icon ?? undefined,
        darkIcon: c.darkIcon ?? undefined,
        raw: c,
      })),
    [catalogsData]
  )

  const prAutomationRows = useMemo<PrAutomationRow[]>(
    () =>
      mapExistingNodes(prAutomationsData?.prAutomations).map((p) => ({
        kind: 'prAutomation',
        id: p.id,
        name: p.name,
        description: p.documentation ?? undefined,
        author: p.cluster?.name ?? undefined,
        icon: p.icon ?? undefined,
        darkIcon: p.darkIcon ?? undefined,
        raw: p,
      })),
    [prAutomationsData]
  )

  // ----- Fuzzy controls -----

  const [threshold, setThreshold] = useState(0.4)
  const [distance, setDistance] = useState(200)
  const [minMatchCharLength, setMinMatchCharLength] = useState(2)
  const [maxPerGroup, setMaxPerGroup] = useState(5)
  const [searchKeys, setSearchKeys] =
    useState<Array<'name' | 'description' | 'category' | 'author'>>(
      DEFAULT_KEYS
    )
  const [showScores, setShowScores] = useState(false)
  const [showEmptyGroups, setShowEmptyGroups] = useState(true)

  // ----- Search -----

  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputWrapperRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const fuseOptions = useMemo(
    () => ({
      includeScore: true,
      shouldSort: true,
      threshold,
      distance,
      minMatchCharLength,
      ignoreLocation: true,
      keys: searchKeys.length > 0 ? searchKeys : ['name'],
    }),
    [threshold, distance, minMatchCharLength, searchKeys]
  )

  const catalogFuse = useMemo(
    () => new Fuse(catalogRows, fuseOptions),
    [catalogRows, fuseOptions]
  )
  const prFuse = useMemo(
    () => new Fuse(prAutomationRows, fuseOptions),
    [prAutomationRows, fuseOptions]
  )

  const catalogHits: FuseHit<CatalogRow>[] = useMemo(() => {
    if (!query.trim()) return []
    return catalogFuse.search(query).slice(0, maxPerGroup)
  }, [catalogFuse, query, maxPerGroup])

  const prHits: FuseHit<PrAutomationRow>[] = useMemo(() => {
    if (!query.trim()) return []
    return prFuse.search(query).slice(0, maxPerGroup)
  }, [prFuse, query, maxPerGroup])

  const flatHits: Row[] = useMemo(
    () => [...catalogHits.map((h) => h.item), ...prHits.map((h) => h.item)],
    [catalogHits, prHits]
  )

  // ----- Keyboard navigation -----

  const [activeIdx, setActiveIdx] = useState(0)
  useEffect(() => setActiveIdx(0), [query])

  const navigate = useNavigate()
  const goToRow = useCallback(
    (row: Row) => {
      if (row.kind === 'catalog') {
        navigate(getCatalogAbsPath(row.id))
      } else {
        navigate(PR_AUTOMATIONS_ABS_PATH)
      }
      setIsOpen(false)
    },
    [navigate]
  )

  // ----- Click outside / Escape -----

  useEffect(() => {
    if (!isOpen) return
    const onDown = (e: MouseEvent) => {
      if (
        !inputWrapperRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen])

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIsOpen(true)
      setActiveIdx((i) => Math.min(i + 1, Math.max(flatHits.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const hit = flatHits[activeIdx]
      if (hit) {
        e.preventDefault()
        goToRow(hit)
      }
    }
  }

  // ----- Render -----

  const error = catalogsError ?? prAutomationsError
  const loading = catalogsLoading || prAutomationsLoading
  const hasQuery = query.trim().length > 0
  const noResults = hasQuery && flatHits.length === 0

  return (
    <PageSC>
      <Flex
        direction="column"
        gap="xsmall"
      >
        <h2 css={{ margin: 0 }}>Self-service search prototype</h2>
        <DescriptionSC>
          Dual fuzzy search across <strong>Service catalog</strong> +{' '}
          <strong>PR automations</strong>. Tune the matcher on the right to find
          the right feel for the dropdown.
        </DescriptionSC>
      </Flex>

      <LayoutSC>
        <MainColSC>
          <SearchWrapperSC ref={inputWrapperRef}>
            <Input
              inputProps={{
                ref: inputRef,
                onFocus: () => setIsOpen(true),
                onKeyDown: onInputKeyDown,
              }}
              value={query}
              onClick={() => setIsOpen(true)}
              onChange={(e) => {
                setQuery(e.currentTarget.value)
                setIsOpen(true)
              }}
              showClearButton
              placeholder='Ask anything across service catalog and PR automations. Try "I want to create clusters."'
              startIcon={<MagnifyingGlassIcon color="icon-light" />}
              width="100%"
            />

            {isOpen && (
              <DropdownSC ref={dropdownRef}>
                {error ? (
                  <DropdownPaddingSC>
                    <GqlError error={error} />
                  </DropdownPaddingSC>
                ) : !hasQuery ? (
                  <SuggestionsBlock
                    loading={loading}
                    catalogCount={catalogRows.length}
                    prCount={prAutomationRows.length}
                    onPick={(s) => {
                      setQuery(s)
                      inputRef.current?.focus()
                    }}
                  />
                ) : noResults ? (
                  <DropdownPaddingSC>
                    <EmptyState message={`No matches for "${query}".`}>
                      <Flex
                        direction="column"
                        gap="xsmall"
                        align="center"
                      >
                        <HelperHintSC>
                          Try lowering the threshold or distance in the tuning
                          panel.
                        </HelperHintSC>
                        <Button
                          secondary
                          onClick={() => {
                            setQuery('')
                            inputRef.current?.focus()
                          }}
                        >
                          Reset
                        </Button>
                      </Flex>
                    </EmptyState>
                  </DropdownPaddingSC>
                ) : (
                  <>
                    <ResultGroup
                      title="Service catalog"
                      icon={<CatalogIcon size={14} />}
                      hits={catalogHits}
                      activeIdx={activeIdx}
                      startIdx={0}
                      showScores={showScores}
                      showEmpty={showEmptyGroups}
                      onPick={goToRow}
                      onHover={setActiveIdx}
                    />
                    <ResultGroup
                      title="PR automations"
                      icon={<PrQueueIcon size={14} />}
                      hits={prHits}
                      activeIdx={activeIdx}
                      startIdx={catalogHits.length}
                      showScores={showScores}
                      showEmpty={showEmptyGroups}
                      onPick={goToRow}
                      onHover={setActiveIdx}
                    />
                    <FooterSC>
                      <span>
                        {flatHits.length} result
                        {flatHits.length === 1 ? '' : 's'}
                      </span>
                      <span>
                        <kbd>↑</kbd> <kbd>↓</kbd> to navigate <kbd>Enter</kbd>{' '}
                        to open <kbd>Esc</kbd> to close
                      </span>
                    </FooterSC>
                  </>
                )}
              </DropdownSC>
            )}
          </SearchWrapperSC>

          {/* Quick suggestion chips below the input */}
          <Flex
            wrap="wrap"
            gap="xsmall"
          >
            {SUGGESTIONS.map((s) => (
              <Chip
                key={s}
                clickable
                size="small"
                onClick={() => {
                  setQuery(s)
                  setIsOpen(true)
                  inputRef.current?.focus()
                }}
              >
                {s}
              </Chip>
            ))}
          </Flex>

          <NoteSC>
            <strong>Prototype scope:</strong> client-side Fuse.js fuzzy match
            over the first 100 catalogs and 100 PR automations from the live
            GraphQL endpoint. Once we settle on the right feel, this can be
            swapped for the backend <code>catalogSearch</code> semantic query.
          </NoteSC>
        </MainColSC>

        <TuningPanel
          threshold={threshold}
          setThreshold={setThreshold}
          distance={distance}
          setDistance={setDistance}
          minMatchCharLength={minMatchCharLength}
          setMinMatchCharLength={setMinMatchCharLength}
          maxPerGroup={maxPerGroup}
          setMaxPerGroup={setMaxPerGroup}
          searchKeys={searchKeys}
          setSearchKeys={setSearchKeys}
          showScores={showScores}
          setShowScores={setShowScores}
          showEmptyGroups={showEmptyGroups}
          setShowEmptyGroups={setShowEmptyGroups}
        />
      </LayoutSC>
    </PageSC>
  )
}

// ----- Result group -----

function ResultGroup<T extends Row>({
  title,
  icon,
  hits,
  activeIdx,
  startIdx,
  showScores,
  showEmpty,
  onPick,
  onHover,
}: {
  title: string
  icon: React.ReactNode
  hits: FuseHit<T>[]
  activeIdx: number
  startIdx: number
  showScores: boolean
  showEmpty: boolean
  onPick: (row: T) => void
  onHover: (idx: number) => void
}) {
  if (hits.length === 0 && !showEmpty) return null

  return (
    <GroupSC>
      <GroupHeaderSC>
        <GroupHeaderIconSC>{icon}</GroupHeaderIconSC>
        <span>{title}</span>
        <GroupHeaderCountSC>{hits.length}</GroupHeaderCountSC>
      </GroupHeaderSC>
      {hits.length === 0 ? (
        <EmptyGroupSC>No matches in this group.</EmptyGroupSC>
      ) : (
        hits.map((hit, i) => {
          const flatIdx = startIdx + i
          const active = flatIdx === activeIdx
          return (
            <ResultRow
              key={hit.item.id}
              row={hit.item}
              score={hit.score}
              active={active}
              showScore={showScores}
              onClick={() => onPick(hit.item)}
              onMouseEnter={() => onHover(flatIdx)}
            />
          )
        })
      )}
    </GroupSC>
  )
}

// ----- Result row -----

function ResultRow({
  row,
  score,
  active,
  showScore,
  onClick,
  onMouseEnter,
}: {
  row: Row
  score?: number
  active: boolean
  showScore: boolean
  onClick: () => void
  onMouseEnter: () => void
}) {
  const theme = useTheme()
  const url = iconUrl(row.icon, row.darkIcon, theme.mode)
  const fallback =
    row.kind === 'catalog' ? (
      <CatalogIcon size={16} />
    ) : (
      <PrQueueIcon size={16} />
    )

  return (
    <RowSC
      $active={active}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      <AppIcon
        size="xxsmall"
        url={url}
        icon={fallback}
        spacing="none"
      />
      <Flex
        direction="column"
        grow={1}
        css={{ minWidth: 0 }}
      >
        <RowTitleSC>{row.name}</RowTitleSC>
        {row.description && (
          <RowDescriptionSC>{row.description}</RowDescriptionSC>
        )}
      </Flex>
      <Flex
        gap="xsmall"
        align="center"
      >
        {row.category && <Chip size="small">{row.category}</Chip>}
        <KindChip kind={row.kind} />
        {showScore && score !== undefined && (
          <Tooltip label="Fuse score (lower = closer match)">
            <ScoreSC>{score.toFixed(3)}</ScoreSC>
          </Tooltip>
        )}
      </Flex>
    </RowSC>
  )
}

function KindChip({ kind }: { kind: ResultKind }) {
  return (
    <Chip
      size="small"
      severity={kind === 'catalog' ? 'info' : 'neutral'}
    >
      {kind === 'catalog' ? 'Catalog' : 'PR automation'}
    </Chip>
  )
}

// ----- Suggestions (empty state inside dropdown) -----

function SuggestionsBlock({
  loading,
  catalogCount,
  prCount,
  onPick,
}: {
  loading: boolean
  catalogCount: number
  prCount: number
  onPick: (q: string) => void
}) {
  return (
    <DropdownPaddingSC>
      <Flex
        direction="column"
        gap="small"
      >
        <SectionLabelSC>Suggested searches</SectionLabelSC>
        <Flex
          wrap="wrap"
          gap="xsmall"
        >
          {SUGGESTIONS.map((s) => (
            <Chip
              key={s}
              clickable
              size="small"
              onClick={() => onPick(s)}
            >
              {s}
            </Chip>
          ))}
        </Flex>
        <SubtleSC>
          {loading
            ? 'Loading indexes…'
            : `Indexed ${catalogCount} catalog${catalogCount === 1 ? '' : 's'} and ${prCount} PR automation${prCount === 1 ? '' : 's'}.`}
        </SubtleSC>
      </Flex>
    </DropdownPaddingSC>
  )
}

// ----- Tuning panel -----

function TuningPanel({
  threshold,
  setThreshold,
  distance,
  setDistance,
  minMatchCharLength,
  setMinMatchCharLength,
  maxPerGroup,
  setMaxPerGroup,
  searchKeys,
  setSearchKeys,
  showScores,
  setShowScores,
  showEmptyGroups,
  setShowEmptyGroups,
}: {
  threshold: number
  setThreshold: (n: number) => void
  distance: number
  setDistance: (n: number) => void
  minMatchCharLength: number
  setMinMatchCharLength: (n: number) => void
  maxPerGroup: number
  setMaxPerGroup: (n: number) => void
  searchKeys: Array<'name' | 'description' | 'category' | 'author'>
  setSearchKeys: (
    keys: Array<'name' | 'description' | 'category' | 'author'>
  ) => void
  showScores: boolean
  setShowScores: (b: boolean) => void
  showEmptyGroups: boolean
  setShowEmptyGroups: (b: boolean) => void
}) {
  const toggleKey = (k: 'name' | 'description' | 'category' | 'author') => {
    setSearchKeys(
      searchKeys.includes(k)
        ? searchKeys.filter((x) => x !== k)
        : [...searchKeys, k]
    )
  }

  return (
    <TuningPanelSC>
      <TuningHeaderSC>Fuzzy tuning</TuningHeaderSC>

      <FieldSC>
        <FieldLabelSC>
          <span>Threshold</span>
          <FieldValueSC>{threshold.toFixed(2)}</FieldValueSC>
        </FieldLabelSC>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={threshold}
          onChange={(e) => setThreshold(parseFloat(e.currentTarget.value))}
        />
        <FieldHintSC>
          0 = exact match · 1 = match anything. Higher = more forgiving.
        </FieldHintSC>
      </FieldSC>

      <FieldSC>
        <FieldLabelSC>
          <span>Distance</span>
          <FieldValueSC>{distance}</FieldValueSC>
        </FieldLabelSC>
        <input
          type="range"
          min={0}
          max={1000}
          step={10}
          value={distance}
          onChange={(e) => setDistance(parseInt(e.currentTarget.value, 10))}
        />
        <FieldHintSC>
          How far in the string a match can be from the expected location.
        </FieldHintSC>
      </FieldSC>

      <FieldSC>
        <FieldLabelSC>
          <span>Min match length</span>
          <FieldValueSC>{minMatchCharLength}</FieldValueSC>
        </FieldLabelSC>
        <input
          type="range"
          min={1}
          max={6}
          step={1}
          value={minMatchCharLength}
          onChange={(e) =>
            setMinMatchCharLength(parseInt(e.currentTarget.value, 10))
          }
        />
        <FieldHintSC>
          Shortest character run that counts as a match.
        </FieldHintSC>
      </FieldSC>

      <FieldSC>
        <FieldLabelSC>
          <span>Max results / group</span>
          <FieldValueSC>{maxPerGroup}</FieldValueSC>
        </FieldLabelSC>
        <input
          type="range"
          min={1}
          max={20}
          step={1}
          value={maxPerGroup}
          onChange={(e) => setMaxPerGroup(parseInt(e.currentTarget.value, 10))}
        />
      </FieldSC>

      <FieldSC>
        <FieldLabelSC>
          <span>Search keys</span>
        </FieldLabelSC>
        <Flex
          wrap="wrap"
          gap="xsmall"
        >
          {(['name', 'description', 'category', 'author'] as const).map((k) => {
            const on = searchKeys.includes(k)
            return (
              <Chip
                key={k}
                clickable
                size="small"
                severity={on ? 'info' : 'neutral'}
                onClick={() => toggleKey(k)}
              >
                {k}
              </Chip>
            )
          })}
        </Flex>
      </FieldSC>

      <FieldSC>
        <Switch
          checked={showScores}
          onChange={(c) => setShowScores(c)}
        >
          Show match scores
        </Switch>
      </FieldSC>

      <FieldSC>
        <Switch
          checked={showEmptyGroups}
          onChange={(c) => setShowEmptyGroups(c)}
        >
          Always show both groups
        </Switch>
        <FieldHintSC>
          When off, hides a group entirely when it has no matches.
        </FieldHintSC>
      </FieldSC>

      <Flex
        direction="column"
        gap="xsmall"
      >
        <Button
          secondary
          small
          as="a"
          href={CATALOGS_ABS_PATH}
        >
          ← Back to live catalog page
        </Button>
      </Flex>
    </TuningPanelSC>
  )
}

// ----- Styled -----

const PageSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  gap: theme.spacing.large,
  height: '100%',
  width: '100%',
  overflow: 'auto',
  padding: theme.spacing.large,
  maxWidth: theme.breakpoints.desktopLarge,
}))

const DescriptionSC = styled.p(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
  margin: 0,
}))

const LayoutSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 320px',
  gap: theme.spacing.large,
  alignItems: 'start',
  '@media (max-width: 1024px)': {
    gridTemplateColumns: 'minmax(0, 1fr)',
  },
}))

const MainColSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  position: 'relative',
}))

const SearchWrapperSC = styled.div({
  position: 'relative',
})

const DropdownSC = styled.div(({ theme }) => ({
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  right: 0,
  background: theme.colors['fill-one'],
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.medium,
  boxShadow: theme.boxShadows.modal,
  zIndex: 20,
  maxHeight: 480,
  overflowY: 'auto',
}))

const DropdownPaddingSC = styled.div(({ theme }) => ({
  padding: theme.spacing.medium,
}))

const GroupSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
})

const GroupHeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
  color: theme.colors['text-xlight'],
  background: theme.colors['fill-two'],
  borderTop: `1px solid ${theme.colors.border}`,
  borderBottom: `1px solid ${theme.colors.border}`,
  ...theme.partials.text.overline,
  '&:first-of-type': {
    borderTop: 'none',
  },
}))

const GroupHeaderIconSC = styled.span(({ theme }) => ({
  color: theme.colors['icon-light'],
  display: 'inline-flex',
}))

const GroupHeaderCountSC = styled.span(({ theme }) => ({
  marginLeft: 'auto',
  color: theme.colors['text-xlight'],
  ...theme.partials.text.caption,
}))

const EmptyGroupSC = styled.div(({ theme }) => ({
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  color: theme.colors['text-xlight'],
  ...theme.partials.text.caption,
  fontStyle: 'italic',
}))

const RowSC = styled.div<{ $active: boolean }>(({ theme, $active }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  cursor: 'pointer',
  background: $active ? theme.colors['fill-one-hover'] : 'transparent',
  '&:hover': {
    background: theme.colors['fill-one-hover'],
  },
}))

const RowTitleSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2Bold,
  color: theme.colors.text,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}))

const RowDescriptionSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-light'],
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}))

const ScoreSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  fontFamily: 'monospace',
  padding: `2px ${theme.spacing.xsmall}px`,
  background: theme.colors['fill-two'],
  borderRadius: theme.borderRadiuses.medium,
}))

const FooterSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.small,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
  borderTop: `1px solid ${theme.colors.border}`,
  background: theme.colors['fill-two'],
  color: theme.colors['text-xlight'],
  ...theme.partials.text.caption,
  '& kbd': {
    padding: '1px 5px',
    margin: '0 2px',
    background: theme.colors['fill-three'],
    color: theme.colors['text-light'],
    border: `1px solid ${theme.colors.border}`,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 11,
  },
}))

const SectionLabelSC = styled.div(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
}))

const SubtleSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
}))

const NoteSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-light'],
  padding: theme.spacing.small,
  background: theme.colors['fill-two'],
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.medium,
  '& code': {
    fontFamily: 'monospace',
    background: theme.colors['fill-three'],
    padding: '0 4px',
    borderRadius: 3,
  },
}))

const TuningPanelSC = styled.aside(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.medium,
  background: theme.colors['fill-one'],
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.borderRadiuses.large,
  position: 'sticky',
  top: 0,
}))

const TuningHeaderSC = styled.h3(({ theme }) => ({
  ...theme.partials.text.body1Bold,
  margin: 0,
  color: theme.colors.text,
}))

const FieldSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  '& input[type=range]': {
    width: '100%',
    accentColor: theme.colors['action-primary'],
  },
}))

const FieldLabelSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: theme.spacing.xsmall,
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
}))

const FieldValueSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  fontFamily: 'monospace',
  color: theme.colors['text-xlight'],
}))

const FieldHintSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
}))

const HelperHintSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-light'],
}))
