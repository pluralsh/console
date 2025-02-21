import {
  Accordion,
  AccordionItem,
  AiSparkleOutlineIcon,
  Button,
  Flex,
  HamburgerMenuCollapseIcon,
  IconFrame,
  SearchDocsIcon,
  SearchIcon,
} from '@pluralsh/design-system'
import { ARBITRARY_VALUE_NAME } from 'components/utils/IconExpander'
import { AiInsightFragment } from 'generated/graphql'
import { useState } from 'react'
import styled from 'styled-components'
import { InsightEvidence } from './InsightEvidence'
import { InsightMainContent } from './InsightMainContent'
import { isEmpty } from 'lodash'
import { isNonNullable } from 'utils/isNonNullable'

const HEADER_HEIGHT = 40

export function InsightDisplay({
  insight,
  kind = 'resource',
}: {
  insight: Nullable<AiInsightFragment>
  kind: Nullable<string>
}) {
  const evidence = insight?.evidence?.filter(isNonNullable)
  const hasEvidence = !isEmpty(evidence)
  const [openItem, setOpenItem] = useState(ARBITRARY_VALUE_NAME)
  const isExpanded = openItem === ARBITRARY_VALUE_NAME

  return (
    <WrapperSC>
      <LeftSideSC>
        <ContentHeaderSC>
          <Flex gap="small">
            <AiSparkleOutlineIcon />
            <span>insight</span>
          </Flex>
          {hasEvidence && !isExpanded && (
            <Button
              secondary
              small
              startIcon={<SearchDocsIcon />}
              onClick={() => setOpenItem(ARBITRARY_VALUE_NAME)}
            >
              View evidence
            </Button>
          )}
        </ContentHeaderSC>
        <InsightMainContent
          text={insight?.text}
          kind={kind}
        />
      </LeftSideSC>
      {hasEvidence && (
        <Accordion
          type="single"
          value={openItem}
          orientation="horizontal"
          css={{ border: 'none' }}
        >
          <AccordionItem
            value={ARBITRARY_VALUE_NAME}
            caret="none"
            padding="none"
            trigger={null}
            css={{ height: '100%' }}
          >
            <RightSideSC>
              <ContentHeaderSC css={{ paddingRight: 0 }}>
                <Flex gap="small">
                  <SearchIcon />
                  <span>{"insight's evidence"}</span>
                </Flex>
                <IconFrame
                  clickable
                  size="large"
                  icon={<HamburgerMenuCollapseIcon />}
                  onClick={() => setOpenItem('')}
                  tooltip="Close panel"
                />
              </ContentHeaderSC>
              <InsightEvidence evidence={evidence} />
            </RightSideSC>
          </AccordionItem>
        </Accordion>
      )}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  border: theme.borders['fill-three'],
  borderRadius: theme.borderRadiuses.large,
  background: theme.colors['fill-one'],
}))

const ContentHeaderSC = styled.div(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: HEADER_HEIGHT,
  background: theme.colors['fill-two'],
  borderBottom: theme.borders['fill-two'],
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
}))

const LeftSideSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
})

const RightSideSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  width: 450,
  height: '100%',
  borderLeft: theme.borders['fill-three'],
}))
