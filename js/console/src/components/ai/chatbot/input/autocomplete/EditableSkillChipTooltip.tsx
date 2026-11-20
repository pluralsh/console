import { Tooltip } from '@pluralsh/design-system'
import {
  CHIP_ATTR_PREFIX,
  CHIP_DATA_ATTR,
  CHIP_TAG_ATTR,
} from 'components/utils/contentEditableChips'
import {
  ReactNode,
  Ref,
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
import {
  SentinelChipTooltipLabel,
  sentinelChipTooltipText,
} from './SentinelChipTooltipLabel'

const PLRL_CHIP_SELECTOR = [
  MentionKind.Skill,
  MentionKind.Vulnerability,
  MentionKind.SentinelRun,
  MentionKind.SentinelRunJob,
]
  .map((kind) => `[${CHIP_DATA_ATTR}="true"][${CHIP_TAG_ATTR}="${kind}"]`)
  .join(',')

function chipAttrs(chip: HTMLElement): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const attr of Array.from(chip.attributes)) {
    if (attr.name.startsWith(CHIP_ATTR_PREFIX))
      attrs[attr.name.slice(CHIP_ATTR_PREFIX.length)] = attr.value
  }
  return attrs
}
const DESC_ATTR = `${CHIP_ATTR_PREFIX}description`
const NAME_ATTR = `${CHIP_ATTR_PREFIX}item-name`
const TITLE_ATTR = `${CHIP_ATTR_PREFIX}title`

const TIP_ON_INPUT_STYLE = {
  maxWidth: 500,
  overflowWrap: 'break-word' as const,
  zIndex: 11_000,
}

type ChipHint = {
  chip: HTMLElement
  label: ReactNode
  hintKey: string
  textValue?: string
}

function chipHintFromTarget(eventTarget: EventTarget | null): ChipHint | null {
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
    case MentionKind.SentinelRun:
    case MentionKind.SentinelRunJob: {
      const attrs = chipAttrs(chip)
      const text = sentinelChipTooltipText(tag, attrs)
      if (!text) return null
      return {
        chip,
        label: (
          <SentinelChipTooltipLabel
            kind={tag}
            attrs={attrs}
          />
        ),
        textValue: text,
        hintKey: `${tag}|${itemId}|${text}`,
      }
    }
    default:
      return null
  }
}

const ChipAnchorStub = function ChipAnchorStub({
  chip,
  ref,
}: {
  chip: HTMLElement
  ref?: Ref<HTMLSpanElement>
}) {
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

export function EditableSkillChipTooltip({
  containerRef,
}: {
  containerRef: RefObject<HTMLElement | null>
}) {
  const [hint, setHint] = useState<ChipHint | null>(null)

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
    hint.textValue ??
    (hint.chip.getAttribute(CHIP_TAG_ATTR) === MentionKind.Vulnerability
      ? vulnerabilityChipTooltipText({
          title: hint.chip.getAttribute(TITLE_ATTR) ?? undefined,
          description: hint.chip.getAttribute(DESC_ATTR) ?? undefined,
        })
      : typeof hint.label === 'string'
        ? hint.label
        : undefined)

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
