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
      d="M3.7998 14.4H1.2998V5.39995C1.2998 4.99995 1.5998 4.69995 1.9998 4.69995H3.8998V14.4H3.7998Z"
      fill={color}
    />
    <path
      d="M9.3002 14.4H6.7002V2.29998C6.7002 1.89998 7.0002 1.59998 7.4002 1.59998H9.3002V14.4Z"
      fill={color}
    />
    <path
      d="M14.6996 14.4H12.0996V7.79998C12.0996 7.39998 12.3996 7.09998 12.7996 7.09998H14.6996V14.4Z"
      fill={color}
    />
    <path
      d="M0 14.4H16"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))

