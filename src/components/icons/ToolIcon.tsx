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
        <path d="m0 0h20v20h-20z" />
      </clipPath>
      <g
        clipPath={`url(#${id1})`}
        transform="matrix(.8 0 0 .8 .001701 .007876)"
      >
        <path
          d="m2.42514 2.61589 2.09179 2.70702 2.25328-1.74572-2.09179-2.707016s1.99182-.669064 3.70678 1.453486c0 0 .99975 1.55346-.02307 3.58373l5.12177 6.65221s2.1841-.6076 3.7453 1.1689c0 0 1.2996 1.5381.3922 3.5145l-2.0841-2.6916-2.4071 1.8688 2.0841 2.6916s-1.8611.646-3.3838-1.0843c-1.5227-1.7304-.2538-3.9837-.2538-3.9837l-5.14487-6.63679s-2.24559.68445-3.64524-1.03051-.36145-3.76061-.36145-3.76061z"
          stroke={color}
          strokeMiterlimit="10"
        />
      </g>
    </svg>
  )
})
