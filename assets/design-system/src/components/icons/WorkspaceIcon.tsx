import { useId } from 'react'

import createIcon from './createIcon'

export default createIcon(({ size, color }) => {
  const id1 = useId()

  return (
    <svg
      width={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <clipPath id={id1}>
        <path d="m0 0h16v16h-16z" />
      </clipPath>
      <g
        clipPath={`url(#${id1})`}
        stroke={color}
        strokeMiterlimit="10"
      >
        <path d="m12.3166.447876h-8.64082c-.56307 0-1.01953.45646-1.01953 1.019534v3.93337c0 .56308.45646 1.01953 1.01953 1.01953h8.64082c.5631 0 1.0196-.45645 1.0196-1.01953v-3.93337c0-.563074-.4565-1.019534-1.0196-1.019534z" />
        <path
          d="m8 8.51611v-2.0957"
          strokeWidth="1.17"
        />
        <path d="m15.5514 15.552v-7.03601h-15.104134v7.03601" />
        <path d="m15.5514 10.6809h-15.104134" />
      </g>
    </svg>
  )
})
