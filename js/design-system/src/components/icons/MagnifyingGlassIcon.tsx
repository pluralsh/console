import { useId } from 'react'

import createIcon from './createIcon'

export default createIcon(({ size, color }) => {
  const maskId = useId()

  return (
    <svg
      width={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <clipPath id={maskId}>
        <path d="m0 0h16v16h-16z" />
      </clipPath>
      <g clipPath={`url(#${maskId})`}>
        <path
          stroke={color}
          strokeMiterlimit="10"
          d="m11.3998 5.9001c0-2.9-2.4-5.300002-5.3-5.300002s-5.299995 2.400002-5.299995 5.300002 2.399995 5.3 5.299995 5.3 5.3-2.4 5.3-5.3z"
        />
        <path
          fill={color}
          d="m15.8998 14.2002-1.8 1.8-3.4-3.4c-.2-.2-.2-.5 0-.6l1.8-1.8 3.4 3.4c.1.2.1.4 0 .6z"
        />
      </g>
    </svg>
  )
})
