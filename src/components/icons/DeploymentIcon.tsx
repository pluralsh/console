import createIcon from './createIcon'

export default createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
      >
    <path
      d="M15.0998 15.4H11.7998V10.5C11.7998 9.99998 12.1998 9.59998 12.6998 9.59998H15.9998V14.5C15.9998 15 15.5998 15.4 15.0998 15.4Z"
      fill={color}
    />
    <path
      d="M3.3 15.4H0V10.5C0 9.99995 0.4 9.69995 0.9 9.69995H4.2V14.6C4.1 15 3.7 15.4 3.3 15.4Z"
      fill={color}
    />
    <path
      d="M9.1999 15.4H5.8999V10.5C5.8999 9.99998 6.2999 9.59998 6.7999 9.59998H10.0999V14.5C10.0999 15 9.6999 15.4 9.1999 15.4Z"
      fill={color}
    />
    <path
      d="M13.8999 0.599976V7.09998"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M2.1001 7.69998V2.39998C2.1001 1.69998 2.7001 1.09998 3.4001 1.09998H12.0001"
      stroke={color}
      strokeMiterlimit="10"
    />
    <path
      d="M15.9 5.5L13.9 7.7L12 5.5H15.9Z"
      fill={color}
    />
  </svg>
))
