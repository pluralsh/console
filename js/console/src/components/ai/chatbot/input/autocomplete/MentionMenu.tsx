import { CSSProperties, useMemo } from 'react'
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

  // Rendered inline (not portalled to body) so Radix Dialog scroll-lock treats
  // wheel/touch over the menu as inside the dialog and allows native scrolling.
  // position:fixed still positions relative to the viewport.
  // onMouseDown prevents scrollbar/padding clicks from blurring the editor,
  // which would otherwise close the menu via selectionchange.
  return (
    <MenuSC
      style={style}
      onMouseDown={(e) => e.preventDefault()}
    >
      <MentionResults
        items={items}
        highlightedIndex={highlightedIndex}
        loading={loading}
        onSelect={onSelect}
        onHover={onHover}
      />
    </MenuSC>
  )
}

const MenuSC = styled.div(({ theme }) => ({
  background: theme.colors['fill-one'],
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.large,
  boxShadow: theme.boxShadows.modal,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
}))
