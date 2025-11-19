import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M7 4L4 1L1 4"
      stroke={color}
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 12L4 15L1 12"
      stroke={color}
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 6.3335L4 1.3335"
      stroke={color}
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 9.6665L4 14.6665"
      stroke={color}
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 4H16"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M8 8H16"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M10 12H16"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
