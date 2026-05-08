import { Tooltip } from '@pluralsh/design-system'
import {
  CHIP_ATTR_PREFIX,
  CHIP_DATA_ATTR,
  CHIP_TAG_ATTR,
} from 'components/utils/contentEditableChips'
import {
  forwardRef,
  RefObject,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react'
import { MentionKind } from './mentionTypes'

const SKILL_SELECTOR = `[${CHIP_DATA_ATTR}="true"][${CHIP_TAG_ATTR}="${MentionKind.Skill}"]`
const DESC_ATTR = `${CHIP_ATTR_PREFIX}description`
const NAME_ATTR = `${CHIP_ATTR_PREFIX}item-name`

const TIP_ON_INPUT_STYLE = {
  maxWidth: 500,
  overflowWrap: 'break-word' as const,
  zIndex: 11_000,
}

/**
 * Mirrors the DOM chip bounds so design-system Tooltip (manual mode) positions
 * the tip like a hover target; the real chip is contenteditable markup.
 */
const ChipAnchorStub = forwardRef<HTMLSpanElement, { chip: HTMLElement }>(
  function ChipAnchorStub({ chip }, ref) {
    const [rect, setRect] = useState(() => chip.getBoundingClientRect())

    useLayoutEffect(() => {
      let raf = 0
      const sync = () => {
        cancelAnimationFrame(raf)
        raf = requestAnimationFrame(() => {
          if (!chip.isConnected) return
          setRect(chip.getBoundingClientRect())
        })
      }
      sync()
      window.addEventListener('scroll', sync, true)
      window.addEventListener('resize', sync)
      return () => {
        cancelAnimationFrame(raf)
        window.removeEventListener('scroll', sync, true)
        window.removeEventListener('resize', sync)
      }
    }, [chip])

    return (
      <span
        ref={ref}
        aria-hidden
        style={{
          position: 'fixed',
          left: rect.left,
          top: rect.top,
          width: Math.max(rect.width, 1),
          height: Math.max(rect.height, 1),
          pointerEvents: 'none',
        }}
      />
    )
  }
)

export function EditableSkillChipTooltip({
  containerRef,
}: {
  containerRef: RefObject<HTMLElement | null>
}) {
  const [hint, setHint] = useState<{ chip: HTMLElement; label: string } | null>(
    null
  )

  useEffect(() => {
    const insideInput = (n: EventTarget | null) => {
      const root = containerRef.current
      return root instanceof Node && n instanceof Node && root.contains(n)
    }

    const labelFor = (chip: Element) =>
      chip.getAttribute(DESC_ATTR)?.trim() ||
      chip.getAttribute(NAME_ATTR)?.trim() ||
      null

    const onOver = (e: PointerEvent) => {
      if (!insideInput(e.target)) return
      const chip = (e.target as Element).closest(SKILL_SELECTOR)
      if (!chip) return
      const label = labelFor(chip)
      if (!label) return
      setHint({ chip: chip as HTMLElement, label })
    }

    const onOut = (e: PointerEvent) => {
      if (!insideInput(e.target)) return
      const from =
        e.target instanceof Element ? e.target.closest(SKILL_SELECTOR) : null
      if (!from) return
      const next = e.relatedTarget
      if (next instanceof Node && from.contains(next)) return
      setHint((h) => (h?.chip === from ? null : h))
    }

    document.addEventListener('pointerover', onOver, true)
    document.addEventListener('pointerout', onOut, true)
    return () => {
      document.removeEventListener('pointerover', onOver, true)
      document.removeEventListener('pointerout', onOut, true)
    }
  }, [])

  if (!hint) return null

  return (
    <Tooltip
      key={hint.chip.getAttribute(`${CHIP_ATTR_PREFIX}item-id`) ?? hint.label}
      displayOn="manual"
      dismissable={false}
      manualOpen
      label={hint.label}
      placement="top"
      style={TIP_ON_INPUT_STYLE}
    >
      <ChipAnchorStub chip={hint.chip} />
    </Tooltip>
  )
}
