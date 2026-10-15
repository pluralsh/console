import {
  AddIcon,
  ApiIcon,
  Button,
  Card,
  Chip,
  EmptyState,
  Flex,
} from '@pluralsh/design-system'
import { PageSidecarPortal } from 'components/layout/PageLayout'
import {
  DisplayButton,
  DisplayFilterSection,
  DisplayPanel,
} from 'components/utils/display/DisplayPanel'
import { CardGrid } from 'components/self-service/catalog/CatalogsGrid'
import { StackedText } from 'components/utils/table/StackedText'
import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { ToolbarSearchInput } from 'components/layout/PageToolbar'
import { WorkbenchTabHeader } from 'components/workbenches/common/WorkbenchTabHeader'
import { WorkbenchTabWrapper } from 'components/workbenches/common/WorkbenchTabWrapper'
import Fuse, { type IFuseOptions } from 'fuse.js'
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
  WorkbenchToolCardIcon,
  workbenchToolCardGridStyles,
} from './tools/workbenchToolsUtils'

const SEARCH_OPTIONS: IFuseOptions<WorkbenchToolCard> = {
  keys: ['label', 'description', 'categoryLabels', 'type', 'provider'],
  threshold: 0.25,
}
export function WorkbenchesIntegrations() {
  const theme = useTheme()
  const [query, setQuery] = useState('')
  const [filtersVisible, setFiltersVisible] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

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

  useSetPageHeaderContent(
    useMemo(
      () => (
        <>
          <ToolbarSearchInput
            placeholder="Search workbench connectors"
            value={query}
            onChange={setQuery}
          />
          <DisplayButton
            showDot={selectedCategories.length > 0}
            expanded={filtersVisible}
            onClick={() => setFiltersVisible((visible) => !visible)}
          />
        </>
      ),
      [query, filtersVisible, selectedCategories.length]
    )
  )

  return (
    <WorkbenchTabWrapper>
      <WorkbenchTabHeader
        icon={<ApiIcon />}
        title="Integrations"
        description="Integrate your dev stack, including observability, ticketing, MCP, and Cloud services with Plural.  You can create multiple tools for each."
      />
      {filtersVisible && (
        <PageSidecarPortal>
          <DisplayPanel>
            <DisplayFilterSection
              title="Categories"
              options={categories.map(({ key }) => key)}
              selected={selectedCategories}
              counts={Object.fromEntries(
                categories.map(({ key, items }) => [key, items])
              )}
              getLabel={(key) => key}
              onChange={setSelectedCategories}
            />
          </DisplayPanel>
        </PageSidecarPortal>
      )}
      <FiltersLayoutSC>
        <Flex
          direction="column"
          gap="medium"
          grow={1}
          minWidth={0}
        >
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
                              <WorkbenchToolCardIcon
                                type={type}
                                provider={provider}
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
