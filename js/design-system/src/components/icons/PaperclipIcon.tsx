import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M7.3999 14.5L13.6999 8.30005"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M10.2998 1.59998L1.9998 9.89997C1.3998 10.5 1.3998 11.4 1.9998 12L5.5998 15.6"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M8.09961 10.5L13.9996 4.6C14.5996 4 14.5996 3.1 13.9996 2.5L11.9996 0.5"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M10.3 4.90002L5.8 9.40002C5.4 9.80002 5.4 10.5 5.8 10.9L7 12.2"
      stroke={color}
      strokeMiterlimit="10"
    />
  </svg>
))
