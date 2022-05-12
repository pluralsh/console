import { Flex, FlexProps, P } from 'honorable'
import PropTypes from 'prop-types'
import { Ref, forwardRef } from 'react'

import CheckOutlineIcon from './icons/CheckOutlineIcon'

type InstalledLabelProps = FlexProps & {
  label?: string
}

const propTypes = {
  label: PropTypes.string,
}

function InstalledLabelRef({ label = 'Installed', ...props }: InstalledLabelProps, ref: Ref<any>) {
  return (
    <Flex
      ref={ref}
      align="center"
      {...props}
    >
      <P fontWeight="bold">
        {label}
      </P>
      <CheckOutlineIcon
        color="success"
        ml={0.333}
      />
    </Flex>
  )
}

const InstalledLabel = forwardRef(InstalledLabelRef)

InstalledLabel.propTypes = propTypes

export default InstalledLabel
