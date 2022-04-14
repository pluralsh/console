import { useContext } from 'react'
import { ThemeContext } from 'grommet'
import { normalizeColor } from 'grommet/utils'

function createIcon(render) {
  function Icon({ size = 16, color = 'white', ...props }) {
    const theme = useContext(ThemeContext)
    const workingColor = normalizeColor(color, theme)

    return render({ size, color: workingColor, ...props })
  }

  return Icon
}

export default createIcon
