import { Box, Text } from 'grommet'
import CheckOutlineIcon from './icons/CheckOutlineIcon'

function InstalledLabel({ label = 'Installed' }) {
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

export default InstalledLabel
