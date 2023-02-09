import { ComponentProps, Ref, forwardRef } from 'react'
import styled from 'styled-components'

import { FillLevel, useFillLevel } from './contexts/FillLevelContext'
import { TabBaseProps } from './TabList'

type SubTabSize = 'small' | 'medium'
type SubtabProps = TabBaseProps &
  ComponentProps<'div'> & {
    size?: SubTabSize
  }

const parentFillLevelToActiveBG: Record<FillLevel, string> = {
  0: 'fill-zero-selected',
  1: 'fill-one-selected',
  2: 'fill-two-selected',
  3: 'fill-three-selected',
}

const parentFillLevelToHoverBG: Record<FillLevel, string> = {
  0: 'fill-zero-hover',
  1: 'fill-one-hover',
  2: 'fill-two-hover',
  3: 'fill-three-hover',
}

const SubTabBase = styled.div<{
  size: SubTabSize
  active: boolean
  parentFillLevel: FillLevel
}>(({
  theme, active, size, parentFillLevel,
}) => ({
  ...(size === 'small'
    ? theme.partials.text.buttonSmall
    : theme.partials.text.buttonMedium),
  tabIndex: 0,
  userSelect: 'none',
  cursor: active ? 'default' : 'pointer',
  color: active ? theme.colors.text : theme.colors['text-xlight'],
  backgroundColor: active
    ? theme.colors[parentFillLevelToActiveBG[parentFillLevel]]
    : 'transparent',
  borderRadius: theme.borderRadiuses.medium,
  focusVisible: {
    zIndex: theme.zIndexes.base + 1,
    ...theme.partials.focus.default,
  },
  padding: `${size === 'small' ? theme.spacing.xxsmall : theme.spacing.xsmall}px ${theme.spacing.medium}px`,
  align: 'center',
  ':hover': {
    backgroundColor: !active ? theme.colors[parentFillLevelToHoverBG[parentFillLevel]] : undefined,
  },
  transition:
    'background-color 150ms ease, border-color 150ms ease, color 150ms ease',
  '.codeTabInner': {},
}))

function SubTabRef({
  active,
  children,
  textValue: _textValue,
  size = 'medium',
  ...props
}: SubtabProps,
ref: Ref<any>) {
  const parentFillLevel = useFillLevel()

  return (
    <SubTabBase
      parentFillLevel={parentFillLevel}
      active={active}
      ref={ref}
      size={size}
      {...props}
    >
      {children}
    </SubTabBase>
  )
}

export const SubTab = forwardRef(SubTabRef)
export default SubTab
