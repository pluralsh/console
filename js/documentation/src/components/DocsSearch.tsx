import {
  AiSparkleFilledIcon,
  Button,
  IconFrame,
  SearchIcon,
} from '@pluralsh/design-system'
import styled from 'styled-components'

import { mqs } from './Breakpoints'

function SearchTrigger({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <IconFrame
        clickable
        size="large"
        type="floating"
        tooltip="Search docs"
        icon={<SearchIcon size={16} />}
        className="docs-search-trigger"
      />
    )
  }

  return (
    <SearchBar
      type="button"
      className="docs-search-trigger"
      aria-label="Search docs"
    >
      <SearchIcon
        size={16}
        className="searchIcon"
      />
      <span className="placeholder">Search docs...</span>
      <Kbd>⌘K</Kbd>
    </SearchBar>
  )
}

function AskAiTrigger({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <IconFrame
        clickable
        size="large"
        type="secondary"
        tooltip="Ask AI"
        icon={<AiSparkleFilledIcon size={16} />}
        className="docs-ai-trigger"
      />
    )
  }

  return (
    <AskAiButton
      className="docs-ai-trigger"
      secondary
      startIcon={<AiSparkleFilledIcon size={16} />}
    >
      Ask AI
    </AskAiButton>
  )
}

export function DocsSearch() {
  return (
    <>
      <CenterCluster>
        <SearchTrigger />
        <WideAskAi>
          <AskAiTrigger />
        </WideAskAi>
        <NarrowAskAi>
          <AskAiTrigger compact />
        </NarrowAskAi>
      </CenterCluster>
      <ToolbarCluster>
        <SearchTrigger compact />
        <AskAiTrigger compact />
      </ToolbarCluster>
    </>
  )
}

const AskAiButton = styled(Button)({
  height: 40,
  minHeight: 40,
})

const SearchBar = styled.button(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  width: 220,
  [mqs.threeColumn]: {
    width: 360,
    maxWidth: '32vw',
  },
  height: 40,
  padding: `0 ${theme.spacing.xsmall}px 0 ${theme.spacing.medium}px`,
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.medium,
  background: theme.colors['fill-one'],
  color: theme.colors['text-xlight'],
  cursor: 'pointer',
  ...theme.partials.text.body2,
  '.searchIcon': {
    flexShrink: 0,
    color: theme.colors['text-light'],
  },
  '.placeholder': {
    flex: 1,
    minWidth: 0,
    textAlign: 'left',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '&:hover': {
    background: theme.colors['fill-one-hover'],
    color: theme.colors['text-light'],
  },
  '&:focus, &:focus-visible': {
    outline: 'none',
  },
  '&:focus-visible': {
    ...theme.partials.focus.default,
  },
}))

const Kbd = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  minWidth: 28,
  height: 22,
  padding: `0 ${theme.spacing.xsmall}px`,
  borderRadius: theme.borderRadiuses.medium,
  background: theme.colors['fill-two'],
  color: theme.colors['text-xlight'],
}))

const CenterCluster = styled.div(({ theme }) => ({
  display: 'none',
  [mqs.fullHeader]: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.small,
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1,
  },
}))

const ToolbarCluster = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  [mqs.fullHeader]: {
    display: 'none',
  },
}))

const WideAskAi = styled.div({
  display: 'none',
  [mqs.threeColumn]: {
    display: 'block',
  },
})

const NarrowAskAi = styled.div({
  display: 'block',
  [mqs.threeColumn]: {
    display: 'none',
  },
})
