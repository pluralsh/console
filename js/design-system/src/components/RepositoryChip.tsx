import { type ReactNode, useState } from 'react'
import { Flex, type FlexProps } from 'honorable'
import styled from 'styled-components'

import CheckRoundedIcon from './icons/CheckRoundedIcon'
import PlusIcon from './icons/PlusIcon'
import WrapWithIf from './WrapWithIf'
import Tooltip from './Tooltip'

type TagProps = FlexProps & {
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
  ...props
}: TagProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <WrapWithIf
      condition={!!tooltip}
      wrapper={<Tooltip label={tooltip} />}
    >
      <Flex
        padding="xsmall"
        align="center"
        justify="space-between"
        cursor={disabled ? 'not-allowed' : 'pointer'}
        opacity={disabled ? 0.5 : 1}
        borderRadius="large"
        border={`1px solid ${
          checked ? 'border-outline-focused' : 'border-fill-two'
        }`}
        backgroundColor="fill-two"
        _hover={disabled ? {} : { backgroundColor: 'fill-two-hover' }}
        transition="background-color 200ms ease"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        whiteSpace="nowrap"
        {...props}
      >
        <Flex
          align="center"
          overflow="hidden"
        >
          {icon ? (
            <Flex
              align="center"
              justify="center"
              backgroundColor="fill-three"
              padding={2}
              border="1px solid border-input"
              borderRadius="medium"
              width={24}
              height={24}
            >
              {icon}
            </Flex>
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
      </Flex>
    </WrapWithIf>
  )
}

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
