import { CSSProperties, useMemo } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { ChipAttrs } from './mentionTypes'
import { MentionResults } from './MentionResults'

const MENU_GAP = 4
const MENU_MAX_HEIGHT = 320
const MENU_WIDTH = 320

export function MentionMenu({
  isOpen,
  anchorRect,
  items,
  highlightedIndex,
  loading,
  onSelect,
  onHover,
}: {
  isOpen: boolean
  anchorRect: DOMRect | null
  items: ChipAttrs[]
  highlightedIndex: number
  loading: boolean
  onSelect: (item: ChipAttrs) => void
  onHover: (index: number) => void
}) {
  const style = useMemo<CSSProperties | null>(() => {
    if (!isOpen || !anchorRect) return null
    const viewportH = window.innerHeight
    const viewportW = window.innerWidth
    // Prefer placing below; flip up if not enough room.
    const placeAbove =
      anchorRect.bottom + MENU_GAP + MENU_MAX_HEIGHT > viewportH &&
      anchorRect.top > MENU_MAX_HEIGHT
    const top = placeAbove
      ? Math.max(8, anchorRect.top - MENU_GAP - MENU_MAX_HEIGHT)
      : anchorRect.bottom + MENU_GAP
    const left = Math.min(
      Math.max(8, anchorRect.left),
      viewportW - MENU_WIDTH - 8
    )
    return {
      position: 'fixed',
      top,
      left,
      width: MENU_WIDTH,
      maxHeight: MENU_MAX_HEIGHT,
      zIndex: 9999,
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
