import createIcon from './createIcon'

export default createIcon(({ size, color, ...props }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M0.5 14.9V1.5"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M3.5 14.9V4.40002"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M6.5 14.9V8.19995"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M9.3999 14.9V11.2"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M12.3999 14.9V2.69995"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M15.3999 14.9V5.5"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))

