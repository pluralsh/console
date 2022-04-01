import { useContext } from 'react'
import PropTypes from 'prop-types'
import { ThemeContext } from 'grommet'
import { normalizeColor } from 'grommet/utils'

function createIcon(render) {
  function Icon({ size, color, ...props }) {
    const theme = useContext(ThemeContext)
    const workingColor = normalizeColor(color, theme)

    return render({ size, color: workingColor, ...props })
  }

  Icon.propTypes = {
    size: PropTypes.number,
    color: PropTypes.string,
  }

  Icon.defaultProps = {
    size: 16,
    color: 'white',
  }

  return Icon
}

export default createIcon
