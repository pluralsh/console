import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_5967_118)">
      <path
        d="M10.132 1.74243H5.86788C5.30524 1.74243 4.84912 2.19854 4.84912 2.76119V7.02527C4.84912 7.58791 5.30524 8.04403 5.86788 8.04403H10.132C10.6946 8.04403 11.1507 7.58791 11.1507 7.02527V2.76119C11.1507 2.19854 10.6946 1.74243 10.132 1.74243Z"
        fill={color}
      />
    </g>
    <path
      d="M2 8.39331L7.89923 11.8345C7.9615 11.8709 8.0385 11.8709 8.10077 11.8345L14 8.39331"
      stroke={color}
      strokeLinecap="round"
    />
    <path
      d="M2 11.8933L7.89923 15.3345C7.9615 15.3709 8.0385 15.3709 8.10077 15.3345L14 11.8933"
      stroke={color}
      strokeLinecap="round"
    />
    <defs>
      <clipPath id="clip0_5967_118">
        <rect
          width="7"
          height="7"
          fill={color}
          transform="translate(4.5 1.39331)"
        />
      </clipPath>
    </defs>
  </svg>
))
