import {
  AddIcon,
  ApiIcon,
  Button,
  Card,
  Chip,
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
import styled from 'styled-components'
import {
  WORKBENCHES_TOOLS_PROVIDER_PARAM,
  WORKBENCHES_TOOLS_TYPE_PARAM,
} from './tools/WorkbenchToolCreateOrEdit'
import {
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

export function WorkbenchesIntegrations() {
  const [query, setQuery] = useState('')

  const filteredCards = useMemo(() => {
    if (!query) return WORKBENCH_TOOL_CARDS

    const fuse = new Fuse(WORKBENCH_TOOL_CARDS, SEARCH_OPTIONS)
    return fuse.search(query).map(({ item }) => item)
  }, [query])

  return (
    <WorkbenchTabWrapper>
      <WorkbenchTabHeader
        icon={<ApiIcon />}
        title="Integrations"
        description="Integrate your dev stack, including observability, ticketing, MCP, and Cloud services with Plural."
      />
      <Flex gap="medium">
        <Input
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          showClearButton
          placeholder="Search workbench connectors"
          startIcon={<MagnifyingGlassIcon color="icon-light" />}
          width="100%"
        />
        {/* <Button
          secondary
          startIcon={<FiltersIcon />}
          onClick={() => undefined}
        >
          Filters
        </Button> */}
      </Flex>
      <CardGrid styles={workbenchToolCardGridStyles(280)}>
        {filteredCards.map(
          ({ type, provider, label, description, categoryLabels }) => {
            const params = new URLSearchParams({
              [WORKBENCHES_TOOLS_TYPE_PARAM]: type,
            })
            if (provider) params.set(WORKBENCHES_TOOLS_PROVIDER_PARAM, provider)
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
    </WorkbenchTabWrapper>
  )
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
