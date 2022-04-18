import { Box, Text } from 'grommet'
import PropTypes from 'prop-types'

import CheckOutlineIcon from './icons/CheckOutlineIcon'

type InstalledLabelProps = {
  label?: string
}

const propTypes = {
  label: PropTypes.string,
}

function InstalledLabel({ label = 'Installed' }: InstalledLabelProps) {
  return (
    <Box
      direction="row"
      align="center"
    >
      <Text weight="bold">
        {label}
      </Text>
      <CheckOutlineIcon
        color="status-ok"
        style={{ marginLeft: '6px' }}
      />
    </Box>
  )
}

InstalledLabel.propTypes = propTypes

export default InstalledLabel
