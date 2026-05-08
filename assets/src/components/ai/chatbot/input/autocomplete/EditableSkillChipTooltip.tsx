import { Tooltip } from '@pluralsh/design-system'
import compact from 'lodash/compact'
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

/** Nearest `[data-chip][data-plrl-tag=skill]` under `editorRoot`, if event target lies in the editor. */
function nearestSkillChipInEditor(
  editorRoot: HTMLElement | null,
  eventTarget: EventTarget | null
): HTMLElement | null {
  if (!editorRoot || !(eventTarget instanceof Element)) return null
  const match = eventTarget.closest(SKILL_SELECTOR)
  return match instanceof HTMLElement && editorRoot.contains(match)
    ? match
    : null
}

function skillChipLabel(chip: Element): string | null {
  return (
    compact([
      chip.getAttribute(DESC_ATTR)?.trim(),
      chip.getAttribute(NAME_ATTR)?.trim(),
    ])[0] ?? null
  )
}

const ChipAnchorStub = forwardRef<HTMLSpanElement, { chip: HTMLElement }>(
  function ChipAnchorStub({ chip }, ref) {
    const [rect, setRect] = useState(() => chip.getBoundingClientRect())

    useLayoutEffect(() => {
      let frame = 0
      const sync = () => {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(() => {
          if (chip.isConnected) setRect(chip.getBoundingClientRect())
        })
      }
      sync()
      window.addEventListener('scroll', sync, true)
      window.addEventListener('resize', sync)
      return () => {
        cancelAnimationFrame(frame)
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
    const editorRoot = containerRef.current
    if (!editorRoot) return

    const setHintFromTarget = (eventTarget: EventTarget | null) => {
      const chip = nearestSkillChipInEditor(editorRoot, eventTarget)
      if (!chip)
        return setHint((current) => (current === null ? current : null))

      const label = skillChipLabel(chip)
      if (!label) return

      setHint((current) =>
        current?.chip === chip && current.label === label
          ? current
          : { chip, label }
      )
    }

    const onPointerMove = (event: PointerEvent) => {
      setHintFromTarget(event.target)
    }

    const onPointerLeave = () => {
      setHint((current) => (current === null ? current : null))
    }

    editorRoot.addEventListener('pointermove', onPointerMove)
    editorRoot.addEventListener('pointerleave', onPointerLeave)
    return () => {
      editorRoot.removeEventListener('pointermove', onPointerMove)
      editorRoot.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [containerRef])

  if (!hint) return null

  return (
    <Tooltip
      key={hint.chip.getAttribute(`${CHIP_ATTR_PREFIX}item-id`) ?? hint.label}
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
