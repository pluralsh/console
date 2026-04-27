import {
  Accordion,
  AccordionItem,
  AddIcon,
  ApiIcon,
  Button,
  Card,
  Checkbox,
  Chip,
  EmptyState,
  FiltersIcon,
  Flex,
  IconFrame,
  Input,
  MagnifyingGlassIcon,
} from '@pluralsh/design-system'
import { animated, useTransition } from '@react-spring/web'
import { CardGrid } from 'components/self-service/catalog/CatalogsGrid'
import { StackedText } from 'components/utils/table/StackedText'
import { WorkbenchTabHeader } from 'components/workbenches/common/WorkbenchTabHeader'
import { WorkbenchTabWrapper } from 'components/workbenches/common/WorkbenchTabWrapper'
import Fuse from 'fuse.js'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { WORKBENCHES_TOOLS_CREATE_ABS_PATH } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import {
  WORKBENCHES_TOOLS_PROVIDER_PARAM,
  WORKBENCHES_TOOLS_TYPE_PARAM,
} from './tools/WorkbenchToolCreateOrEdit'
import type { WorkbenchToolCard } from './tools/workbenchToolsUtils'
import {
  WORKBENCH_TOOL_CARDS,
  WorkbenchToolCardBody,
  WorkbenchToolIcon,
  workbenchToolCardGridStyles,
} from './tools/workbenchToolsUtils'

const SEARCH_OPTIONS: Fuse.IFuseOptions<WorkbenchToolCard> = {
  keys: ['label', 'description', 'categoryLabels', 'type', 'provider'],
  threshold: 0.25,
}
const CATEGORIES_ACCORDION_VALUE = 'categories'

export function WorkbenchesIntegrations() {
  const theme = useTheme()
  const [query, setQuery] = useState('')
  const [filtersVisible, setFiltersVisible] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [openFilterSections, setOpenFilterSections] = useState<string[]>([
    CATEGORIES_ACCORDION_VALUE,
  ])

  const categories = useMemo(
    () => getFilterOptions(WORKBENCH_TOOL_CARDS, (card) => card.categoryLabels),
    []
  )

  const filteredCards = useMemo(() => {
    const categorySet = new Set(selectedCategories.map(normalizeFilterValue))

    const byFilters = WORKBENCH_TOOL_CARDS.filter(({ categoryLabels }) => {
      if (
        categorySet.size > 0 &&
        !categoryLabels.some((category) =>
          categorySet.has(normalizeFilterValue(category))
        )
      )
        return false

      return true
    })

    const sortedByLabel = sortToolCards(byFilters)

    if (!query) return sortedByLabel

    const fuse = new Fuse(sortedByLabel, SEARCH_OPTIONS)
    return fuse.search(query).map(({ item }) => item)
  }, [query, selectedCategories])

  const hasActiveSearch = query.trim().length > 0
  const hasActiveFilters = selectedCategories.length > 0
  const showEmptyState =
    filteredCards.length === 0 && (hasActiveSearch || hasActiveFilters)

  const resetSearchAndFilters = () => {
    setQuery('')
    setSelectedCategories([])
  }

  const panelTransitions = useTransition(filtersVisible ? [true] : [], {
    from: { opacity: 0, width: 0, marginRight: 0 },
    enter: { opacity: 1, width: 260, marginRight: theme.spacing.large },
    leave: { opacity: 0, width: 0, marginRight: 0 },
    config: filtersVisible
      ? { mass: 0.6, tension: 280, velocity: 0.02 }
      : { mass: 0.6, tension: 400, velocity: 0.02, restVelocity: 0.1 },
  })

  return (
    <WorkbenchTabWrapper>
      <WorkbenchTabHeader
        icon={<ApiIcon />}
        title="Integrations"
        description="Integrate your dev stack, including observability, ticketing, MCP, and Cloud services with Plural."
      />
      <FiltersLayoutSC>
        {panelTransitions((styles) => (
          <AnimatedFiltersPanelSC style={styles}>
            <FiltersPanelContentSC>
              <Accordion
                type="multiple"
                value={openFilterSections}
                onValueChange={(value) =>
                  setOpenFilterSections(value as string[])
                }
              >
                <AccordionItem
                  value={CATEGORIES_ACCORDION_VALUE}
                  trigger={`Categories (${categories.length})`}
                >
                  <Flex
                    direction="column"
                    gap="xsmall"
                  >
                    <FilterOptionsSC>
                      {categories.map(({ key, items }) => (
                        <Checkbox
                          key={key}
                          small
                          checked={selectedCategories.includes(key)}
                          onChange={() =>
                            setSelectedCategories((current) =>
                              toggleFilterValue(current, key)
                            )
                          }
                        >
                          {key} ({items})
                        </Checkbox>
                      ))}
                    </FilterOptionsSC>
                  </Flex>
                </AccordionItem>
              </Accordion>
            </FiltersPanelContentSC>
          </AnimatedFiltersPanelSC>
        ))}
        <Flex
          direction="column"
          gap="medium"
          grow={1}
          minWidth={0}
        >
          <Flex gap="medium">
            <Input
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              showClearButton
              placeholder="Search workbench connectors"
              startIcon={<MagnifyingGlassIcon color="icon-light" />}
              width="100%"
            />
            <Button
              secondary
              startIcon={<FiltersIcon />}
              onClick={() => setFiltersVisible((visible) => !visible)}
              style={{
                borderColor:
                  filtersVisible ||
                  selectedCategories.length ||
                  selectedCategories.length
                    ? theme.colors['border-primary']
                    : undefined,
              }}
            >
              Filters
            </Button>
          </Flex>
          {showEmptyState ? (
            <Card
              css={{
                padding: theme.spacing.large,
                ...(theme.mode === 'light' && {
                  backgroundColor: theme.colors['fill-zero'],
                }),
              }}
            >
              <EmptyState message="There are no results with these filters.">
                <Button
                  secondary
                  onClick={resetSearchAndFilters}
                >
                  Reset filters
                </Button>
              </EmptyState>
            </Card>
          ) : (
            <CardGrid styles={workbenchToolCardGridStyles(280)}>
              {filteredCards.map(
                ({ type, provider, label, description, categoryLabels }) => {
                  const params = new URLSearchParams({
                    [WORKBENCHES_TOOLS_TYPE_PARAM]: type,
                  })
                  if (provider)
                    params.set(WORKBENCHES_TOOLS_PROVIDER_PARAM, provider)
                  return (
                    <ToolCardSC key={`${type}-${provider ?? ''}`}>
                      <WorkbenchToolCardBody>
                        <StackedText
                          first={
                            <Flex
                              align="center"
                              gap="medium"
                            >
                              <IconFrame
                                circle
                                type="secondary"
                                icon={
                                  <WorkbenchToolIcon
                                    size={20}
                                    type={type}
                                    provider={provider}
                                  />
                                }
                              />
                              {label}
                            </Flex>
                          }
                          firstPartialType="subtitle1"
                          firstColor="text"
                          second={description}
                          secondPartialType="body2"
                          secondColor="text-light"
                          gap="small"
                        />
                        <Flex
                          direction="column"
                          gap="small"
                          css={{ marginTop: 'auto' }}
                        >
                          <Flex
                            gap="xsmall"
                            wrap="wrap"
                          >
                            {categoryLabels.map((cat) => (
                              <Chip
                                key={cat}
                                size="small"
                                css={{ height: 'fit-content' }}
                              >
                                {cat}
                              </Chip>
                            ))}
                          </Flex>
                          <Button
                            small
                            floating
                            as={Link}
                            to={`${WORKBENCHES_TOOLS_CREATE_ABS_PATH}?${params.toString()}`}
                            style={{ boxShadow: 'none' }}
                            startIcon={<AddIcon />}
                          >
                            Add tool
                          </Button>
                        </Flex>
                      </WorkbenchToolCardBody>
                    </ToolCardSC>
                  )
                }
              )}
            </CardGrid>
          )}
        </Flex>
      </FiltersLayoutSC>
    </WorkbenchTabWrapper>
  )
}

function getFilterOptions(
  cards: WorkbenchToolCard[],
  getValues: (card: WorkbenchToolCard) => string[]
) {
  const counts = new Map<string, { label: string; count: number }>()

  cards.forEach((card) => {
    getValues(card).forEach((value) => {
      const normalized = normalizeFilterValue(value)
      const current = counts.get(normalized)
      if (current) {
        current.count += 1
      } else {
        counts.set(normalized, { label: value, count: 1 })
      }
    })
  })

  return Array.from(counts.entries())
    .map(([, { label, count }]) => ({ key: label, items: count }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

function sortToolCards(cards: WorkbenchToolCard[]) {
  return [...cards].sort((a, b) => {
    const byLabel = a.label.localeCompare(b.label)
    if (byLabel !== 0) return byLabel

    const byType = a.type.localeCompare(b.type)
    if (byType !== 0) return byType

    return (a.provider ?? '').localeCompare(b.provider ?? '')
  })
}

function normalizeFilterValue(value: string) {
  return value.trim().toLowerCase()
}

function toggleFilterValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value]
}

const ToolCardSC = styled(Card)(() => ({
  '&&': {
    display: 'flex',
    flexDirection: 'column',
    padding: 0,
    minWidth: 0,
    overflow: 'visible',
  },
  minHeight: 120,
  textDecoration: 'none',
}))

const FiltersLayoutSC = styled.div({
  display: 'flex',
  width: '100%',
  minHeight: 0,
})

const AnimatedFiltersPanelSC = styled(animated.div)({
  flexShrink: 0,
  minWidth: 0,
  overflow: 'hidden',
})

const FiltersPanelContentSC = styled.div(({ theme }) => ({
  width: 260,
  minWidth: 260,
  maxHeight: '100%',
  overflowY: 'auto',
  paddingRight: theme.spacing.xxsmall,
}))

const FilterOptionsSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  rowGap: theme.spacing.xxsmall,
}))
