import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_5967_118)">
      <path
        d="M10.132 1.34912H5.86788C5.30524 1.34912 4.84912 1.80523 4.84912 2.36788V6.63196C4.84912 7.1946 5.30524 7.65072 5.86788 7.65072H10.132C10.6946 7.65072 11.1507 7.1946 11.1507 6.63196V2.36788C11.1507 1.80523 10.6946 1.34912 10.132 1.34912Z"
        fill={color}
      />
    </g>
    <path
      d="M2 8L7.89923 11.4412C7.9615 11.4775 8.0385 11.4775 8.10077 11.4412L14 8"
      stroke={color}
      strokeLinecap="round"
    />
    <path
      d="M2 11.5L7.89923 14.9412C7.9615 14.9775 8.0385 14.9775 8.10077 14.9412L14 11.5"
      stroke={color}
      strokeLinecap="round"
    />
    <defs>
      <clipPath id="clip0_5967_118">
        <rect
          width="7"
          height="7"
          fill="white"
          transform="translate(4.5 1)"
        />
      </clipPath>
    </defs>
  </svg>
))
