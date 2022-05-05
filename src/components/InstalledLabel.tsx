import { Flex, FlexProps, P } from 'honorable'
import PropTypes from 'prop-types'

import CheckOutlineIcon from './icons/CheckOutlineIcon'

type InstalledLabelProps = FlexProps & {
  label?: string
}

const propTypes = {
  label: PropTypes.string,
}

function InstalledLabel({ label = 'Installed', ...props }: InstalledLabelProps) {
  return (
    <Flex
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

InstalledLabel.propTypes = propTypes

export default InstalledLabel
