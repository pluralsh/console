import { useTheme } from 'styled-components'

import createIcon from './createIcon'

export default createIcon(({ size, color, secondaryColor }) => {
  const theme = useTheme()

  return (
    <svg
      width={size}
      fill="none"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="m8 11.2c-.6 0-1-.4-1-1v-2c-.6-.4-1-1-1-1.7 0-1.1.9-2 2-2s2 .9 2 2c0 .7-.4 1.4-1 1.7v2c0 .6-.4 1-1 1z"
        fill={secondaryColor || theme.colors['fill-one']}
      />
      <path
        d="m15 7.3c0 4-3 7.8-7 8.7-4-.9-7-4.7-7-8.7v-4.4l7-2.9 7 2.9zm-6.2.8c.6-.3 1-.9 1-1.6 0-1-.8-1.8-1.8-1.8s-1.8.8-1.8 1.8c0 .7.4 1.3 1 1.6v2.2c0 .4.4.7.8.7s.8-.3.8-.8z"
        fill={color}
      />
    </svg>
  )
})
