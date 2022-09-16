import { Ref, forwardRef } from 'react'
import {
  Div,
  Flex,
  FlexProps,
  Img,
  P,
} from 'honorable'
import PropTypes from 'prop-types'

import CheckRoundedIcon from './icons/CheckRoundedIcon'

type TagProps = FlexProps & {
  label: string
  imageUrl: string
  checked: boolean
}

const propTypes = {
  label: PropTypes.string.isRequired,
  imageUrl: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
}

function RepositoryChipRef({
  label,
  imageUrl,
  checked,
  ...props
}: TagProps, ref: Ref<any>) {
  return (
    <Flex
      ref={ref}
      padding="xsmall"
      align="center"
      backgroundColor="fill-two"
      borderRadius="large"
      border={`1px solid ${checked ? 'border-outline-focused' : 'border-fill-two'}`}
      cursor="pointer"
      {...props}
    >
      <Img
        src={imageUrl}
        width={24}
        backgroundColor="fill-three"
        border="1px solid border-input"
        padding={2}
        borderRadius="medium"
      />
      <P
        body2
        marginLeft="medium"
      >
        {label}
      </P>
      <Div flexGrow={1} />
      {checked && (
        <CheckRoundedIcon
          color="border-outline-focused"
        />
      )}
    </Flex>
  )
}

const RepositoryChip = forwardRef(RepositoryChipRef)

RepositoryChip.propTypes = propTypes

export default RepositoryChip
