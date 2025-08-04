import {
  Accordion,
  AccordionItem,
  ArrowTopRightIcon,
  DropdownArrowIcon,
  EmptyState,
  IconFrame,
  ReloadIcon,
  Toast,
} from '@pluralsh/design-system'
import {
  PullRequestFragment,
  useKickStackPullRequestMutation,
  useStackRunsQuery,
} from 'generated/graphql'
import { Link, useParams } from 'react-router-dom'

import { isEmpty } from 'lodash'

import styled, { useTheme } from 'styled-components'

import { PrStatusChip } from 'components/self-service/pr/queue/PrQueueColumns'

import { StackRunsScroller } from '../runs/StackRunsScroller'

// can't really make this dynamic with the current scroller component
const ACCORDION_TABLE_HEIGHT = '300px'

export function PrStackRunsAccordion({
  pr,
  isOpen,
  toggleOpen,
}: {
  pr: PullRequestFragment
  isOpen: boolean
  toggleOpen: (open: boolean) => void
}) {
  const theme = useTheme()
  const { stackId = '' } = useParams()

  const queryResult = useStackRunsQuery({
    variables: { id: stackId, pullRequestId: pr.id },
    fetchPolicy: 'cache-and-network',
    pollInterval: 5_000,
    skip: !isOpen,
  })

  return (
    <Accordion
      fillLevel={1}
      type="single"
      value={isOpen ? 'item' : ''}
      css={{ width: '100%', borderRadius: 0, border: 'none' }}
    >
      <AccordionItem
        value="item"
        caret="none"
        padding="none"
        trigger={
          <PrStackRunsAccordionTrigger
            isOpen={isOpen}
            toggleOpen={toggleOpen}
            pr={pr}
          />
        }
      >
        {queryResult.data ? (
          !isEmpty(queryResult.data.infrastructureStack?.runs) ? (
            <ScrollerWrapperSC>
              <StackRunsScroller
                entryStyles={{
                  paddingLeft: `${theme.spacing.xxxlarge}px`,
                  background: theme.colors['fill-two'],
                  borderBottom: theme.borders['fill-two'],
                  '&:hover': {
                    backgroundColor: theme.colors['fill-two-hover'],
                  },
                }}
                queryResult={queryResult}
              />
            </ScrollerWrapperSC>
          ) : (
            <EmptyState message="No runs found." />
          )
        ) : null}
      </AccordionItem>
    </Accordion>
  )
}

function PrStackRunsAccordionTrigger({
  pr,
  isOpen,
  toggleOpen,
}: {
  pr: PullRequestFragment
  isOpen: boolean
  toggleOpen: (open: boolean) => void
}) {
  return (
    <TriggerWrapperSC onClick={() => toggleOpen(!isOpen)}>
      <TriggerArrowSC
        size="medium"
        className={isOpen ? 'open' : ''}
      />
      <span>{pr.title}</span>
      <PrStatusChip status={pr.status} />
      {pr.creator && <span>created by {pr.creator}</span>}
      <ResyncStackPr id={pr.id} />
      <IconFrame
        icon={<ArrowTopRightIcon />}
        as={EndLinkSC}
        to={pr.url}
        target="_blank"
        rel="noopener noreferrer"
      />
    </TriggerWrapperSC>
  )
}

function ResyncStackPr({ id }: { id: string }) {
  const [mutation, { loading, error }] = useKickStackPullRequestMutation({
    variables: { id },
  })

  return (
    <>
      <IconFrame
        css={{ marginLeft: 'auto' }}
        disabled={loading}
        clickable
        type="floating"
        tooltip="Resync"
        icon={<ReloadIcon />}
        onClick={(e) => {
          e.stopPropagation()
          mutation()
        }}
      />
      {error && (
        <Toast
          heading="Resync error"
          severity="danger"
          closeTimeout={4500}
          margin="large"
          marginRight="xxxxlarge"
        >
          {error.message}
        </Toast>
      )}
    </>
  )
}

const EndLinkSC = styled(Link)(({ theme }) => ({
  '&:hover': {
    background: theme.colors['fill-two-hover'],
  },
}))

const TriggerWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  width: '100%',
  ...theme.partials.text.body2Bold,
  color: theme.colors['text-light'],
  alignItems: 'center',
  gap: theme.spacing.large,
  padding: `${theme.spacing.medium}px`,
  cursor: 'pointer',
  background: theme.colors['fill-one'],
  '&:hover': {
    background: theme.colors['fill-one-hover'],
  },
}))

const TriggerArrowSC = styled(DropdownArrowIcon)(({ theme }) => ({
  position: 'relative',
  transition: 'transform 0.25s ease',
  transform: 'rotate(-90deg)',
  width: theme.spacing.medium,
  '&.open': { transform: 'rotate(0deg)' },
}))

const ScrollerWrapperSC = styled.div(({ theme }) => ({
  padding: `${theme.spacing.xsmall}px 0`,
  background: theme.colors['fill-two'],
  height: ACCORDION_TABLE_HEIGHT,
  position: 'relative', // for the "back to top" button to position correctly
}))
