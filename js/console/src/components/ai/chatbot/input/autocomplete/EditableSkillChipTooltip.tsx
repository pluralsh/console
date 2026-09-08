import { Tooltip } from '@pluralsh/design-system'
import {
  CHIP_ATTR_PREFIX,
  CHIP_DATA_ATTR,
  CHIP_TAG_ATTR,
} from 'components/utils/contentEditableChips'
import {
  forwardRef,
  ReactNode,
  RefObject,
  useEffect,
  useLayoutEffect,
  useState,
} from 'react'
import { MentionKind } from './mentionTypes'
import {
  hasVulnerabilityChipTooltip,
  VulnerabilityChipTooltipLabel,
  vulnerabilityChipTooltipText,
} from './VulnerabilityChipTooltipLabel'

const PLRL_CHIP_SELECTOR = [MentionKind.Skill, MentionKind.Vulnerability]
  .map((kind) => `[${CHIP_DATA_ATTR}="true"][${CHIP_TAG_ATTR}="${kind}"]`)
  .join(',')
const DESC_ATTR = `${CHIP_ATTR_PREFIX}description`
const NAME_ATTR = `${CHIP_ATTR_PREFIX}item-name`
const TITLE_ATTR = `${CHIP_ATTR_PREFIX}title`

const TIP_ON_INPUT_STYLE = {
  maxWidth: 500,
  overflowWrap: 'break-word' as const,
  zIndex: 11_000,
}

function chipHintFromTarget(
  eventTarget: EventTarget | null
): { chip: HTMLElement; label: ReactNode; hintKey: string } | null {
  if (!(eventTarget instanceof Element)) return null
  const chip = eventTarget.closest(PLRL_CHIP_SELECTOR)
  if (!(chip instanceof HTMLElement)) return null

  const tag = chip.getAttribute(CHIP_TAG_ATTR)
  const itemId = chip.getAttribute(`${CHIP_ATTR_PREFIX}item-id`) ?? ''
  const description = chip.getAttribute(DESC_ATTR)?.trim()
  const name = chip.getAttribute(NAME_ATTR)?.trim()
  const title = chip.getAttribute(TITLE_ATTR)?.trim()

  switch (tag) {
    case MentionKind.Skill: {
      const label = description || name
      if (!label) return null
      return {
        chip,
        label,
        hintKey: `${tag}|${itemId}|${description ?? ''}|${name ?? ''}`,
      }
    }
    case MentionKind.Vulnerability: {
      if (!hasVulnerabilityChipTooltip({ title, description })) return null
      return {
        chip,
        label: (
          <VulnerabilityChipTooltipLabel
            title={title}
            description={description}
          />
        ),
        hintKey: `${tag}|${itemId}|${title ?? ''}|${description ?? ''}`,
      }
    }
    default:
      return null
  }
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
  const [hint, setHint] = useState<{
    chip: HTMLElement
    label: ReactNode
    hintKey: string
  } | null>(null)

  useEffect(() => {
    const editorRoot = containerRef.current
    if (!editorRoot) return

    const onPointerMove = (event: PointerEvent) => {
      const next = chipHintFromTarget(event.target)
      setHint((current) => {
        if (!next) return null
        return current?.chip === next.chip && current.hintKey === next.hintKey
          ? current
          : next
      })
    }

    const onPointerLeave = () => setHint(null)

    editorRoot.addEventListener('pointermove', onPointerMove)
    editorRoot.addEventListener('pointerleave', onPointerLeave)
    return () => {
      editorRoot.removeEventListener('pointermove', onPointerMove)
      editorRoot.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [containerRef])

  if (!hint) return null

  const textValue =
    hint.chip.getAttribute(CHIP_TAG_ATTR) === MentionKind.Vulnerability
      ? vulnerabilityChipTooltipText({
          title: hint.chip.getAttribute(TITLE_ATTR) ?? undefined,
          description: hint.chip.getAttribute(DESC_ATTR) ?? undefined,
        })
      : typeof hint.label === 'string'
        ? hint.label
        : undefined

  return (
    <Tooltip
      key={hint.hintKey}
      dismissable={false}
      displayOn="manual"
      manualOpen
      label={hint.label}
      textValue={textValue}
      placement="top"
      style={TIP_ON_INPUT_STYLE}
    >
      <ChipAnchorStub chip={hint.chip} />
    </Tooltip>
  )
}
