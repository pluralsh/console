import { Tooltip } from '@pluralsh/design-system'
import {
  CHIP_ATTR_PREFIX,
  CHIP_DATA_ATTR,
  CHIP_TAG_ATTR,
} from 'components/utils/contentEditableChips'
import { compact } from 'lodash'
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
const ITEM_ID_ATTR = `${CHIP_ATTR_PREFIX}item-id`

const TIP_ON_INPUT_STYLE = {
  maxWidth: 500,
  overflowWrap: 'break-word' as const,
  zIndex: 11_000,
}

function eventTargetInEditor(
  container: HTMLElement | null,
  target: EventTarget | null
): boolean {
  if (!container || !(target instanceof Node)) return false
  return container.contains(target)
}

function nearestSkillChip(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null
  const chip = target.closest(SKILL_SELECTOR)
  return chip instanceof HTMLElement ? chip : null
}

function skillChipLabel(chip: Element): string | null {
  const [label] = compact([
    chip.getAttribute(DESC_ATTR)?.trim(),
    chip.getAttribute(NAME_ATTR)?.trim(),
  ])
  return label ?? null
}

function useChipBoundingRect(chip: HTMLElement): DOMRect {
  const [rect, setRect] = useState(() => chip.getBoundingClientRect())

  useLayoutEffect(() => {
    let frameHandle = 0
    const syncRect = () => {
      cancelAnimationFrame(frameHandle)
      frameHandle = requestAnimationFrame(() => {
        if (chip.isConnected) setRect(chip.getBoundingClientRect())
      })
    }
    syncRect()
    window.addEventListener('scroll', syncRect, true)
    window.addEventListener('resize', syncRect)
    return () => {
      cancelAnimationFrame(frameHandle)
      window.removeEventListener('scroll', syncRect, true)
      window.removeEventListener('resize', syncRect)
    }
  }, [chip])

  return rect
}

const ChipAnchorStub = forwardRef<HTMLSpanElement, { chip: HTMLElement }>(
  function ChipAnchorStub({ chip }, ref) {
    const rect = useChipBoundingRect(chip)

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
    const onPointerOver = (event: PointerEvent) => {
      if (!eventTargetInEditor(containerRef.current, event.target)) return
      const chip = nearestSkillChip(event.target)
      if (!chip) return
      const label = skillChipLabel(chip)
      if (!label) return
      setHint({ chip, label })
    }

    const onPointerOut = (event: PointerEvent) => {
      if (!eventTargetInEditor(containerRef.current, event.target)) return
      const chip = nearestSkillChip(event.target)
      if (!chip) return
      const next = event.relatedTarget
      if (next instanceof Node && chip.contains(next)) return
      setHint((current) => (current?.chip === chip ? null : current))
    }

    document.addEventListener('pointerover', onPointerOver, true)
    document.addEventListener('pointerout', onPointerOut, true)
    return () => {
      document.removeEventListener('pointerover', onPointerOver, true)
      document.removeEventListener('pointerout', onPointerOut, true)
    }
  }, [containerRef])

  if (!hint) return null

  const tooltipKey = hint.chip.getAttribute(ITEM_ID_ATTR) ?? hint.label

  return (
    <Tooltip
      key={tooltipKey}
      dismissable={false}
      displayOn="manual"
      manualOpen
      label={hint.label}
      placement="top"
      style={TIP_ON_INPUT_STYLE}
    >
      <ChipAnchorStub chip={hint.chip} />
    </Tooltip>
  )
}
