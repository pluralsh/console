import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0.5 13.5V3.30002C0.5 2.80002 0.9 2.40002 1.4 2.40002H13.8"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M2.5 13H13.3"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M9.2 5.90002H3.5"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M8.0002 8.69995H4.7002"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M13.8002 8.7C14.96 8.7 15.9002 7.7598 15.9002 6.6C15.9002 5.4402 14.96 4.5 13.8002 4.5C12.6404 4.5 11.7002 5.4402 11.7002 6.6C11.7002 7.7598 12.6404 8.7 13.8002 8.7Z"
      fill={color}
    />
    <path
      d="M13.2998 8.40002L12.2998 10.9"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M14.2002 8.40002L15.2002 10.9"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
