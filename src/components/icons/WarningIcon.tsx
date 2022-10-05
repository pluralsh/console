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
        <path d="m.95459.306h16v16h-16z" />
      </clipPath>
      <g
        clipPath={`url(#${id1})`}
        transform="translate(-.95459 -.308503)"
      >
        <path
          clipRule="evenodd"
          d="m1.69248 12.3034c-.67604 1.1415.1694 2.5676 1.52069 2.5676h11.48333c1.3505 0 2.1959-1.4261 1.5206-2.5676l-5.7408-9.70127c-.67605-1.1415-2.36693-1.1415-3.04296 0zm6.68995-2.2061h1.22951v-5.55001h-1.22951zm.61495 1.4755c-.47533 0-.86066.3853-.86066.8606 0 .4754.38533.8607.86066.8607s.86066-.3853.86066-.8607c0-.4753-.38533-.8606-.86066-.8606z"
          fill={color}
          fillRule="evenodd"
        />
      </g>
    </svg>
  )
})
