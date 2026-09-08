import createIcon from './createIcon'

export default createIcon(({ size, mode }) => {
  const { fill1, fill2, clipFill } =
    mode === 'dark'
      ? { fill1: '#4B4646', fill2: '#F1ECEC', clipFill: '#fff' }
      : { fill1: '#CFCECD', fill2: '#211E1E', clipFill: '#fff' }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_1401_86274)">
        <mask
          id="mask0_1401_86274"
          style={{ maskType: 'luminance' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="240"
          height="300"
        >
          <path
            d="M240 0H0V300H240V0Z"
            fill="white"
          />
        </mask>
        <g mask="url(#mask0_1401_86274)">
          <path
            d="M180 240H60V120H180V240Z"
            fill={fill1}
          />
          <path
            d="M180 60H60V240H180V60ZM240 300H0V0H240V300Z"
            fill={fill2}
          />
        </g>
      </g>
      <defs>
        <clipPath id="clip0_1401_86274">
          <rect
            width="240"
            height="300"
            fill={clipFill}
          />
        </clipPath>
      </defs>
    </svg>
  )
})
