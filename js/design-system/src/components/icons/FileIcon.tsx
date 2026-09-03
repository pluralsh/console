import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10.2998 0V2.4C10.2998 3.3 10.9998 4 11.8998 4H14.4998"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M8.2998 0.5H3.8998C3.2998 0.5 2.7998 1 2.7998 1.6V16"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M4.7998 15.5H12.9998C13.5998 15.5 14.0998 15 14.0998 14.4V6"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
