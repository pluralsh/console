import {
  memo,
  type CSSProperties,
  type ComponentPropsWithRef,
  type ReactNode,
  type Ref,
} from 'react'
import styled, {
  type DefaultTheme,
  type StyledObject,
  useTheme,
} from 'styled-components'
import { type SemanticSpacingKey } from '../theme/spacing'

const SPACER_SHORTHANDS = {
  marginHorizontal: ['marginLeft', 'marginRight'],
  marginVertical: ['marginTop', 'marginBottom'],
  paddingHorizontal: ['paddingLeft', 'paddingRight'],
  paddingVertical: ['paddingTop', 'paddingBottom'],
} as const satisfies Record<string, readonly (keyof CSSProperties)[]>

const SPACER_KEYS = new Set([
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
])

const DOM_PROP_KEYS = new Set([
  'id',
  'role',
  'tabIndex',
  'title',
  'hidden',
  'lang',
  'dir',
  'slot',
  'style',
  'draggable',
  'contentEditable',
  'spellCheck',
  'autoFocus',
  'accessKey',
  'nonce',
])

type IconSpacerShorthands = {
  marginHorizontal?: SemanticSpacingKey | CSSProperties['marginLeft']
  marginVertical?: SemanticSpacingKey | CSSProperties['marginTop']
  paddingHorizontal?: SemanticSpacingKey | CSSProperties['paddingLeft']
  paddingVertical?: SemanticSpacingKey | CSSProperties['paddingTop']
}

export type IconProps = Omit<CSSProperties, 'color' | 'translate'> &
  IconSpacerShorthands &
  Omit<ComponentPropsWithRef<'span'>, 'color' | 'translate'> & {
    css?: StyledObject
    ref?: Ref<HTMLSpanElement>
    className?: string
    children?: ReactNode
  }

function splitIconProps(props: Record<string, unknown>) {
  const domProps: Record<string, unknown> = {}
  const cssProps: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(props)) {
    if (
      DOM_PROP_KEYS.has(key) ||
      key.startsWith('aria-') ||
      key.startsWith('data-') ||
      (key.startsWith('on') && (typeof value === 'function' || value == null))
    ) {
      domProps[key] = value
    } else {
      cssProps[key] = value
    }
  }

  return { domProps, cssProps }
}

function resolveIconCss(
  props: Record<string, unknown>,
  spacing: DefaultTheme['spacing']
) {
  const out: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(props)) {
    if (key === 'display' && value === 'visible') {
      out.display = 'inline-flex'
      continue
    }

    const resolved =
      typeof value === 'string' && value in spacing
        ? spacing[value as SemanticSpacingKey]
        : value

    if (key in SPACER_SHORTHANDS) {
      for (const cssKey of SPACER_SHORTHANDS[
        key as keyof typeof SPACER_SHORTHANDS
      ]) {
        out[cssKey] = resolved
      }
    } else if (SPACER_KEYS.has(key)) {
      out[key] = resolved
    } else {
      out[key] = value
    }
  }

  return out
}

function BaseIcon({ ref, className, css, children, ...otherProps }: IconProps) {
  const theme = useTheme()
  const { domProps, cssProps } = splitIconProps(
    otherProps as Record<string, unknown>
  )

  return (
    <IconSC
      ref={ref}
      className={className}
      {...domProps}
      css={
        { ...resolveIconCss(cssProps, theme.spacing), ...css } as StyledObject
      }
    >
      {children}
    </IconSC>
  )
}

const IconSC = styled.span({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 0,
  '& *': {
    transition: 'stroke 150ms linear, fill 150ms linear',
  },
})

const Icon = memo(BaseIcon)

export default Icon
