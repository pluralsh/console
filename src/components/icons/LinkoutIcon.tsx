import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
      >
    <path
      d="M8 8L15.5 0.5"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M10.2998 0.5H15.4998V5.7"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M15.5 8V13.4C15.5 14.5 14.6 15.5 13.4 15.5H0.5V2.6C0.5 1.5 1.4 0.5 2.6 0.5H8"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
