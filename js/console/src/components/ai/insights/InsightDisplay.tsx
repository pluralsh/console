import {
  Accordion,
  AccordionItem,
  Button,
  Flex,
  HamburgerMenuCollapseIcon,
  IconFrame,
  SearchDocsIcon,
} from '@pluralsh/design-system'
import { ARBITRARY_VALUE_NAME } from 'components/utils/IconExpander'
import { CaptionP } from 'components/utils/typography/Text'
import { AiInsightFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { ReactNode, useState } from 'react'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { InsightEvidence } from './InsightEvidence'
import { InsightMainContent } from './InsightMainContent'

const HEADER_HEIGHT = 40

export function InsightDisplay({
  insight,
  kind = 'resource',
  loading = false,
  headerActions,
}: {
  insight: Nullable<AiInsightFragment>
  kind: Nullable<string>
  loading: boolean
  /** When set, shows last-updated and these actions on the right of the panel header. */
  headerActions?: ReactNode
}) {
  const evidence = insight?.evidence?.filter(isNonNullable)
  const hasEvidence = !isEmpty(evidence)
  const [openItem, setOpenItem] = useState(ARBITRARY_VALUE_NAME)
  const isExpanded = openItem === ARBITRARY_VALUE_NAME
  const compactHeader = headerActions != null

  return (
    <WrapperSC>
      <LeftSideSC>
        <ContentHeaderSC>
          <span>insights</span>
          <Flex
            align="center"
            gap="small"
          >
            {compactHeader && insight?.updatedAt && (
              <CaptionP
                $color="text-xlight"
                css={{ textTransform: 'none' }}
              >
                Last updated {fromNow(insight.updatedAt)}
              </CaptionP>
            )}
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
            {headerActions}
          </Flex>
        </ContentHeaderSC>
        <InsightMainContent
          text={insight?.text}
          kind={kind}
          loading={loading}
        />
      </LeftSideSC>
      {hasEvidence && (
        <Accordion
          type="single"
          value={openItem}
          orientation="horizontal"
          css={{ border: 'none', maxWidth: '50%' }}
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
                <span>evidence</span>
                <IconFrame
                  clickable
                  size="large"
                  icon={<HamburgerMenuCollapseIcon />}
                  onClick={() => setOpenItem('')}
                  tooltip="Close panel"
                />
              </ContentHeaderSC>
              <InsightEvidence evidence={evidence ?? []} />
            </RightSideSC>
          </AccordionItem>
        </Accordion>
      )}
    </WrapperSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  height: '100%',
  width: '100%',
  overflow: 'hidden',
  border: theme.borders['fill-three'],
  borderRadius: theme.borderRadiuses.large,
  background:
    theme.mode === 'light'
      ? theme.colors['fill-zero']
      : theme.colors['fill-one'],
}))

const ContentHeaderSC = styled.div(({ theme }) => ({
  ...theme.partials.text.overline,
  color: theme.colors['text-xlight'],
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.small,
  height: HEADER_HEIGHT,
  flexShrink: 0,
  minWidth: 0,
  background:
    theme.mode === 'light'
      ? theme.colors['fill-one']
      : theme.colors['fill-two'],
  borderBottom: theme.borders['fill-two'],
  padding: `0 ${theme.spacing.medium}`,
}))

const LeftSideSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  minWidth: '50%', // overrides flex min width, prevents crowding out the right side
})

const RightSideSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  height: '100%',
  borderLeft: theme.borders['fill-three'],
}))
