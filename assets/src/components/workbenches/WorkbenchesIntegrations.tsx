import {
  Accordion,
  AccordionItem,
  AddIcon,
  ApiIcon,
  Button,
  Card,
  Checkbox,
  Chip,
  FiltersIcon,
  Flex,
  IconFrame,
  Input,
  MagnifyingGlassIcon,
} from '@pluralsh/design-system'
import { CardGrid } from 'components/self-service/catalog/CatalogsGrid'
import { StackedText } from 'components/utils/table/StackedText'
import Fuse from 'fuse.js'
import { useMemo, useState } from 'react'
import { WorkbenchTabHeader } from 'components/workbenches/common/WorkbenchTabHeader'
import { WorkbenchTabWrapper } from 'components/workbenches/common/WorkbenchTabWrapper'
import { Link } from 'react-router-dom'
import { WORKBENCHES_TOOLS_CREATE_ABS_PATH } from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import {
  WORKBENCHES_TOOLS_PROVIDER_PARAM,
  WORKBENCHES_TOOLS_TYPE_PARAM,
} from './tools/WorkbenchToolCreateOrEdit'
import {
  TOOL_TYPE_TO_LABEL,
  WORKBENCH_TOOL_CARDS,
  WorkbenchToolCardBody,
  WorkbenchToolIcon,
  workbenchToolCardGridStyles,
} from './tools/workbenchToolsUtils'
import type { WorkbenchToolCard } from './tools/workbenchToolsUtils'

const SEARCH_OPTIONS: Fuse.IFuseOptions<WorkbenchToolCard> = {
  keys: ['label', 'description', 'categoryLabels', 'type', 'provider'],
  threshold: 0.25,
}
const CATEGORIES_ACCORDION_VALUE = 'categories'
const TYPES_ACCORDION_VALUE = 'types'
type FilterOption = { key: string; items: number }

export function WorkbenchesIntegrations() {
  const theme = useTheme()
  const [query, setQuery] = useState('')
  const [filtersVisible, setFiltersVisible] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [categoryFilterQuery, setCategoryFilterQuery] = useState('')
  const [typeFilterQuery, setTypeFilterQuery] = useState('')

  const categories = useMemo(
    () => getFilterOptions(WORKBENCH_TOOL_CARDS, (card) => card.categoryLabels),
    []
  )

  const types = useMemo(
    () =>
      getFilterOptions(WORKBENCH_TOOL_CARDS, (card) => [
        TOOL_TYPE_TO_LABEL[card.type],
      ]),
    []
  )

  const filteredCards = useMemo(() => {
    const categorySet = new Set(selectedCategories)
    const typeSet = new Set(selectedTypes)

    const byFilters = WORKBENCH_TOOL_CARDS.filter((card) => {
      if (
        categorySet.size > 0 &&
        !card.categoryLabels.some((category) => categorySet.has(category))
      ) {
        return false
      }

      if (typeSet.size > 0 && !typeSet.has(TOOL_TYPE_TO_LABEL[card.type])) {
        return false
      }

      return true
    })

    const sortedByLabel = sortToolCards(byFilters)

    if (!query) return sortedByLabel

    const fuse = new Fuse(sortedByLabel, SEARCH_OPTIONS)
    return fuse.search(query).map(({ item }) => item)
  }, [query, selectedCategories, selectedTypes])

  const visibleTypes = useMemo(
    () => filterOptionsByQuery(types, typeFilterQuery),
    [types, typeFilterQuery]
  )

  const visibleCategories = useMemo(
    () => filterOptionsByQuery(categories, categoryFilterQuery),
    [categories, categoryFilterQuery]
  )

  return (
    <WorkbenchTabWrapper>
      <WorkbenchTabHeader
        icon={<ApiIcon />}
        title="Integrations"
        description="Integrate your dev stack, including observability, ticketing, MCP, and Cloud services with Plural."
      />
      <FiltersLayoutSC>
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
                  selectedTypes.length
                    ? theme.colors['border-primary']
                    : undefined,
              }}
            >
              Filters
            </Button>
          </Flex>
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
        </Flex>
        {filtersVisible && (
          <FiltersPanelSC>
            <Accordion
              type="multiple"
              defaultValue={[CATEGORIES_ACCORDION_VALUE, TYPES_ACCORDION_VALUE]}
            >
              <AccordionItem
                value={CATEGORIES_ACCORDION_VALUE}
                trigger={`Categories (${categories.length})`}
              >
                <Flex
                  direction="column"
                  gap="xsmall"
                >
                  <Input
                    value={categoryFilterQuery}
                    onChange={(e) =>
                      setCategoryFilterQuery(e.currentTarget.value)
                    }
                    showClearButton
                    placeholder="Filter categories"
                    startIcon={<MagnifyingGlassIcon color="icon-light" />}
                    width="100%"
                  />
                  <FilterOptionsSC>
                    {visibleCategories.map(({ key, items }) => (
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
              <AccordionItem
                value={TYPES_ACCORDION_VALUE}
                trigger={`Types (${types.length})`}
              >
                <Flex
                  direction="column"
                  gap="xsmall"
                >
                  <Input
                    value={typeFilterQuery}
                    onChange={(e) => setTypeFilterQuery(e.currentTarget.value)}
                    showClearButton
                    placeholder="Filter types"
                    startIcon={<MagnifyingGlassIcon color="icon-light" />}
                    width="100%"
                  />
                  <FilterOptionsSC>
                    {visibleTypes.map(({ key, items }) => (
                      <Checkbox
                        key={key}
                        small
                        checked={selectedTypes.includes(key)}
                        onChange={() =>
                          setSelectedTypes((current) =>
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
          </FiltersPanelSC>
        )}
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

function filterOptionsByQuery(
  options: FilterOption[],
  query: string
): FilterOption[] {
  if (!query) return options
  const lower = query.toLowerCase()

  return options.filter(({ key }) => key.toLowerCase().includes(lower))
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

const FiltersLayoutSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.large,
  width: '100%',
  minHeight: 0,
}))

const FiltersPanelSC = styled.div(({ theme }) => ({
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
