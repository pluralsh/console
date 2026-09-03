import { CSSProperties, useMemo } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { ChipAttrs } from './mentionTypes'
import { MentionResults } from './MentionResults'
import { MentionAutocompleteState } from './useMentionAutocomplete'

const MENU_GAP = 12
const MENU_MAX_HEIGHT = 320
const MENU_WIDTH = 320

export function MentionMenu({
  autoCompleteState: { isOpen, anchorRect, items, highlightedIndex, loading },
  onSelect,
  onHover,
}: {
  autoCompleteState: MentionAutocompleteState
  onSelect: (item: ChipAttrs) => void
  onHover: (index: number) => void
}) {
  const style = useMemo<CSSProperties | null>(() => {
    if (!isOpen || !anchorRect) return null
    const viewportH = window.innerHeight
    const viewportW = window.innerWidth

    const placeAbove =
      anchorRect.bottom + MENU_GAP + MENU_MAX_HEIGHT > viewportH &&
      anchorRect.top > viewportH - anchorRect.bottom
    return {
      position: 'fixed',
      left: Math.min(Math.max(8, anchorRect.left), viewportW - MENU_WIDTH - 8),
      ...(placeAbove
        ? { bottom: viewportH - anchorRect.top + MENU_GAP }
        : { top: anchorRect.bottom + MENU_GAP }),
      width: MENU_WIDTH,
      zIndex: 9999,
      maxHeight: Math.min(
        MENU_MAX_HEIGHT,
        (placeAbove ? anchorRect.top : viewportH - anchorRect.bottom) -
          MENU_GAP -
          8
      ),
    }
  }, [isOpen, anchorRect])

  if (!isOpen || !style) return null

  return createPortal(
    <MenuSC style={style}>
      <MentionResults
        items={items}
        highlightedIndex={highlightedIndex}
        loading={loading}
        onSelect={onSelect}
        onHover={onHover}
      />
    </MenuSC>,
    document.body
  )
}

const MenuSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-one'],
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.large,
  boxShadow: theme.boxShadows.modal,
  overflow: 'hidden',
}))
