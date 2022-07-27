import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0.5 14.6V3.10002C0.5 2.50002 1 1.90002 1.7 1.90002H13.5"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M15.5 1.40002V12.9C15.5 13.5 15 14.1 14.3 14.1H2.5"
      stroke={color}
      strokeMiterlimit="10"
      strokeLinejoin="round"
    />
    <path
      d="M3.69995 5.09998L4.0535 5.45353L4.40706 5.09998L4.0535 4.74642L3.69995 5.09998ZM1.8464 3.95353L3.3464 5.45353L4.0535 4.74642L2.5535 3.24642L1.8464 3.95353ZM3.3464 4.74642L1.8464 6.24642L2.5535 6.95353L4.0535 5.45353L3.3464 4.74642Z"
      fill={color}
    />
  </svg>
))
