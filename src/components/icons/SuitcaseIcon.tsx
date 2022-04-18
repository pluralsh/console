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
      d="M0.5 12.9V5.30002C0.5 4.80002 0.9 4.40002 1.4 4.40002H16"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M15.5 6.40002V13.9C15.5 14.4 15.1 14.8 14.6 14.8H0"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M3.6001 12.9V4.59998"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M12.3999 12.9V4.59998"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M5.7998 2.39998V1.09998C5.7998 0.799976 5.9998 0.599976 6.2998 0.599976H10.2998"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))

