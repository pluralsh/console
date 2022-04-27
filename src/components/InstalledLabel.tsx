import { Div, DivProps, P } from 'honorable'
import PropTypes from 'prop-types'

import CheckOutlineIcon from './icons/CheckOutlineIcon'

type InstalledLabelProps = DivProps & {
  label?: string
}

const propTypes = {
  label: PropTypes.string,
}

function InstalledLabel({ label = 'Installed', ...props }: InstalledLabelProps) {
  return (
    <Div
      xflex="x4"
      {...props}
    >
      <P fontWeight="bold">
        {label}
      </P>
      <CheckOutlineIcon
        color="success"
        ml={0.333}
      />
    </Div>
  )
}

InstalledLabel.propTypes = propTypes

export default InstalledLabel
