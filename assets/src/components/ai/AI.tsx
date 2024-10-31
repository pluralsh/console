import {
  AiSparkleFilledIcon,
  Button,
  Card,
  CaretRightIcon,
  Chip,
  GearTrainIcon,
  IconFrame,
} from '@pluralsh/design-system'
import moment from 'moment'
import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { useTheme } from 'styled-components'
import { ChatThread, useChatThreadsQuery } from '../../generated/graphql.ts'
import { GLOBAL_SETTINGS_ABS_PATH } from '../../routes/settingsRoutesConst.tsx'
import { Body2P } from '../utils/typography/Text.tsx'

function AIUnstyled({ ...props }): ReactNode {
  const { data } = useChatThreadsQuery()

  const threads: Array<ChatThread> =
    data?.chatThreads?.edges?.map(
      (threadConntection) => threadConntection?.node as ChatThread
    ) ?? []

  return (
    <div {...props}>
      <Header
        heading="Plural AI"
        subheading="View ongoing threads and saved insights at a glance."
      />
      {/* <ThreadList */}
      {/*   heading="Saved" */}
      {/*   subheading="Save important threads and insights. If not saved, insights and threads are automatically deleted over time." */}
      {/*   threads={[]} */}
      {/* /> */}
      <ThreadList
        heading="All threads"
        threads={threads}
      />
    </div>
  )
}

function HeaderUnstyled({
  heading,
  subheading,
  ...props
}: StackedTextProps): ReactNode {
  const navigate = useNavigate()

  return (
    <div {...props}>
      <StackedText
        heading={heading}
        subheading={subheading}
      ></StackedText>
      <Button
        secondary
        startIcon={<GearTrainIcon />}
        onClick={() => navigate(`${GLOBAL_SETTINGS_ABS_PATH}/ai-provider`)}
      >
        Settings
      </Button>
    </div>
  )
}

interface ThreadListProps {
  threads: Array<ChatThread>
}

function ThreadListUnstyled({
  heading,
  subheading,
  threads,
  ...props
}: ThreadListProps & StackedTextProps): ReactNode {
  return (
    <div {...props}>
      <StackedText
        heading={heading}
        subheading={subheading}
      ></StackedText>
      <div className="list">
        {threads.map((thread) => (
          <Thread
            key={thread.id}
            thread={thread}
          ></Thread>
        ))}
      </div>
    </div>
  )
}

interface ThreadProps {
  thread: Omit<ChatThread, 'chats' | 'user'>
}

function ThreadUnstyled({ thread, ...props }: ThreadProps): ReactNode {
  const now = moment().utc()
  const updatedAt = moment.utc(thread.updatedAt)
  const staleAfterHours = 2
  const isStale = now.diff(updatedAt, 'hours') > staleAfterHours
  const theme = useTheme()

  return (
    <Card {...props}>
      <IconFrame
        background="fill-two"
        type="secondary"
        icon={<AiSparkleFilledIcon color="icon-info" />}
      ></IconFrame>
      <span className="title">{thread.summary}</span>
      <div className="spacer" />
      <span className="timestamp">
        Last updated {moment(thread.updatedAt).fromNow()}
      </span>
      <Chip
        severity={isStale ? 'neutral' : 'success'}
        css={{
          margin: `0 ${theme.spacing.large}px`,
          ...(isStale
            ? {
                '.children': {
                  color: theme.colors['text-light'],
                },
              }
            : {}),
        }}
      >
        {isStale ? 'Stale' : 'Active'}
      </Chip>
      <IconFrame
        clickable
        icon={<CaretRightIcon color="icon-light" />}
      ></IconFrame>
    </Card>
  )
}

interface StackedTextProps {
  heading: string
  subheading?: string
}

function StackedTextUnstyled({
  heading,
  subheading,
  ...props
}: StackedTextProps): ReactNode {
  return (
    <div {...props}>
      <span className="heading">{heading}</span>
      {subheading && <Body2P $color="text-light">{subheading}</Body2P>}
    </div>
  )
}

const AI = styled(AIUnstyled)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: theme.spacing.large,
  gap: theme.spacing.large,
  overflow: 'hidden',
}))

const Header = styled(HeaderUnstyled)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',

  '.header': {
    ...theme.partials.text.subtitle1,
  },
}))

const StackedText = styled(StackedTextUnstyled)(({ theme }) => ({
  '.heading': {
    ...theme.partials.text.subtitle1,
  },
}))

const ThreadList = styled(ThreadListUnstyled)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  overflow: 'hidden',

  '.list': {
    overflow: 'auto',
  },
}))
const Thread = styled(ThreadUnstyled)(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing.medium,
  alignItems: 'center',
  gap: theme.spacing.small,

  '.title': {
    ...theme.partials.text.body1Bold,

    minWidth: '400px',
    width: '40%',
    maxWidth: '40%',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },

  '.spacer': {
    flexGrow: 1,
  },

  '.timestamp': {
    ...theme.partials.text.caption,
    color: theme.colors['text-xlight'],
  },
}))

export default AI
