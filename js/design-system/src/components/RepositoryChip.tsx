import { type ComponentPropsWithRef, type ReactNode, useState } from 'react'
import styled, { type StyledObject } from 'styled-components'

import Flex, { type FlexProps } from './Flex'
import CheckRoundedIcon from './icons/CheckRoundedIcon'
import PlusIcon from './icons/PlusIcon'
import WrapWithIf from './WrapWithIf'
import Tooltip from './Tooltip'

type TagProps = Omit<FlexProps, 'tooltip'> &
  Pick<
    ComponentPropsWithRef<'div'>,
    'onClick' | 'onMouseEnter' | 'onMouseLeave'
  > & {
  label: string
  imageUrl?: string
  checked?: boolean
  disabled?: boolean
  icon?: ReactNode
  tooltip?: string
}

function RepositoryChip({
  label,
  imageUrl = '',
  checked = false,
  disabled = false,
  icon = null,
  tooltip,
  onClick,
  onMouseEnter,
  onMouseLeave,
  css,
  className,
  ...props
}: TagProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <WrapWithIf
      condition={!!tooltip}
      wrapper={<Tooltip label={tooltip} />}
    >
      <RepositoryChipSC
        $checked={checked}
        $disabled={disabled}
        className={className}
        onClick={onClick}
        onMouseEnter={(e) => {
          setHovered(true)
          onMouseEnter?.(e)
        }}
        onMouseLeave={(e) => {
          setHovered(false)
          onMouseLeave?.(e)
        }}
        css={{ ...props, ...css } as StyledObject}
      >
        <Flex
          align="center"
          overflow="hidden"
        >
          {icon ? (
            <IconWrapSC>
              {icon}
            </IconWrapSC>
          ) : imageUrl ? (
            <IconImgSC
              src={imageUrl}
              alt={label}
            />
          ) : null}
          <LabelSC title={label}>{label}</LabelSC>
        </Flex>
        <CheckRoundedIcon
          color="border-outline-focused"
          display={checked ? 'visible' : 'none'}
          marginLeft="small"
        />
        <PlusIcon
          color="text-light"
          display={hovered && !checked && !disabled ? 'visible' : 'none'}
          marginLeft="small"
          height={16}
        />
      </RepositoryChipSC>
    </WrapWithIf>
  )
}

const RepositoryChipSC = styled.div<{
  $checked: boolean
  $disabled: boolean
}>(({ theme, $checked, $disabled }) => ({
  display: 'flex',
  padding: theme.spacing.xsmall,
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: $disabled ? 'not-allowed' : 'pointer',
  opacity: $disabled ? 0.5 : 1,
  borderRadius: theme.borderRadiuses.large,
  border: `1px solid ${
    $checked
      ? theme.colors['border-outline-focused']
      : theme.colors['border-fill-two']
  }`,
  backgroundColor: theme.colors['fill-two'],
  whiteSpace: 'nowrap',
  transition: 'background-color 200ms ease',
  ...(!$disabled && {
    '&:hover': {
      backgroundColor: theme.colors['fill-two-hover'],
    },
  }),
}))

const IconWrapSC = styled(Flex)(({ theme }) => ({
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.colors['fill-three'],
  padding: 2,
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.medium,
  width: 24,
  height: 24,
}))

const LabelSC = styled.p(({ theme }) => ({
  margin: 0,
  ...theme.partials.text.body2,
  marginLeft: theme.spacing.medium,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const IconImgSC = styled.img(({ theme }) => ({
  objectPosition: 'center',
  backgroundColor: theme.colors['fill-three'],
  padding: 2,
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.medium,
  width: 24,
  height: 24,
}))

export default RepositoryChip
