import {
  AiSparkleFilledIcon,
  Button,
  IconFrame,
  SearchIcon,
} from '@pluralsh/design-system'

import styled from 'styled-components'

import { brand } from '@src/theme/docsTheme'
import { mqs } from './Breakpoints'

function SearchTrigger({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <IconFrame
        clickable
        size="large"
        type="floating"
        textValue="Search docs"
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
      <span className="placeholder">Search docs…</span>
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
        textValue="Ask AI"
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

const AskAiButton = styled(Button)((_) => ({
  height: 36,
  minHeight: 36,
  borderRadius: 4,
  borderColor: brand['line-strong'],
  background: brand.surface,
  fontWeight: 500,
  '&:hover': {
    background: brand.surface,
    borderColor: brand.subtle,
  },
}))

const SearchBar = styled.button(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  width: 240,
  [mqs.threeColumn]: {
    width: 300,
    maxWidth: '26vw',
  },
  height: 36,
  padding: `0 ${theme.spacing.xsmall} 0 ${theme.spacing.small}`,
  border: `1px solid ${brand['line-strong']}`,
  borderRadius: 4,
  background: brand.surface,
  color: brand.muted,
  cursor: 'pointer',
  fontFamily: theme.fontFamilies.sans,
  fontSize: 14,
  lineHeight: 1.4,
  letterSpacing: '0.01em',
  transition: 'border-color 0.2s ease-out, color 0.2s ease-out',
  '.searchIcon': {
    flexShrink: 0,
    color: brand.muted,
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
    borderColor: brand.subtle,
    color: brand.ink,
  },
  '&:focus, &:focus-visible': {
    outline: 'none',
  },
  '&:focus-visible': {
    outline: `2px solid ${brand.accent}`,
    outlineOffset: 2,
  },
}))

const Kbd = styled.kbd(({ theme }) => ({
  ...theme.partials.text.mono,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  padding: '1px 6px',
  fontSize: 11,
  lineHeight: 1.4,
  borderRadius: 3,
  border: `1px solid ${brand['line-strong']}`,
  color: brand.muted,
}))

const CenterCluster = styled.div(({ theme }) => ({
  display: 'none',
  [mqs.fullHeader]: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xsmall,
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
